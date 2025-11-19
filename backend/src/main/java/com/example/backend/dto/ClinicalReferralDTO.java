package com.example.backend.dto;

import java.time.LocalDateTime;

import com.example.backend.model.ClinicalReferralStatus;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClinicalReferralDTO {
    private Long referralId;
    private ClinicalReferralStatus status;
    private String notes;
    private String resultText;
    private String resultFileUrl;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    
    // Appointment info
    private Long appointmentId;
    
    // From Doctor info
    private Long fromDoctorId;
    private String fromDoctorName;
    private String fromDoctorSpecialty;
    
    // To Department info
    private Long toDepartmentId;
    private String toDepartmentName;
    
    // Performed By Doctor info (nullable)
    private Long performedByDoctorId;
    private String performedByDoctorName;
    
    // Patient info
    private Long patientId;
    private String patientName;
    private String patientPhone;
}
