package com.example.backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.PrescriptionItemDto;
import com.example.backend.service.PrescriptionItemService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/prescription-items")
@CrossOrigin(origins = "*")
public class PrescriptionItemController {

    @Autowired
    private PrescriptionItemService prescriptionItemService;

    @GetMapping
    public ResponseEntity<List<PrescriptionItemDto>> getAllPrescriptionItems() {
        List<PrescriptionItemDto> items = prescriptionItemService.getAllPrescriptionItems();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<PrescriptionItemDto>> getAllPrescriptionItemsPaged(Pageable pageable) {
        Page<PrescriptionItemDto> items = prescriptionItemService.getAllPrescriptionItems(pageable);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionItemDto> getPrescriptionItemById(@PathVariable Integer id) {
        PrescriptionItemDto item = prescriptionItemService.getPrescriptionItemById(id);
        return ResponseEntity.ok(item);
    }

    @GetMapping("/prescription/{prescriptionId}")
    public ResponseEntity<List<PrescriptionItemDto>> getPrescriptionItemsByPrescriptionId(@PathVariable Integer prescriptionId) {
        List<PrescriptionItemDto> items = prescriptionItemService.getPrescriptionItemsByPrescriptionId(prescriptionId);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/medicine/{medicineId}")
    public ResponseEntity<List<PrescriptionItemDto>> getPrescriptionItemsByMedicineId(@PathVariable Integer medicineId) {
        List<PrescriptionItemDto> items = prescriptionItemService.getPrescriptionItemsByMedicineId(medicineId);
        return ResponseEntity.ok(items);
    }

    @PostMapping("/prescription/{prescriptionId}")
    public ResponseEntity<PrescriptionItemDto> createPrescriptionItem(@PathVariable Integer prescriptionId,
                                                                    @Valid @RequestBody PrescriptionItemDto requestDto) {
        PrescriptionItemDto createdItem = prescriptionItemService.createPrescriptionItem(prescriptionId, requestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdItem);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrescriptionItemDto> updatePrescriptionItem(@PathVariable Integer id, 
                                                                    @Valid @RequestBody PrescriptionItemDto requestDto) {
        PrescriptionItemDto updatedItem = prescriptionItemService.updatePrescriptionItem(id, requestDto);
        return ResponseEntity.ok(updatedItem);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrescriptionItem(@PathVariable Integer id) {
        prescriptionItemService.deletePrescriptionItem(id);
        return ResponseEntity.noContent().build();
    }
}