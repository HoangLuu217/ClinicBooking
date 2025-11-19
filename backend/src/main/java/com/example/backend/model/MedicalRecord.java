package com.example.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "MedicalRecords")
public class MedicalRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer recordId;

    @OneToOne
    @JoinColumn(name = "AppointmentID", nullable = false)
    private Appointment appointment;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String diagnosis;
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String advice;

    private LocalDateTime createdAt;

    @OneToOne(mappedBy = "medicalRecord")
    private Prescription prescription;
}