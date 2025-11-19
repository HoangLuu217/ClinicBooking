package com.example.backend.service;

import vn.payos.model.webhooks.WebhookData;
import com.example.backend.model.Payment;
import com.example.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookService {
    
    private final PaymentRepository paymentRepository;
    
    @Transactional
    public void processPayOSWebhook(WebhookData webhookData) {
        try {
            log.info("Processing PayOS webhook: {}", webhookData);
            
            String orderCode = String.valueOf(webhookData.getOrderCode());
            String status = webhookData.getCode();
            String description = webhookData.getDesc();
            
            // Tìm payment theo order code
            Payment payment = paymentRepository.findByPayOSCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy payment với order code: " + orderCode));
            
            // Cập nhật trạng thái payment
            Payment.PaymentStatus paymentStatus;
            if ("00".equals(status)) {
                paymentStatus = Payment.PaymentStatus.PAID;
                payment.setPaidAt(LocalDateTime.now());
                payment.setPaymentMethod("PayOS");
                log.info("Payment completed successfully for order code: {}", orderCode);
            } else {
                paymentStatus = Payment.PaymentStatus.FAILED;
                payment.setFailureReason(description);
                log.warn("Payment failed for order code: {} with reason: {}", orderCode, description);
            }
            
            payment.setStatus(paymentStatus);
            paymentRepository.save(payment);
            
            // Có thể thêm logic khác như gửi email thông báo, cập nhật appointment status, etc.
            if (paymentStatus == Payment.PaymentStatus.PAID) {
                // Cập nhật appointment status nếu cần
                if (payment.getAppointment() != null) {
                    payment.getAppointment().setStatus("Confirmed");
                    log.info("Appointment status updated to Confirmed for appointment ID: {}", 
                        payment.getAppointment().getAppointmentId());
                }
            }
            
        } catch (Exception e) {
            log.error("Error processing PayOS webhook: ", e);
            throw new RuntimeException("Lỗi khi xử lý webhook: " + e.getMessage());
        }
    }
}
