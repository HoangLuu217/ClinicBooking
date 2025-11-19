package com.example.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "PrescriptionItems")
public class PrescriptionItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer itemId;

    @ManyToOne
    @JoinColumn(name = "PrescriptionID", nullable = false)
    private Prescription prescription;

    @ManyToOne
    @JoinColumn(name = "MedicineID", nullable = false)
    private Medicine medicine;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String dosage;
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String duration;
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String note;
    
    @Column(name = "Quantity")
    private Integer quantity;
}