package com.example.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.backend.model.Review;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByPatient_PatientId(Long patientId);
    List<Review> findByDoctor_DoctorId(Long doctorId);
    List<Review> findByStatus(String status);
    
    @Query("SELECT r FROM Review r WHERE r.doctor.doctorId = :doctorId AND r.status = 'ACTIVE'")
    List<Review> findActiveReviewsByDoctor(@Param("doctorId") Long doctorId);
    
    @Query("SELECT r FROM Review r WHERE r.patient.patientId = :patientId AND r.status = 'ACTIVE'")
    List<Review> findActiveReviewsByPatient(@Param("patientId") Long patientId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.doctor.doctorId = :doctorId AND r.status = 'ACTIVE'")
    Double getAverageRatingByDoctor(@Param("doctorId") Long doctorId);
    
    @Query("SELECT COUNT(r) FROM Review r WHERE r.doctor.doctorId = :doctorId AND r.status = 'ACTIVE'")
    Long getReviewCountByDoctor(@Param("doctorId") Long doctorId);
    
    Optional<Review> findByAppointment_AppointmentId(Long appointmentId);
}
