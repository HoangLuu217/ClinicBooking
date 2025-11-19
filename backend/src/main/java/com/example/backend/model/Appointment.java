package com.example.backend.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Appointments")
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long appointmentId;

    @ManyToOne
    @JoinColumn(name = "PatientID", nullable = true)
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "DoctorID", nullable = false)
    private Doctor doctor;

    @ManyToOne
    @JoinColumn(name = "ScheduleID")
    private DoctorSchedule schedule;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Column(columnDefinition = "NVARCHAR(30) DEFAULT 'Scheduled'")
    private String status = "Scheduled";

    private String notes;

    @Column(name = "Fee")
    private BigDecimal fee;

    @OneToOne(mappedBy = "appointment")
    private MedicalRecord medicalRecord;

    @OneToOne(mappedBy = "appointment")
    private Payment payment;

    @OneToMany(mappedBy = "appointment", fetch = FetchType.LAZY)
    private List<ClinicalReferral> clinicalReferrals;
}