package com.example.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.backend.model.Appointment;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    @Query("SELECT a FROM Appointment a " +
           "LEFT JOIN FETCH a.patient p " +
           "LEFT JOIN FETCH p.user " +
           "LEFT JOIN FETCH a.doctor d " +
           "LEFT JOIN FETCH d.user " +
           "LEFT JOIN FETCH a.schedule " +
           "WHERE d.doctorId = :doctorId")
    List<Appointment> findByDoctor_DoctorId(@Param("doctorId") Long doctorId);

    @Query("SELECT a FROM Appointment a " +
        "LEFT JOIN FETCH a.patient p " +
        "LEFT JOIN FETCH p.user " +
        "LEFT JOIN FETCH a.doctor d " +
        "LEFT JOIN FETCH d.user " +
           "LEFT JOIN FETCH a.schedule " +
           "WHERE d.doctorId = :doctorId " +
           "AND a.startTime >= :startDate AND a.startTime <= :endDate")
    List<Appointment> findByDoctor_DoctorIdAndDateRange(@Param("doctorId") Long doctorId,
                                                         @Param("startDate") LocalDateTime startDate,
                                                         @Param("endDate") LocalDateTime endDate);

    @Query("SELECT a FROM Appointment a " +
        "LEFT JOIN FETCH a.patient p " +
        "LEFT JOIN FETCH p.user " +
        "LEFT JOIN FETCH a.doctor d " +
        "LEFT JOIN FETCH d.user " +
        "WHERE p.patientId = :patientId")
    List<Appointment> findByPatient_PatientId(@Param("patientId") Long patientId);

    @Query("SELECT a FROM Appointment a WHERE a.doctor.doctorId = :doctorId AND a.startTime BETWEEN :start AND :end")
    List<Appointment> findDoctorAppointmentsInRange(@Param("doctorId") Long doctorId,
                                                    @Param("start") LocalDateTime start,
                                                    @Param("end") LocalDateTime end);

    List<Appointment> findBySchedule_ScheduleId(Long scheduleId);

    @Query("SELECT a FROM Appointment a " +
           "LEFT JOIN FETCH a.schedule " +
           "WHERE a.schedule.scheduleId IN :scheduleIds")
    List<Appointment> findBySchedule_ScheduleIdIn(@Param("scheduleIds") List<Long> scheduleIds);

    @Query("SELECT a FROM Appointment a " +
           "LEFT JOIN FETCH a.patient p " +
           "LEFT JOIN FETCH p.user " +
           "LEFT JOIN FETCH a.doctor d " +
           "LEFT JOIN FETCH d.user " +
           "LEFT JOIN FETCH a.schedule " +
           "WHERE p.patientId = :patientId AND d.doctorId = :doctorId")
    List<Appointment> findByPatientIdAndDoctorId(@Param("patientId") Long patientId, @Param("doctorId") Long doctorId);
}


