package com.example.backend.model;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "SystemNotifications")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SystemNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "NotificationID")
    private Long notificationId;

    @NotNull(message = "User ID không được để trống")
    @Column(name = "UserID", nullable = false)
    private Long userId;

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề không được quá 255 ký tự")
    @Column(name = "Title", nullable = false, columnDefinition = "NVARCHAR(255)")
    private String title;

    @NotBlank(message = "Nội dung không được để trống")
    @Column(name = "Message", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String message;

    @Size(max = 50, message = "Loại thông báo không được quá 50 ký tự")
    @Column(name = "Type", columnDefinition = "NVARCHAR(50)")
    private String type = "general";

    @Column(name = "IsRead", nullable = false, columnDefinition = "BIT DEFAULT 0")
    private Boolean isRead = false;

    @Column(name = "CreatedAt", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "ReadAt")
    private LocalDateTime readAt;

    @Column(name = "EmailSent")
    private Boolean emailSent = false;

    @Column(name = "EmailSentAt")
    private LocalDateTime emailSentAt;

    @ManyToOne
    @JoinColumn(name = "AppointmentID")
    @JsonIgnoreProperties({"patient", "doctor", "medicalRecord", "prescription", "notifications"})
    private Appointment appointment;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isRead == null) {
            isRead = false;
        }
    }

    // Enum cho các loại thông báo
    public enum NotificationType {
        APPOINTMENT("appointment"),
        REMINDER("reminder"),
        RESULT("result"),
        CANCELLATION("cancellation"),
        GENERAL("general"),
        PAYMENT("payment"),
        SYSTEM("system");

        private final String value;

        NotificationType(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }
}