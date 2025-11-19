package com.example.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Patients")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Patient {

    @Id
    @Column(name = "PatientID")
    private Long patientId;

    // Quan hệ 1-1 với User
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserID")
    private User user;

    // Mã bảo hiểm y tế
    @Column(name = "HealthInsuranceNumber")
    private String healthInsuranceNumber;

    // Tiền sử bệnh án
    @Column(name = "MedicalHistory", columnDefinition = "NVARCHAR(MAX)")
    private String medicalHistory;

    // Ngày tạo hồ sơ
    @Column(name = "CreatedAt")
    private LocalDate createdAt;

    // Trạng thái (ACTIVE, INACTIVE, v.v.)
    @Column(name = "Status")
    private String status;

    // Danh sách lịch hẹn của bệnh nhân
    @OneToMany(mappedBy = "patient", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Appointment> appointments;

    // Danh sách đánh giá của bệnh nhân
    @OneToMany(mappedBy = "patient", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Review> reviews;

    // Gán giá trị mặc định khi tạo mới
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDate.now();
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "ACTIVE";
        }
    }
}
