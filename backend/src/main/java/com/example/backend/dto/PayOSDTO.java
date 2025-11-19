package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

public class PayOSDTO {
    
    // ========== PayOSPaymentRequestDTO ==========
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentRequest {
        private String orderCode;
        private Long amount;
        private String description;
        private List<PayOSItemDTO> items;
        private String cancelUrl;
        private String returnUrl;
        private String expiredAt;
        private String signature;
        
        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class PayOSItemDTO {
            private String name;
            private Long quantity;
            private Long price;
        }
    }
    
    // ========== PayOSPaymentResponseDTO ==========
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentResponse {
        private int code;
        private String message;
        private PayOSDataDTO data;
        
        // Alternative fields that PayOS might return
        private String paymentLinkId;
        private String paymentLink;
        private String qrCode;
        private String expiredAt;
        
        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class PayOSDataDTO {
            private String paymentLinkId;
            private String paymentLink;
            private String qrCode;
            private String expiredAt;
        }
    }
    
    // ========== PayOSWebhookDTO ==========
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Webhook {
        private String code;
        private String desc;
        private PayOSWebhookDataDTO data;
        private String signature;
        
        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class PayOSWebhookDataDTO {
            private String orderCode;
            private Long amount;
            private String description;
            private String accountNumber;
            private String reference;
            private String transactionDateTime;
            private String currency;
            private String paymentLinkId;
            private String code;
            private String desc;
            private Long counter;
            private String virtualAccountName;
            private String virtualAccountNumber;
            private String location;
        }
    }
}
