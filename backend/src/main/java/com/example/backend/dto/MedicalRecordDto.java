package com.example.backend.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotNull;

public class MedicalRecordDto {
    private Integer recordId;
    
    @NotNull(message = "Appointment ID is required")
    private Long appointmentId;
    
    private String diagnosis;
    private String advice;
    private LocalDateTime createdAt;
    
    private PrescriptionDto prescription;
    
    // Additional fields for display
    private Long patientId;
    private String patientName;
    private String patientPhone;
    private Integer patientAge;
    private String patientGender;
    private String patientDob;
    private String patientAddress;
    private Long doctorId;
    private String doctorName;
    private LocalDateTime appointmentDate;

    // Constructors
    public MedicalRecordDto() {}

    // Constructor for response (with all fields including ID)
    public MedicalRecordDto(Integer recordId, Long appointmentId, String diagnosis, String advice, LocalDateTime createdAt) {
        this.recordId = recordId;
        this.appointmentId = appointmentId;
        this.diagnosis = diagnosis;
        this.advice = advice;
        this.createdAt = createdAt;
    }

    // Constructor for request (without ID and createdAt for new records)
    public MedicalRecordDto(Long appointmentId, String diagnosis, String advice) {
        this.appointmentId = appointmentId;
        this.diagnosis = diagnosis;
        this.advice = advice;
    }

    // Getters and Setters
    public Integer getRecordId() { return recordId; }
    public void setRecordId(Integer recordId) { this.recordId = recordId; }

    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getAdvice() { return advice; }
    public void setAdvice(String advice) { this.advice = advice; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public PrescriptionDto getPrescription() { return prescription; }
    public void setPrescription(PrescriptionDto prescription) { this.prescription = prescription; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientPhone() { return patientPhone; }
    public void setPatientPhone(String patientPhone) { this.patientPhone = patientPhone; }

    public Integer getPatientAge() { return patientAge; }
    public void setPatientAge(Integer patientAge) { this.patientAge = patientAge; }

    public String getPatientGender() { return patientGender; }
    public void setPatientGender(String patientGender) { this.patientGender = patientGender; }

    public String getPatientDob() { return patientDob; }
    public void setPatientDob(String patientDob) { this.patientDob = patientDob; }

    public String getPatientAddress() { return patientAddress; }
    public void setPatientAddress(String patientAddress) { this.patientAddress = patientAddress; }

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public LocalDateTime getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(LocalDateTime appointmentDate) { this.appointmentDate = appointmentDate; }
}