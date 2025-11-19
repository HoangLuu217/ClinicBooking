package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Payments")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Payment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PaymentID")
    private Long paymentId;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentID")
    private Appointment appointment;
    
    @Column(name = "PayOSPaymentId", unique = true)
    private String payOSPaymentId;
    
    @Column(name = "Amount", nullable = false)
    private BigDecimal amount;
    
    @Column(name = "Currency", nullable = false)
    private String currency = "VND";
    
    @Enumerated(EnumType.STRING)
    @Column(name = "Status", nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;
    
    @Column(name = "PaymentMethod")
    private String paymentMethod;
    
    @Column(name = "PayOSCode")
    private String payOSCode;
    
    @Column(name = "PayOSLink")
    private String payOSLink;
    
    @Column(name = "Description")
    private String description;
    
    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "UpdatedAt")
    private LocalDateTime updatedAt;
    
    @Column(name = "PaidAt")
    private LocalDateTime paidAt;
    
    @Column(name = "FailureReason")
    private String failureReason;
    
    @Column(name = "PatientID")
    private Long patientId;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    public enum PaymentStatus {
        PENDING,    // Chờ thanh toán
        PAID,       // Đã thanh toán
        FAILED,     // Thanh toán thất bại
        CANCELLED,  // Hủy thanh toán
        REFUNDED    // Hoàn tiền
    }
}
