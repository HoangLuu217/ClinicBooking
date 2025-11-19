package com.example.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class PatientDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotNull(message = "ID người dùng không được để trống")
        private Long userId;

        @Size(max = 50, message = "Số bảo hiểm y tế không được quá 50 ký tự")
        private String healthInsuranceNumber;

        @Size(max = 1000, message = "Tiền sử bệnh không được quá 1000 ký tự")
        private String medicalHistory;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        @Size(max = 50, message = "Số bảo hiểm y tế không được quá 50 ký tự")
        private String healthInsuranceNumber;

        @Size(max = 1000, message = "Tiền sử bệnh không được quá 1000 ký tự")
        private String medicalHistory;

        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long patientId;
        private UserDTO.Response user;
        private String healthInsuranceNumber;
        private String medicalHistory;
        private LocalDate createdAt;
        private String status;
    }
}
