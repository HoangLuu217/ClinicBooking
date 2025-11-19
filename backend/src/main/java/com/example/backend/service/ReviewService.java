package com.example.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.ReviewDTO;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.ReviewMapper;
import com.example.backend.model.Appointment;
import com.example.backend.model.Doctor;
import com.example.backend.model.Patient;
import com.example.backend.model.Review;
import com.example.backend.repository.AppointmentRepository;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.PatientRepository;
import com.example.backend.repository.ReviewRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final ReviewMapper reviewMapper;

    @Transactional(readOnly = true)
    public List<ReviewDTO.Response> getAll() {
        return reviewRepository.findAll()
                .stream()
                .map(reviewMapper::entityToResponseDTO)
                .toList();
    }

    public ReviewDTO.Response create(ReviewDTO.Create dto) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new NotFoundException("Patient not found with ID: " + dto.getPatientId()));
        Doctor doctor = doctorRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new NotFoundException("Doctor not found with ID: " + dto.getDoctorId()));
        Appointment appointment = appointmentRepository.findById(dto.getAppointmentId())
                .orElseThrow(() -> new NotFoundException("Appointment not found with ID: " + dto.getAppointmentId()));

        if (appointment.getPatient() == null
                || appointment.getPatient().getPatientId() == null
                || !appointment.getPatient().getPatientId().equals(dto.getPatientId())) {
            throw new ConflictException("Appointment does not belong to the provided patient");
        }

        if (appointment.getDoctor() == null
                || appointment.getDoctor().getDoctorId() == null
                || !appointment.getDoctor().getDoctorId().equals(dto.getDoctorId())) {
            throw new ConflictException("Appointment does not belong to the provided doctor");
        }

        reviewRepository.findByAppointment_AppointmentId(dto.getAppointmentId())
                .ifPresent(existing -> {
                    throw new ConflictException("This appointment has already been reviewed");
                });

        Review entity = reviewMapper.createDTOToEntity(dto, patient, doctor, appointment);
        Review saved = reviewRepository.save(entity);
        return reviewMapper.entityToResponseDTO(saved);
    }

    @Transactional(readOnly = true)
    public ReviewDTO.Response getById(Long reviewId) {
        Review entity = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found with ID: " + reviewId));
        return reviewMapper.entityToResponseDTO(entity);
    }

    @Transactional(readOnly = true)
    public ReviewDTO.Response getByAppointment(Long appointmentId) {
        Review entity = reviewRepository.findByAppointment_AppointmentId(appointmentId)
                .orElseThrow(() -> new NotFoundException("Review not found for appointment ID: " + appointmentId));
        return reviewMapper.entityToResponseDTO(entity);
    }

    @Transactional(readOnly = true)
    public List<ReviewDTO.Response> getByPatient(Long patientId) {
        return reviewRepository.findByPatient_PatientId(patientId)
                .stream()
                .map(reviewMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewDTO.Response> getByDoctor(Long doctorId) {
        return reviewRepository.findByDoctor_DoctorId(doctorId)
                .stream()
                .map(reviewMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewDTO.Response> getActiveReviewsByDoctor(Long doctorId) {
        return reviewRepository.findActiveReviewsByDoctor(doctorId)
                .stream()
                .map(reviewMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Double getAverageRatingByDoctor(Long doctorId) {
        return reviewRepository.getAverageRatingByDoctor(doctorId);
    }

    @Transactional(readOnly = true)
    public Long getReviewCountByDoctor(Long doctorId) {
        return reviewRepository.getReviewCountByDoctor(doctorId);
    }

    public ReviewDTO.Response update(Long reviewId, ReviewDTO.Update dto) {
        Review entity = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found with ID: " + reviewId));
        reviewMapper.applyUpdateToEntity(entity, dto);
        Review saved = reviewRepository.save(entity);
        return reviewMapper.entityToResponseDTO(saved);
    }

    public void delete(Long reviewId) {
        if (!reviewRepository.existsById(reviewId)) {
            throw new NotFoundException("Review not found with ID: " + reviewId);
        }
        reviewRepository.deleteById(reviewId);
    }

    public ReviewDTO.Response deactivateReview(Long reviewId) {
        Review entity = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found with ID: " + reviewId));

        entity.setStatus("INACTIVE");
        Review saved = reviewRepository.save(entity);
        return reviewMapper.entityToResponseDTO(saved);
    }
}
