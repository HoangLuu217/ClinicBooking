package com.example.backend.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public class MedicineDto {
    private Integer medicineId;
    
    @NotBlank(message = "Medicine name is required")
    private String name;
    
    private String strength;
    
    @Positive(message = "Unit price must be positive")
    private BigDecimal unitPrice;
    
    private String note;

    // Constructors
    public MedicineDto() {}

    // Constructor for response (with ID)
    public MedicineDto(Integer medicineId, String name, String strength, BigDecimal unitPrice, String note) {
        this.medicineId = medicineId;
        this.name = name;
        this.strength = strength;
        this.unitPrice = unitPrice;
        this.note = note;
    }

    // Constructor for request (without ID)
    public MedicineDto(String name, String strength, BigDecimal unitPrice, String note) {
        this.name = name;
        this.strength = strength;
        this.unitPrice = unitPrice;
        this.note = note;
    }

    // Getters and Setters
    public Integer getMedicineId() { return medicineId; }
    public void setMedicineId(Integer medicineId) { this.medicineId = medicineId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStrength() { return strength; }
    public void setStrength(String strength) { this.strength = strength; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}