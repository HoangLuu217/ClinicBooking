package com.example.backend.mapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.example.backend.dto.SystemNotificationDTO;
import com.example.backend.model.Appointment;
import com.example.backend.model.SystemNotification;

/**
 * Mapper để convert giữa SystemNotification entity và DTO
 */
@Component
public class SystemNotificationMapper {

    /**
     * Convert Create DTO to Entity
     */
    public SystemNotification createDTOToEntity(SystemNotificationDTO.Create dto, Appointment appointment) {
        SystemNotification entity = new SystemNotification();
        entity.setTitle(dto.getTitle());
        entity.setMessage(dto.getMessage());
        entity.setAppointment(appointment);
        entity.setCreatedAt(LocalDateTime.now());
        return entity;
    }

    /**
     * Convert Entity to Response DTO
     */
    public SystemNotificationDTO.Response entityToResponseDTO(SystemNotification entity) {
        SystemNotificationDTO.Response dto = new SystemNotificationDTO.Response();
        dto.setNotificationId(entity.getNotificationId());
        dto.setTitle(entity.getTitle());
        dto.setMessage(entity.getMessage());
        dto.setCreatedAt(entity.getCreatedAt());
        
        // Set appointment info if exists
        if (entity.getAppointment() != null) {
            dto.setAppointmentId(entity.getAppointment().getAppointmentId());
            
            SystemNotificationDTO.Response.AppointmentInfo appointmentInfo = 
                new SystemNotificationDTO.Response.AppointmentInfo();
            appointmentInfo.setAppointmentId(entity.getAppointment().getAppointmentId());
            
            // Set patient name
            if (entity.getAppointment().getPatient() != null && 
                entity.getAppointment().getPatient().getUser() != null) {
                String patientName = entity.getAppointment().getPatient().getUser().getFirstName() + 
                                   " " + entity.getAppointment().getPatient().getUser().getLastName();
                appointmentInfo.setPatientName(patientName.trim());
            }
            
            // Set doctor name
            if (entity.getAppointment().getDoctor() != null && 
                entity.getAppointment().getDoctor().getUser() != null) {
                String doctorName = entity.getAppointment().getDoctor().getUser().getFirstName() + 
                                  " " + entity.getAppointment().getDoctor().getUser().getLastName();
                appointmentInfo.setDoctorName(doctorName.trim());
            }
            
            // Set appointment time and status
            if (entity.getAppointment().getStartTime() != null) {
                appointmentInfo.setAppointmentTime(entity.getAppointment().getStartTime());
            }
            if (entity.getAppointment().getStatus() != null) {
                appointmentInfo.setStatus(entity.getAppointment().getStatus().toString());
            }
            
            dto.setAppointment(appointmentInfo);
        }
        
        return dto;
    }

    /**
     * Convert List of Entities to List of Response DTOs
     */
    public List<SystemNotificationDTO.Response> entitiesToResponseDTOs(List<SystemNotification> entities) {
        return entities.stream()
                .map(this::entityToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Apply Update DTO to existing Entity
     */
    public void applyUpdateToEntity(SystemNotification entity, SystemNotificationDTO.Update dto) {
        if (dto.getTitle() != null) {
            entity.setTitle(dto.getTitle());
        }
        if (dto.getMessage() != null) {
            entity.setMessage(dto.getMessage());
        }
    }

    /**
     * Create ListResponse DTO
     */
    public SystemNotificationDTO.ListResponse createListResponse(
            List<SystemNotificationDTO.Response> notifications,
            long totalElements,
            int totalPages,
            int currentPage,
            int pageSize) {
        
        SystemNotificationDTO.ListResponse response = new SystemNotificationDTO.ListResponse();
        response.setNotifications(notifications);
        response.setTotalElements(totalElements);
        response.setTotalPages(totalPages);
        response.setCurrentPage(currentPage);
        response.setPageSize(pageSize);
        response.setHasNext(currentPage < totalPages - 1);
        response.setHasPrevious(currentPage > 0);
        
        return response;
    }
}
