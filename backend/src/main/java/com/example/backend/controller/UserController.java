package com.example.backend.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.HashMap;
import org.springframework.web.bind.annotation.CookieValue;

import com.example.backend.model.User;
import com.example.backend.model.Patient;
import com.example.backend.service.UserService;
import com.example.backend.service.PatientService;
import com.example.backend.dto.UserWithPatientInfoDTO;

import lombok.RequiredArgsConstructor;

/**
 * REST Controller cho User entity
 * Cung cấp các API endpoints để quản lý thông tin người dùng
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;
    private final PatientService patientService;

    /**
     * Lấy tất cả user với thông tin role
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<Page<User>> getAllUsersWithRole(Pageable pageable) {
        Page<User> users = userService.getAllUsersWithRole(pageable);
        return ResponseEntity.ok(users);
    }

    /**
     * Lấy thông tin user hiện tại
     * GET /api/users/me
     */
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @CookieValue(value = "userId", required = false) String userIdCookie) {
        try {
            // 1) Prefer cookie userId when available (set on login)
            if (userIdCookie != null && !userIdCookie.isBlank()) {
                try {
                    Long uid = Long.parseLong(userIdCookie.trim());
                    User byCookie = userService.getUserByIdWithRole(uid);
                    if (byCookie != null) return ResponseEntity.ok(byCookie);
                } catch (NumberFormatException ignore) {}
            }

            // 2) Fallback to previous simplified logic (mainly for legacy Google-only sessions)
            User user = userService.getCurrentUserFromToken(authHeader);
            if (user != null) {
                return ResponseEntity.ok(user);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (Exception e) {
            System.err.println("Error in /api/users/me: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Lấy user theo ID với thông tin role
     * GET /api/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<User> getUserByIdWithRole(@PathVariable Long userId) {
        User user = userService.getUserByIdWithRole(userId);
        return ResponseEntity.ok(user);
    }

    /**
     * Lấy user theo email với thông tin role
     * GET /api/users/email/{email}
     */
    @GetMapping("/email/{email}")
    public ResponseEntity<User> getUserByEmailWithRole(@PathVariable String email) {
        User user = userService.getUserByEmailWithRole(email);
        return ResponseEntity.ok(user);
    }

    /**
     * Tìm user với các bộ lọc
     * GET /api/users/search?email=...&firstName=...&lastName=...&status=...&roleId=...
     */
    @GetMapping("/search")
    public ResponseEntity<Page<User>> searchUsersWithFilters(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String firstName,
            @RequestParam(required = false) String lastName,
            @RequestParam(required = false) User.UserStatus status,
            @RequestParam(required = false) Long roleId,
            Pageable pageable) {
        
        Page<User> users = userService.searchUsersWithFilters(email, firstName, lastName, status, roleId, pageable);
        return ResponseEntity.ok(users);
    }

    /**
     * Lấy tất cả user với thông tin role
     * GET /api/users/with-roles-info
     */
    @GetMapping("/with-roles-info")
    public ResponseEntity<List<User>> getAllUsersWithRoleInfo() {
        List<User> users = userService.getAllUsersWithRoleInfo();
        return ResponseEntity.ok(users);
    }

    /**
     * Lấy tất cả user với thông tin role và thông tin bệnh nhân (nếu có)
     * GET /api/users/with-patient-info
     */
    @GetMapping("/with-patient-info")
    public ResponseEntity<List<UserWithPatientInfoDTO>> getAllUsersWithPatientInfo() {
        List<UserWithPatientInfoDTO> users = userService.getAllUsersWithPatientInfo();
        return ResponseEntity.ok(users);
    }

    /**
     * Lấy user theo roleId với thông tin role
     * GET /api/users/role/{roleId}/with-roles-info
     */
    @GetMapping("/role/{roleId}/with-roles-info")
    public ResponseEntity<List<User>> getUsersByRoleIdWithRoleInfo(@PathVariable Long roleId) {
        List<User> users = userService.getUsersByRoleIdWithRoleInfo(roleId);
        return ResponseEntity.ok(users);
    }

    /**
     * Tìm user theo tên với thông tin role
     * GET /api/users/search-with-roles-info?keyword={keyword}
     */
    @GetMapping("/search-with-roles-info")
    public ResponseEntity<List<User>> getUsersByNameWithRoleInfo(@RequestParam String keyword) {
        List<User> users = userService.getUsersByNameWithRoleInfo(keyword);
        return ResponseEntity.ok(users);
    }

    /**
     * Tạo user mới
     * POST /api/users
     */
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody CreateUserRequest request) {
        User user = userService.createUser(
            request.getEmail(),
            request.getPasswordHash(),
            request.getFirstName(),
            request.getLastName(),
            request.getPhone(),
            request.getGender(),
            request.getDateOfBirth(),
            request.getAddress(),
            request.getAvatarUrl(),
            request.getRoleId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    /**
     * Cập nhật thông tin user
     * PUT /api/users/{userId}
     */
    @PutMapping("/{userId}")
    public ResponseEntity<User> updateUser(@PathVariable Long userId, @RequestBody UpdateUserRequest request) {
        System.out.println("Received update request for user " + userId);
        System.out.println("Address in request: " + request.getAddress());
        
        User user = userService.updateUser(
            userId,
            request.getEmail(),
            request.getPasswordHash(),
            request.getFirstName(),
            request.getLastName(),
            request.getPhone(),
            request.getGender(),
            request.getDateOfBirth(),
            request.getAddress(),
            request.getAvatarUrl(),
            request.getStatus(),
            request.getRoleId()
        );
        return ResponseEntity.ok(user);
    }

    /**
     * Xóa user (soft delete)
     * DELETE /api/users/{userId}
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Xóa user vĩnh viễn (hard delete)
     * DELETE /api/users/{userId}/hard
     */
    @DeleteMapping("/{userId}/hard")
    public ResponseEntity<Void> hardDeleteUser(@PathVariable Long userId) {
        userService.hardDeleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Cập nhật avatar cho user
     * PUT /api/users/{userId}/avatar
     */
    @PutMapping("/{userId}/avatar")
    public ResponseEntity<Map<String, Object>> updateUserAvatar(
            @PathVariable Long userId, 
            @RequestParam String avatarUrl) {
        Map<String, Object> response = new HashMap<>();
        try {
            User user = userService.getUserByIdWithRole(userId);
            user.setAvatarUrl(avatarUrl);
            User updatedUser = userService.updateUser(userId, 
                user.getEmail(), null, user.getFirstName(), user.getLastName(),
                user.getPhone(), user.getGender(), user.getDateOfBirth(),
                user.getAddress(), avatarUrl, user.getStatus(), user.getRole().getId());
            
            response.put("success", true);
            response.put("message", "Cập nhật avatar thành công");
            response.put("user", updatedUser);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi cập nhật avatar: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Đổi mật khẩu cho user đã đăng nhập
     * PUT /api/users/{userId}/change-password
     */
    @PutMapping("/{userId}/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @PathVariable Long userId,
            @RequestBody ChangePasswordRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            User user = userService.getUserByIdWithRole(userId);
            
            // Kiểm tra mật khẩu hiện tại
            if (!userService.matchesPassword(request.getCurrentPassword(), user.getPasswordHash())) {
                response.put("success", false);
                response.put("message", "Mật khẩu hiện tại không chính xác");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Cập nhật mật khẩu mới bằng cách gọi updateUser
            userService.updateUser(
                userId,
                user.getEmail(),
                request.getNewPassword(), // passwordHash
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getGender(),
                user.getDateOfBirth(),
                user.getAddress(),
                user.getAvatarUrl(),
                user.getStatus(),
                user.getRole().getId()
            );
            
            response.put("success", true);
            response.put("message", "Đổi mật khẩu thành công");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi đổi mật khẩu: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Đếm số user theo roleId
     * GET /api/users/count-by-role/{roleId}
     */
    @GetMapping("/count-by-role/{roleId}")
    public ResponseEntity<Long> countUsersByRoleId(@PathVariable Long roleId) {
        long count = userService.countUsersByRoleId(roleId);
        return ResponseEntity.ok(count);
    }

    /**
     * Kiểm tra email đã tồn tại chưa
     * GET /api/users/check-email/{email}
     */
    @GetMapping("/check-email/{email}")
    public ResponseEntity<Boolean> isEmailExists(@PathVariable String email) {
        boolean exists = userService.isEmailExists(email);
        return ResponseEntity.ok(exists);
    }

    /**
     * Upload ảnh đại diện cho user
     * POST /api/users/{userId}/upload-avatar
     */
    @PostMapping("/{userId}/upload-avatar")
    public ResponseEntity<String> uploadAvatar(@PathVariable Long userId, @RequestParam("file") MultipartFile file) {
        try {
            String avatarUrl = userService.uploadAvatar(userId, file);
            return ResponseEntity.ok(avatarUrl);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Lỗi khi upload ảnh: " + e.getMessage());
        }
    }

    /**
     * Cập nhật profile bao gồm cả Patient information
     * PUT /api/users/{userId}/profile
     */
    @PutMapping("/{userId}/profile")
    public ResponseEntity<Map<String, Object>> updateUserProfile(@PathVariable Long userId, @RequestBody UpdateProfileRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Cập nhật User information
            User user = userService.updateUser(
                userId,
                request.getEmail(),
                request.getPasswordHash(),
                request.getFirstName(),
                request.getLastName(),
                request.getPhone(),
                request.getGender(),
                request.getDateOfBirth(),
                request.getAddress(),
                request.getAvatarUrl(),
                request.getStatus(),
                request.getRoleId()
            );

            // Nếu user là Patient, cập nhật Patient information
            if (user.getRole() != null && "PATIENT".equals(user.getRole().getName())) {
                try {
                    // Kiểm tra xem user đã có Patient record chưa
                    boolean hasPatientRecord = patientService.isUserPatient(userId);
                    
                    if (hasPatientRecord) {
                        // Cập nhật Patient information hiện có
                        Patient patient = patientService.getPatientByUserId(userId);
                        patientService.updatePatient(
                            patient.getPatientId(),
                            request.getHealthInsurance(),
                            request.getMedicalHistory(),
                            null // status không thay đổi
                        );
                    } else {
                        // Tạo Patient record mới
                        patientService.createPatient(
                            userId,
                            request.getHealthInsurance(),
                            request.getMedicalHistory()
                        );
                    }
                } catch (Exception e) {
                    System.err.println("Error updating patient info: " + e.getMessage());
                    e.printStackTrace();
                    // Không throw exception, chỉ log lỗi
                }
            }

            response.put("success", true);
            response.put("message", "Cập nhật profile thành công");
            response.put("user", user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi cập nhật profile: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Request DTO cho tạo user mới
     */
    public static class CreateUserRequest {
        private String email;
        private String passwordHash;
        private String firstName;
        private String lastName;
        private String phone;
        private User.Gender gender;
        private java.time.LocalDate dateOfBirth;
        private String address;
        private String avatarUrl;
        private Long roleId;

        // Getters and Setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public String getPasswordHash() { return passwordHash; }
        public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
        
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        
        public User.Gender getGender() { return gender; }
        public void setGender(User.Gender gender) { this.gender = gender; }
        
        public java.time.LocalDate getDateOfBirth() { return dateOfBirth; }
        public void setDateOfBirth(java.time.LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
        
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
        
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        
        public Long getRoleId() { return roleId; }
        public void setRoleId(Long roleId) { this.roleId = roleId; }
    }

    /**
     * Request DTO cho cập nhật user
     */
    public static class UpdateUserRequest {
        private String email;
        private String passwordHash;
        private String firstName;
        private String lastName;
        private String phone;
        private User.Gender gender;
        private java.time.LocalDate dateOfBirth;
        private String address;
        private String avatarUrl;
        private User.UserStatus status;
        private Long roleId;

        // Default constructor
        public UpdateUserRequest() {}

        // Getters and Setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public String getPasswordHash() { return passwordHash; }
        public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
        
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        
        public User.Gender getGender() { return gender; }
        public void setGender(User.Gender gender) { this.gender = gender; }
        
        public java.time.LocalDate getDateOfBirth() { return dateOfBirth; }
        public void setDateOfBirth(java.time.LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
        
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
        
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        
        public User.UserStatus getStatus() { return status; }
        public void setStatus(User.UserStatus status) { this.status = status; }
        
        public Long getRoleId() { return roleId; }
        public void setRoleId(Long roleId) { this.roleId = roleId; }
    }

    /**
     * Request DTO cho đổi mật khẩu
     */
    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;

        // Default constructor
        public ChangePasswordRequest() {}

        // Getters and Setters
        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    /**
     * Request DTO cho cập nhật profile bao gồm Patient information
     */
    public static class UpdateProfileRequest {
        private String email;
        private String passwordHash;
        private String firstName;
        private String lastName;
        private String phone;
        private User.Gender gender;
        private java.time.LocalDate dateOfBirth;
        private String address;
        private String avatarUrl;
        private User.UserStatus status;
        private Long roleId;
        
        // Patient information
        private String healthInsurance;
        private String medicalHistory;

        // Default constructor
        public UpdateProfileRequest() {}

        // Getters and Setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public String getPasswordHash() { return passwordHash; }
        public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
        
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        
        public User.Gender getGender() { return gender; }
        public void setGender(User.Gender gender) { this.gender = gender; }
        
        public java.time.LocalDate getDateOfBirth() { return dateOfBirth; }
        public void setDateOfBirth(java.time.LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
        
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
        
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        
        public User.UserStatus getStatus() { return status; }
        public void setStatus(User.UserStatus status) { this.status = status; }
        
        public Long getRoleId() { return roleId; }
        public void setRoleId(Long roleId) { this.roleId = roleId; }
        
        public String getHealthInsurance() { return healthInsurance; }
        public void setHealthInsurance(String healthInsurance) { this.healthInsurance = healthInsurance; }
        
        public String getMedicalHistory() { return medicalHistory; }
        public void setMedicalHistory(String medicalHistory) { this.medicalHistory = medicalHistory; }
    }
}