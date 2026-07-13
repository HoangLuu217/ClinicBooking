package com.example.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.model.Department;
import com.example.backend.model.Doctor;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.model.User.UserStatus;
import com.example.backend.repository.DepartmentRepository;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Checking and seeding default users (Admin and Doctor)...");

        // 1. Ensure Roles exist
        Role adminRole = getOrCreateRole("Admin", "Quản trị hệ thống");
        Role doctorRole = getOrCreateRole("Doctor", "Bác sĩ có thể khám, tạo lịch trình, quản lý bệnh án");
        Role patientRole = getOrCreateRole("Patient", "Bệnh nhân có thể đặt lịch và trò chuyện với bác sĩ");

        // 2. Ensure a default Department exists for Doctor
        Department defaultDept;
        if (departmentRepository.count() == 0) {
            defaultDept = new Department();
            defaultDept.setDepartmentName("Nội tổng hợp");
            defaultDept.setDescription("Khoa Nội tổng hợp - Khám và điều trị các bệnh lý nội khoa thường gặp");
            defaultDept.setImageUrl("/uploads/departments/noi_tong_hop.jpg");
            defaultDept.setStatus(Department.DepartmentStatus.ACTIVE);
            defaultDept = departmentRepository.save(defaultDept);
            log.info("Created default department: Nội tổng hợp");
        } else {
            defaultDept = departmentRepository.findAll().get(0);
        }

        // 3. Create Default Admin
        String adminEmail = "admin@clinic.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode("adminPassword123"));
            admin.setFirstName("System");
            admin.setLastName("Admin");
            admin.setPhone("0123456789");
            admin.setGender(User.Gender.MALE);
            admin.setDateOfBirth(LocalDate.of(1990, 1, 1));
            admin.setAddress("Hà Nội, Việt Nam");
            admin.setRole(adminRole);
            admin.setStatus(UserStatus.ACTIVE);
            userRepository.save(admin);
            log.info("Seeded default Admin: {}", adminEmail);
        } else {
            log.info("Admin user already exists. Skipping seeding.");
        }

        // 4. Create Default Doctor
        String doctorEmail = "doctor@clinic.com";
        if (!userRepository.existsByEmail(doctorEmail)) {
            User docUser = new User();
            docUser.setEmail(doctorEmail);
            docUser.setPasswordHash(passwordEncoder.encode("doctorPassword123"));
            docUser.setFirstName("John");
            docUser.setLastName("Doe");
            docUser.setPhone("0987654321");
            docUser.setGender(User.Gender.MALE);
            docUser.setDateOfBirth(LocalDate.of(1985, 5, 15));
            docUser.setAddress("Hồ Chí Minh, Việt Nam");
            docUser.setRole(doctorRole);
            docUser.setStatus(UserStatus.ACTIVE);
            User savedDocUser = userRepository.save(docUser);

            // Create corresponding Doctor details
            Long nextDoctorId = getNextDoctorId();
            Doctor doctor = new Doctor();
            doctor.setDoctorId(nextDoctorId);
            doctor.setUser(savedDocUser);
            doctor.setDepartment(defaultDept);
            doctor.setSpecialty("Nội tổng hợp");
            doctor.setBio("Bác sĩ chuyên khoa Nội tổng hợp với hơn 10 năm kinh nghiệm khám chữa bệnh.");
            doctor.setDegree("Thạc sĩ Y khoa");
            doctor.setWorkExperience("10 năm kinh nghiệm tại các bệnh viện lớn.");
            doctor.setWorkingHours("Thứ 2 - Thứ 6 (8:00 - 17:00)");
            doctor.setPracticeCertificateNumber("CCHN-123456");
            doctor.setCitizenId("012345678912");
            doctor.setCreatedAt(LocalDate.now());
            doctor.setStatus("ACTIVE");
            doctorRepository.save(doctor);
            log.info("Seeded default Doctor: {} with doctorId {}", doctorEmail, nextDoctorId);
        } else {
            log.info("Doctor user already exists. Skipping seeding.");
        }
    }

    private Role getOrCreateRole(String name, String description) {
        Optional<Role> roleOpt = roleRepository.findByName(name);
        if (roleOpt.isPresent()) {
            return roleOpt.get();
        }
        Role role = new Role();
        role.setName(name);
        role.setDescription(description);
        Role savedRole = roleRepository.save(role);
        log.info("Created role: {}", name);
        return savedRole;
    }

    private Long getNextDoctorId() {
        try {
            Long maxId = doctorRepository.findMaxDoctorId().orElse(0L);
            return maxId + 1;
        } catch (Exception e) {
            return 1L;
        }
    }
}
