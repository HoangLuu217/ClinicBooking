package com.example.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.backend.dto.PrescriptionDto;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.PrescriptionMapper;
import com.example.backend.model.MedicalRecord;
import com.example.backend.model.Medicine;
import com.example.backend.model.Prescription;
import com.example.backend.model.PrescriptionItem;
import com.example.backend.repository.AppointmentRepository;
import com.example.backend.repository.MedicalRecordRepository;
import com.example.backend.repository.MedicineRepository;
import com.example.backend.repository.PrescriptionItemRepository;
import com.example.backend.repository.PrescriptionRepository;

@Service
public class PrescriptionService {

    @Autowired
    private PrescriptionRepository prescriptionRepository;
    
    @Autowired
    private PrescriptionItemRepository prescriptionItemRepository;

    @Autowired
    private MedicalRecordRepository medicalRecordRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private MedicalRecordService medicalRecordService;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private PrescriptionMapper prescriptionMapper;

    public List<PrescriptionDto> getAllPrescriptions() {
        return prescriptionRepository.findAllWithDetails().stream()
                .map(prescriptionMapper::toDto)
                .collect(Collectors.toList());
    }

    public Page<PrescriptionDto> getAllPrescriptions(Pageable pageable) {
        return prescriptionRepository.findAll(pageable)
                .map(prescriptionMapper::toDto);
    }

