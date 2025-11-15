package com.example.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/doctor-schedules")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DoctorScheduleController {

    private final DoctorScheduleService doctorScheduleService;

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody DoctorScheduleDTO.Create dto) {
        try {
            log.info("🔍 Creating doctor schedule - doctorId: {}, workDate: {}, startTime: {}, endTime: {}", 
                    dto.getDoctorId(), dto.getWorkDate(), dto.getStartTime(), dto.getEndTime());
            
            DoctorScheduleDTO.Response created = doctorScheduleService.create(dto);
            
            log.info("✅ Doctor schedule created successfully - scheduleId: {}", created.getScheduleId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
            
        } catch (IllegalArgumentException e) {
            log.error("❌ Validation error: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
            
        } catch (com.example.backend.exception.NotFoundException e) {
            log.error("❌ Not found error: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            
        } catch (Exception e) {
            log.error("❌ Error creating doctor schedule: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi tạo lịch làm việc: " + e.getMessage());
            errorResponse.put("detail", e.getClass().getName());
            
            if (e.getCause() != null) {
                log.error("❌ Caused by: {}", e.getCause().getMessage());
                errorResponse.put("cause", e.getCause().getMessage());
            }
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
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


