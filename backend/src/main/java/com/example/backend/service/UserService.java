package com.example.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.backend.exception.ConflictException;
import com.example.backend.exception.NotFoundException;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.PatientRepository;
import com.example.backend.model.Doctor;
import com.example.backend.model.Patient;
import com.example.backend.dto.UserWithPatientInfoDTO;

import lombok.RequiredArgsConstructor;

/**
 * Service class cho User entity
 * Chứa business logic để xử lý các thao tác CRUD với User
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final CloudinaryService cloudinaryService;

    /**
     * Lấy tất cả user với thông tin role
     * @param pageable thông tin phân trang
     * @return danh sách user với phân trang
     */
    @Transactional(readOnly = true)
    public Page<User> getAllUsersWithRole(Pageable pageable) {
        return userRepository.findAllWithRole(pageable);
    }

    /**
     * Lấy user theo ID với thông tin role
     * @param userId ID của user
     * @return user nếu tìm thấy
     * @throws NotFoundException nếu không tìm thấy user
     */
    @Transactional(readOnly = true)
    public User getUserByIdWithRole(Long userId) {
        return userRepository.findByIdWithRole(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy user với ID: " + userId));
    }

    /**
     * Lấy user theo email với thông tin role
     * @param email email của user
     * @return user nếu tìm thấy
     * @throws NotFoundException nếu không tìm thấy user
     */
    @Transactional(readOnly = true)
    public User getUserByEmailWithRole(String email) {
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy user với email: " + email));
    }

    /**
     * Tìm user với các bộ lọc
     * @param email email để tìm kiếm
     * @param firstName tên để tìm kiếm
     * @param lastName họ để tìm kiếm
     * @param status trạng thái để tìm kiếm
     * @param roleId ID role để tìm kiếm
     * @param pageable thông tin phân trang
     * @return danh sách user với phân trang
     */
    @Transactional(readOnly = true)
    public Page<User> searchUsersWithFilters(String email, String firstName, String lastName, 
                                           User.UserStatus status, Long roleId, Pageable pageable) {
        return userRepository.findUsersWithFilters(email, firstName, lastName, status, roleId, pageable);
    }

    /**
     * Lấy tất cả user với thông tin role
     * @return danh sách user với thông tin role
     */
    @Transactional(readOnly = true)
    public List<User> getAllUsersWithRoleInfo() {
        return userRepository.findAllWithRoleInfo();
    }

    /**
     * Lấy tất cả user với thông tin role và thông tin bệnh nhân (nếu có)
     * @return danh sách user với thông tin đầy đủ
     */
    @Transactional(readOnly = true)
    public List<UserWithPatientInfoDTO> getAllUsersWithPatientInfo() {
        List<User> users = userRepository.findAllWithRoleInfo();
        return users.stream()
                .map(this::convertToUserWithPatientInfoDTO)
                .toList();
    }

    /**
     * Tìm user theo roleId với thông tin role
     * @param roleId ID của role
     * @return danh sách user theo role
     */
    @Transactional(readOnly = true)
    public List<User> getUsersByRoleIdWithRoleInfo(Long roleId) {
        return userRepository.findByRoleIdWithRoleInfo(roleId);
    }

    /**
     * Tìm user theo tên với thông tin role
     * @param keyword từ khóa tìm kiếm
     * @return danh sách user theo tên
     */
    @Transactional(readOnly = true)
    public List<User> getUsersByNameWithRoleInfo(String keyword) {
        return userRepository.findByNameContainingWithRoleInfo(keyword);
    }

    /**
     * Tạo user mới
     * @param email email của user
     * @param passwordHash hash của password
     * @param firstName tên
     * @param lastName họ
     * @param phone số điện thoại
     * @param gender giới tính
     * @param dateOfBirth ngày sinh
     * @param address địa chỉ
     * @param roleId ID của role
     * @return user đã được tạo
     * @throws ConflictException nếu email đã tồn tại
     * @throws NotFoundException nếu không tìm thấy role hoặc roleId null
     */
    public User createUser(String email, String passwordHash, String firstName, String lastName, 
                          String phone, User.Gender gender, java.time.LocalDate dateOfBirth, 
                          String address, String avatarUrl, Long roleId) {
        
        // Kiểm tra email đã tồn tại chưa
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email đã tồn tại: " + email);
        }

        // Kiểm tra roleId không null
        if (roleId == null) {
            throw new IllegalArgumentException("RoleId không được để trống");
        }

        // Kiểm tra role tồn tại
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy role với ID: " + roleId));

        // Tạo user mới
        User user = new User();
        user.setEmail(email);
        
        // Hash password trước khi lưu
        String hashedPassword = passwordEncoder.encode(passwordHash);
        user.setPasswordHash(hashedPassword);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPhone(phone);
        user.setGender(gender);
        user.setDateOfBirth(dateOfBirth);
        user.setAddress(address);
        user.setAvatarUrl(avatarUrl);
        user.setRole(role);
        user.setStatus(User.UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        return savedUser;
    }

    /**
     * Cập nhật thông tin user
     * @param userId ID của user
     * @param email email mới
     * @param firstName tên mới
     * @param lastName họ mới
     * @param phone số điện thoại mới
     * @param gender giới tính mới
     * @param dateOfBirth ngày sinh mới
     * @param address địa chỉ mới
     * @param status trạng thái mới
     * @param roleId ID role mới
     * @return user đã được cập nhật
     * @throws NotFoundException nếu không tìm thấy user hoặc role
     * @throws ConflictException nếu email mới đã tồn tại
     */
    public User updateUser(Long userId, String email, String passwordHash, String firstName, String lastName, 
                          String phone, User.Gender gender, java.time.LocalDate dateOfBirth, 
                          String address, String avatarUrl, User.UserStatus status, Long roleId) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy user với ID: " + userId));

        // Kiểm tra email mới có trùng với user khác không (nếu có)
        if (email != null && !email.equals(user.getEmail())) {
            // Kiểm tra xem email có tồn tại với user khác không
            Optional<User> existingUser = userRepository.findByEmailWithRole(email);
            if (existingUser.isPresent() && !existingUser.get().getId().equals(userId)) {
                throw new ConflictException("Email đã tồn tại: " + email);
            }
            user.setEmail(email);
        }

        // Cập nhật password nếu có
        if (passwordHash != null && !passwordHash.trim().isEmpty()) {
            String hashedPassword = passwordEncoder.encode(passwordHash);
            user.setPasswordHash(hashedPassword);
        }

        // Kiểm tra role mới tồn tại (nếu có)
        if (roleId != null) {
            try {
                Long currentRoleId = (user.getRole() != null) ? user.getRole().getId() : null;
                if (currentRoleId == null || !currentRoleId.equals(roleId)) {
                    Role role = roleRepository.findById(roleId)
                            .orElseThrow(() -> new NotFoundException("Không tìm thấy role với ID: " + roleId));
                    user.setRole(role);
                }
            } catch (Exception e) {
                // Nếu có lỗi với Hibernate proxy, tìm lại user
                user = userRepository.findById(userId)
                        .orElseThrow(() -> new NotFoundException("Không tìm thấy user với ID: " + userId));
                Role role = roleRepository.findById(roleId)
                        .orElseThrow(() -> new NotFoundException("Không tìm thấy role với ID: " + roleId));
                user.setRole(role);
            }
        }

        if (firstName != null) {
            user.setFirstName(firstName);
        }
        if (lastName != null) {
            user.setLastName(lastName);
        }
        if (phone != null) {
            user.setPhone(phone);
        }
        if (gender != null) {
            user.setGender(gender);
        }
        if (dateOfBirth != null) {
            user.setDateOfBirth(dateOfBirth);
        }
        if (address != null && !address.trim().isEmpty()) {
            System.out.println("Updating user address: " + address);
            user.setAddress(address.trim());
        } else {
            System.out.println("Address is null or empty, not updating");
        }
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl);
        }
        if (status != null) {
            user.setStatus(status);
        }

        try {
            return userRepository.save(user);
        } catch (Exception e) {
            System.err.println("Error saving user: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Xóa user (soft delete)
     * @param userId ID của user
     * @throws NotFoundException nếu không tìm thấy user
     */
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy user với ID: " + userId));

        user.setStatus(User.UserStatus.DELETED);
        userRepository.save(user);
    }

    /**
     * Xóa user vĩnh viễn (hard delete)
     * @param userId ID của user
     * @throws NotFoundException nếu không tìm thấy user
     */
    public void hardDeleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new NotFoundException("Không tìm thấy user với ID: " + userId);
        }
        userRepository.deleteById(userId);
    }

    /**
     * Đếm số user theo roleId
     * @param roleId ID của role
     * @return số lượng user
     */
    @Transactional(readOnly = true)
    public long countUsersByRoleId(Long roleId) {
        return userRepository.countByRoleId(roleId);
    }

    /**
     * Kiểm tra email đã tồn tại chưa
     * @param email email cần kiểm tra
     * @return true nếu email đã tồn tại
     */
    @Transactional(readOnly = true)
    public boolean isEmailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Tạo doctor record trong transaction riêng
     * @param userId ID của user
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createDoctorRecordAsync(Long userId) {
        try {
            Doctor doctor = new Doctor();
            doctor.setDoctorId(userId);
            doctor.setBio("Bác sĩ chuyên khoa");
            doctor.setSpecialty("Nội khoa");
            // Status is managed by User entity, not Doctor entity
            // Không set departmentId vì có thể gây lỗi constraint
            
            doctorRepository.save(doctor);
            System.out.println("Đã tạo doctor record cho userId: " + userId);
        } catch (Exception e) {
            System.err.println("Lỗi khi tạo doctor record: " + e.getMessage());
        }
    }

    /**
     * Tạo patient record trong transaction riêng
     * @param userId ID của user
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createPatientRecordAsync(Long userId) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return;
            
            Patient patient = new Patient();
            patient.setPatientId(userId);
            patient.setUser(user);
            patient.setHealthInsuranceNumber(null);
            patient.setMedicalHistory(null);
            
            patientRepository.save(patient);
            System.out.println("Đã tạo patient record cho userId: " + userId);
        } catch (Exception e) {
            System.err.println("Lỗi khi tạo patient record: " + e.getMessage());
        }
    }

    /**
     * Convert User entity thành UserWithPatientInfoDTO
     * @param user User entity
     * @return UserWithPatientInfoDTO
     */
    private UserWithPatientInfoDTO convertToUserWithPatientInfoDTO(User user) {
        UserWithPatientInfoDTO dto = new UserWithPatientInfoDTO();
        
        // Copy thông tin cơ bản từ User
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhone(user.getPhone());
        dto.setGender(user.getGender() != null ? user.getGender().name() : null);
        dto.setDateOfBirth(user.getDateOfBirth());
        dto.setAddress(user.getAddress());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setStatus(user.getStatus() != null ? user.getStatus().name() : null);
        
        // Copy thông tin Role
        if (user.getRole() != null) {
            UserWithPatientInfoDTO.RoleDTO roleDTO = new UserWithPatientInfoDTO.RoleDTO();
            roleDTO.setId(user.getRole().getId());
            roleDTO.setName(user.getRole().getName());
            roleDTO.setDescription(user.getRole().getDescription());
            dto.setRole(roleDTO);
        }
        
        // Nếu user là Patient, lấy thông tin bệnh nhân
        if (user.getRole() != null && "PATIENT".equals(user.getRole().getName())) {
            try {
                Optional<Patient> patientOpt = patientRepository.findByPatientId(user.getId());
                if (patientOpt.isPresent()) {
                    Patient patient = patientOpt.get();
                    dto.setHealthInsuranceNumber(patient.getHealthInsuranceNumber());
                    dto.setMedicalHistory(patient.getMedicalHistory());
                    dto.setPatientCreatedAt(patient.getCreatedAt());
                    dto.setPatientStatus(patient.getStatus());
                }
            } catch (Exception e) {
                // Nếu không tìm thấy thông tin patient, để null
                System.err.println("Không tìm thấy thông tin patient cho user ID: " + user.getId());
            }
        }
        
        // Nếu user là Doctor, lấy thông tin bác sĩ
        if (user.getRole() != null && "DOCTOR".equals(user.getRole().getName())) {
            try {
                Optional<Doctor> doctorOpt = doctorRepository.findByDoctorId(user.getId());
                if (doctorOpt.isPresent()) {
                    Doctor doctor = doctorOpt.get();
                    dto.setBio(doctor.getBio());
                    dto.setSpecialty(doctor.getSpecialty());
                    dto.setDepartmentId(doctor.getDepartment() != null ? doctor.getDepartment().getId() : null);
                    dto.setDepartmentName(doctor.getDepartment() != null ? doctor.getDepartment().getDepartmentName() : null);
                    dto.setDoctorStatus(doctor.getStatus());
                }
            } catch (Exception e) {
                // Nếu không tìm thấy thông tin doctor, để null
                System.err.println("Không tìm thấy thông tin doctor cho user ID: " + user.getId());
            }
        }
        
        // Nếu user là Admin, lấy thông tin quản trị viên
        if (user.getRole() != null && "ADMIN".equals(user.getRole().getName())) {
            // Tạm thời set thông tin mặc định cho admin
            dto.setAdminLevel("Super Admin");
            dto.setAdminPermissions("Full Access");
            dto.setAdminNotes("Quản trị viên hệ thống");
        }
        
        return dto;
    }

    /**
     * Upload ảnh đại diện cho user
     * @param userId ID của user
     * @param file file ảnh
     * @return URL của ảnh đã upload
     */
    public String uploadAvatar(Long userId, MultipartFile file) {
        try {
            User user = getUserByIdWithRole(userId);
            
            // Validate file
            if (file.isEmpty()) {
                throw new RuntimeException("File không được để trống");
            }
            
            // Check file size (5MB limit)
            if (file.getSize() > 5 * 1024 * 1024) {
                throw new RuntimeException("Kích thước file không được vượt quá 5MB");
            }
            
            // Check file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new RuntimeException("File phải là ảnh");
            }
            
            // Delete old avatar from Cloudinary if exists
            String oldAvatarUrl = user.getAvatarUrl();
            if (oldAvatarUrl != null && oldAvatarUrl.contains("cloudinary.com")) {
                try {
                    cloudinaryService.deleteImage(oldAvatarUrl);
                    System.out.println("🗑️ Deleted old avatar from Cloudinary: " + oldAvatarUrl);
                } catch (Exception e) {
                    System.err.println("⚠️ Could not delete old avatar from Cloudinary: " + e.getMessage());
                }
            }
            
            // Upload to Cloudinary
            String folder = "clinic/users";
            String avatarUrl = cloudinaryService.uploadImage(file, folder);
            
            System.out.println("✅ Avatar uploaded to Cloudinary: " + avatarUrl);
            
            // Update user avatar
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
            
            System.out.println("✅ Avatar updated successfully for user: " + userId);
            return avatarUrl;
            
        } catch (Exception e) {
            System.err.println("❌ Error uploading avatar: " + e.getMessage());
            throw new RuntimeException("Lỗi khi upload ảnh: " + e.getMessage());
        }
    }
    
    /**
     * Lấy user hiện tại từ token (simplified implementation)
     * @param token JWT token
     * @return User object
     */
    public User getCurrentUserFromToken(String token) {
        try {
            // For Google users, get the most recent Google user
            List<User> googleUsers = userRepository.findByPasswordHash("oauth_google_user");
            if (!googleUsers.isEmpty()) {
                // Return the most recent Google user (highest ID)
                return googleUsers.stream()
                    .max((u1, u2) -> Long.compare(u1.getId(), u2.getId()))
                    .orElse(null);
            }
            return null;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get current user from token", e);
        }
    }

    /**
     * So sánh password thô với password đã hash
     * @param rawPassword password thô
     * @param encodedPassword password đã hash
     * @return true nếu khớp, false nếu không khớp
     */
    public boolean matchesPassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }
}