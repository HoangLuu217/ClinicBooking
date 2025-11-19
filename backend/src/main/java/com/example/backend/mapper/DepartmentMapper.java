package com.example.backend.mapper;

import org.springframework.stereotype.Component;

import com.example.backend.dto.DepartmentDTO;
import com.example.backend.model.Department;

@Component
public class DepartmentMapper {

    public Department createDTOToEntity(DepartmentDTO.Create createDTO) {
        Department department = new Department();
        department.setDepartmentName(createDTO.getDepartmentName());
        department.setDescription(createDTO.getDescription());
        department.setImageUrl(createDTO.getImageUrl());
        department.setStatus(createDTO.getStatus() != null ? createDTO.getStatus() : Department.DepartmentStatus.ACTIVE);
        return department;
    }

    public DepartmentDTO.Response entityToResponseDTO(Department department) {
        DepartmentDTO.Response dto = new DepartmentDTO.Response();
        dto.setId(department.getId());
        dto.setDepartmentName(department.getDepartmentName());
        dto.setDescription(department.getDescription());
        dto.setImageUrl(department.getImageUrl());
        dto.setStatus(department.getStatus());
        return dto;
    }

    public void updateEntityFromDTO(Department department, DepartmentDTO.Update updateDTO) {
        if (updateDTO.getDepartmentName() != null) {
            department.setDepartmentName(updateDTO.getDepartmentName());
        }
        if (updateDTO.getDescription() != null) {
            department.setDescription(updateDTO.getDescription());
        }
        if (updateDTO.getImageUrl() != null) {
            department.setImageUrl(updateDTO.getImageUrl());
        }
        if (updateDTO.getStatus() != null) {
            department.setStatus(updateDTO.getStatus());
        }
    }
}