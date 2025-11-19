package com.example.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.RoleDTO;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.NotFoundException;
import com.example.backend.model.Role;
import com.example.backend.repository.RoleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class RoleService {

    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public List<RoleDTO.Response> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoleDTO.Response getRoleById(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò với ID: " + id));
        return convertToResponseDTO(role);
    }

    @Transactional(readOnly = true)
    public RoleDTO.Response getRoleByName(String name) {
        Role role = roleRepository.findByName(name)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò với tên: " + name));
        return convertToResponseDTO(role);
    }

    public RoleDTO.Response createRole(RoleDTO.Create createDTO) {
        // Kiểm tra tên vai trò đã tồn tại
        if (roleRepository.findByName(createDTO.getName()).isPresent()) {
            throw new ConflictException("Tên vai trò đã tồn tại: " + createDTO.getName());
        }

        Role role = new Role();
        role.setName(createDTO.getName());
        role.setDescription(createDTO.getDescription());

        Role savedRole = roleRepository.save(role);
        return convertToResponseDTO(savedRole);
    }

    private RoleDTO.Response convertToResponseDTO(Role role) {
        RoleDTO.Response dto = new RoleDTO.Response();
        dto.setId(role.getId());
        dto.setName(role.getName());
        dto.setDescription(role.getDescription());
        return dto;
    }
}