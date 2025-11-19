package com.example.backend.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Department;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByDepartmentName(String departmentName);

    boolean existsByDepartmentName(String departmentName);

    Page<Department> findByStatus(Department.DepartmentStatus status, Pageable pageable);

    @Query("SELECT d FROM Department d WHERE " +
           "(:departmentName IS NULL OR LOWER(d.departmentName) LIKE LOWER(CONCAT('%', :departmentName, '%'))) AND " +
           "(:status IS NULL OR d.status = :status)")
    Page<Department> findDepartmentsWithFilters(
            @Param("departmentName") String departmentName,
            @Param("status") Department.DepartmentStatus status,
            Pageable pageable
    );

    @Query("SELECT COUNT(d) FROM Department d WHERE d.status = 'ACTIVE'")
    long countByStatus(Department.DepartmentStatus status);

    @Query("SELECT COUNT(d) FROM Department d WHERE d.id IN " +
           "(SELECT DISTINCT doc.department.id FROM Doctor doc)")
    long countDepartmentsWithDoctors();
}