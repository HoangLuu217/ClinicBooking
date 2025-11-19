package com.example.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.ClinicalReferralDTO;
import com.example.backend.dto.CreateReferralRequest;
import com.example.backend.dto.UpdateResultRequest;
import com.example.backend.model.ClinicalReferral;
import com.example.backend.model.ClinicalReferralStatus;
import com.example.backend.service.ClinicalReferralService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/clinical-referrals")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ClinicalReferralController {

    private final ClinicalReferralService referralService;

    @PostMapping
    public ResponseEntity<ClinicalReferral> createReferral(@RequestBody CreateReferralRequest request) {
        System.out.println("🔍 ClinicalReferralController.createReferral called");
        System.out.println("🔍 Request body: " + request);
        
        try {
            ClinicalReferral result = referralService.createReferral(request);
            System.out.println("✅ Controller: Referral created successfully with ID: " + result.getReferralId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("❌ Controller error: " + e.getClass().getName() + ": " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<ClinicalReferral>> getReferralsByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(referralService.getByDoctor(doctorId));
    }

    @GetMapping("/doctor/{doctorId}/stats")
    public ResponseEntity<Map<String, Long>> getDoctorStats(@PathVariable Long doctorId) {
        Map<String, Long> stats = new HashMap<>();
        stats.put("pendingReferrals", referralService.countPendingByDoctor(doctorId));
        stats.put("completedToday", referralService.countCompletedTodayByDoctor(doctorId));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<ClinicalReferralDTO>> getReferralsByAppointment(@PathVariable Long appointmentId) {
        System.out.println("🔍 ClinicalReferralController.getReferralsByAppointment called with appointmentId: " + appointmentId);
        List<ClinicalReferralDTO> referrals = referralService.getByAppointmentDTO(appointmentId);
        System.out.println("✅ Found " + referrals.size() + " referrals for appointment " + appointmentId);
        return ResponseEntity.ok(referrals);
    }

    @GetMapping("/department/{departmentId}")
    public ResponseEntity<List<ClinicalReferralDTO>> getReferralsByDepartment(@PathVariable Long departmentId) {
        System.out.println("🔍 ClinicalReferralController.getReferralsByDepartment called with departmentId: " + departmentId);
        List<ClinicalReferralDTO> referrals = referralService.getByDepartmentDTO(departmentId);
        System.out.println("✅ Found " + referrals.size() + " referrals for department " + departmentId);
        if (!referrals.isEmpty()) {
            ClinicalReferralDTO first = referrals.get(0);
            System.out.println("📋 First referral ID: " + first.getReferralId());
            System.out.println("📋 First referral toDepartmentName: " + first.getToDepartmentName());
        }
        return ResponseEntity.ok(referrals);
    }

    @GetMapping("/department/{departmentId}/pending")
    public ResponseEntity<List<ClinicalReferral>> getPendingReferrals(@PathVariable Long departmentId) {
        System.out.println("🔍 ClinicalReferralController.getPendingReferrals called with departmentId: " + departmentId);
        List<ClinicalReferral> referrals = referralService.getPendingByDepartment(departmentId);
        System.out.println("✅ Found " + referrals.size() + " PENDING referrals for department " + departmentId);
        return ResponseEntity.ok(referrals);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ClinicalReferral> updateStatus(
            @PathVariable Long id,
            @RequestParam ClinicalReferralStatus status) {
        return ResponseEntity.ok(referralService.updateStatus(id, status));
    }

    @PutMapping("/{id}/result")
    public ResponseEntity<?> updateResult(
            @PathVariable Long id,
            @RequestBody UpdateResultRequest request) {
        System.out.println("🔍 ========================================");
        System.out.println("🔍 ClinicalReferralController.updateResult called");
        System.out.println("🔍 Referral ID: " + id);
        System.out.println("🔍 Request: " + request);
        System.out.println("🔍 PerformedByDoctorId: " + request.getPerformedByDoctorId());
        System.out.println("🔍 ResultText: " + request.getResultText());
        System.out.println("🔍 Status: " + request.getStatus());
        System.out.println("🔍 ========================================");
        
        try {
            ClinicalReferral result = referralService.updateResult(id, request);
            System.out.println("✅ ========================================");
            System.out.println("✅ Update successful! Referral ID: " + result.getReferralId());
            System.out.println("✅ New status: " + result.getStatus());
            System.out.println("✅ ========================================");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("❌ ========================================");
            System.err.println("❌ ERROR in updateResult controller");
            System.err.println("❌ Exception type: " + e.getClass().getName());
            System.err.println("❌ Message: " + e.getMessage());
            System.err.println("❌ ========================================");
            e.printStackTrace();
            
            // Return detailed error to frontend
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getClass().getSimpleName());
            errorResponse.put("message", e.getMessage());
            errorResponse.put("detail", "Vui lòng kiểm tra log server để biết thêm chi tiết");
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<ClinicalReferral>> getReferralsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(referralService.getByPatient(patientId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClinicalReferral> getReferral(@PathVariable Long id) {
        return ResponseEntity.ok(referralService.getById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReferral(@PathVariable Long id) {
        referralService.deleteReferral(id);
        return ResponseEntity.noContent().build();
    }
}
