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
    @Column(name = "appointment_id")
    private Long appointmentId;

    @ManyToOne
    @JoinColumn(name = "patientid", nullable = true)
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "doctorid", nullable = false)
    private Doctor doctor;

    @ManyToOne
    @JoinColumn(name = "scheduleid")
    private DoctorSchedule schedule;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(columnDefinition = "VARCHAR(30) DEFAULT 'Scheduled'")
    private String status = "Scheduled";

    private String notes;

    @Column(name = "fee")
    private BigDecimal fee;

    @OneToOne(mappedBy = "appointment")
    private MedicalRecord medicalRecord;

    @OneToOne(mappedBy = "appointment")
    private Payment payment;

    @OneToMany(mappedBy = "appointment", fetch = FetchType.LAZY)
    private List<ClinicalReferral> clinicalReferrals;
}