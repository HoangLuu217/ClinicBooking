package com.example.backend.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho SystemNotification entity
 * Chứa các class cho request và response
 */
public class SystemNotificationDTO {

    /**
     * DTO để tạo notification mới
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotBlank(message = "Title không được để trống")
        @Size(max = 200, message = "Title không được quá 200 ký tự")
        private String title;

        @NotBlank(message = "Message không được để trống")
        @Size(max = 1000, message = "Message không được quá 1000 ký tự")
        private String message;

        private Long appointmentId; // Có thể null cho notifications hệ thống
    }

    /**
     * DTO để cập nhật notification
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        @Size(max = 200, message = "Title không được quá 200 ký tự")
        private String title;

        @Size(max = 1000, message = "Message không được quá 1000 ký tự")
        private String message;
    }

    /**
     * DTO cho response notification
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long notificationId;
        private String title;
        private String message;
        private Long appointmentId;
        private LocalDateTime createdAt;
        
        // Thông tin appointment nếu có
        private AppointmentInfo appointment;
        
        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class AppointmentInfo {
            private Long appointmentId;
            private String patientName;
            private String doctorName;
            private LocalDateTime appointmentTime;
            private String status;
        }
    }

    /**
     * DTO cho danh sách notifications với pagination
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private java.util.List<Response> notifications;
        private long totalElements;
        private int totalPages;
        private int currentPage;
        private int pageSize;
        private boolean hasNext;
        private boolean hasPrevious;
    }

    /**
     * DTO cho tìm kiếm notifications
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchRequest {
        private String keyword;
        private Long appointmentId;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private Boolean systemOnly; // true = chỉ notifications hệ thống
    }
}
