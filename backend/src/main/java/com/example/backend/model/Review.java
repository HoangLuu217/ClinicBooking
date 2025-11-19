package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Reviews")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewId;

    @ManyToOne
    @JoinColumn(name = "PatientID", nullable = false)
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "DoctorID", nullable = false)
    private Doctor doctor;

    @ManyToOne
    @JoinColumn(name = "AppointmentID", nullable = false)
    private Appointment appointment;

    private Integer rating;
    @Column(columnDefinition = "NVARCHAR(255)")
    private String comment;
    private LocalDateTime createdAt;

    @Column(columnDefinition = "NVARCHAR(20) DEFAULT 'ACTIVE'")
    private String status = "ACTIVE";
}
