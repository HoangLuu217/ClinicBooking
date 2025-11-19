package com.example.backend.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "Users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "UserID")
    private Long id;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    @Size(max = 100, message = "Email không được quá 100 ký tự")
    @Column(name = "Email", unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 255, message = "Mật khẩu phải có ít nhất 6 ký tự")
    @Column(name = "PasswordHash", nullable = false)
    private String passwordHash;

    @NotBlank(message = "Tên không được để trống")
    @Size(max = 50, message = "Tên không được quá 50 ký tự")
    @Column(name = "FirstName", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String firstName;

    @NotBlank(message = "Họ không được để trống")
    @Size(max = 50, message = "Họ không được quá 50 ký tự")
    @Column(name = "LastName", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String lastName;

    @Size(max = 20, message = "Số điện thoại không được quá 20 ký tự")
    @Column(name = "Phone")
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "Gender")
    private Gender gender;

    @Column(name = "DOB")
    private LocalDate dateOfBirth;

    @Size(max = 255, message = "Địa chỉ không được quá 255 ký tự")
    @Column(name = "Address", columnDefinition = "NVARCHAR(MAX)")
    private String address;

    @Size(max = 500, message = "URL ảnh đại diện không được quá 500 ký tự")
    @Column(name = "AvatarUrl")
    private String avatarUrl;

    @CreationTimestamp
    @Column(name = "CreatedAt", updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "Status")
    private UserStatus status = UserStatus.ACTIVE;

    // Số lần đăng nhập sai liên tiếp (phục vụ khóa tài khoản)
    @Column(name = "FailedLoginAttempts")
    private Integer failedLoginAttempts = 0;

    // Thời điểm bị khóa (để theo dõi hoặc mở khóa theo thời gian nếu cần)
    @Column(name = "LockedAt")
    private LocalDateTime lockedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RoleID", referencedColumnName = "RoleID", nullable = false)
    private Role role;

    public enum Gender {
        MALE("M"), FEMALE("F"), OTHER("O");
        
        private final String code;
Gender(String code) {
            this.code = code;
        }
        
        public String getCode() {
            return code;
        }
    }

    public enum UserStatus {
        ACTIVE, INACTIVE, SUSPENDED, DELETED
    }
}
