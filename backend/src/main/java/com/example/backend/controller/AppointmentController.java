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

import com.example.backend.dto.AppointmentDTO;
import com.example.backend.service.AppointmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    public ResponseEntity<List<AppointmentDTO.Response>> getAll() {
        return ResponseEntity.ok(appointmentService.getAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody AppointmentDTO.Create dto) {
        AppointmentDTO.Response created = appointmentService.create(dto);
        // Chỉ tạo appointment, không tạo payment
        // Payment sẽ được tạo khi bệnh nhân đặt lịch
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(java.util.Map.of(
                "appointment", created,
                "message", "Appointment created successfully"
            ));
    }

    @PostMapping("/bulk")
    public ResponseEntity<AppointmentDTO.BulkCreateResponse> bulkCreate(@Valid @RequestBody AppointmentDTO.BulkCreate bulkCreate) {
        AppointmentDTO.BulkCreateResponse response = appointmentService.bulkCreate(bulkCreate);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =====================================================================
    // QUAN TRỌNG: Các endpoint CỤ THỂ phải đặt TRƯỚC {id}
    // Nếu không, Spring sẽ match "/available-slots" với "/{id}"
    // và cố parse "available-slots" thành Long → LỖI
    // =====================================================================
    
    @GetMapping("/by-patient")
    public ResponseEntity<List<AppointmentDTO.Response>> getByPatient(@RequestParam("patientId") Long patientId) {
        return ResponseEntity.ok(appointmentService.getByPatient(patientId));
    }

    @GetMapping("/by-doctor")
    public ResponseEntity<List<AppointmentDTO.Response>> getByDoctor(@RequestParam("doctorId") Long doctorId) {
        return ResponseEntity.ok(appointmentService.getByDoctor(doctorId));
    }

    @GetMapping("/available-slots")
    public ResponseEntity<List<AppointmentDTO.Response>> getAvailableSlots(
            @RequestParam("doctorId") Long doctorId,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate) {
        // Nếu có date range, sử dụng query tối ưu
        if (startDate != null && endDate != null) {
            java.time.LocalDateTime start = java.time.LocalDateTime.parse(startDate);
            java.time.LocalDateTime end = java.time.LocalDateTime.parse(endDate);
            return ResponseEntity.ok(appointmentService.getAvailableSlotsByDoctorAndDateRange(doctorId, start, end));
        }
        // Nếu không có date range, trả về tất cả (backward compatible)
        return ResponseEntity.ok(appointmentService.getAvailableSlotsByDoctor(doctorId));
    }

    @GetMapping("/by-patient-and-doctor")
    public ResponseEntity<List<AppointmentDTO.Response>> getAppointmentsByPatientAndDoctor(
            @RequestParam("patientId") Long patientId,
            @RequestParam("doctorId") Long doctorId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByPatientAndDoctor(patientId, doctorId));
    }

    // =====================================================================
    // Endpoints với PATH VARIABLE - Phải đặt SAU
    // =====================================================================
    
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentDTO.Response> getById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(appointmentService.getById(id));
    }

    @PutMapping("/{id}/book")
    public ResponseEntity<AppointmentDTO.Response> bookAppointment(@PathVariable("id") Long id,
                                                                   @RequestBody BookAppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.bookAppointment(id, request.getPatientId(), request.getNotes()));
    }

    // Inner class để nhận request book appointment
    public static class BookAppointmentRequest {
        private Long patientId;
        private String notes;

        public Long getPatientId() { return patientId; }
        public void setPatientId(Long patientId) { this.patientId = patientId; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentDTO.Response> update(@PathVariable("id") Long id,
                                                          @Valid @RequestBody AppointmentDTO.Update dto) {
        return ResponseEntity.ok(appointmentService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<AppointmentDTO.Response> delete(@PathVariable("id") Long id) {
        AppointmentDTO.Response updated = appointmentService.cancelAppointment(id);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<String> permanentDelete(@PathVariable("id") Long id) {
        appointmentService.permanentDelete(id);
        return ResponseEntity.ok("Đã xóa khung giờ thành công");
    }
}
