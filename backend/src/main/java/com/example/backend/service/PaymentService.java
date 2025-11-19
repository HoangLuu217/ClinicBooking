package com.example.backend.service;

import com.example.backend.dto.PaymentDTO;
import com.example.backend.mapper.PaymentMapper;
import com.example.backend.model.Appointment;
import com.example.backend.model.Payment;
import com.example.backend.repository.AppointmentRepository;
import com.example.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    private final AppointmentRepository appointmentRepository;
    private final PayOSService payOSService;
    private final PaymentMapper paymentMapper;
    private final AppointmentService appointmentService;
    
    @Transactional
    public PaymentDTO.Response createPayment(PaymentDTO.Create paymentCreateDTO) {
        try {
            log.info("🔍 Creating payment for appointment ID: {}", paymentCreateDTO.getAppointmentId());
            log.info("🔍 Payment DTO: {}", paymentCreateDTO);
            
            // Kiểm tra appointment có tồn tại không
            Optional<Appointment> appointmentOpt = appointmentRepository.findById(paymentCreateDTO.getAppointmentId());
            if (appointmentOpt.isEmpty()) {
                log.error("❌ Appointment not found with ID: {}", paymentCreateDTO.getAppointmentId());
                throw new RuntimeException("Không tìm thấy lịch hẹn với ID: " + paymentCreateDTO.getAppointmentId());
            }
            
            Appointment appointment = appointmentOpt.get();
            log.info("✅ Found appointment: ID={}, Fee={}", appointment.getAppointmentId(), appointment.getFee());
            
            // Kiểm tra xem đã có payment cho appointment này chưa
            List<Payment> existingPayments = paymentRepository.findByAppointment_AppointmentId(paymentCreateDTO.getAppointmentId());
            Optional<Payment> existingPayment = existingPayments.isEmpty() ? Optional.empty() : Optional.of(existingPayments.get(0));
            if (existingPayment.isPresent()) {
                Payment payment = existingPayment.get();
                if (payment.getStatus() == Payment.PaymentStatus.PENDING) {
                    // Nếu payment đang pending, tạo lại link thanh toán
                    payOSService.createPaymentLink(
                        payment, 
                        paymentCreateDTO.getReturnUrl(), 
                        paymentCreateDTO.getCancelUrl()
                    );
                    
                    paymentRepository.save(payment);
                    return paymentMapper.toResponseDTO(payment);
                } else if (payment.getStatus() == Payment.PaymentStatus.PAID) {
                    throw new RuntimeException("Lịch hẹn này đã được thanh toán");
                } else if (payment.getStatus() == Payment.PaymentStatus.CANCELLED || 
                          payment.getStatus() == Payment.PaymentStatus.FAILED) {
                    // Nếu payment đã bị hủy hoặc thất bại, cập nhật lại thành PENDING và tạo link mới
                    log.info("🔄 Reusing cancelled/failed payment for appointment ID: {}", paymentCreateDTO.getAppointmentId());
                    
                    // Reset payment fields
                    payment.setStatus(Payment.PaymentStatus.PENDING);
                    payment.setPayOSLink(null);
                    payment.setPayOSPaymentId(null);
                    payment.setPayOSCode(null);
                    payment.setPaidAt(null);
                    payment.setFailureReason(null);
                    
                    // Cập nhật amount từ appointment
                    if (appointment.getFee() != null) {
                        payment.setAmount(appointment.getFee());
                        log.info("Updated payment amount from appointment fee: {} VND", appointment.getFee());
                    }
                    
                    // Cập nhật description
                    payment.setDescription(paymentCreateDTO.getDescription() != null ? 
                        paymentCreateDTO.getDescription() : "Thanh toán lịch hẹn khám bệnh");
                    
                    // Tạo PayOS payment link mới
                    payOSService.createPaymentLink(
                        payment,
                        paymentCreateDTO.getReturnUrl(),
                        paymentCreateDTO.getCancelUrl()
                    );
                    
                    payment = paymentRepository.save(payment);
                    log.info("✅ Reused payment with new PayOS link for payment ID: {}", payment.getPaymentId());
                    return paymentMapper.toResponseDTO(payment);
                }
            }
            
            // Tạo payment mới
            Payment payment = new Payment();
            payment.setAppointment(appointment);
            payment.setPatientId(paymentCreateDTO.getPatientId());
            
            // Lấy fee từ appointment thay vì từ DTO
            if (appointment.getFee() != null) {
                payment.setAmount(appointment.getFee());
                log.info("Using appointment fee: {} VND", appointment.getFee());
            } else {
                // Fallback nếu appointment không có fee
                payment.setAmount(paymentCreateDTO.getAmount());
                log.warn("Appointment has no fee, using DTO amount: {}", paymentCreateDTO.getAmount());
            }
            
            payment.setDescription(paymentCreateDTO.getDescription() != null ? 
                paymentCreateDTO.getDescription() : "Thanh toán lịch hẹn khám bệnh");
            payment.setStatus(Payment.PaymentStatus.PENDING);
            
            // Lưu payment trước
            payment = paymentRepository.save(payment);
            
            // Tạo PayOS payment link
            log.info("🔍 Creating PayOS payment link for payment ID: {}", payment.getPaymentId());
            payOSService.createPaymentLink(
                payment,
                paymentCreateDTO.getReturnUrl(),
                paymentCreateDTO.getCancelUrl()
            );
            
            // Cập nhật payment với thông tin từ PayOS (đã được xử lý trong PayOSService)
            // PayOSService đã handle việc set PayOS fields, chỉ cần log
            log.info("Payment created with PayOS integration for payment ID: {}", payment.getPaymentId());
            
            payment = paymentRepository.save(payment);
            
            log.info("Payment created successfully with ID: {}", payment.getPaymentId());
            return paymentMapper.toResponseDTO(payment);
            
        } catch (Exception e) {
            log.error("Error creating payment: ", e);
            throw new RuntimeException("Lỗi khi tạo thanh toán: " + e.getMessage());
        }
    }
    
    public PaymentDTO.Response getPaymentById(Long paymentId) {
        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy thanh toán với ID: " + paymentId);
        }
        return paymentMapper.toResponseDTO(paymentOpt.get());
    }
    
    public PaymentDTO.Response getPaymentByPayOSPaymentId(String payOSPaymentId) {
        Optional<Payment> paymentOpt = paymentRepository.findByPayOSPaymentId(payOSPaymentId);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy thanh toán với PayOS Payment ID: " + payOSPaymentId);
        }
        return paymentMapper.toResponseDTO(paymentOpt.get());
    }
    
    public List<PaymentDTO.Response> getPaymentsByAppointmentId(Long appointmentId) {
        List<Payment> payments = paymentRepository.findByAppointment_AppointmentId(appointmentId);
        return payments.stream()
                .map(paymentMapper::toResponseDTO)
                .toList();
    }
    
    public List<PaymentDTO.Response> getPaymentsByPatientId(Long patientId) {
        List<Payment> payments = paymentRepository.findByPatientId(patientId);
        return payments.stream()
                .map(paymentMapper::toResponseDTO)
                .toList();
    }
    
    public List<PaymentDTO.Response> getPaymentsByDoctorId(Long doctorId) {
        List<Payment> payments = paymentRepository.findByDoctorId(doctorId);
        return payments.stream()
                .map(paymentMapper::toResponseDTO)
                .toList();
    }
    
    public Page<PaymentDTO.Response> getAllPayments(Pageable pageable) {
        Page<Payment> payments = paymentRepository.findAll(pageable);
        return payments.map(paymentMapper::toResponseDTO);
    }
    
    public List<PaymentDTO.Response> getPaymentsByStatus(Payment.PaymentStatus status) {
        List<Payment> payments = paymentRepository.findByStatus(status);
        return payments.stream()
                .map(paymentMapper::toResponseDTO)
                .toList();
    }
    
    @Transactional
    public PaymentDTO.Response updatePaymentStatus(Long paymentId, Payment.PaymentStatus status) {
        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy thanh toán với ID: " + paymentId);
        }
        
        Payment payment = paymentOpt.get();
        payment.setStatus(status);
        
        if (status == Payment.PaymentStatus.PAID) {
            payment.setPaidAt(java.time.LocalDateTime.now());
        }
        
        payment = paymentRepository.save(payment);
        log.info("Payment status updated to {} for payment ID: {}", status, paymentId);
        
        return paymentMapper.toResponseDTO(payment);
    }
    
    @Transactional
    public PaymentDTO.Response updatePaymentStatusByPayOSPaymentId(String payOSPaymentId, Payment.PaymentStatus status) {
        Optional<Payment> paymentOpt = paymentRepository.findByPayOSPaymentId(payOSPaymentId);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy thanh toán với PayOS Payment ID: " + payOSPaymentId);
        }
        
        Payment payment = paymentOpt.get();
        payment.setStatus(status);
        
        if (status == Payment.PaymentStatus.PAID) {
            payment.setPaidAt(java.time.LocalDateTime.now());
        }
        
        payment = paymentRepository.save(payment);
        log.info("Payment status updated to {} for PayOS Payment ID: {}", status, payOSPaymentId);
        
        return paymentMapper.toResponseDTO(payment);
    }

    @Transactional
    public PaymentDTO.Response updatePaymentStatusFromPayOS(String payOSPaymentId, String status, String orderCode) {
        log.info("🔍 Updating payment status from PayOS: payOSId={}, status={}, orderCode={}", 
            payOSPaymentId, status, orderCode);
        
        // Tìm payment theo PayOS Payment ID
        Optional<Payment> paymentOpt = paymentRepository.findByPayOSPaymentId(payOSPaymentId);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy thanh toán với PayOS Payment ID: " + payOSPaymentId);
        }
        
        Payment payment = paymentOpt.get();
        
        // Cập nhật status
        Payment.PaymentStatus paymentStatus;
        switch (status.toUpperCase()) {
            case "PAID":
                paymentStatus = Payment.PaymentStatus.PAID;
                break;
            case "CANCELLED":
                paymentStatus = Payment.PaymentStatus.CANCELLED;
                break;
            case "PENDING":
                paymentStatus = Payment.PaymentStatus.PENDING;
                break;
            default:
                paymentStatus = Payment.PaymentStatus.FAILED;
                break;
        }
        
        payment.setStatus(paymentStatus);
        
        if (paymentStatus == Payment.PaymentStatus.PAID) {
            payment.setPaidAt(java.time.LocalDateTime.now());
            
            // Tự động đặt lịch hẹn khi thanh toán thành công
            try {
                log.info("🎯 Auto-booking appointment after successful payment for PayOS ID: {}", payOSPaymentId);
                
                // Debug: Kiểm tra appointment và patient data
                Appointment appointment = payment.getAppointment();
                Long patientId = payment.getPatientId();
                String notes = payment.getDescription();
                
                log.info("📋 Appointment ID: {}", appointment.getAppointmentId());
                log.info("📋 Appointment status: {}", appointment.getStatus());
                log.info("📋 Payment patientId: {}", patientId);
                log.info("📋 Payment notes: {}", notes);
                
                if (patientId == null) {
                    log.error("❌ PatientId is null in payment, cannot auto-book");
                    return paymentMapper.toResponseDTO(payment);
                }
                
                log.info("🔍 Calling bookAppointment with patientId: {}, notes: {}", patientId, notes);
                appointmentService.bookAppointment(appointment.getAppointmentId(), patientId, notes);
                log.info("✅ Appointment booked successfully after payment");
            } catch (Exception e) {
                log.error("❌ Error auto-booking appointment after payment: ", e);
                // Không throw exception để không ảnh hưởng đến việc cập nhật payment status
            }
        }
        
        // Cập nhật orderCode nếu có
        if (orderCode != null && !orderCode.isEmpty()) {
            payment.setPayOSCode(orderCode);
        }
        
        payment = paymentRepository.save(payment);
        log.info("✅ Payment status updated to {} for PayOS Payment ID: {}", paymentStatus, payOSPaymentId);
        
        return paymentMapper.toResponseDTO(payment);
    }
    
    @Transactional
    public void deletePayment(Long paymentId) {
        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy thanh toán với ID: " + paymentId);
        }
        
        Payment payment = paymentOpt.get();
        if (payment.getStatus() == Payment.PaymentStatus.PAID) {
            throw new RuntimeException("Không thể xóa thanh toán đã hoàn thành");
        }
        
        paymentRepository.delete(payment);
        log.info("Payment deleted with ID: {}", paymentId);
    }
}
