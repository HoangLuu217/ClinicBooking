package com.example.backend.controller;

import java.util.List;
import java.nio.charset.StandardCharsets;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;              // <-- thêm
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;   // <-- thêm (RestController, RequestMapping, etc.)
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.PaymentDTO;
import com.example.backend.model.Payment;
import com.example.backend.service.PaymentService;
import com.example.backend.service.PdfExportService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PaymentController {
    
    private final PaymentService paymentService;
    private final PdfExportService pdfExportService;

    @PostMapping
    public ResponseEntity<PaymentDTO.Response> createPayment(@Valid @RequestBody PaymentDTO.Create paymentCreateDTO) {
        try {
            log.info("🔍 Creating payment with data: {}", paymentCreateDTO);
            PaymentDTO.Response payment = paymentService.createPayment(paymentCreateDTO);
            log.info("✅ Payment created successfully: {}", payment.getPaymentId());
            return ResponseEntity.status(HttpStatus.CREATED).body(payment);
        } catch (Exception e) {
            log.error("❌ Error creating payment: ", e);
            PaymentDTO.Response errorResponse = new PaymentDTO.Response();
            errorResponse.setPaymentId(null);
            errorResponse.setAppointmentId(paymentCreateDTO.getAppointmentId());
            errorResponse.setStatus(Payment.PaymentStatus.FAILED);
            errorResponse.setDescription("Error: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }
    
    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentDTO.Response> getPaymentById(@PathVariable Long paymentId) {
        try {
            PaymentDTO.Response payment = paymentService.getPaymentById(paymentId);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            log.error("Error getting payment by ID: ", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
    
    @GetMapping("/payos/{payOSPaymentId}")
    public ResponseEntity<PaymentDTO.Response> getPaymentByPayOSPaymentId(@PathVariable String payOSPaymentId) {
        try {
            PaymentDTO.Response payment = paymentService.getPaymentByPayOSPaymentId(payOSPaymentId);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            log.error("Error getting payment by PayOS Payment ID: ", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
    
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<PaymentDTO.Response>> getPaymentsByAppointmentId(@PathVariable Long appointmentId) {
        try {
            List<PaymentDTO.Response> payments = paymentService.getPaymentsByAppointmentId(appointmentId);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            log.error("Error getting payments by appointment ID: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PaymentDTO.Response>> getPaymentsByPatientId(@PathVariable Long patientId) {
        try {
            List<PaymentDTO.Response> payments = paymentService.getPaymentsByPatientId(patientId);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            log.error("Error getting payments by patient ID: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<PaymentDTO.Response>> getPaymentsByDoctorId(@PathVariable Long doctorId) {
        try {
            List<PaymentDTO.Response> payments = paymentService.getPaymentsByDoctorId(doctorId);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            log.error("Error getting payments by doctor ID: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping
    public ResponseEntity<Page<PaymentDTO.Response>> getAllPayments(Pageable pageable) {
        try {
            Page<PaymentDTO.Response> payments = paymentService.getAllPayments(pageable);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            log.error("Error getting all payments: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/status/{status}")
    public ResponseEntity<List<PaymentDTO.Response>> getPaymentsByStatus(@PathVariable Payment.PaymentStatus status) {
        try {
            List<PaymentDTO.Response> payments = paymentService.getPaymentsByStatus(status);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            log.error("Error getting payments by status: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PutMapping("/{paymentId}/status")
    public ResponseEntity<PaymentDTO.Response> updatePaymentStatus(
            @PathVariable Long paymentId, 
            @RequestParam Payment.PaymentStatus status) {
        try {
            PaymentDTO.Response payment = paymentService.updatePaymentStatus(paymentId, status);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            log.error("Error updating payment status: ", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    @DeleteMapping("/{paymentId}")
    public ResponseEntity<Void> deletePayment(@PathVariable Long paymentId) {
        try {
            paymentService.deletePayment(paymentId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting payment: ", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    
    @GetMapping("/{paymentId}/status")
    public ResponseEntity<PaymentDTO.Response> checkPaymentStatus(@PathVariable Long paymentId) {
        try {
            PaymentDTO.Response payment = paymentService.getPaymentById(paymentId);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            log.error("Error checking payment status: ", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PutMapping("/payos/{payOSPaymentId}/status")
    public ResponseEntity<PaymentDTO.Response> updatePaymentStatusFromPayOS(
            @PathVariable String payOSPaymentId,
            @RequestParam String status,
            @RequestParam(required = false) String orderCode) {
        try {
            log.info("🔍 Updating payment status from PayOS: payOSId={}, status={}, orderCode={}", 
                payOSPaymentId, status, orderCode);
            
            PaymentDTO.Response payment = paymentService.updatePaymentStatusFromPayOS(
                payOSPaymentId, status, orderCode);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            log.error("Error updating payment status from PayOS: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/invoice-pdf")
    public ResponseEntity<byte[]> exportInvoicePdf(@PathVariable Long id) {
        try {
            PaymentDTO.Response p = paymentService.getPaymentById(id);
            if (p == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_PLAIN_VALUE + ";charset=UTF-8")
                        .body(("Không tìm thấy hoá đơn: " + id).getBytes(StandardCharsets.UTF_8));
            }
            String currency = p.getCurrency() != null ? p.getCurrency() : "VND";
            java.math.BigDecimal amount = p.getAmount() != null ? p.getAmount() : java.math.BigDecimal.ZERO;

            String[] headers = new String[]{
                "Payment ID","Appointment ID","Bệnh nhân","Bác sĩ","Số tiền","Mô tả","Trạng thái","PayOS Code","Tạo lúc","Thanh toán lúc"
            };
            java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");
            String createdAt = p.getCreatedAt() != null ? p.getCreatedAt().format(fmt) : "-";
            String paidAt = p.getPaidAt() != null ? p.getPaidAt().format(fmt) : "-";
            String[] values = new String[]{
                String.valueOf(p.getPaymentId()),
                String.valueOf(p.getAppointmentId()),
                p.getPatientName() == null ? "-" : p.getPatientName(),
                p.getDoctorName() == null ? "-" : p.getDoctorName(),
                amount + " " + currency,
                p.getDescription() == null ? "-" : p.getDescription(),
                p.getStatus() != null ? p.getStatus().name() : "-",
                p.getPayOSCode() == null ? "-" : p.getPayOSCode(),
                createdAt,
                paidAt
            };

            byte[] pdf = pdfExportService.generateSingleRowTable("Chi tiết thanh toán", headers, values);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice-" + id + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_PLAIN_VALUE + ";charset=UTF-8")
                    .body(("Lỗi xuất hoá đơn: " + ex.getMessage()).getBytes(StandardCharsets.UTF_8));
        }
    }

}
