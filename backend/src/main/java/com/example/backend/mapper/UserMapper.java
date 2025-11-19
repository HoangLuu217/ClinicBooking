package com.example.backend.mapper;

import org.springframework.stereotype.Component;

import com.example.backend.dto.RoleDTO;
import com.example.backend.dto.UserDTO;
import com.example.backend.model.Role;
import com.example.backend.model.User;

@Component
public class UserMapper {

    public User createDTOToEntity(UserDTO.Create createDTO, Role role, String encodedPassword) {
        User user = new User();
        user.setEmail(createDTO.getEmail());
        user.setPasswordHash(encodedPassword);
        user.setFirstName(createDTO.getFirstName());
        user.setLastName(createDTO.getLastName());
        user.setPhone(createDTO.getPhone());
        user.setGender(createDTO.getGender());
        user.setDateOfBirth(createDTO.getDateOfBirth());
        user.setAddress(createDTO.getAddress());
        user.setAvatarUrl(createDTO.getAvatarUrl());
        user.setRole(role);
        user.setStatus(User.UserStatus.ACTIVE);
        return user;
    }

    public void updateEntityFromDTO(User user, UserDTO.Update updateDTO) {
        if (updateDTO.getEmail() != null) {
            user.setEmail(updateDTO.getEmail());
        }
        if (updateDTO.getFirstName() != null) {
            user.setFirstName(updateDTO.getFirstName());
        }
        if (updateDTO.getLastName() != null) {
            user.setLastName(updateDTO.getLastName());
        }
        if (updateDTO.getPhone() != null) {
            user.setPhone(updateDTO.getPhone());
        }
        if (updateDTO.getGender() != null) {
            user.setGender(updateDTO.getGender());
        }
        if (updateDTO.getDateOfBirth() != null) {
            user.setDateOfBirth(updateDTO.getDateOfBirth());
        }
        if (updateDTO.getAddress() != null) {
            user.setAddress(updateDTO.getAddress());
        }
        if (updateDTO.getAvatarUrl() != null) {
            user.setAvatarUrl(updateDTO.getAvatarUrl());
        }
        if (updateDTO.getStatus() != null) {
            user.setStatus(updateDTO.getStatus());
        }
    }

    public UserDTO.Response entityToResponseDTO(User user) {
        UserDTO.Response dto = new UserDTO.Response();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhone(user.getPhone());
        dto.setGender(user.getGender());
        dto.setDateOfBirth(user.getDateOfBirth());
        dto.setAddress(user.getAddress());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setStatus(user.getStatus());

        if (user.getRole() != null) {
            dto.setRole(roleToResponseDTO(user.getRole()));
        }

        return dto;
    }

    public RoleDTO.Response roleToResponseDTO(Role role) {
        RoleDTO.Response roleDTO = new RoleDTO.Response();
        roleDTO.setId(role.getId());
        roleDTO.setName(role.getName());
        roleDTO.setDescription(role.getDescription());
        return roleDTO;
    }
}