package com.example.backend.dto;

import jakarta.validation.constraints.NotNull;

public class PrescriptionItemDto {
    private Long itemId;
    private Long prescriptionId;
    
    @NotNull(message = "Medicine ID is required")
    private Long medicineId;
    
    private String medicineName;
    private String dosage;
    private String duration;
    private String note;
    private Double price; // Medicine unit price
    private Integer quantity; // Quantity for display

    // Constructors
    public PrescriptionItemDto() {}

    // Constructor for response (with all fields)
    public PrescriptionItemDto(Long itemId, Long prescriptionId, Long medicineId, String medicineName, 
                             String dosage, String duration, String note) {
        this.itemId = itemId;
        this.prescriptionId = prescriptionId;
        this.medicineId = medicineId;
        this.medicineName = medicineName;
        this.dosage = dosage;
        this.duration = duration;
        this.note = note;
    }

    // Constructor for request (without itemId, prescriptionId, medicineName)
    public PrescriptionItemDto(Long medicineId, String dosage, String duration, String note) {
        this.medicineId = medicineId;
        this.dosage = dosage;
        this.duration = duration;
        this.note = note;
    }

    // Getters and Setters
    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public Long getPrescriptionId() { return prescriptionId; }
    public void setPrescriptionId(Long prescriptionId) { this.prescriptionId = prescriptionId; }

    public Long getMedicineId() { return medicineId; }
    public void setMedicineId(Long medicineId) { this.medicineId = medicineId; }

    public String getMedicineName() { return medicineName; }
    public void setMedicineName(String medicineName) { this.medicineName = medicineName; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}