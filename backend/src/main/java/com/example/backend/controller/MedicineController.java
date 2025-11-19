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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.MedicineDto;
import com.example.backend.service.MedicineService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/medicines")
@CrossOrigin(origins = "*")
public class MedicineController {

    @Autowired
    private MedicineService medicineService;

    @GetMapping
    public ResponseEntity<List<MedicineDto>> getAllMedicines() {
        List<MedicineDto> medicines = medicineService.getAllMedicines();
        return ResponseEntity.ok(medicines);
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<MedicineDto>> getAllMedicinesPaged(Pageable pageable) {
        Page<MedicineDto> medicines = medicineService.getAllMedicines(pageable);
        return ResponseEntity.ok(medicines);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicineDto> getMedicineById(@PathVariable Integer id) {
        MedicineDto medicine = medicineService.getMedicineById(id);
        return ResponseEntity.ok(medicine);
    }

    @GetMapping("/search")
    public ResponseEntity<List<MedicineDto>> searchMedicinesByName(@RequestParam String name) {
        List<MedicineDto> medicines = medicineService.searchMedicinesByName(name);
        return ResponseEntity.ok(medicines);
    }

    @PostMapping
    public ResponseEntity<MedicineDto> createMedicine(@Valid @RequestBody MedicineDto requestDto) {
        MedicineDto createdMedicine = medicineService.createMedicine(requestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdMedicine);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicineDto> updateMedicine(@PathVariable Integer id, 
                                                    @Valid @RequestBody MedicineDto requestDto) {
        MedicineDto updatedMedicine = medicineService.updateMedicine(id, requestDto);
        return ResponseEntity.ok(updatedMedicine);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedicine(@PathVariable Integer id) {
        medicineService.deleteMedicine(id);
        return ResponseEntity.noContent().build();
    }
}