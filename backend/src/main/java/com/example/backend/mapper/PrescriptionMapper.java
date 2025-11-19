package com.example.backend.mapper;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.example.backend.dto.PrescriptionDto;
import com.example.backend.model.Prescription;

@Component
public class PrescriptionMapper {

    @Autowired
    private PrescriptionItemMapper prescriptionItemMapper;

    public PrescriptionDto toDto(Prescription entity) {
        if (entity == null) {
            return null;
        }
        
        try {
            PrescriptionDto dto = new PrescriptionDto();
            dto.setPrescriptionId(entity.getPrescriptionId() != null ? Long.valueOf(entity.getPrescriptionId()) : null);
            dto.setRecordId(entity.getMedicalRecord() != null ? Long.valueOf(entity.getMedicalRecord().getRecordId()) : null);
            dto.setNotes(entity.getNotes());
            dto.setCreatedAt(entity.getCreatedAt());
            dto.setCreatedDate(entity.getCreatedAt()); // Alias for frontend compatibility
        
        // Map patient information from MedicalRecord -> Appointment -> Patient
        if (entity.getMedicalRecord() != null && entity.getMedicalRecord().getAppointment() != null) {
            var appointment = entity.getMedicalRecord().getAppointment();
            
            // Set appointmentId
            if (appointment.getAppointmentId() != null) {
                dto.setAppointmentId(appointment.getAppointmentId());
            }
            
            // Map patient info
            if (appointment.getPatient() != null) {
                dto.setPatientId((long) appointment.getPatient().getPatientId());
                
                // Build patient name from User entity
                if (appointment.getPatient().getUser() != null) {
                    String lastName = appointment.getPatient().getUser().getLastName() != null 
                        ? appointment.getPatient().getUser().getLastName() : "";
                    String firstName = appointment.getPatient().getUser().getFirstName() != null 
                        ? appointment.getPatient().getUser().getFirstName() : "";
                    dto.setPatientName((lastName + " " + firstName).trim());
                }
            }
            
            // Map doctor info
            if (appointment.getDoctor() != null) {
                dto.setDoctorId((long) appointment.getDoctor().getDoctorId());
                
                // Build doctor name from User entity
                if (appointment.getDoctor().getUser() != null) {
                    String lastName = appointment.getDoctor().getUser().getLastName() != null 
                        ? appointment.getDoctor().getUser().getLastName() : "";
                    String firstName = appointment.getDoctor().getUser().getFirstName() != null 
                        ? appointment.getDoctor().getUser().getFirstName() : "";
                    dto.setDoctorName((lastName + " " + firstName).trim());
                }
            }
            
            // Map diagnosis from MedicalRecord
            dto.setDiagnosis(entity.getMedicalRecord().getDiagnosis());
        }
        
        // Map prescription items and calculate total amount
        // Always set items array, even if empty
        if (entity.getItems() != null && !entity.getItems().isEmpty()) {
            System.out.println("🔍 Mapping " + entity.getItems().size() + " prescription items");
            dto.setItems(entity.getItems().stream()
                .map(item -> {
                    var itemDto = prescriptionItemMapper.toDto(item);
                    System.out.println("📋 Mapped item: " + itemDto.getMedicineName() + ", dosage: " + itemDto.getDosage());
                    return itemDto;
                })
                .collect(Collectors.toList()));
            
            // Calculate total amount from items (unit price * quantity for each item)
            double total = entity.getItems().stream()
                .filter(item -> item.getMedicine() != null && item.getMedicine().getUnitPrice() != null)
                .mapToDouble(item -> {
                    double unitPrice = item.getMedicine().getUnitPrice().doubleValue();
                    Integer quantityValue = item.getQuantity();
                    int quantity = (quantityValue != null) ? quantityValue : 1;
                    return unitPrice * quantity;
                })
                .sum();
            dto.setTotalAmount(total);
            System.out.println("✅ Total amount: " + total);
        } else {
            System.out.println("⚠️ No prescription items found - setting empty list");
            dto.setItems(java.util.Collections.emptyList()); // Always set empty list instead of null
            dto.setTotalAmount(0.0);
        }
        
            return dto;
        } catch (Exception e) {
            System.err.println("❌ Error mapping Prescription to DTO: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to map Prescription to DTO: " + e.getMessage(), e);
        }
    }

    public Prescription toEntity(PrescriptionDto dto) {
        if (dto == null) {
            return null;
        }
        
        Prescription entity = new Prescription();
        entity.setNotes(dto.getNotes());
        // Set createdAt when creating new entity (always set for new entities)
        entity.setCreatedAt(LocalDateTime.now());
        // Note: MedicalRecord will be set in the service layer
        return entity;
    }

    public void updateEntity(Prescription entity, PrescriptionDto dto) {
        if (entity == null || dto == null) {
            return;
        }
        entity.setNotes(dto.getNotes());
        // createdAt should not be updated when updating existing prescription
    }
}