package com.example.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.exception.ConflictException;
import com.example.backend.exception.NotFoundException;
import com.example.backend.model.Doctor;
import com.example.backend.model.Department;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.DepartmentRepository;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Service class cho Doctor entity
 * Chứa business logic để xử lý các thao tác CRUD với Doctor
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Lấy tất cả doctor với thông tin User và Role
     * @return danh sách tất cả doctor
     */
    @Transactional(readOnly = true)
    public List<Doctor> getAllDoctorsWithUserAndRole() {
        return doctorRepository.findAll();
    }

    /**
     * Lấy doctor theo ID với thông tin User và Role
     * @param doctorId ID của doctor
     * @return doctor nếu tìm thấy
     * @throws NotFoundException nếu không tìm thấy doctor
     */
    @Transactional(readOnly = true)
    public Doctor getDoctorByIdWithUserAndRole(Long doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bác sĩ với ID: " + doctorId));
    }

    /**
     * Tìm doctor theo specialty với thông tin User và Role
     * @param specialty chuyên khoa
     * @return danh sách doctor theo specialty
     */
    @Transactional(readOnly = true)
    public List<Doctor> getDoctorsBySpecialtyWithUserAndRole(String specialty) {
        return doctorRepository.findBySpecialtyWithUserAndRole(specialty);
    }

    /**
     * Tìm doctor theo department với thông tin User và Role
     * @param departmentId ID của department
     * @return danh sách doctor theo department
     */
    @Transactional(readOnly = true)
    public List<Doctor> getDoctorsByDepartmentWithUserAndRole(Long departmentId) {
        return doctorRepository.findByDepartmentWithUserAndRole(departmentId);
    }

    /**
     * Tìm doctor theo tên với thông tin User và Role
     * @param keyword từ khóa tìm kiếm
     * @return danh sách doctor theo tên
     */
    @Transactional(readOnly = true)
    public List<Doctor> getDoctorsByNameWithUserAndRole(String keyword) {
        return doctorRepository.findByNameContainingWithUserAndRole(keyword);
    }

    /**
     * Tạo doctor mới
     * @param userId ID của user (phải có roleId = 2)
     * @param bio tiểu sử
     * @param specialty chuyên khoa
     * @param departmentId ID của department
     * @return doctor đã được tạo
     * @throws NotFoundException nếu không tìm thấy user
     * @throws ConflictException nếu user không phải là doctor hoặc đã có thông tin doctor
     */
    public Doctor createDoctor(Long userId, String bio, String specialty, Long departmentId, 
                              String degree, String workExperience, String workingHours, 
                              String practiceCertificateNumber, String citizenId) {
        // Kiểm tra user tồn tại
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy user với ID: " + userId));

        // Kiểm tra user có phải là doctor không (roleId = 2)
        if (user.getRole() == null || !user.getRole().getName().equals("Doctor")) {
            throw new ConflictException("User không phải là bác sĩ (roleId phải = 2)");
        }

        // Kiểm tra user đã có thông tin doctor chưa
        if (doctorRepository.existsByUserId(userId)) {
            throw new ConflictException("User đã có thông tin bác sĩ");
        }

        // Lấy Department
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy department với ID: " + departmentId));

        // Refresh entities to avoid detached entity issues
        User refreshedUser = entityManager.merge(user);
        Department refreshedDepartment = entityManager.merge(department);
        entityManager.flush();

        // Get next Doctor ID
        Long nextDoctorId = getNextDoctorId(); 
        
        // Tạo doctor mới
        Doctor doctor = new Doctor();
        doctor.setDoctorId(nextDoctorId); // Set doctorId manually
        doctor.setUser(refreshedUser); // Set user reference
        doctor.setDepartment(refreshedDepartment); // Set department reference
        doctor.setBio(bio);
        doctor.setSpecialty(specialty);
        doctor.setDegree(degree);
        doctor.setWorkExperience(workExperience);
        doctor.setWorkingHours(workingHours);
        doctor.setPracticeCertificateNumber(practiceCertificateNumber);
        doctor.setCitizenId(citizenId);
        doctor.setCreatedAt(java.time.LocalDate.now()); // Set default values
        doctor.setStatus("ACTIVE");

        // Save using EntityManager
        entityManager.persist(doctor);
        entityManager.flush();
        return doctor;
    }

    /**
     * Cập nhật thông tin doctor
     * @param doctorId ID của doctor
     * @param bio tiểu sử mới
     * @param specialty chuyên khoa mới
     * @param departmentId ID department mới
     * @param status trạng thái mới
     * @param degree bằng cấp mới
     * @param workExperience kinh nghiệm làm việc mới
     * @param workingHours giờ làm việc mới
     * @param practiceCertificateNumber số chứng chỉ hành nghề mới
     * @param citizenId số CCCD/CMND mới
     * @return doctor đã được cập nhật
     * @throws NotFoundException nếu không tìm thấy doctor
     */
    public Doctor updateDoctor(Long doctorId, String bio, String specialty, Long departmentId, String status,
                              String degree, String workExperience, String workingHours, 
                              String practiceCertificateNumber, String citizenId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bác sĩ với ID: " + doctorId));

        if (bio != null) {
            doctor.setBio(bio);
        }
        if (specialty != null) {
            doctor.setSpecialty(specialty);
        }
        if (degree != null) {
            doctor.setDegree(degree);
        }
        if (workExperience != null) {
            doctor.setWorkExperience(workExperience);
        }
        if (workingHours != null) {
            doctor.setWorkingHours(workingHours);
        }
        if (practiceCertificateNumber != null) {
            doctor.setPracticeCertificateNumber(practiceCertificateNumber);
        }
        if (citizenId != null) {
            doctor.setCitizenId(citizenId);
        }
        
        // Update department if provided
        if (departmentId != null) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy department với ID: " + departmentId));
            doctor.setDepartment(department);
        }
        
        // Update status if provided
        if (status != null) {
            doctor.setStatus(status);
        }

        return doctorRepository.save(doctor);
    }

    /**
     * Cập nhật thông tin bác sĩ và user
     * @param doctorId ID của doctor
     * @param bio Tiểu sử
     * @param specialty Chuyên khoa
     * @param departmentId ID khoa
     * @param status Trạng thái
     * @param email Email
     * @param firstName Tên
     * @param lastName Họ
     * @param phone Số điện thoại
     * @return Doctor đã được cập nhật
     */
    public Doctor updateDoctorWithUser(Long doctorId, String bio, String specialty, Long departmentId, String status,
                                     String email, String firstName, String lastName, String phone, String avatarUrl) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bác sĩ với ID: " + doctorId));

        // Update doctor info
        if (bio != null) {
            doctor.setBio(bio);
        }
        if (specialty != null) {
            doctor.setSpecialty(specialty);
        }
        
        // Update department if provided
        if (departmentId != null) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy department với ID: " + departmentId));
            doctor.setDepartment(department);
        }
        
        // Update status if provided
        if (status != null) {
            doctor.setStatus(status);
        }

        // Update user info
        User user = doctor.getUser();
        if (user != null) {
            if (email != null && !email.trim().isEmpty()) {
                user.setEmail(email);
            }
            if (firstName != null && !firstName.trim().isEmpty()) {
                user.setFirstName(firstName);
            }
            if (lastName != null && !lastName.trim().isEmpty()) {
                user.setLastName(lastName);
            }
            if (phone != null && !phone.trim().isEmpty()) {
                user.setPhone(phone);
            }
            if (avatarUrl != null && !avatarUrl.trim().isEmpty()) {
                user.setAvatarUrl(avatarUrl);
            }
            userRepository.save(user);
        }

        return doctorRepository.save(doctor);
    }

    /**
     * Xóa doctor (soft delete)
     * @param doctorId ID của doctor
     * @throws NotFoundException nếu không tìm thấy doctor
     */
    public void deleteDoctor(Long doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bác sĩ với ID: " + doctorId));

        // Soft delete by updating both User status and Doctor status
        if (doctor.getUser() != null) {
            User user = doctor.getUser();
            user.setStatus(User.UserStatus.INACTIVE);
            userRepository.save(user);
        }
        
        // Also update Doctor status to maintain consistency
        doctor.setStatus("INACTIVE");
        doctorRepository.save(doctor);
    }


    /**
     * Lấy doctor theo userId
     * @param userId ID của user
     * @return doctor nếu tìm thấy
     * @throws NotFoundException nếu không tìm thấy doctor
     */
    @Transactional(readOnly = true)
    public Doctor getDoctorByUserId(Long userId) {
        return doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bác sĩ với userId: " + userId));
    }

    /**
     * Kiểm tra user đã có thông tin doctor chưa
     * @param userId ID của user
     * @return true nếu đã có thông tin doctor
     */
    @Transactional(readOnly = true)
    public boolean isUserDoctor(Long userId) {
        return doctorRepository.existsByUserId(userId);
    }

    /**
     * Lưu doctor entity (dành cho SmartUserController)
     * @param doctor entity doctor cần lưu
     * @return doctor đã được lưu
     */
    public Doctor saveDoctor(Doctor doctor) {
        return doctorRepository.save(doctor);
    }
    
    private Long getNextDoctorId() {
        // Simple approach: get max ID + 1
        try {
            Long maxId = doctorRepository.findMaxDoctorId().orElse(0L);
            return maxId + 1;
        } catch (Exception e) {
            return 1L; // Fallback to 1 if no doctors exist
        }
    }

    /**
     * Đăng ký bác sĩ mới (tạo cả User và Doctor)
     * @param request thông tin đăng ký bác sĩ
     * @throws ConflictException nếu email đã tồn tại
     * @throws NotFoundException nếu không tìm thấy role Doctor hoặc Department
     */
    @Transactional
    public void registerDoctor(DoctorRegisterRequest request) {
        // 🔍 DEBUG: Log request data
        System.out.println("=== REGISTER DOCTOR DEBUG ===");
        System.out.println("Email: " + request.getEmail());
        System.out.println("Avatar URL: " + request.getAvatarUrl());
        System.out.println("Department ID: " + request.getDepartmentId());
        System.out.println("=============================");
        
        // 1️⃣ Kiểm tra email đã tồn tại chưa
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email đã tồn tại: " + request.getEmail());
        }

        // 2️⃣ Lấy Role Doctor (roleId = 2)
        Role doctorRole = roleRepository.findById(2L)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy role Doctor (roleId = 2)"));
        System.out.println("Doctor Role: " + doctorRole.getName());

        // 3️⃣ Lấy Department
        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy department với ID: " + request.getDepartmentId()));
        System.out.println("Department: " + department.getDepartmentName());

        // 4️⃣ Tạo User
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setGender(request.getGender());
        user.setDateOfBirth(request.getDob());
        user.setAddress(request.getAddress());
        user.setAvatarUrl(request.getAvatarUrl());
        user.setRole(doctorRole);
        user.setStatus(User.UserStatus.ACTIVE);

        System.out.println("User Avatar URL before save: " + user.getAvatarUrl());

        // Save User first
        User savedUser = userRepository.save(user);
        entityManager.flush(); // Force flush to ensure User is persisted
        
        System.out.println("User Avatar URL after save: " + savedUser.getAvatarUrl());
        System.out.println("Saved User ID: " + savedUser.getId());
        
        // Get the persisted User ID
        Long userId = savedUser.getId();

        // 5️⃣ Tạo Doctor với User ID đã tồn tại
        createDoctorWithExistingUser(userId, request, department);
        
        System.out.println("=== REGISTER DOCTOR COMPLETED ===");
    }

    @Transactional
    private void createDoctorWithExistingUser(Long userId, DoctorRegisterRequest request, Department department) {
        // Get the User entity by ID (this ensures it's properly loaded)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found with ID: " + userId));
        
        // Refresh entities to avoid detached entity issues
        User refreshedUser = entityManager.merge(user);
        Department refreshedDepartment = entityManager.merge(department);
        entityManager.flush();

        // Get next Doctor ID
        Long nextDoctorId = getNextDoctorId();
        
        // Tạo doctor mới
        Doctor doctor = new Doctor();
        doctor.setDoctorId(nextDoctorId); // Set doctorId manually
        doctor.setUser(refreshedUser); // Set user reference
        doctor.setDepartment(refreshedDepartment); // Set department reference
        doctor.setBio(request.getBio());
        doctor.setSpecialty(request.getSpecialty());
        doctor.setDegree(request.getDegree());
        doctor.setWorkExperience(request.getWorkExperience());
        doctor.setWorkingHours(request.getWorkingHours());
        doctor.setPracticeCertificateNumber(request.getPracticeCertificateNumber());
        doctor.setCitizenId(request.getCitizenId());
        doctor.setCreatedAt(java.time.LocalDate.now()); // Set default values
        doctor.setStatus("ACTIVE");

        // Save using EntityManager
        entityManager.persist(doctor);
        entityManager.flush();
    }

    /**
     * Request DTO cho đăng ký bác sĩ
     */
    public static class DoctorRegisterRequest {
        private String email;
        private String password;
        private String firstName;
        private String lastName;
        private String phone;
        private User.Gender gender;
        private java.time.LocalDate dob;
        private String address;
        private String avatarUrl;
        private Long departmentId;
        private String specialty;
        private String bio;
        private String degree;
        private String workExperience;
        private String workingHours;
        private String practiceCertificateNumber;
        private String citizenId;

        // Getters and Setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        
        public User.Gender getGender() { return gender; }
        public void setGender(User.Gender gender) { this.gender = gender; }
        
        public java.time.LocalDate getDob() { return dob; }
        public void setDob(java.time.LocalDate dob) { this.dob = dob; }
        
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
        
        public Long getDepartmentId() { return departmentId; }
        public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }
        
        public String getSpecialty() { return specialty; }
        public void setSpecialty(String specialty) { this.specialty = specialty; }
        
        public String getBio() { return bio; }
        public void setBio(String bio) { this.bio = bio; }
        
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        
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

}