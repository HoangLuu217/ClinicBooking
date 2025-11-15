package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "DoctorSchedules")
public class DoctorSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "scheduleid")
    private Long scheduleId;

    @ManyToOne
    @JoinColumn(name = "doctorid", nullable = false)
    private Doctor doctor;

    @Column(name = "workdate", nullable = false)
    private LocalDate workDate;

    @Column(name = "starttime", nullable = false)
    private LocalTime startTime;

    @Column(name = "endtime", nullable = false)
    private LocalTime endTime;

    @Column(name = "status", columnDefinition = "VARCHAR(20) DEFAULT 'Available'")
    private String status = "Available";

    @Column(name = "notes")
    private String notes;
}