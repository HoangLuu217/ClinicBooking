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
        DoctorScheduleDTO.Response dto = new DoctorScheduleDTO.Response();
        dto.setScheduleId(entity.getScheduleId());
        dto.setDoctorId(entity.getDoctor() != null ? entity.getDoctor().getDoctorId() : null);
        dto.setDoctorName(entity.getDoctor() != null && entity.getDoctor().getUser() != null
                ? entity.getDoctor().getUser().getFirstName() + " " + entity.getDoctor().getUser().getLastName()
                : null);
        dto.setWorkDate(entity.getWorkDate());
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setStatus(entity.getStatus());
        dto.setNotes(entity.getNotes());
        return dto;
    }
}


