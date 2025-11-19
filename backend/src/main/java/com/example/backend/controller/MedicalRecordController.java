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

import com.example.backend.dto.MedicalRecordDto;
import com.example.backend.service.MedicalRecordService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/medical-records")
@CrossOrigin(origins = "*")
public class MedicalRecordController {

    @Autowired
    private MedicalRecordService medicalRecordService;

    @GetMapping
    public ResponseEntity<List<MedicalRecordDto>> getAllMedicalRecords() {
        List<MedicalRecordDto> records = medicalRecordService.getAllMedicalRecords();
        return ResponseEntity.ok(records);
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<MedicalRecordDto>> getAllMedicalRecordsPaged(Pageable pageable) {
        Page<MedicalRecordDto> records = medicalRecordService.getAllMedicalRecords(pageable);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecordDto> getMedicalRecordById(@PathVariable Integer id) {
        MedicalRecordDto record = medicalRecordService.getMedicalRecordById(id);
        return ResponseEntity.ok(record);
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<MedicalRecordDto>> getMedicalRecordsByAppointmentId(@PathVariable Long appointmentId) {
        List<MedicalRecordDto> records = medicalRecordService.getMedicalRecordsByAppointmentId(appointmentId);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<MedicalRecordDto>> getMedicalRecordsByDoctor(@PathVariable Long doctorId) {
        try {
            if (doctorId == null) {
                return ResponseEntity.badRequest().build();
            }
            List<MedicalRecordDto> records = medicalRecordService.getMedicalRecordsByDoctor(doctorId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            System.err.println("❌ Error getting medical records for doctorId " + doctorId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<MedicalRecordDto>> getMedicalRecordsByPatient(@PathVariable Long patientId) {
        List<MedicalRecordDto> records = medicalRecordService.getMedicalRecordsByPatient(patientId);
        return ResponseEntity.ok(records);
    }

    @PostMapping
    public ResponseEntity<MedicalRecordDto> createMedicalRecord(@Valid @RequestBody MedicalRecordDto requestDto) {
        MedicalRecordDto createdRecord = medicalRecordService.createMedicalRecord(requestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRecord);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicalRecordDto> updateMedicalRecord(@PathVariable Integer id, 
                                                              @Valid @RequestBody MedicalRecordDto requestDto) {
        MedicalRecordDto updatedRecord = medicalRecordService.updateMedicalRecord(id, requestDto);
        return ResponseEntity.ok(updatedRecord);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedicalRecord(@PathVariable Integer id) {
        medicalRecordService.deleteMedicalRecord(id);
        return ResponseEntity.noContent().build();
    }
}