package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "Departments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DepartmentID")
    private Long id;

    @NotBlank(message = "Tên khoa không được để trống")
    @Size(max = 100, message = "Tên khoa không được quá 100 ký tự")
    @Column(name = "DepartmentName", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String departmentName;

    @Size(max = 255, message = "Mô tả không được quá 255 ký tự")
    @Column(name = "Description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Size(max = 500, message = "URL ảnh không được quá 500 ký tự")
    @Column(name = "ImageUrl")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "Status")
    private DepartmentStatus status = DepartmentStatus.ACTIVE;

    public enum DepartmentStatus {
        ACTIVE,      // Khoa đang hoạt động bình thường
        INACTIVE,    // Khoa đang bảo trì (sử dụng thay cho MAINTENANCE)
        MAINTENANCE, // Khoa đang bảo trì (giữ để tương thích ngược)
        CLOSED       // Khoa đã ngừng hoạt động hoàn toàn
    }
}