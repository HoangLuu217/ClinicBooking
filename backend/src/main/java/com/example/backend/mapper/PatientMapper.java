package com.example.backend.mapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.example.backend.dto.PatientDTO;
import com.example.backend.model.Patient;
import com.example.backend.model.User;

@Component
public class PatientMapper {

    @Autowired
    private UserMapper userMapper;

    public Patient createDTOToEntity(PatientDTO.Create createDTO, User user) {
        Patient patient = new Patient();
        patient.setPatientId(user.getId());
        patient.setUser(user);
        patient.setHealthInsuranceNumber(createDTO.getHealthInsuranceNumber());
        patient.setMedicalHistory(createDTO.getMedicalHistory());
        patient.setStatus("ACTIVE");
        return patient;
    }

    public PatientDTO.Response entityToResponseDTO(Patient patient) {
        PatientDTO.Response dto = new PatientDTO.Response();
        dto.setPatientId(patient.getPatientId());
        dto.setHealthInsuranceNumber(patient.getHealthInsuranceNumber());
        dto.setMedicalHistory(patient.getMedicalHistory());
        dto.setCreatedAt(patient.getCreatedAt());
        dto.setStatus(patient.getStatus());

        if (patient.getUser() != null) {
            dto.setUser(userMapper.entityToResponseDTO(patient.getUser()));
        }

        return dto;
    }

    public void updateEntityFromDTO(Patient patient, PatientDTO.Update updateDTO) {
        if (updateDTO.getHealthInsuranceNumber() != null) {
            patient.setHealthInsuranceNumber(updateDTO.getHealthInsuranceNumber());
        }
        if (updateDTO.getMedicalHistory() != null) {
            patient.setMedicalHistory(updateDTO.getMedicalHistory());
        }
        if (updateDTO.getStatus() != null) {
            patient.setStatus(updateDTO.getStatus());
        }
    }
}
