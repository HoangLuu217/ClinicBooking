package com.example.backend.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

import com.example.backend.constant.AppConstants;
import com.example.backend.dto.DepartmentDTO;
import com.example.backend.model.Department;
import com.example.backend.service.DepartmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public ResponseEntity<Page<DepartmentDTO.Response>> getAllDepartments(
            @PageableDefault(size = AppConstants.DEFAULT_PAGE_SIZE, sort = "departmentName") Pageable pageable) {
        Page<DepartmentDTO.Response> departments = departmentService.getAllDepartments(pageable);
        return ResponseEntity.ok(departments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentDTO.Response> getDepartmentById(@PathVariable Long id) {
        DepartmentDTO.Response department = departmentService.getDepartmentById(id);
        return ResponseEntity.ok(department);
    }

    @GetMapping("/name/{departmentName}")
    public ResponseEntity<DepartmentDTO.Response> getDepartmentByName(@PathVariable String departmentName) {
        DepartmentDTO.Response department = departmentService.getDepartmentByName(departmentName);
        return ResponseEntity.ok(department);
    }

    @GetMapping("/search")
    public ResponseEntity<Page<DepartmentDTO.Response>> searchDepartments(
            @RequestParam(required = false) String departmentName,
            @RequestParam(required = false) Department.DepartmentStatus status,
            @PageableDefault(size = AppConstants.DEFAULT_PAGE_SIZE, sort = "departmentName") Pageable pageable) {
        
        Page<DepartmentDTO.Response> departments = departmentService.searchDepartments(departmentName, status, pageable);
        return ResponseEntity.ok(departments);
    }

    @PostMapping
    public ResponseEntity<DepartmentDTO.Response> createDepartment(@Valid @RequestBody DepartmentDTO.Create createDTO) {
        DepartmentDTO.Response createdDepartment = departmentService.createDepartment(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdDepartment);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepartmentDTO.Response> updateDepartment(
            @PathVariable Long id,
            @Valid @RequestBody DepartmentDTO.Update updateDTO) {
        DepartmentDTO.Response updatedDepartment = departmentService.updateDepartment(id, updateDTO);
        return ResponseEntity.ok(updatedDepartment);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        departmentService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<DepartmentDTO.Response> changeStatus(
            @PathVariable Long id,
            @RequestParam Department.DepartmentStatus status) {
        DepartmentDTO.Response updatedDepartment = departmentService.changeStatus(id, status);
        return ResponseEntity.ok(updatedDepartment);
    }

    @GetMapping("/statistics")
    public ResponseEntity<DepartmentDTO.Statistics> getStatistics() {
        DepartmentDTO.Statistics stats = departmentService.getDepartmentStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/active")
    public ResponseEntity<Page<DepartmentDTO.Response>> getActiveDepartments(
            @PageableDefault(size = AppConstants.DEFAULT_PAGE_SIZE, sort = "departmentName") Pageable pageable) {
        Page<DepartmentDTO.Response> departments = departmentService.getActiveDepartments(pageable);
        return ResponseEntity.ok(departments);
    }

    @PostMapping("/{id}/upload-image")
    public ResponseEntity<Map<String, Object>> uploadDepartmentImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        System.out.println("=== DEPARTMENT UPLOAD ENDPOINT CALLED ===");
        System.out.println("Department ID: " + id);
        System.out.println("File: " + (file != null ? file.getOriginalFilename() : "null"));
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate file
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("message", "File không được để trống");
                return ResponseEntity.badRequest().body(response);
            }

            // Check file size (5MB limit)
            if (file.getSize() > 5 * 1024 * 1024) {
                response.put("success", false);
                response.put("message", "Kích thước file không được vượt quá 5MB");
                return ResponseEntity.badRequest().body(response);
            }

            // Check file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                response.put("success", false);
                response.put("message", "File phải là ảnh");
                return ResponseEntity.badRequest().body(response);
            }

            // Upload image and update department
            String imageUrl = departmentService.uploadDepartmentImage(id, file);
            
            response.put("success", true);
            response.put("message", "Upload ảnh thành công");
            response.put("imageUrl", imageUrl);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Exception in uploadDepartmentImage endpoint: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Lỗi khi upload ảnh: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}