    public PrescriptionDto getPrescriptionById(Integer id) {
        try {
            System.out.println("🔍 Getting prescription by ID: " + id);
            
            // Try to load with details first
            Prescription prescription = prescriptionRepository.findByIdWithDetails(id)
                    .orElse(null);
            
            // If not found with details, try regular findById
            if (prescription == null) {
                System.out.println("⚠️ Not found with details, trying regular findById...");
                prescription = prescriptionRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException("Prescription not found with id: " + id));
                
                // Load items separately
                System.out.println("🔍 Loading items for prescription " + id + "...");
                List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionPrescriptionId(id);
                System.out.println("📦 Items from repository: " + (items != null ? items.size() : 0));
                if (items != null && !items.isEmpty()) {
                    items.forEach(item -> {
                        System.out.println("  - Item ID: " + item.getItemId() + 
                                         ", Medicine: " + (item.getMedicine() != null ? item.getMedicine().getName() : "null"));
                    });
                }
                prescription.setItems(items != null ? items : new ArrayList<>());
                System.out.println("✅ Loaded " + (items != null ? items.size() : 0) + " items separately");
            } else {
                // Ensure items are not null
                if (prescription.getItems() == null) {
                    System.out.println("⚠️ Items is null, setting empty list");
                    prescription.setItems(new ArrayList<>());
                } else {
                    System.out.println("📦 Items from JOIN FETCH: " + prescription.getItems().size());
                    if (!prescription.getItems().isEmpty()) {
                        prescription.getItems().forEach(item -> {
                            System.out.println("  - Item ID: " + item.getItemId() + 
                                             ", Medicine: " + (item.getMedicine() != null ? item.getMedicine().getName() : "null"));
                        });
                    }
                }
                System.out.println("✅ Loaded with details, has " + prescription.getItems().size() + " items");
            }
            
            return prescriptionMapper.toDto(prescription);
        } catch (Exception e) {
            System.err.println("❌ Error getting prescription by ID: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to get prescription: " + e.getMessage(), e);
        }
    }

    public List<PrescriptionDto> getPrescriptionsByRecordId(Integer recordId) {
        return prescriptionRepository.findByMedicalRecordRecordId(recordId).stream()
                .map(prescriptionMapper::toDto)
                .collect(Collectors.toList());
    }

    public List<PrescriptionDto> getPrescriptionsByDoctor(Long doctorId) {
        try {
            System.out.println("🔍 Getting prescriptions for doctorId: " + doctorId);
            List<Prescription> prescriptions = prescriptionRepository.findByDoctorId(doctorId);
            System.out.println("📊 Found " + prescriptions.size() + " prescriptions");
            
            // Check items loaded from JOIN FETCH
            for (Prescription p : prescriptions) {
                try {
                    Integer prescriptionId = p.getPrescriptionId();
                    if (prescriptionId == null) {
                        System.err.println("⚠️ Prescription has null ID");
                        if (p.getItems() == null) {
                            p.setItems(new ArrayList<>());
                        }
                        continue;
                    }
                    
                    // Items should already be loaded by JOIN FETCH, but ensure they're not null
                    if (p.getItems() == null) {
                        System.out.println("⚠️ Prescription " + prescriptionId + " has null items, loading separately");
                        List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionPrescriptionId(prescriptionId);
                        p.setItems(items != null ? items : new ArrayList<>());
                    }
                    
                    int itemsCount = p.getItems() != null ? p.getItems().size() : 0;
                    System.out.println("🔍 Prescription " + prescriptionId + " has " + itemsCount + " items");
                    
                    if (itemsCount > 0) {
                        p.getItems().forEach(item -> {
                            System.out.println("  - Item: " + item.getItemId() + 
                                ", Medicine: " + (item.getMedicine() != null ? item.getMedicine().getName() : "null"));
                        });
                    }
                } catch (Exception e) {
                    System.err.println("❌ Error processing prescription " + p.getPrescriptionId() + ": " + e.getMessage());
                    e.printStackTrace();
                    // Set empty list on error to prevent null pointer
                    if (p.getItems() == null) {
                        p.setItems(new ArrayList<>());
                    }
                }
            }
            
            List<PrescriptionDto> dtos = prescriptions.stream()
                    .map(prescriptionMapper::toDto)
                    .collect(Collectors.toList());
            
            System.out.println("✅ Mapped to " + dtos.size() + " DTOs");
            if (!dtos.isEmpty()) {
                PrescriptionDto firstDto = dtos.get(0);
                System.out.println("📋 First prescription: " + firstDto.getPrescriptionId() + 
                                 ", Patient: " + firstDto.getPatientName() +
                                 ", Items count: " + (firstDto.getItems() != null ? firstDto.getItems().size() : 0));
            }
            
            return dtos;
        } catch (Exception e) {
            System.err.println("❌ Fatal error in getPrescriptionsByDoctor: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to get prescriptions for doctor: " + e.getMessage(), e);
        }
    }

    public PrescriptionDto createPrescription(PrescriptionDto requestDto) {
        System.out.println("🔍 ========================================");
        System.out.println("🔍 Creating prescription with data: " + requestDto);
        System.out.println("🔍 RecordId: " + requestDto.getRecordId());
        System.out.println("🔍 AppointmentId: " + requestDto.getAppointmentId());
        System.out.println("🔍 Items count: " + (requestDto.getItems() != null ? requestDto.getItems().size() : 0));
        
        // VALIDATE ALL MEDICINES EXIST FIRST
        if (requestDto.getItems() != null && !requestDto.getItems().isEmpty()) {
            System.out.println("🔍 Validating medicines exist...");
            for (var itemDto : requestDto.getItems()) {
                Long medicineId = itemDto.getMedicineId();
                System.out.println("  🔍 Checking medicine ID: " + medicineId);
                boolean exists = medicineRepository.existsById(medicineId.intValue());
                if (!exists) {
                    String errorMsg = "Medicine not found with ID: " + medicineId;
                    System.err.println("❌ " + errorMsg);
                    throw new NotFoundException(errorMsg);
                }
                System.out.println("  ✅ Medicine " + medicineId + " exists");
            }
            System.out.println("✅ All medicines validated successfully");
        }
        
        // Ensure medical record exists. If recordId is not provided, attempt to find or create one from appointmentId
        MedicalRecord medicalRecord = null;
        if (requestDto.getRecordId() == null) {
            Long appointmentId = requestDto.getAppointmentId();
            
            if (appointmentId == null) {
                throw new IllegalArgumentException("Either recordId or appointmentId must be provided");
            }

            System.out.println("🔍 RecordId not provided, checking for existing medical record with appointmentId: " + appointmentId);
            
            // Try to find existing medical record for this appointment
            var existing = medicalRecordRepository.findByAppointmentAppointmentId(appointmentId);
            if (existing != null && !existing.isEmpty()) {
                medicalRecord = existing.get(0);
                requestDto.setRecordId(Long.valueOf(medicalRecord.getRecordId()));
                System.out.println("✅ Found existing medical record with ID: " + medicalRecord.getRecordId());
                
                // Update medical record with new data
                boolean needUpdate = false;
                if (requestDto.getNotes() != null && !requestDto.getNotes().trim().isEmpty()) {
                    medicalRecord.setDiagnosis(requestDto.getNotes());
                    needUpdate = true;
                }
                if (requestDto.getAdvice() != null && !requestDto.getAdvice().trim().isEmpty()) {
                    medicalRecord.setAdvice(requestDto.getAdvice());
                    needUpdate = true;
                }
                if (needUpdate) {
                    try {
                        medicalRecord = medicalRecordRepository.save(medicalRecord);
                        System.out.println("✅ Updated existing medical record");
                    } catch (Exception ex) {
                        System.err.println("⚠️ Failed to update medical record: " + ex.getMessage());
                    }
                }
            } else {
                // Create new medical record for this appointment
                System.out.println("🔍 No existing medical record found, creating new one for appointmentId: " + appointmentId);
                
                try {
                    // Validate appointment exists
                    var appointment = appointmentRepository.findById(appointmentId)
                            .orElseThrow(() -> new NotFoundException("Appointment not found with id: " + appointmentId));
                    
                    // Create minimal medical record
                    medicalRecord = new MedicalRecord();
                    medicalRecord.setAppointment(appointment);
                    medicalRecord.setDiagnosis(requestDto.getNotes() != null ? requestDto.getNotes() : "Kê đơn thuốc");
                    medicalRecord.setAdvice(requestDto.getAdvice() != null ? requestDto.getAdvice() : "");
                    medicalRecord.setCreatedAt(java.time.LocalDateTime.now());
                    
                    medicalRecord = medicalRecordRepository.saveAndFlush(medicalRecord);
                    requestDto.setRecordId(Long.valueOf(medicalRecord.getRecordId()));
                    System.out.println("✅ Created new medical record with ID: " + medicalRecord.getRecordId());
                } catch (Exception ex) {
                    System.err.println("❌ Failed to create medical record: " + ex.getMessage());
                    ex.printStackTrace();
                    throw new RuntimeException("Cannot create medical record: " + ex.getMessage(), ex);
                }
            }
        } else {
            // Validate medical record exists
            System.out.println("🔍 RecordId provided: " + requestDto.getRecordId() + ", validating...");
            medicalRecord = medicalRecordRepository.findById(requestDto.getRecordId().intValue())
                    .orElseThrow(() -> new NotFoundException("Medical Record not found with id: " + requestDto.getRecordId()));
            System.out.println("✅ Medical record validated successfully");
            
            // Update medical record with new data
            boolean needUpdate = false;
            if (requestDto.getNotes() != null && !requestDto.getNotes().trim().isEmpty()) {
                medicalRecord.setDiagnosis(requestDto.getNotes());
                needUpdate = true;
            }
            if (requestDto.getAdvice() != null && !requestDto.getAdvice().trim().isEmpty()) {
                medicalRecord.setAdvice(requestDto.getAdvice());
                needUpdate = true;
            }
            if (needUpdate) {
                try {
                    medicalRecord = medicalRecordRepository.save(medicalRecord);
                    System.out.println("✅ Updated medical record");
                } catch (Exception ex) {
                    System.err.println("⚠️ Failed to update medical record: " + ex.getMessage());
                }
            }
        }

        // Check if this medical record already has a prescription (OneToOne relationship)
        final Integer recordId = medicalRecord.getRecordId();
        System.out.println("🔍 Checking for existing prescription with recordId: " + recordId);
        
        // Check for existing prescription
        List<Prescription> existingPrescriptions = prescriptionRepository.findByMedicalRecordRecordId(recordId);
        
        if (existingPrescriptions != null && !existingPrescriptions.isEmpty()) {
            Prescription oldPrescription = existingPrescriptions.get(0);
            System.out.println("⚠️ Found existing prescription ID: " + oldPrescription.getPrescriptionId());
            System.out.println("🗑️ DELETING old prescription and items...");
            
            // Delete old prescription completely (items will be cascade deleted)
            try {
                prescriptionRepository.delete(oldPrescription);
                prescriptionRepository.flush();
                System.out.println("✅ Old prescription deleted successfully");
            } catch (Exception delEx) {
                System.err.println("❌ Failed to delete old prescription: " + delEx.getMessage());
                delEx.printStackTrace();
            }
        }
        
        // CREATE NEW PRESCRIPTION
        System.out.println("✅ Creating NEW prescription for medical record: " + recordId);
        Prescription prescription = new Prescription();
        prescription.setMedicalRecord(medicalRecord);
        prescription.setNotes(requestDto.getNotes());
        prescription.setCreatedAt(java.time.LocalDateTime.now());
        
        // Create prescription items
        List<PrescriptionItem> items = new ArrayList<>();
        if (requestDto.getItems() != null && !requestDto.getItems().isEmpty()) {
            System.out.println("� Creating " + requestDto.getItems().size() + " prescription items...");
            for (var itemDto : requestDto.getItems()) {
                Medicine medicine = medicineRepository.findById(itemDto.getMedicineId().intValue())
                        .orElseThrow(() -> new NotFoundException("Medicine not found with id: " + itemDto.getMedicineId()));

                PrescriptionItem item = new PrescriptionItem();
                item.setPrescription(prescription);
                item.setMedicine(medicine);
                item.setDosage(itemDto.getDosage());
                item.setDuration(itemDto.getDuration());
                item.setNote(itemDto.getNote());
                Integer quantity = itemDto.getQuantity();
                item.setQuantity(quantity != null ? quantity : 1);
                items.add(item);
                System.out.println("  ✅ Prepared item: " + medicine.getName() + " x " + (quantity != null ? quantity : 1));
            }
        }
        prescription.setItems(items);

        // SAVE PRESCRIPTION FIRST WITHOUT CASCADE - then save items separately
        System.out.println("💾 Step 1: Saving prescription WITHOUT items...");
        try {
            // Temporarily clear items to save prescription alone
            prescription.setItems(new ArrayList<>());
            prescription = prescriptionRepository.saveAndFlush(prescription);
            System.out.println("✅ Prescription saved with ID: " + prescription.getPrescriptionId());
        } catch (Exception ex) {
            System.err.println("❌ FAILED to save prescription:");
            System.err.println("  Error: " + ex.getClass().getName());
            System.err.println("  Message: " + ex.getMessage());
            if (ex.getCause() != null) {
                System.err.println("  Cause: " + ex.getCause().getClass().getName() + " - " + ex.getCause().getMessage());
            }
            ex.printStackTrace();
            throw new RuntimeException("Cannot save prescription: " + (ex.getMessage() != null ? ex.getMessage() : ex.getClass().getName()), ex);
        }
        
        // NOW save items separately
        System.out.println("💾 Step 2: Saving " + items.size() + " prescription items...");
        List<PrescriptionItem> savedItems = new ArrayList<>();
        for (PrescriptionItem item : items) {
            try {
                // Ensure prescription reference is set
                item.setPrescription(prescription);
                PrescriptionItem savedItem = prescriptionItemRepository.saveAndFlush(item);
                savedItems.add(savedItem);
                System.out.println("  ✅ Saved item " + savedItem.getItemId());
            } catch (Exception itemEx) {
                System.err.println("  ❌ Failed to save item: " + itemEx.getMessage());
                itemEx.printStackTrace();
            }
        }
        System.out.println("✅ Saved " + savedItems.size() + "/" + items.size() + " items");
        
        // Reload prescription with items
        System.out.println("💾 Step 3: Reloading...");
        try {
            Prescription reloaded = prescriptionRepository.findById(prescription.getPrescriptionId())
                    .orElseThrow(() -> new NotFoundException("Cannot reload"));
            PrescriptionDto result = prescriptionMapper.toDto(reloaded);
            System.out.println("✅✅✅ SUCCESS! Prescription ID: " + result.getPrescriptionId());
            return result;
        } catch (Exception reloadEx) {
            System.err.println("⚠️ Reload failed");
            prescription.setItems(savedItems);
            return prescriptionMapper.toDto(prescription);
        }
    }

    public PrescriptionDto updatePrescription(Integer id, PrescriptionDto requestDto) {
        Prescription existingPrescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Prescription not found with id: " + id));

        // Update basic fields (notes)
        prescriptionMapper.updateEntity(existingPrescription, requestDto);

        // Update medical record diagnosis if notes is provided (sync notes with diagnosis)
        if (requestDto.getNotes() != null && existingPrescription.getMedicalRecord() != null) {
            MedicalRecord medicalRecord = existingPrescription.getMedicalRecord();
            medicalRecord.setDiagnosis(requestDto.getNotes());
            medicalRecordRepository.save(medicalRecord);
        }

        // Update medical record if changed
        if (requestDto.getRecordId() != null && 
            !requestDto.getRecordId().equals(Long.valueOf(existingPrescription.getMedicalRecord().getRecordId()))) {
            MedicalRecord medicalRecord = medicalRecordRepository.findById(requestDto.getRecordId().intValue())
                    .orElseThrow(() -> new NotFoundException("Medical Record not found with id: " + requestDto.getRecordId()));
            existingPrescription.setMedicalRecord(medicalRecord);
        }

        // Update prescription items only if items are provided and not empty (don't recreate if not needed)
        // If items is null or empty, keep existing items unchanged
        if (requestDto.getItems() != null && !requestDto.getItems().isEmpty()) {
            existingPrescription.getItems().clear();
            List<PrescriptionItem> newItems = new ArrayList<>();
            for (var itemDto : requestDto.getItems()) {
                Medicine medicine = medicineRepository.findById(itemDto.getMedicineId().intValue())
                        .orElseThrow(() -> new NotFoundException("Medicine not found with id: " + itemDto.getMedicineId()));

                PrescriptionItem item = new PrescriptionItem();
                item.setPrescription(existingPrescription);
                item.setMedicine(medicine);
                item.setDosage(itemDto.getDosage());
                item.setDuration(itemDto.getDuration());
                item.setNote(itemDto.getNote());
                // Set quantity if provided, otherwise default to 1
                item.setQuantity(itemDto.getQuantity() != null ? itemDto.getQuantity() : 1);
                newItems.add(item);
            }
            existingPrescription.setItems(newItems);
        }

        Prescription updatedPrescription = prescriptionRepository.save(existingPrescription);
        return prescriptionMapper.toDto(updatedPrescription);
    }

    public void deletePrescription(Integer id) {
        if (!prescriptionRepository.existsById(id)) {
            throw new NotFoundException("Prescription not found with id: " + id);
        }
        prescriptionRepository.deleteById(id);
    }
}