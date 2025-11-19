package com.example.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Patient;

/**
 * Repository interface cho Patient entity
 * Chứa các query methods để truy vấn dữ liệu bệnh nhân
 */
@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    
    /**
     * Tìm patient theo ID
     */
    Optional<Patient> findByPatientId(Long patientId);
    
    /**
     * Lấy tất cả patient với thông tin User và Role
     * Query join 3 bảng: Patient -> User -> Role
     */
    @Query("SELECT p FROM Patient p " +
           "JOIN FETCH p.user u " +
           "JOIN FETCH u.role r " +
           "WHERE u.status = 'ACTIVE' " +
           "ORDER BY u.firstName, u.lastName")
    List<Patient> findAllWithUserAndRole();
    
    /**
     * Tìm patient theo tên (firstName hoặc lastName chứa keyword)
     */
    @Query("SELECT p FROM Patient p " +
           "JOIN FETCH p.user u " +
           "JOIN FETCH u.role r " +
           "WHERE (LOWER(u.firstName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :keyword, '%')))" +
           "AND u.status = 'ACTIVE' " +
           "ORDER BY u.firstName, u.lastName")
    List<Patient> findByNameContainingWithUserAndRole(@Param("keyword") String keyword);
    
    /**
     * Tìm patient theo số bảo hiểm y tế
     */
    @Query("SELECT p FROM Patient p " +
           "JOIN FETCH p.user u " +
           "JOIN FETCH u.role r " +
           "WHERE p.healthInsuranceNumber = :insuranceNumber " +
           "AND u.status = 'ACTIVE'")
    Optional<Patient> findByHealthInsuranceNumberWithUserAndRole(@Param("insuranceNumber") String insuranceNumber);
    
    /**
     * Tìm patient theo email
     */
    @Query("SELECT p FROM Patient p " +
           "JOIN FETCH p.user u " +
           "JOIN FETCH u.role r " +
           "WHERE u.email = :email " +
           "AND u.status = 'ACTIVE'")
    Optional<Patient> findByEmailWithUserAndRole(@Param("email") String email);
    
    /**
     * Kiểm tra xem user đã có thông tin patient chưa
     */
    boolean existsByPatientId(Long patientId);
    
    /**
     * Tìm Patient ID lớn nhất
     */
    @Query("SELECT MAX(p.patientId) FROM Patient p")
    Optional<Long> findMaxPatientId();
    
    /**
     * Tìm patient theo userId với thông tin User và Role
     */
    @Query("SELECT p FROM Patient p " +
           "JOIN FETCH p.user u " +
           "JOIN FETCH u.role r " +
           "WHERE p.user.id = :userId")
    Optional<Patient> findByUserIdWithUserAndRole(@Param("userId") Long userId);
}


