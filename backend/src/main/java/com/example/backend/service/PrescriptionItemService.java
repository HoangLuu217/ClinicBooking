package com.example.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.PrescriptionItemDto;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.PrescriptionItemMapper;
import com.example.backend.model.Medicine;
import com.example.backend.model.Prescription;
import com.example.backend.model.PrescriptionItem;
import com.example.backend.repository.MedicineRepository;
import com.example.backend.repository.PrescriptionItemRepository;
import com.example.backend.repository.PrescriptionRepository;

@Service
@Transactional
public class PrescriptionItemService {

    @Autowired
    private PrescriptionItemRepository prescriptionItemRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private PrescriptionItemMapper prescriptionItemMapper;

    public List<PrescriptionItemDto> getAllPrescriptionItems() {
        return prescriptionItemRepository.findAll().stream()
                .map(prescriptionItemMapper::toDto)
                .collect(Collectors.toList());
    }

    public Page<PrescriptionItemDto> getAllPrescriptionItems(Pageable pageable) {
        return prescriptionItemRepository.findAll(pageable)
                .map(prescriptionItemMapper::toDto);
    }

    public PrescriptionItemDto getPrescriptionItemById(Integer id) {
        PrescriptionItem item = prescriptionItemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Prescription Item not found with id: " + id));
        return prescriptionItemMapper.toDto(item);
    }

    public List<PrescriptionItemDto> getPrescriptionItemsByPrescriptionId(Integer prescriptionId) {
        return prescriptionItemRepository.findByPrescriptionPrescriptionId(prescriptionId).stream()
                .map(prescriptionItemMapper::toDto)
                .collect(Collectors.toList());
    }

    public List<PrescriptionItemDto> getPrescriptionItemsByMedicineId(Integer medicineId) {
        return prescriptionItemRepository.findByMedicineMedicineId(medicineId).stream()
                .map(prescriptionItemMapper::toDto)
                .collect(Collectors.toList());
    }

    public PrescriptionItemDto createPrescriptionItem(Integer prescriptionId, PrescriptionItemDto requestDto) {
        // Validate prescription exists
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new NotFoundException("Prescription not found with id: " + prescriptionId));

        // Validate medicine exists
        Medicine medicine = medicineRepository.findById(requestDto.getMedicineId().intValue())
                .orElseThrow(() -> new NotFoundException("Medicine not found with id: " + requestDto.getMedicineId()));

        PrescriptionItem item = prescriptionItemMapper.toEntity(requestDto);
        item.setPrescription(prescription);
        item.setMedicine(medicine);

        PrescriptionItem savedItem = prescriptionItemRepository.save(item);
        return prescriptionItemMapper.toDto(savedItem);
    }

    public PrescriptionItemDto updatePrescriptionItem(Integer id, PrescriptionItemDto requestDto) {
        PrescriptionItem existingItem = prescriptionItemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Prescription Item not found with id: " + id));

        // Update medicine if changed
        if (requestDto.getMedicineId() != null && 
            !requestDto.getMedicineId().equals(Long.valueOf(existingItem.getMedicine().getMedicineId()))) {
            Medicine medicine = medicineRepository.findById(requestDto.getMedicineId().intValue())
                    .orElseThrow(() -> new NotFoundException("Medicine not found with id: " + requestDto.getMedicineId()));
            existingItem.setMedicine(medicine);
        }

        prescriptionItemMapper.updateEntity(existingItem, requestDto);
        PrescriptionItem updatedItem = prescriptionItemRepository.save(existingItem);
        return prescriptionItemMapper.toDto(updatedItem);
    }

    public void deletePrescriptionItem(Integer id) {
        if (!prescriptionItemRepository.existsById(id)) {
            throw new NotFoundException("Prescription Item not found with id: " + id);
        }
        prescriptionItemRepository.deleteById(id);
    }
}