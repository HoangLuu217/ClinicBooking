package com.example.backend.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.backend.model.DoctorSchedule;

public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, Long> {
    List<DoctorSchedule> findByDoctor_DoctorId(Long doctorId);

    List<DoctorSchedule> findByDoctor_DoctorIdAndWorkDate(Long doctorId, LocalDate workDate);

    List<DoctorSchedule> findByDoctor_DoctorIdAndStatus(Long doctorId, String status);

    @Query("SELECT ds FROM DoctorSchedule ds WHERE ds.doctor.doctorId = :doctorId AND ds.workDate BETWEEN :start AND :end")
    List<DoctorSchedule> findByDoctorAndDateRange(@Param("doctorId") Long doctorId,
                                                  @Param("start") LocalDate start,
                                                  @Param("end") LocalDate end);

    @Query("SELECT COUNT(ds) > 0 FROM DoctorSchedule ds WHERE ds.doctor.doctorId = :doctorId AND ds.workDate = :workDate AND ((:startTime < ds.endTime) AND (:endTime > ds.startTime))")
    boolean existsOverlap(@Param("doctorId") Long doctorId,
                          @Param("workDate") LocalDate workDate,
                          @Param("startTime") java.time.LocalTime startTime,
                          @Param("endTime") java.time.LocalTime endTime);
}
