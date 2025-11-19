package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class RoleDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotBlank(message = "Tên vai trò không được để trống")
        @Size(max = 50, message = "Tên vai trò không được quá 50 ký tự")
        private String name;

        @Size(max = 255, message = "Mô tả không được quá 255 ký tự")
        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        @Size(max = 50, message = "Tên vai trò không được quá 50 ký tự")
        private String name;

        @Size(max = 255, message = "Mô tả không được quá 255 ký tự")
        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String name;
        private String description;
    }
}