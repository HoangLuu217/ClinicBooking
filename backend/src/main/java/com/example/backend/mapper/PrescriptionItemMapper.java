package com.example.backend.mapper;

import org.springframework.stereotype.Component;

import com.example.backend.dto.PrescriptionItemDto;
import com.example.backend.model.PrescriptionItem;

@Component
public class PrescriptionItemMapper {

    public PrescriptionItemDto toDto(PrescriptionItem entity) {
        if (entity == null) {
            return null;
        }
        
        PrescriptionItemDto dto = new PrescriptionItemDto();
        dto.setItemId(entity.getItemId() != null ? Long.valueOf(entity.getItemId()) : null);
        dto.setPrescriptionId(entity.getPrescription() != null ? Long.valueOf(entity.getPrescription().getPrescriptionId()) : null);
        dto.setMedicineId(entity.getMedicine() != null ? Long.valueOf(entity.getMedicine().getMedicineId()) : null);
        dto.setMedicineName(entity.getMedicine() != null ? entity.getMedicine().getName() : null);
        dto.setDosage(entity.getDosage());
        dto.setDuration(entity.getDuration());
        dto.setNote(entity.getNote());
        
        // Map quantity from entity (default to 1 if null)
        Integer quantity = entity.getQuantity();
        dto.setQuantity(quantity != null ? quantity : 1);
        
        // Map medicine price (unit price * quantity)
        if (entity.getMedicine() != null && entity.getMedicine().getUnitPrice() != null) {
            double unitPrice = entity.getMedicine().getUnitPrice().doubleValue();
            double totalPrice = unitPrice * dto.getQuantity();
            dto.setPrice(totalPrice);
        }
        
        return dto;
    }

    public PrescriptionItem toEntity(PrescriptionItemDto dto) {
        if (dto == null) {
            return null;
        }
        
        PrescriptionItem entity = new PrescriptionItem();
        entity.setDosage(dto.getDosage());
        entity.setDuration(dto.getDuration());
        entity.setNote(dto.getNote());
        Integer quantity = dto.getQuantity();
        entity.setQuantity(quantity != null ? quantity : 1);
        // Note: Prescription and Medicine will be set in the service layer
        return entity;
    }

    public void updateEntity(PrescriptionItem entity, PrescriptionItemDto dto) {
        if (entity == null || dto == null) {
            return;
        }
        entity.setDosage(dto.getDosage());
        entity.setDuration(dto.getDuration());
        entity.setNote(dto.getNote());
        if (dto.getQuantity() != null) {
            entity.setQuantity(dto.getQuantity());
        }
    }
}