package com.example.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.ClinicalReferral;
import com.example.backend.model.ClinicalReferralStatus;

@Repository
public interface ClinicalReferralRepository extends JpaRepository<ClinicalReferral, Long> {
    
    // Test with native SQL query to bypass JPA mapping issues
    @Query(value = "SELECT * FROM dbo.clinical_referrals WHERE to_departmentid = :departmentId ORDER BY created_at DESC", 
           nativeQuery = true)
    List<ClinicalReferral> findByDepartmentIdNative(@Param("departmentId") Long departmentId);
    
    @Query("SELECT r FROM ClinicalReferral r " +
           "LEFT JOIN FETCH r.toDepartment " +
           "LEFT JOIN FETCH r.fromDoctor fd " +
           "LEFT JOIN FETCH fd.user " +
           "LEFT JOIN FETCH fd.department " +
           "LEFT JOIN FETCH r.appointment a " +
           "LEFT JOIN FETCH a.patient p " +
           "LEFT JOIN FETCH p.user " +
           "WHERE r.toDepartment.id = :departmentId " +
           "ORDER BY r.createdAt DESC")
    List<ClinicalReferral> findByToDepartment_IdOrderByCreatedAtDesc(@Param("departmentId") Long departmentId);
    
    @Query("SELECT r FROM ClinicalReferral r " +
           "LEFT JOIN FETCH r.toDepartment " +
           "LEFT JOIN FETCH r.fromDoctor fd " +
           "LEFT JOIN FETCH fd.user " +
           "LEFT JOIN FETCH fd.department " +
           "LEFT JOIN FETCH r.appointment a " +
           "LEFT JOIN FETCH a.patient p " +
           "LEFT JOIN FETCH p.user " +
           "WHERE r.toDepartment.id = :departmentId AND r.status = :status " +
           "ORDER BY r.createdAt DESC")
    List<ClinicalReferral> findByToDepartment_IdAndStatusOrderByCreatedAtDesc(
        @Param("departmentId") Long departmentId, 
        @Param("status") ClinicalReferralStatus status
    );
    
    List<ClinicalReferral> findByAppointment_AppointmentIdOrderByCreatedAtDesc(Long appointmentId);
    
    List<ClinicalReferral> findByFromDoctor_DoctorIdOrderByCreatedAtDesc(Long doctorId);
    
    List<ClinicalReferral> findByStatusOrderByCreatedAtDesc(ClinicalReferralStatus status);
    
    @Query("SELECT r FROM ClinicalReferral r WHERE r.appointment.patient.patientId = :patientId ORDER BY r.createdAt DESC")
    List<ClinicalReferral> findByPatientId(@Param("patientId") Long patientId);
    
    @Query("SELECT COUNT(r) FROM ClinicalReferral r WHERE r.fromDoctor.doctorId = :doctorId AND r.status = 'PENDING'")
    Long countPendingByDoctorId(@Param("doctorId") Long doctorId);
    
    @Query("SELECT COUNT(r) FROM ClinicalReferral r WHERE r.fromDoctor.doctorId = :doctorId " +
           "AND r.status = 'DONE' AND CAST(r.completedAt AS date) = CURRENT_DATE")
    Long countCompletedTodayByDoctorId(@Param("doctorId") Long doctorId);
}
