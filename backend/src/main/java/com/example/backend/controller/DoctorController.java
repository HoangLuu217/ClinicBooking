package com.example.backend.controller;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.backend.model.Doctor;
import com.example.backend.service.DoctorService;

import lombok.RequiredArgsConstructor;

/**
 * REST Controller cho Doctor entity
 * Cung cấp các API endpoints để quản lý thông tin bác sĩ
 */
@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DoctorController {

    private final DoctorService doctorService;


    /**
     * Lấy tất cả bác sĩ với thông tin User và Role
     * GET /api/doctors
     */
    @GetMapping
    public ResponseEntity<List<Doctor>> getAllDoctorsWithUserAndRole() {
        List<Doctor> doctors = doctorService.getAllDoctorsWithUserAndRole();
        return ResponseEntity.ok(doctors);
    }

    /**
     * Lấy bác sĩ theo ID với thông tin User và Role
     * GET /api/doctors/{doctorId}
     */
    @GetMapping("/{doctorId}")
    public ResponseEntity<Doctor> getDoctorByIdWithUserAndRole(@PathVariable Long doctorId) {
        Doctor doctor = doctorService.getDoctorByIdWithUserAndRole(doctorId);
        return ResponseEntity.ok(doctor);
    }

    /**
     * Lấy bác sĩ theo chuyên khoa với thông tin User và Role
     * GET /api/doctors/specialty/{specialty}
     */
    @GetMapping("/specialty/{specialty}")
    public ResponseEntity<List<Doctor>> getDoctorsBySpecialtyWithUserAndRole(@PathVariable String specialty) {
        List<Doctor> doctors = doctorService.getDoctorsBySpecialtyWithUserAndRole(specialty);
        return ResponseEntity.ok(doctors);
    }

    /**
     * Lấy bác sĩ theo khoa với thông tin User và Role
     * GET /api/doctors/department/{departmentId}
     */
    @GetMapping("/department/{departmentId}")
    public ResponseEntity<List<Doctor>> getDoctorsByDepartmentWithUserAndRole(@PathVariable Long departmentId) {
        List<Doctor> doctors = doctorService.getDoctorsByDepartmentWithUserAndRole(departmentId);
        return ResponseEntity.ok(doctors);
    }

    /**
     * Tìm bác sĩ theo tên với thông tin User và Role
     * GET /api/doctors/search?keyword={keyword}
     */
    @GetMapping("/search")
    public ResponseEntity<List<Doctor>> getDoctorsByNameWithUserAndRole(@RequestParam String keyword) {
        List<Doctor> doctors = doctorService.getDoctorsByNameWithUserAndRole(keyword);
        return ResponseEntity.ok(doctors);
    }

    /**
     * Lấy bác sĩ theo userId
     * GET /api/doctors/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<Doctor> getDoctorByUserId(@PathVariable Long userId) {
        Doctor doctor = doctorService.getDoctorByUserId(userId);
        return ResponseEntity.ok(doctor);
    }

    /**
     * Đăng ký bác sĩ mới (tạo cả User và Doctor)
     * POST /api/doctors/register
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> registerDoctor(@RequestBody DoctorService.DoctorRegisterRequest request) {
        try {
            doctorService.registerDoctor(request);
            
            // Lấy doctor vừa tạo để trả về
            List<Doctor> doctors = doctorService.getAllDoctorsWithUserAndRole();
            Doctor newDoctor = doctors.stream()
                .filter(d -> d.getUser() != null && d.getUser().getEmail().equals(request.getEmail()))
                .findFirst()
                .orElse(null);
            
            Map<String, Object> response = new HashMap<>();
            if (newDoctor != null) {
                response.put("success", true);
                response.put("message", "Đăng ký bác sĩ thành công");
                response.put("doctor", newDoctor);
            } else {
                response.put("success", true);
                response.put("message", "Đăng ký bác sĩ thành công nhưng không thể lấy thông tin doctor");
            }
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi đăng ký bác sĩ: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Tạo bác sĩ mới
     * POST /api/doctors
     */
    @PostMapping
    public ResponseEntity<Doctor> createDoctor(@RequestBody CreateDoctorRequest request) {
        Doctor doctor = doctorService.createDoctor(
            request.getUserId(),
            request.getBio(),
            request.getSpecialty(),
            request.getDepartmentId(),
            request.getDegree(),
            request.getWorkExperience(),
            request.getWorkingHours(),
            request.getPracticeCertificateNumber(),
            request.getCitizenId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(doctor);
    }

    /**
     * Cập nhật thông tin bác sĩ
     * PUT /api/doctors/{doctorId}
     */
    @PutMapping("/{doctorId}")
    public ResponseEntity<Doctor> updateDoctor(@PathVariable Long doctorId, @RequestBody UpdateDoctorRequest request) {
        Doctor doctor = doctorService.updateDoctor(
            doctorId,
            request.getBio(),
            request.getSpecialty(),
            request.getDepartmentId(),
            request.getStatus(),
            request.getDegree(),
            request.getWorkExperience(),
            request.getWorkingHours(),
            request.getPracticeCertificateNumber(),
            request.getCitizenId()
        );
        return ResponseEntity.ok(doctor);
    }

    /**
     * Cập nhật thông tin bác sĩ và user
     * PUT /api/doctors/{doctorId}/with-user
     */
    @PutMapping("/{doctorId}/with-user")
    public ResponseEntity<Doctor> updateDoctorWithUser(@PathVariable Long doctorId, @RequestBody UpdateDoctorWithUserRequest request) {
        Doctor doctor = doctorService.updateDoctorWithUser(
            doctorId,
            request.getBio(),
            request.getSpecialty(),
            request.getDepartmentId(),
            request.getStatus(),
            request.getEmail(),
            request.getFirstName(),
            request.getLastName(),
            request.getPhone(),
            request.getAvatarUrl()
        );
        return ResponseEntity.ok(doctor);
    }

    /**
     * Xóa bác sĩ (soft delete)
     * DELETE /api/doctors/{doctorId}
     */
    @DeleteMapping("/{doctorId}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable Long doctorId) {
        doctorService.deleteDoctor(doctorId);
        return ResponseEntity.noContent().build();
    }


    /**
     * Kiểm tra user đã có thông tin bác sĩ chưa
     * GET /api/doctors/check/{userId}
     */
    @GetMapping("/check/{userId}")
    public ResponseEntity<Boolean> isUserDoctor(@PathVariable Long userId) {
        boolean isDoctor = doctorService.isUserDoctor(userId);
        return ResponseEntity.ok(isDoctor);
    }

    /**
     * Request DTO cho tạo bác sĩ mới
     */
    public static class CreateDoctorRequest {
        private Long userId;
        private String bio;
        private String specialty;
        private Long departmentId;
        private String degree;
        private String workExperience;
        private String workingHours;
        private String practiceCertificateNumber;
        private String citizenId;

        // Getters and Setters
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        
        public String getBio() { return bio; }
        public void setBio(String bio) { this.bio = bio; }
        
        public String getSpecialty() { return specialty; }
        public void setSpecialty(String specialty) { this.specialty = specialty; }
        
        public Long getDepartmentId() { return departmentId; }
        public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

        public String getDegree() { return degree; }
        public void setDegree(String degree) { this.degree = degree; }

        public String getWorkExperience() { return workExperience; }
        public void setWorkExperience(String workExperience) { this.workExperience = workExperience; }

        public String getWorkingHours() { return workingHours; }
        public void setWorkingHours(String workingHours) { this.workingHours = workingHours; }

        public String getPracticeCertificateNumber() { return practiceCertificateNumber; }
        public void setPracticeCertificateNumber(String practiceCertificateNumber) { this.practiceCertificateNumber = practiceCertificateNumber; }

        public String getCitizenId() { return citizenId; }
        public void setCitizenId(String citizenId) { this.citizenId = citizenId; }
    }

    /**
     * Request DTO cho cập nhật bác sĩ
     */
    public static class UpdateDoctorRequest {
        private String bio;
        private String specialty;
        private Long departmentId;
        private String status;
        private String degree;
        private String workExperience;
        private String workingHours;
        private String practiceCertificateNumber;
        private String citizenId;

        // Getters and Setters
        public String getBio() { return bio; }
        public void setBio(String bio) { this.bio = bio; }
        
        public String getSpecialty() { return specialty; }
        public void setSpecialty(String specialty) { this.specialty = specialty; }
        
        public Long getDepartmentId() { return departmentId; }
        public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }
        
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getDegree() { return degree; }
        public void setDegree(String degree) { this.degree = degree; }

        public String getWorkExperience() { return workExperience; }
        public void setWorkExperience(String workExperience) { this.workExperience = workExperience; }

        public String getWorkingHours() { return workingHours; }
        public void setWorkingHours(String workingHours) { this.workingHours = workingHours; }

        public String getPracticeCertificateNumber() { return practiceCertificateNumber; }
        public void setPracticeCertificateNumber(String practiceCertificateNumber) { this.practiceCertificateNumber = practiceCertificateNumber; }

        public String getCitizenId() { return citizenId; }
        public void setCitizenId(String citizenId) { this.citizenId = citizenId; }
    }

    /**
     * Request DTO cho cập nhật bác sĩ và user
     */
    public static class UpdateDoctorWithUserRequest {
        private String bio;
        private String specialty;
        private Long departmentId;
        private String status;
        private String email;
        private String firstName;
        private String lastName;
        private String phone;
        private String avatarUrl;

        // Getters and Setters
        public String getBio() { return bio; }
        public void setBio(String bio) { this.bio = bio; }
        
        public String getSpecialty() { return specialty; }
        public void setSpecialty(String specialty) { this.specialty = specialty; }
        
        public Long getDepartmentId() { return departmentId; }
        public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }
        
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }

        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    }
}