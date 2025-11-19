package com.example.backend.model;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
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
@Table(name = "Prescriptions")
public class Prescription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer prescriptionId;

    @OneToOne
    @JoinColumn(name = "RecordID", nullable = false)
    private MedicalRecord medicalRecord;

    private LocalDateTime createdAt;
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String notes;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, fetch = jakarta.persistence.FetchType.LAZY)
    private List<PrescriptionItem> items;
}