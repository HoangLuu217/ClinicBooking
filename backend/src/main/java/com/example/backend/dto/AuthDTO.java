package com.example.backend.dto;

import java.time.LocalDate;

import com.example.backend.model.User;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AuthDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginResponse {
        private String message;
        private boolean success;
        private UserDTO.Response user;
        private String token; // JWT token - hiện tại để null
        // Số lần thử còn lại trước khi bị khóa (chỉ trả về khi sai mật khẩu)
        private Integer attemptsRemaining;
        // Tài khoản đang bị khóa?
        private Boolean locked;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        @Size(max = 100, message = "Email không được quá 100 ký tự")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, max = 255, message = "Mật khẩu phải có ít nhất 6 ký tự")
        private String password;

        @NotBlank(message = "Xác nhận mật khẩu không được để trống")
        private String confirmPassword;

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

        private String role; // Role for registration (optional, defaults to PATIENT)
        
        // Doctor specific fields
        private String specialty;
        private String bio;
        private Long departmentId;
        
        // Patient specific fields (if needed)
        private String medicalHistory;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterResponse {
        private String message;
        private boolean success;
        private UserDTO.Response user;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogoutRequest {
        private String token; // JWT token để vô hiệu hóa (optional)
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogoutResponse {
        private String message;
        private boolean success;
    }

    // Email OTP DTOs (no database needed)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor  
    public static class SendOtpRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyOtpRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Mã OTP không được để trống")
        private String otp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OtpResponse {
        private String message;
        private boolean success;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Mã OTP không được để trống")
        private String otp;

        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
        private String newPassword;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordResponse {
        private String message;
        private boolean success;
    }
}
