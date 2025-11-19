package com.example.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserWithPatientInfoDTO {
    
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String avatarUrl;
    private LocalDateTime createdAt;
    private String status;
    private RoleDTO role;
    
    // Thông tin bệnh nhân (chỉ có khi role = PATIENT)
    private String healthInsuranceNumber;
    private String medicalHistory;
    private LocalDate patientCreatedAt;
    private String patientStatus;
    
    // Thông tin bác sĩ (chỉ có khi role = DOCTOR)
    private String bio;
    private String specialty;
    private Long departmentId;
    private String departmentName;
    private String doctorStatus;
    
    // Thông tin quản trị viên (chỉ có khi role = ADMIN)
    private String adminLevel;
    private String adminPermissions;
    private String adminNotes;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleDTO {
        private Long id;
        private String name;
        private String description;
    }
}
