package com.example.backend.mapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.example.backend.dto.DoctorDTO;
import com.example.backend.model.Department;
import com.example.backend.model.Doctor;
import com.example.backend.model.User;

@Component
public class DoctorMapper {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private DepartmentMapper departmentMapper;

    public Doctor createDTOToEntity(DoctorDTO.Create createDTO, User user, Department department) {
        Doctor doctor = new Doctor();
        doctor.setDoctorId(user.getId());
        doctor.setUser(user);
        doctor.setDepartment(department);
        doctor.setSpecialty(createDTO.getSpecialty());
        doctor.setBio(createDTO.getBio());
        // Status is managed by User entity, not Doctor entity
        return doctor;
    }

    public DoctorDTO.Response entityToResponseDTO(Doctor doctor) {
        DoctorDTO.Response dto = new DoctorDTO.Response();
        dto.setDoctorId(doctor.getDoctorId());
        dto.setSpecialty(doctor.getSpecialty());
        dto.setBio(doctor.getBio());
        // createdAt and status are managed by User entity, not Doctor entity
        // dto.setCreatedAt(doctor.getUser().getCreatedAt());
        // dto.setStatus(doctor.getUser().getStatus().toString());

        if (doctor.getUser() != null) {
            dto.setUser(userMapper.entityToResponseDTO(doctor.getUser()));
        }

        if (doctor.getDepartment() != null) {
            dto.setDepartment(departmentMapper.entityToResponseDTO(doctor.getDepartment()));
        }

        return dto;
    }

    public void updateEntityFromDTO(Doctor doctor, DoctorDTO.Update updateDTO) {
        if (updateDTO.getSpecialty() != null) {
            doctor.setSpecialty(updateDTO.getSpecialty());
        }
        if (updateDTO.getBio() != null) {
            doctor.setBio(updateDTO.getBio());
        }
        // Status is managed by User entity, not Doctor entity
        // if (updateDTO.getStatus() != null) {
        //     doctor.getUser().setStatus(User.UserStatus.valueOf(updateDTO.getStatus()));
        // }
    }
}
