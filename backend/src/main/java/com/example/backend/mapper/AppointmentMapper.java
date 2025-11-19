package com.example.backend.mapper;

import org.springframework.stereotype.Component;

import com.example.backend.dto.AppointmentDTO;
import com.example.backend.model.Appointment;
import com.example.backend.model.Doctor;
import com.example.backend.model.DoctorSchedule;
import com.example.backend.model.Patient;

@Component
public class AppointmentMapper {

    public Appointment createDTOToEntity(AppointmentDTO.Create dto, Patient patient, Doctor doctor, DoctorSchedule schedule) {
    Appointment entity = new Appointment();
    entity.setPatient(patient);
    entity.setDoctor(doctor);
    entity.setSchedule(schedule);
    entity.setStartTime(dto.getStartTime());
    entity.setEndTime(dto.getEndTime());
    entity.setNotes(dto.getNotes());
    entity.setFee(dto.getFee());
    
    // Set status: Nếu không có patient thì là "Available" (slot trống)
    // Nếu có patient thì là "Scheduled" (đã đặt)
    if (patient == null) {
        entity.setStatus("Available");
    } else {
        entity.setStatus("Scheduled");
    }
    
    return entity;
    }

    public void applyUpdateToEntity(Appointment entity, AppointmentDTO.Update dto) {
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
        if (dto.getFee() != null) {
            entity.setFee(dto.getFee());
        }
    }

    public AppointmentDTO.Response entityToResponseDTO(Appointment entity) {
        AppointmentDTO.Response dto = new AppointmentDTO.Response();
        dto.setAppointmentId(entity.getAppointmentId() != null ? entity.getAppointmentId().longValue() : null);
        if (entity.getPatient() != null) {
            dto.setPatientId(entity.getPatient().getPatientId() != null ? entity.getPatient().getPatientId().longValue() : null);
            if (entity.getPatient().getUser() != null) {
                String firstName = entity.getPatient().getUser().getFirstName() != null ? entity.getPatient().getUser().getFirstName() : "";
                String lastName = entity.getPatient().getUser().getLastName() != null ? entity.getPatient().getUser().getLastName() : "";
                dto.setPatientName((firstName + " " + lastName).trim());
            } else {
                dto.setPatientName("");
            }
        } else {
            dto.setPatientId(null);
            dto.setPatientName("");
        }
        if (entity.getDoctor() != null) {
            dto.setDoctorId(entity.getDoctor().getDoctorId() != null ? entity.getDoctor().getDoctorId() : null);
            if (entity.getDoctor().getUser() != null) {
                String firstName = entity.getDoctor().getUser().getFirstName() != null ? entity.getDoctor().getUser().getFirstName() : "";
                String lastName = entity.getDoctor().getUser().getLastName() != null ? entity.getDoctor().getUser().getLastName() : "";
                dto.setDoctorName((firstName + " " + lastName).trim());
            } else {
                dto.setDoctorName("");
            }
        } else {
            dto.setDoctorId(null);
            dto.setDoctorName("");
        }
        dto.setScheduleId(entity.getSchedule() != null ? entity.getSchedule().getScheduleId() : null);
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setStatus(entity.getStatus());
        dto.setNotes(entity.getNotes());
        dto.setFee(entity.getFee());
        return dto;
    }
}


