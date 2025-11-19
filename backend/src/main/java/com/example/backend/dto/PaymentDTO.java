package com.example.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.example.backend.model.Payment;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentDTO {
    
    // ========== PaymentCreateDTO ==========
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotNull(message = "Appointment ID không được để trống")
        private Long appointmentId;
        
        @NotNull(message = "Patient ID không được để trống")
        private Long patientId;
        
        // Amount không bắt buộc, sẽ lấy từ appointment.fee
        private BigDecimal amount;
        
        private String description;
        
        @NotNull(message = "Return URL không được để trống")
        private String returnUrl;
        
        @NotNull(message = "Cancel URL không được để trống")
        private String cancelUrl;
    }
    
    // ========== PaymentResponseDTO ==========
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long paymentId;
        private Long appointmentId;
        private String payOSPaymentId;
        private BigDecimal amount;
        private String currency;
        private Payment.PaymentStatus status;
        private String paymentMethod;
        private String payOSCode;
        private String payOSLink;
        private String description;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime paidAt;
        private String failureReason;
        
        // Patient info for display
        private String patientName;
        private String doctorName;
        private String appointmentDate;
    }
    
    // ========== PaymentUpdateDTO ==========
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        private BigDecimal amount;
        private String description;
        private Payment.PaymentStatus status;
        private String paymentMethod;
        private String failureReason;
    }
}
