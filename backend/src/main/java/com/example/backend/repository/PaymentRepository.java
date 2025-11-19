package com.example.backend.repository;

import com.example.backend.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    
    Optional<Payment> findByPayOSPaymentId(String payOSPaymentId);
    
    Optional<Payment> findByPayOSCode(String payOSCode);
    
    List<Payment> findByAppointment_AppointmentId(Long appointmentId);
    
    @Query("SELECT p FROM Payment p WHERE p.appointment.patient.patientId = :patientId")
    List<Payment> findByPatientId(@Param("patientId") Long patientId);
    
    @Query("SELECT p FROM Payment p WHERE p.appointment.doctor.doctorId = :doctorId")
    List<Payment> findByDoctorId(@Param("doctorId") Long doctorId);
    
    List<Payment> findByStatus(Payment.PaymentStatus status);
    
    @Query("SELECT p FROM Payment p WHERE p.status = :status AND p.createdAt >= :startDate AND p.createdAt <= :endDate")
    List<Payment> findByStatusAndDateRange(
        @Param("status") Payment.PaymentStatus status,
        @Param("startDate") java.time.LocalDateTime startDate,
        @Param("endDate") java.time.LocalDateTime endDate
    );
}
