package com.example.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class DoctorDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotNull(message = "ID người dùng không được để trống")
        private Long userId;

        @NotNull(message = "ID khoa không được để trống")
        private Long departmentId;

        @Size(max = 100, message = "Chuyên khoa không được quá 100 ký tự")
        private String specialty;

        @Size(max = 500, message = "Tiểu sử không được quá 500 ký tự")
        private String bio;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        private Long departmentId;

        @Size(max = 100, message = "Chuyên khoa không được quá 100 ký tự")
        private String specialty;

        @Size(max = 500, message = "Tiểu sử không được quá 500 ký tự")
        private String bio;

        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long doctorId;
        private UserDTO.Response user;
        private DepartmentDTO.Response department;
        private String specialty;
        private String bio;
        private LocalDate createdAt;
        private String status;
    }
}
