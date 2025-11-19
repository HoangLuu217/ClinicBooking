package com.example.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.MedicalRecord;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Integer> {
    List<MedicalRecord> findByAppointmentAppointmentId(Long appointmentId);
    boolean existsByAppointmentAppointmentId(Long appointmentId);
    
    @Query("SELECT DISTINCT mr FROM MedicalRecord mr " +
           "JOIN FETCH mr.appointment a " +
           "LEFT JOIN FETCH a.patient pat " +
           "LEFT JOIN FETCH pat.user " +
           "LEFT JOIN FETCH a.doctor doc " +
           "LEFT JOIN FETCH doc.user " +
           "LEFT JOIN FETCH mr.prescription p " +
           "LEFT JOIN FETCH p.items " +
           "WHERE a.doctor.doctorId = :doctorId")
    List<MedicalRecord> findByDoctorId(@Param("doctorId") Long doctorId);
    
    @Query("SELECT DISTINCT mr FROM MedicalRecord mr " +
           "JOIN FETCH mr.appointment a " +
           "LEFT JOIN FETCH a.patient pat " +
           "LEFT JOIN FETCH pat.user " +
           "LEFT JOIN FETCH a.doctor doc " +
           "LEFT JOIN FETCH doc.user " +
           "LEFT JOIN FETCH mr.prescription p " +
           "LEFT JOIN FETCH p.items")
    List<MedicalRecord> findAllWithDetails();
    
    @Query("SELECT DISTINCT mr FROM MedicalRecord mr " +
           "JOIN FETCH mr.appointment a " +
           "LEFT JOIN FETCH a.patient pat " +
           "LEFT JOIN FETCH pat.user " +
           "LEFT JOIN FETCH a.doctor doc " +
           "LEFT JOIN FETCH doc.user " +
           "LEFT JOIN FETCH mr.prescription p " +
           "LEFT JOIN FETCH p.items " +
           "WHERE a.patient.patientId = :patientId")
    List<MedicalRecord> findByPatientId(@Param("patientId") Long patientId);
}
