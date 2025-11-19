package com.example.backend.controller;

import java.util.List;

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

import com.example.backend.dto.DoctorScheduleDTO;
import com.example.backend.service.DoctorScheduleService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/doctor-schedules")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DoctorScheduleController {

    private final DoctorScheduleService doctorScheduleService;

    @PostMapping
    public ResponseEntity<DoctorScheduleDTO.Response> create(@Valid @RequestBody DoctorScheduleDTO.Create dto) {
        DoctorScheduleDTO.Response created = doctorScheduleService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DoctorScheduleDTO.Response> getById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(doctorScheduleService.getById(id));
        
    }

    @GetMapping
    public ResponseEntity<List<DoctorScheduleDTO.Response>> getByDoctor(@RequestParam("doctorId") Long doctorId) {
        return ResponseEntity.ok(doctorScheduleService.getByDoctor(doctorId, null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DoctorScheduleDTO.Response> update(@PathVariable("id") Long id,
                                                             @Valid @RequestBody DoctorScheduleDTO.Update dto) {
        return ResponseEntity.ok(doctorScheduleService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        doctorScheduleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/appointments")
    public ResponseEntity<?> getScheduleAppointments(@PathVariable("id") Long id) {
        return ResponseEntity.ok(doctorScheduleService.getScheduleAppointments(id));
    }
}


