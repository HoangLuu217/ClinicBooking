package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.Valid;

public class PrescriptionDto {
    private Long prescriptionId;
    
    // recordId is optional now; if missing the service may create a medical record
    private Long recordId;
    // Optional appointmentId: when provided and recordId is null, backend can create a MedicalRecord for this appointment
    private Long appointmentId;
    
    private String notes;
    private String advice; // Lời khuyên của bác sĩ
    private LocalDateTime createdAt;
    
    @Valid
    private List<PrescriptionItemDto> items;
    
    // Additional fields for display
    private Long patientId;
    private String patientName;
    private Long doctorId;
    private String doctorName;
    private String diagnosis; // From MedicalRecord
    private Double totalAmount; // Calculated from items
    private LocalDateTime createdDate; // Alias for createdAt for frontend compatibility

    // Constructors
    public PrescriptionDto() {}

    // Constructor for response (with all fields)
    public PrescriptionDto(Long prescriptionId, Long recordId, String notes, LocalDateTime createdAt, List<PrescriptionItemDto> items) {
        this.prescriptionId = prescriptionId;
        this.recordId = recordId;
        this.notes = notes;
        this.createdAt = createdAt;
        this.items = items;
    }

    // Constructor for request (without prescriptionId and createdAt)
    public PrescriptionDto(Long recordId, String notes, List<PrescriptionItemDto> items) {
        this.recordId = recordId;
        this.notes = notes;
        this.items = items;
    }

    // Constructor allowing appointmentId (for requests where recordId is not present)
    public PrescriptionDto(Long appointmentId, String notes, List<PrescriptionItemDto> items, boolean useAppointment) {
        this.appointmentId = appointmentId;
        this.notes = notes;
        this.items = items;
    }

    // Getters and Setters
    public Long getPrescriptionId() { return prescriptionId; }
    public void setPrescriptionId(Long prescriptionId) { this.prescriptionId = prescriptionId; }

    public Long getRecordId() { return recordId; }
    public void setRecordId(Long recordId) { this.recordId = recordId; }

    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getAdvice() { return advice; }
    public void setAdvice(String advice) { this.advice = advice; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<PrescriptionItemDto> getItems() { return items; }
    public void setItems(List<PrescriptionItemDto> items) { this.items = items; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public LocalDateTime getCreatedDate() { return createdAt != null ? createdAt : createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
}