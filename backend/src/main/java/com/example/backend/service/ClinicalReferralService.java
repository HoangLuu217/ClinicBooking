package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.ClinicalReferralDTO;
import com.example.backend.dto.CreateReferralRequest;
import com.example.backend.dto.SystemNotificationDTO;
import com.example.backend.dto.UpdateResultRequest;
import com.example.backend.exception.NotFoundException;
import com.example.backend.model.Appointment;
import com.example.backend.model.ClinicalReferral;
import com.example.backend.model.ClinicalReferralStatus;
import com.example.backend.model.Department;
import com.example.backend.model.Doctor;
import com.example.backend.repository.AppointmentRepository;
import com.example.backend.repository.ClinicalReferralRepository;
import com.example.backend.repository.DepartmentRepository;
import com.example.backend.repository.DoctorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClinicalReferralService {

    private final ClinicalReferralRepository referralRepo;
    private final AppointmentRepository appointmentRepo;
    private final DoctorRepository doctorRepo;
    private final DepartmentRepository departmentRepo;
    private final SystemNotificationService notificationService;

    @Transactional
    public ClinicalReferral createReferral(CreateReferralRequest request) {
        System.out.println("🔍 ClinicalReferralService.createReferral called");
        System.out.println("🔍 Request: " + request);
        System.out.println("🔍 AppointmentId: " + request.getAppointmentId());
        System.out.println("🔍 ToDepartmentId: " + request.getToDepartmentId());
        System.out.println("🔍 Notes: " + request.getNotes());

        Appointment appointment = appointmentRepo.findById(request.getAppointmentId())
                .orElseThrow(() -> {
                    System.err.println("❌ Appointment not found with ID: " + request.getAppointmentId());
                    return new NotFoundException("Appointment not found with ID: " + request.getAppointmentId());
                });

        System.out.println("✅ Found appointment: " + appointment.getAppointmentId());

        Department department = departmentRepo.findById(request.getToDepartmentId())
                .orElseThrow(() -> {
                    System.err.println("❌ Department not found with ID: " + request.getToDepartmentId());
                    return new NotFoundException("Department not found with ID: " + request.getToDepartmentId());
                });

        System.out.println("✅ Found department: " + department.getDepartmentName());

        // Validate that appointment has a doctor
        if (appointment.getDoctor() == null) {
            System.err.println("❌ Appointment does not have a doctor assigned");
            throw new IllegalStateException("Appointment does not have an assigned doctor. Cannot create referral.");
        }

        System.out.println("✅ Appointment has doctor: " + appointment.getDoctor().getDoctorId());

        ClinicalReferral referral = new ClinicalReferral();
        referral.setAppointment(appointment);
        referral.setFromDoctor(appointment.getDoctor());
        referral.setToDepartment(department);
        referral.setNotes(request.getNotes());
        referral.setStatus(ClinicalReferralStatus.PENDING);
        referral.setCreatedAt(LocalDateTime.now());

        System.out.println("💾 Saving referral...");
        ClinicalReferral saved = referralRepo.save(referral);
        System.out.println("✅ Referral saved with ID: " + saved.getReferralId());

        return saved;
    }

    @Transactional
    public ClinicalReferral updateStatus(Long referralId, ClinicalReferralStatus status) {
        ClinicalReferral referral = referralRepo.findById(referralId)
                .orElseThrow(() -> new NotFoundException("Referral not found"));
        
        referral.setStatus(status);
        
        if (status == ClinicalReferralStatus.DONE) {
            referral.setCompletedAt(LocalDateTime.now());
        }
        
        return referralRepo.save(referral);
    }

    // Remove @Transactional to avoid rollback issues from nested calls
    public ClinicalReferral updateResult(Long referralId, UpdateResultRequest request) {
        System.out.println("🔍 ClinicalReferralService.updateResult called");
        System.out.println("🔍 ReferralId: " + referralId);
        System.out.println("🔍 PerformedByDoctorId from request: " + request.getPerformedByDoctorId());
        
        ClinicalReferral referral = referralRepo.findById(referralId)
                .orElseThrow(() -> new NotFoundException("Referral not found"));

        System.out.println("✅ Found referral with toDepartmentId: " + referral.getToDepartment().getId());

        // Validate and set performedByDoctor
        if (request.getPerformedByDoctorId() != null) {
            Doctor performer = doctorRepo.findById(request.getPerformedByDoctorId())
                    .orElseThrow(() -> new NotFoundException("Doctor not found with ID: " + request.getPerformedByDoctorId()));
            
            System.out.println("✅ Found doctor with ID: " + performer.getDoctorId());
            
            // Check if doctor's department matches referral's toDepartment
            if (performer.getDepartment() == null) {
                System.err.println("❌ Doctor does not have a department assigned");
                throw new IllegalStateException("Bác sĩ chưa được phân công vào khoa. Không thể cập nhật kết quả.");
            }
            
            Long doctorDepartmentId = performer.getDepartment().getId();
            Long referralToDepartmentId = referral.getToDepartment().getId();
            
            System.out.println("🔍 Doctor's departmentId: " + doctorDepartmentId);
            System.out.println("🔍 Referral's toDepartmentId: " + referralToDepartmentId);
            
            if (!doctorDepartmentId.equals(referralToDepartmentId)) {
                System.err.println("⚠️ Department mismatch - but allowing it for flexibility");
                System.err.println("   Doctor's department: " + performer.getDepartment().getDepartmentName());
                System.err.println("   Referral's department: " + referral.getToDepartment().getDepartmentName());
                // Don't throw exception - just log warning and proceed
            }
            
            System.out.println("✅ Setting performedByDoctor");
            referral.setPerformedByDoctor(performer);
        } else {
            System.err.println("❌ PerformedByDoctorId is null in request");
            throw new IllegalArgumentException("Thiếu thông tin bác sĩ thực hiện");
        }

        referral.setResultText(request.getResultText());
        referral.setResultFileUrl(request.getResultFileUrl());
        
        // Set status from request, default to DONE if not provided
        ClinicalReferralStatus newStatus = request.getStatus() != null ? request.getStatus() : ClinicalReferralStatus.DONE;
        referral.setStatus(newStatus);
        
        // Only set completedAt if status is DONE
        if (newStatus == ClinicalReferralStatus.DONE) {
            referral.setCompletedAt(LocalDateTime.now());
        }

        System.out.println("💾 Saving referral...");
        ClinicalReferral saved = referralRepo.save(referral);
        System.out.println("✅ Referral saved successfully with ID: " + saved.getReferralId());

        // Cập nhật lại appointment status - separate try-catch
        try {
            Appointment appointment = saved.getAppointment();
            if (appointment != null && "REFERRED".equals(appointment.getStatus())) {
                System.out.println("📝 Updating appointment status from REFERRED to Confirmed");
                appointment.setStatus("Confirmed");
                appointmentRepo.save(appointment);
                System.out.println("✅ Appointment status updated");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to update appointment status: " + e.getMessage());
            // Don't throw - let the referral update succeed
        }

        // Gửi thông báo CHO BÁC SĨ CHÍNH - MUST NOT FAIL
        // Use separate thread to avoid transaction rollback
        final ClinicalReferral finalSaved = saved;
        new Thread(() -> {
            try {
                Thread.sleep(1000); // Wait for transaction to commit
                System.out.println("📧 Sending notification in background thread...");
                SystemNotificationDTO.Create notifDto = new SystemNotificationDTO.Create();
                notifDto.setTitle("Kết quả cận lâm sàng đã có");
                notifDto.setMessage("Kết quả " + finalSaved.getToDepartment().getDepartmentName() + 
                    " của bệnh nhân " + finalSaved.getAppointment().getPatient().getUser().getLastName() +
                    " " + finalSaved.getAppointment().getPatient().getUser().getFirstName() + " đã hoàn thành");
                notifDto.setAppointmentId(finalSaved.getAppointment().getAppointmentId());
                notificationService.createNotification(notifDto);
                System.out.println("✅ Notification sent successfully");
            } catch (Exception e) {
                System.err.println("⚠️ Failed to send notification (non-critical): " + e.getMessage());
                // Silent fail - notification is not critical
            }
        }).start();

        System.out.println("🎉 updateResult completed successfully");
        return saved;
    }

    public List<ClinicalReferral> getByDepartment(Long departmentId) {
        System.out.println("🔍 ClinicalReferralService.getByDepartment called with departmentId: " + departmentId);
        System.out.println("🔍 About to query: findByToDepartment_IdOrderByCreatedAtDesc(" + departmentId + ")");
        
        // FIRST: Try native query to see if data exists
        System.out.println("🧪 Testing with NATIVE SQL query first...");
        List<ClinicalReferral> nativeResults = referralRepo.findByDepartmentIdNative(departmentId);
        System.out.println("✅ Native query returned " + nativeResults.size() + " referrals");
        
        if (nativeResults.isEmpty()) {
            System.out.println("⚠️ NATIVE query also returns EMPTY!");
            System.out.println("⚠️ This means:");
            System.out.println("   1. No data in DB with to_departmentid = " + departmentId);
            System.out.println("   2. OR column name mismatch");
            System.out.println("   3. Run in SQL: SELECT * FROM ClinicalReferrals WHERE to_departmentid = " + departmentId);
        } else {
            System.out.println("✅ Native query FOUND data! Problem is JPA mapping.");
            for (int i = 0; i < Math.min(3, nativeResults.size()); i++) {
                ClinicalReferral ref = nativeResults.get(i);
                System.out.println("   📋 Native result #" + (i+1) + ": ID=" + ref.getReferralId());
            }
        }
        
        // SECOND: Try JPA query
        List<ClinicalReferral> results = referralRepo.findByToDepartment_IdOrderByCreatedAtDesc(departmentId);
        System.out.println("✅ JPA Query returned " + results.size() + " referrals");
        
        if (results.isEmpty() && !nativeResults.isEmpty()) {
            System.out.println("🔧 Using native query results as fallback!");
            return nativeResults;
        }
        
        if (results.isEmpty()) {
            System.out.println("⚠️ NO REFERRALS FOUND!");
            System.out.println("⚠️ Kiểm tra:");
            System.out.println("   1. SELECT * FROM ClinicalReferrals WHERE ToDepartmentID = " + departmentId);
            System.out.println("   2. SELECT * FROM ClinicalReferrals WHERE to_departmentid = " + departmentId);
            System.out.println("   3. Có rows nào trong DB không?");
            System.out.println("   4. Hibernate query có chạy đúng không?");
        } else {
            for (int i = 0; i < Math.min(3, results.size()); i++) {
                ClinicalReferral ref = results.get(i);
                System.out.println("   📋 Referral #" + (i+1) + ": ID=" + ref.getReferralId() + 
                    ", Status=" + ref.getStatus() +
                    ", ToDept=" + (ref.getToDepartment() != null ? ref.getToDepartment().getId() + " (" + ref.getToDepartment().getDepartmentName() + ")" : "NULL"));
            }
        }
        return results;
    }

    // Helper method to convert Entity to DTO (avoiding circular reference)
    private ClinicalReferralDTO convertToDTO(ClinicalReferral referral) {
        ClinicalReferralDTO dto = new ClinicalReferralDTO();
        dto.setReferralId(referral.getReferralId());
        dto.setStatus(referral.getStatus());
        dto.setNotes(referral.getNotes());
        dto.setResultText(referral.getResultText());
        dto.setResultFileUrl(referral.getResultFileUrl());
        dto.setCreatedAt(referral.getCreatedAt());
        dto.setCompletedAt(referral.getCompletedAt());
        
        // Appointment
        if (referral.getAppointment() != null) {
            dto.setAppointmentId(referral.getAppointment().getAppointmentId());
            
            // Patient from appointment
            if (referral.getAppointment().getPatient() != null) {
                dto.setPatientId(referral.getAppointment().getPatient().getPatientId());
                if (referral.getAppointment().getPatient().getUser() != null) {
                    dto.setPatientName(referral.getAppointment().getPatient().getUser().getFirstName() + " " + 
                                      referral.getAppointment().getPatient().getUser().getLastName());
                    dto.setPatientPhone(referral.getAppointment().getPatient().getUser().getPhone());
                }
            }
        }
        
        // From Doctor
        if (referral.getFromDoctor() != null) {
            dto.setFromDoctorId(referral.getFromDoctor().getDoctorId());
            // Get specialty from doctor's department
            if (referral.getFromDoctor().getDepartment() != null) {
                dto.setFromDoctorSpecialty(referral.getFromDoctor().getDepartment().getDepartmentName());
            }
            if (referral.getFromDoctor().getUser() != null) {
                dto.setFromDoctorName(referral.getFromDoctor().getUser().getFirstName() + " " + 
                                     referral.getFromDoctor().getUser().getLastName());
            }
        }
        
        // To Department
        if (referral.getToDepartment() != null) {
            dto.setToDepartmentId(referral.getToDepartment().getId());
            dto.setToDepartmentName(referral.getToDepartment().getDepartmentName());
        }
        
        // Performed By Doctor (nullable)
        if (referral.getPerformedByDoctor() != null) {
            dto.setPerformedByDoctorId(referral.getPerformedByDoctor().getDoctorId());
            if (referral.getPerformedByDoctor().getUser() != null) {
                dto.setPerformedByDoctorName(referral.getPerformedByDoctor().getUser().getFirstName() + " " + 
                                            referral.getPerformedByDoctor().getUser().getLastName());
            }
        }
        
        return dto;
    }

    public List<ClinicalReferralDTO> getByDepartmentDTO(Long departmentId) {
        System.out.println("🔍 ClinicalReferralService.getByDepartmentDTO called with departmentId: " + departmentId);
        
        List<ClinicalReferral> referrals = getByDepartment(departmentId);
        System.out.println("✅ Converting " + referrals.size() + " referrals to DTO");
        
        return referrals.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ClinicalReferral> getPendingByDepartment(Long departmentId) {
        System.out.println("🔍 ClinicalReferralService.getPendingByDepartment called with departmentId: " + departmentId);
        System.out.println("🔍 About to query: findByToDepartment_IdAndStatusOrderByCreatedAtDesc(" + departmentId + ", PENDING)");
        List<ClinicalReferral> results = referralRepo.findByToDepartment_IdAndStatusOrderByCreatedAtDesc(
            departmentId, 
            ClinicalReferralStatus.PENDING
        );
        System.out.println("✅ Query returned " + results.size() + " PENDING referrals");
        return results;
    }

    public List<ClinicalReferral> getByAppointment(Long appointmentId) {
        return referralRepo.findByAppointment_AppointmentIdOrderByCreatedAtDesc(appointmentId);
    }

    public List<ClinicalReferralDTO> getByAppointmentDTO(Long appointmentId) {
        System.out.println("🔍 ClinicalReferralService.getByAppointmentDTO called with appointmentId: " + appointmentId);
        
        List<ClinicalReferral> referrals = getByAppointment(appointmentId);
        System.out.println("✅ Converting " + referrals.size() + " referrals to DTO");
        
        return referrals.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ClinicalReferral> getByDoctor(Long doctorId) {
        return referralRepo.findByFromDoctor_DoctorIdOrderByCreatedAtDesc(doctorId);
    }

    public List<ClinicalReferral> getByPatient(Long patientId) {
        return referralRepo.findByPatientId(patientId);
    }

    public ClinicalReferral getById(Long id) {
        return referralRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Referral not found"));
    }

    public Long countPendingByDoctor(Long doctorId) {
        return referralRepo.countPendingByDoctorId(doctorId);
    }

    public Long countCompletedTodayByDoctor(Long doctorId) {
        return referralRepo.countCompletedTodayByDoctorId(doctorId);
    }

    @Transactional
    public void deleteReferral(Long referralId) {
        ClinicalReferral referral = getById(referralId);
        referralRepo.delete(referral);
    }
}
