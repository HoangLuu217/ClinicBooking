package com.example.backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import com.example.backend.dto.DepartmentDTO;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.DepartmentMapper;
import com.example.backend.model.Department;
import com.example.backend.repository.DepartmentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final DepartmentMapper departmentMapper;

    @Transactional(readOnly = true)
    public Page<DepartmentDTO.Response> getAllDepartments(Pageable pageable) {
        return departmentRepository.findAll(pageable)
                .map(departmentMapper::entityToResponseDTO);
    }

    @Transactional(readOnly = true)
    public DepartmentDTO.Response getDepartmentById(Long id) {
        Department department = findDepartmentById(id);
        return departmentMapper.entityToResponseDTO(department);
    }

    @Transactional(readOnly = true)
    public DepartmentDTO.Response getDepartmentByName(String departmentName) {
        Department department = departmentRepository.findByDepartmentName(departmentName)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy khoa với tên: " + departmentName));
        return departmentMapper.entityToResponseDTO(department);
    }

    @Transactional(readOnly = true)
    public Page<DepartmentDTO.Response> searchDepartments(String departmentName, 
                                                        Department.DepartmentStatus status, 
                                                        Pageable pageable) {
        return departmentRepository.findDepartmentsWithFilters(departmentName, status, pageable)
                .map(departmentMapper::entityToResponseDTO);
    }

    @Transactional(readOnly = true)
    public Page<DepartmentDTO.Response> getActiveDepartments(Pageable pageable) {
        return departmentRepository.findByStatus(Department.DepartmentStatus.ACTIVE, pageable)
                .map(departmentMapper::entityToResponseDTO);
    }

    public DepartmentDTO.Response createDepartment(DepartmentDTO.Create createDTO) {
        validateDepartmentNameNotExists(createDTO.getDepartmentName());
        
        Department department = departmentMapper.createDTOToEntity(createDTO);
        Department savedDepartment = departmentRepository.save(department);
        
        return departmentMapper.entityToResponseDTO(savedDepartment);
    }

    public DepartmentDTO.Response updateDepartment(Long id, DepartmentDTO.Update updateDTO) {
        Department department = findDepartmentById(id);
        updateDepartmentFields(department, updateDTO);
        Department updatedDepartment = departmentRepository.save(department);
        return departmentMapper.entityToResponseDTO(updatedDepartment);
    }

    public void deleteDepartment(Long id) {
        Department department = findDepartmentById(id);
        // Soft delete - chuyển sang trạng thái CLOSED
        department.setStatus(Department.DepartmentStatus.CLOSED);
        departmentRepository.save(department);
    }

    public DepartmentDTO.Response changeStatus(Long id, Department.DepartmentStatus newStatus) {
        Department department = findDepartmentById(id);
        department.setStatus(newStatus);
        Department updatedDepartment = departmentRepository.save(department);
        return departmentMapper.entityToResponseDTO(updatedDepartment);
    }

    public void hardDeleteDepartment(Long id) {
        if (!departmentRepository.existsById(id)) {
            throw new NotFoundException("Không tìm thấy khoa với ID: " + id);
        }
        departmentRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public DepartmentDTO.Statistics getDepartmentStatistics() {
        long total = departmentRepository.count();
        long active = departmentRepository.countByStatus(Department.DepartmentStatus.ACTIVE);
        long inactive = departmentRepository.countByStatus(Department.DepartmentStatus.INACTIVE);
        long maintenance = departmentRepository.countByStatus(Department.DepartmentStatus.MAINTENANCE);
        long closed = departmentRepository.countByStatus(Department.DepartmentStatus.CLOSED);
        long withDoctors = departmentRepository.countDepartmentsWithDoctors();
        long withoutDoctors = total - withDoctors;

        return new DepartmentDTO.Statistics(
            total, active, inactive, maintenance, closed, withDoctors, withoutDoctors
        );
    }

    @Transactional(readOnly = true)
    public long getActiveDepartmentCount() {
        return departmentRepository.countByStatus(Department.DepartmentStatus.ACTIVE);
    }

    // Helper Methods
    private void validateDepartmentNameNotExists(String departmentName) {
        if (departmentRepository.existsByDepartmentName(departmentName)) {
            throw new ConflictException("Tên khoa đã tồn tại: " + departmentName);
        }
    }

    private Department findDepartmentById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy khoa với ID: " + id));
    }

    private void updateDepartmentFields(Department department, DepartmentDTO.Update updateDTO) {
        updateDepartmentNameIfChanged(department, updateDTO.getDepartmentName());
        
        if (updateDTO.getDescription() != null) {
            department.setDescription(updateDTO.getDescription());
        }
        
        if (updateDTO.getImageUrl() != null) {
            System.out.println("Updating department " + department.getId() + " imageUrl from '" + department.getImageUrl() + "' to '" + updateDTO.getImageUrl() + "'");
            department.setImageUrl(updateDTO.getImageUrl());
        }
        
        if (updateDTO.getStatus() != null) {
            department.setStatus(updateDTO.getStatus());
        }
    }

    private void updateDepartmentNameIfChanged(Department department, String newDepartmentName) {
        if (newDepartmentName != null && !newDepartmentName.equals(department.getDepartmentName())) {
            validateDepartmentNameNotExists(newDepartmentName);
            department.setDepartmentName(newDepartmentName);
        }
    }

    /**
     * Upload ảnh cho department
     * @param departmentId ID của department
     * @param file file ảnh
     * @return URL của ảnh đã upload
     */
    public String uploadDepartmentImage(Long departmentId, MultipartFile file) {
        try {
            // Kiểm tra department có tồn tại không
            Department department = findDepartmentById(departmentId);
            
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
            
            // Use the filename from frontend (already sanitized)
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isEmpty()) {
                throw new RuntimeException("Tên file không hợp lệ");
            }
            
            String filename = originalFilename;
            
            // Save file to uploads/departments directory
            String uploadDir = "uploads/departments/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Delete old images for this department
            deleteOldDepartmentImages(department, uploadPath, filename);
            
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Update department with new image URL
            String imageUrl = "/uploads/departments/" + filename;
            department.setImageUrl(imageUrl);
            departmentRepository.save(department);
            
            return imageUrl;
            
        } catch (IOException e) {
            System.err.println("IOException in uploadDepartmentImage: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Lỗi khi lưu file: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Exception in uploadDepartmentImage: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Lỗi khi upload ảnh: " + e.getMessage());
        }
    }
    
    /**
     * Xóa tất cả ảnh cũ của department
     */
    private void deleteOldDepartmentImages(Department department, Path uploadPath, String newFilename) {
        try {
            // Get filename without extension for matching
            String newFilenameWithoutExt = newFilename.substring(0, newFilename.lastIndexOf("."));
            
            // Tìm tất cả file có tên bắt đầu bằng tên file mới (không có extension)
            Files.list(uploadPath)
                .filter(path -> {
                    String fileName = path.getFileName().toString();
                    String fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
                    // Check if file starts with new filename (but not the same file)
                    return fileNameWithoutExt.equals(newFilenameWithoutExt) && !fileName.equals(newFilename);
                })
                .forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                        System.out.println("Deleted old image: " + path.getFileName());
                    } catch (IOException e) {
                        System.err.println("Error deleting old image " + path.getFileName() + ": " + e.getMessage());
                    }
                });
                
        } catch (IOException e) {
            System.err.println("Error listing files for department " + department.getId() + ": " + e.getMessage());
        }
    }
}