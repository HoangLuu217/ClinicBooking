package com.example.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Doctor;

/**
 * Repository interface cho Doctor entity
 * Chứa các query methods để truy vấn dữ liệu bác sĩ
 */
@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    
    /**
     * Tìm doctor theo ID
     */
    Optional<Doctor> findByDoctorId(Long doctorId);
    
    /**
     * Lấy tất cả doctor với thông tin User và Role
     * Query join 3 bảng: Doctor -> User -> Role
     */
    @Query("SELECT d FROM Doctor d " +
           "LEFT JOIN FETCH d.user u " +
           "LEFT JOIN FETCH u.role r")
    List<Doctor> findAllWithUserAndRole();
    
    /**
     * Tìm doctor theo specialty
     */
    @Query("SELECT d FROM Doctor d " +
           "LEFT JOIN FETCH d.user u " +
           "LEFT JOIN FETCH u.role r " +
           "WHERE d.specialty = :specialty " +
           "AND d.status = 'ACTIVE' " +
           "ORDER BY u.firstName, u.lastName")
    List<Doctor> findBySpecialtyWithUserAndRole(@Param("specialty") String specialty);
    
    /**
     * Tìm doctor theo department
     */
    @Query("SELECT d FROM Doctor d " +
           "LEFT JOIN FETCH d.user u " +
           "LEFT JOIN FETCH u.role r " +
           "LEFT JOIN FETCH d.department dept " +
           "WHERE dept.id = :departmentId " +
           "AND d.status = 'ACTIVE' " +
           "ORDER BY u.firstName, u.lastName")
    List<Doctor> findByDepartmentWithUserAndRole(@Param("departmentId") Long departmentId);
    
    /**
     * Tìm doctor theo tên (firstName hoặc lastName chứa keyword)
     */
    @Query("SELECT d FROM Doctor d " +
           "LEFT JOIN FETCH d.user u " +
           "LEFT JOIN FETCH u.role r " +
           "WHERE (LOWER(u.firstName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :keyword, '%')))" +
           "AND d.status = 'ACTIVE' " +
           "ORDER BY u.firstName, u.lastName")
    List<Doctor> findByNameContainingWithUserAndRole(@Param("keyword") String keyword);
    
    /**
     * Kiểm tra xem user đã có thông tin doctor chưa
     */
    boolean existsByUserId(Long userId);
    
    /**
     * Tìm Doctor ID lớn nhất
     */
    @Query("SELECT MAX(d.doctorId) FROM Doctor d")
    Optional<Long> findMaxDoctorId();
    
    /**
     * Tìm doctor theo userId
     */
    Optional<Doctor> findByUserId(Long userId);
}


