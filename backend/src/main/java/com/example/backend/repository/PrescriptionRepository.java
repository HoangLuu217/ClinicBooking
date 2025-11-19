package com.example.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Prescription;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Integer> {
    
    @Query("SELECT DISTINCT p FROM Prescription p " +
           "JOIN FETCH p.medicalRecord mr " +
           "JOIN FETCH mr.appointment a " +
           "LEFT JOIN FETCH a.patient pat " +
           "LEFT JOIN FETCH pat.user " +
           "LEFT JOIN FETCH p.items items " +
           "LEFT JOIN FETCH items.medicine " +
           "WHERE mr.recordId = :recordId")
    List<Prescription> findByMedicalRecordRecordId(@Param("recordId") Integer recordId);
    
    @Query("SELECT DISTINCT p FROM Prescription p " +
           "JOIN FETCH p.medicalRecord mr " +
           "JOIN FETCH mr.appointment a " +
           "LEFT JOIN FETCH a.patient pat " +
           "LEFT JOIN FETCH pat.user " +
           "LEFT JOIN FETCH p.items items " +
           "LEFT JOIN FETCH items.medicine " +
           "WHERE a.doctor.doctorId = :doctorId")
    List<Prescription> findByDoctorId(@Param("doctorId") Long doctorId);
    
    @Query("SELECT DISTINCT p FROM Prescription p " +
           "JOIN FETCH p.medicalRecord mr " +
           "JOIN FETCH mr.appointment a " +
           "LEFT JOIN FETCH a.patient pat " +
           "LEFT JOIN FETCH pat.user " +
           "LEFT JOIN FETCH p.items items " +
           "LEFT JOIN FETCH items.medicine")
    List<Prescription> findAllWithDetails();
    
    @Query("SELECT DISTINCT p FROM Prescription p " +
           "JOIN FETCH p.medicalRecord mr " +
           "JOIN FETCH mr.appointment a " +
           "LEFT JOIN FETCH a.patient pat " +
           "LEFT JOIN FETCH pat.user " +
           "LEFT JOIN FETCH p.items items " +
           "LEFT JOIN FETCH items.medicine " +
           "WHERE p.prescriptionId = :id")
    java.util.Optional<Prescription> findByIdWithDetails(@Param("id") Integer id);
}
