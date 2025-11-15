package com.example.backend.mapper;

import org.springframework.stereotype.Component;

import com.example.backend.dto.DoctorScheduleDTO;
import com.example.backend.model.Doctor;
import com.example.backend.model.DoctorSchedule;

@Component
public class DoctorScheduleMapper {

    public DoctorSchedule createDTOToEntity(DoctorScheduleDTO.Create dto, Doctor doctor) {
        DoctorSchedule entity = new DoctorSchedule();
        entity.setDoctor(doctor);
        entity.setWorkDate(dto.getWorkDate());
        entity.setStartTime(dto.getStartTime());
        entity.setEndTime(dto.getEndTime());
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            entity.setStatus(dto.getStatus());
        }
        entity.setNotes(dto.getNotes());
        return entity;
    }

    public void applyUpdateToEntity(DoctorSchedule entity, DoctorScheduleDTO.Update dto) {
        if (dto.getWorkDate() != null) {
            entity.setWorkDate(dto.getWorkDate());
        }
        if (dto.getStartTime() != null) {
            entity.setStartTime(dto.getStartTime());
        }
        if (dto.getEndTime() != null) {
            entity.setEndTime(dto.getEndTime());
        }
        if (dto.getStatus() != null) {
            entity.setStatus(dto.getStatus());
        }
        if (dto.getNotes() != null) {
            entity.setNotes(dto.getNotes());
        }
    }

    public DoctorScheduleDTO.Response entityToResponseDTO(DoctorSchedule entity) {
        if (entity == null) {
            throw new IllegalArgumentException("DoctorSchedule entity cannot be null");
        }
        
        DoctorScheduleDTO.Response dto = new DoctorScheduleDTO.Response();
        dto.setScheduleId(entity.getScheduleId());
        
        // Safe null checks
        if (entity.getDoctor() != null) {
            dto.setDoctorId(entity.getDoctor().getDoctorId());
            
            // Build doctor name safely
            if (entity.getDoctor().getUser() != null) {
                String firstName = entity.getDoctor().getUser().getFirstName() != null 
                    ? entity.getDoctor().getUser().getFirstName() : "";
                String lastName = entity.getDoctor().getUser().getLastName() != null 
                    ? entity.getDoctor().getUser().getLastName() : "";
                dto.setDoctorName((firstName + " " + lastName).trim());
            } else {
                dto.setDoctorName(null);
            }
        } else {
            dto.setDoctorId(null);
            dto.setDoctorName(null);
        }
        
        dto.setWorkDate(entity.getWorkDate());
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setStatus(entity.getStatus());
        dto.setNotes(entity.getNotes());
        return dto;
    }
}


