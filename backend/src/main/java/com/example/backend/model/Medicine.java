package com.example.backend.model;

import java.math.BigDecimal;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Medicines")
public class Medicine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer medicineId;

    @Column(nullable = false, unique = true)
    private String name;

    private String strength;
    private BigDecimal unitPrice;
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String note;

    @OneToMany(mappedBy = "medicine")
    private List<PrescriptionItem> prescriptionItems;
}