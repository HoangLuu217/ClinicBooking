package com.example.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.example.backend.model.User;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class UserDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        @Size(max = 100, message = "Email không được quá 100 ký tự")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, max = 255, message = "Mật khẩu phải có ít nhất 6 ký tự")
        private String password;

        @NotBlank(message = "Tên không được để trống")
        @Size(max = 50, message = "Tên không được quá 50 ký tự")
        private String firstName;

        @NotBlank(message = "Họ không được để trống")
        @Size(max = 50, message = "Họ không được quá 50 ký tự")
        private String lastName;

        @Size(max = 20, message = "Số điện thoại không được quá 20 ký tự")
        private String phone;

        private User.Gender gender;

        private LocalDate dateOfBirth;

        @Size(max = 255, message = "Địa chỉ không được quá 255 ký tự")
        private String address;

        @Size(max = 500, message = "URL ảnh đại diện không được quá 500 ký tự")
        private String avatarUrl;

        private Long roleId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        @Email(message = "Email không hợp lệ")
        @Size(max = 100, message = "Email không được quá 100 ký tự")
        private String email;

        @Size(min = 6, max = 255, message = "Mật khẩu phải có ít nhất 6 ký tự")
        private String password;

        @Size(max = 50, message = "Tên không được quá 50 ký tự")
        private String firstName;

        @Size(max = 50, message = "Họ không được quá 50 ký tự")
        private String lastName;

        @Size(max = 20, message = "Số điện thoại không được quá 20 ký tự")
        private String phone;

        private User.Gender gender;

        private LocalDate dateOfBirth;

        @Size(max = 255, message = "Địa chỉ không được quá 255 ký tự")
        private String address;

        @Size(max = 500, message = "URL ảnh đại diện không được quá 500 ký tự")
        private String avatarUrl;

        private User.UserStatus status;

        private Long roleId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
        private String phone;
        private User.Gender gender;
        private LocalDate dateOfBirth;
        private String address;
        private String avatarUrl;
        private LocalDateTime createdAt;
        private User.UserStatus status;
        private RoleDTO.Response role;
    }
}