package com.example.backend.mapper;

import org.springframework.stereotype.Component;

import com.example.backend.dto.MedicineDto;
import com.example.backend.model.Medicine;

@Component
public class MedicineMapper {

    public MedicineDto toDto(Medicine entity) {
        if (entity == null) {
            return null;
        }
        return new MedicineDto(
            entity.getMedicineId(),
            entity.getName(),
            entity.getStrength(),
            entity.getUnitPrice(),
            entity.getNote()
        );
    }

    public Medicine toEntity(MedicineDto dto) {
        if (dto == null) {
            return null;
        }
        Medicine entity = new Medicine();
        entity.setName(dto.getName());
        entity.setStrength(dto.getStrength());
        entity.setUnitPrice(dto.getUnitPrice());
        entity.setNote(dto.getNote());
        return entity;
    }

    public void updateEntity(Medicine entity, MedicineDto dto) {
        if (entity == null || dto == null) {
            return;
        }
        entity.setName(dto.getName());
        entity.setStrength(dto.getStrength());
        entity.setUnitPrice(dto.getUnitPrice());
        entity.setNote(dto.getNote());
    }
}