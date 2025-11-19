package com.example.backend.dto;

import java.time.LocalDateTime;
import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AppointmentDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        // PatientID có thể null khi bác sĩ tạo slot trống
        private Long patientId;

        @NotNull(message = "DoctorID không được để trống")
        private Long doctorId;

        @NotNull(message = "ScheduleID không được để trống - Phải chọn lịch trình làm việc")
        private Long scheduleId;

        @NotNull(message = "Ngày bắt đầu không được để trống")
        // Bỏ @Future để cho phép tạo slot cho hiện tại/quá khứ
        // Validation chi tiết được xử lý trong Service
        private LocalDateTime startTime;

        @NotNull(message = "Ngày kết thúc không được để trống")
        // Bỏ @Future để cho phép tạo slot cho hiện tại/quá khứ
        private LocalDateTime endTime;

        @Size(max = 255, message = "Ghi chú không quá 255 ký tự")
        private String notes;

        private BigDecimal fee;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        // Bỏ @Future để linh hoạt hơn
        private LocalDateTime startTime;

        private LocalDateTime endTime;

        @Size(max = 30, message = "Trạng thái không quá 30 ký tự")
        private String status;

        @Size(max = 255, message = "Ghi chú không quá 255 ký tự")
        private String notes;

        private BigDecimal fee;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkCreate {
        @NotNull(message = "DoctorID không được để trống")
        private Long doctorId;

        @NotNull(message = "Danh sách appointments không được để trống")
        private java.util.List<Create> appointments;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkCreateResponse {
        private int totalRequested;
        private int successCount;
        private int failedCount;
        private java.util.List<Response> createdAppointments;
        private java.util.List<String> errors;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
    private Long appointmentId;
    private Long patientId;
    private String patientName;
    private Long doctorId;
    private String doctorName;
    private Long scheduleId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private String notes;
    private BigDecimal fee;
    }
}


