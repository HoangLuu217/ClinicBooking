package com.example.backend.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class ReviewDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotNull(message = "PatientID must not be null")
        private Long patientId;

        @NotNull(message = "DoctorID must not be null")
        private Long doctorId;

        @NotNull(message = "AppointmentID must not be null")
        private Long appointmentId;

        @NotNull(message = "Rating must not be null")
        @Min(value = 1, message = "Rating must be between 1 and 5")
        @Max(value = 5, message = "Rating must be between 1 and 5")
        private Integer rating;

        @Size(max = 1000, message = "Comment must be at most 1000 characters")
        private String comment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        @Min(value = 1, message = "Rating must be between 1 and 5")
        @Max(value = 5, message = "Rating must be between 1 and 5")
        private Integer rating;

        @Size(max = 1000, message = "Comment must be at most 1000 characters")
        private String comment;

        @Size(max = 20, message = "Status must be at most 20 characters")
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long reviewId;
        private Long patientId;
        private String patientName;
        private Long doctorId;
        private String doctorName;
        private Long appointmentId;
        private Integer rating;
        private String comment;
        private LocalDateTime createdAt;
        private String status;
    }
}
