package com.example.backend.model;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "clinical_referrals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ClinicalReferral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "referralid")
    private Long referralId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "appointmentid", nullable = false)
    @JsonIgnoreProperties({"referrals", "clinicalReferrals", "prescriptions", "medicalRecords", "payments", "reviews", "doctor", "patient"})
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "from_doctorid", nullable = false)
    @JsonIgnoreProperties({"referrals", "clinicalReferrals", "prescriptions", "appointments", "schedules", "reviews", "conversations", "patients", "department", "user"})
    private Doctor fromDoctor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "to_departmentid", nullable = false)
    @JsonIgnoreProperties({"doctors", "referrals", "clinicalReferrals"})
    private Department toDepartment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "performed_by_doctorid")
    @JsonIgnoreProperties({"referrals", "clinicalReferrals", "prescriptions", "appointments", "schedules", "reviews", "conversations", "patients", "department", "user"})
    private Doctor performedByDoctor;

    @Column(name = "notes", columnDefinition = "NVARCHAR(MAX)")
    private String notes;

    @Column(name = "result_text", columnDefinition = "NVARCHAR(MAX)")
    private String resultText;

    @Column(name = "result_file_url", length = 500)
    private String resultFileUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ClinicalReferralStatus status = ClinicalReferralStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Getters and Setters
    public Long getReferralId() {
        return referralId;
    }

    public void setReferralId(Long referralId) {
        this.referralId = referralId;
    }

    public Appointment getAppointment() {
        return appointment;
    }

    public void setAppointment(Appointment appointment) {
        this.appointment = appointment;
    }

    public Doctor getFromDoctor() {
        return fromDoctor;
    }

    public void setFromDoctor(Doctor fromDoctor) {
        this.fromDoctor = fromDoctor;
    }

    public Department getToDepartment() {
        return toDepartment;
    }

    public void setToDepartment(Department toDepartment) {
        this.toDepartment = toDepartment;
    }

    public Doctor getPerformedByDoctor() {
        return performedByDoctor;
    }

    public void setPerformedByDoctor(Doctor performedByDoctor) {
        this.performedByDoctor = performedByDoctor;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getResultText() {
        return resultText;
    }

    public void setResultText(String resultText) {
        this.resultText = resultText;
    }

    public String getResultFileUrl() {
        return resultFileUrl;
    }

    public void setResultFileUrl(String resultFileUrl) {
        this.resultFileUrl = resultFileUrl;
    }

    public ClinicalReferralStatus getStatus() {
        return status;
    }

    public void setStatus(ClinicalReferralStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
