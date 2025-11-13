package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Doctors")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Doctor {
    @Id
    @Column(name = "DoctorID")
    private Long doctorId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserID")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DepartmentID", nullable = false)
    private Department department;

    @Column(name = "Specialty", columnDefinition = "TEXT")
    private String specialty;
    
    @Column(name = "Bio", columnDefinition = "TEXT")
    private String bio;

    // Thêm các trường mới từ form
    @Column(name = "Degree", columnDefinition = "TEXT")
    private String degree; // Bằng cấp

    @Column(name = "WorkExperience", columnDefinition = "TEXT")
    private String workExperience; // Kinh nghiệm làm việc

    @Column(name = "WorkingHours", columnDefinition = "TEXT")
    private String workingHours; // Giờ làm việc

    @Column(name = "PracticeCertificateNumber", columnDefinition = "TEXT")
    private String practiceCertificateNumber; // Số chứng chỉ hành nghề

    @Column(name = "CitizenId", columnDefinition = "TEXT")
    private String citizenId; // Số CCCD/CMND

    @Column(name = "CreatedAt")
    private LocalDate createdAt;

    @Column(name = "Status")
    private String status;

    @OneToMany(mappedBy = "doctor", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<DoctorSchedule> schedules;

    @OneToMany(mappedBy = "doctor", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Appointment> appointments;

    @OneToMany(mappedBy = "doctor", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Review> reviews;

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