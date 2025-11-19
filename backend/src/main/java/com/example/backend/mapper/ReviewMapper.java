package com.example.backend.mapper;

import org.springframework.stereotype.Component;

import com.example.backend.dto.ReviewDTO;
import com.example.backend.model.Review;
import com.example.backend.model.Doctor;
import com.example.backend.model.Patient;
import com.example.backend.model.Appointment;

@Component
public class ReviewMapper {

    public Review createDTOToEntity(ReviewDTO.Create dto, Patient patient, Doctor doctor, Appointment appointment) {
        Review entity = new Review();
        entity.setPatient(patient);
        entity.setDoctor(doctor);
        entity.setAppointment(appointment);
        entity.setRating(dto.getRating());
        entity.setComment(dto.getComment());
        entity.setCreatedAt(java.time.LocalDateTime.now());
        entity.setStatus("ACTIVE");
        return entity;
    }

    public void applyUpdateToEntity(Review entity, ReviewDTO.Update dto) {
        if (dto.getRating() != null) {
            entity.setRating(dto.getRating());
        }
        if (dto.getComment() != null) {
            entity.setComment(dto.getComment());
        }
        if (dto.getStatus() != null) {
            entity.setStatus(dto.getStatus());
        }
    }

    public ReviewDTO.Response entityToResponseDTO(Review entity) {
        ReviewDTO.Response dto = new ReviewDTO.Response();
        dto.setReviewId(entity.getReviewId());
        dto.setPatientId(entity.getPatient() != null ? entity.getPatient().getPatientId() : null);
        dto.setPatientName(entity.getPatient() != null && entity.getPatient().getUser() != null
                ? entity.getPatient().getUser().getFirstName() + " " + entity.getPatient().getUser().getLastName()
                : null);
        dto.setDoctorId(entity.getDoctor() != null ? entity.getDoctor().getDoctorId() : null);
        dto.setDoctorName(entity.getDoctor() != null && entity.getDoctor().getUser() != null
                ? entity.getDoctor().getUser().getFirstName() + " " + entity.getDoctor().getUser().getLastName()
                : null);
        dto.setAppointmentId(entity.getAppointment() != null ? entity.getAppointment().getAppointmentId() : null);
        dto.setRating(entity.getRating());
        dto.setComment(entity.getComment());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setStatus(entity.getStatus());
        return dto;
    }
}

