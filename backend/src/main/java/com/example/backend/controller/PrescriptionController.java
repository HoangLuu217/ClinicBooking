package com.example.backend.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.PrescriptionDto;
import com.example.backend.service.PdfExportService;
import com.example.backend.service.PrescriptionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/prescriptions")
@CrossOrigin(origins = "*")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final PdfExportService pdfExportService;

    public PrescriptionController(
        PrescriptionService prescriptionService,
        PdfExportService pdfExportService
    ) {
        this.prescriptionService = prescriptionService;
        this.pdfExportService = pdfExportService;
    }

    @GetMapping
    public ResponseEntity<List<PrescriptionDto>> getAllPrescriptions() {
        List<PrescriptionDto> prescriptions = prescriptionService.getAllPrescriptions();
        return ResponseEntity.ok(prescriptions);
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<PrescriptionDto>> getAllPrescriptionsPaged(Pageable pageable) {
        Page<PrescriptionDto> prescriptions = prescriptionService.getAllPrescriptions(pageable);
        return ResponseEntity.ok(prescriptions);
    }

    // Specific endpoints must be declared BEFORE generic /{id} endpoint
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<PrescriptionDto>> getPrescriptionsByDoctor(@PathVariable Long doctorId) {
        try {
            System.out.println("🔍 Controller: Getting prescriptions for doctorId: " + doctorId);
            List<PrescriptionDto> prescriptions = prescriptionService.getPrescriptionsByDoctor(doctorId);
            System.out.println("✅ Controller: Returning " + prescriptions.size() + " prescriptions");
            return ResponseEntity.ok(prescriptions);
        } catch (Exception e) {
            System.err.println("❌ Controller error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/record/{recordId}")
    public ResponseEntity<List<PrescriptionDto>> getPrescriptionsByRecordId(@PathVariable Integer recordId) {
        List<PrescriptionDto> prescriptions = prescriptionService.getPrescriptionsByRecordId(recordId);
        return ResponseEntity.ok(prescriptions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionDto> getPrescriptionById(@PathVariable Integer id) {
        try {
            System.out.println("🔍 Controller: Getting prescription by ID: " + id);
            PrescriptionDto prescription = prescriptionService.getPrescriptionById(id);
            System.out.println("✅ Controller: Returning prescription: " + prescription.getPrescriptionId() + 
                             ", Items count: " + (prescription.getItems() != null ? prescription.getItems().size() : 0));
            return ResponseEntity.ok(prescription);
        } catch (Exception e) {
            System.err.println("❌ Controller error getting prescription by ID: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createPrescription(@Valid @RequestBody PrescriptionDto requestDto) {
        try {
            System.out.println("🔍 ========================================");
            System.out.println("🔍 PrescriptionController.createPrescription called");
            System.out.println("🔍 Request DTO: " + requestDto);
            System.out.println("🔍 Items count: " + (requestDto.getItems() != null ? requestDto.getItems().size() : 0));
            if (requestDto.getItems() != null) {
                requestDto.getItems().forEach(item -> {
                    System.out.println("  📦 Item: medicineId=" + item.getMedicineId() + 
                                     ", quantity=" + item.getQuantity() + 
                                     ", dosage=" + item.getDosage());
                });
            }
            System.out.println("🔍 ========================================");
            
            PrescriptionDto createdPrescription = prescriptionService.createPrescription(requestDto);
            
            System.out.println("✅ ========================================");
            System.out.println("✅ Prescription created successfully");
            System.out.println("✅ Prescription ID: " + createdPrescription.getPrescriptionId());
            System.out.println("✅ ========================================");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(createdPrescription);
        } catch (Exception e) {
            System.err.println("❌ ========================================");
            System.err.println("❌ Error in PrescriptionController.createPrescription");
            System.err.println("❌ Exception type: " + e.getClass().getName());
            System.err.println("❌ Message: " + e.getMessage());
            System.err.println("❌ ========================================");
            e.printStackTrace();
            
            // Return detailed error to frontend
            java.util.Map<String, String> errorResponse = new java.util.HashMap<>();
            errorResponse.put("error", e.getClass().getSimpleName());
            errorResponse.put("message", e.getMessage());
            errorResponse.put("detail", "Could not commit JPA transaction");
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrescriptionDto> updatePrescription(@PathVariable Integer id, 
                                                            @Valid @RequestBody PrescriptionDto requestDto) {
        PrescriptionDto updatedPrescription = prescriptionService.updatePrescription(id, requestDto);
        return ResponseEntity.ok(updatedPrescription);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrescription(@PathVariable Integer id) {
        prescriptionService.deletePrescription(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/export-pdf")
    public ResponseEntity<byte[]> exportPrescriptionPdf(@PathVariable Integer id) {
        List<String> lines = new ArrayList<>();
        lines.add("Mã đơn thuốc: #" + id);
        lines.add("Ngày lập: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        lines.add("Bệnh nhân: [Tên bệnh nhân]");
        lines.add("Bác sĩ: [Tên bác sĩ]");
        lines.add("Chẩn đoán: [Chẩn đoán]");
        lines.add("--------------------------------");
        lines.add("Thuốc 1 - Liều dùng - Số lượng");
        lines.add("Thuốc 2 - Liều dùng - Số lượng");
        lines.add("--------------------------------");
        lines.add("Lưu ý: [Ghi chú]");

        byte[] pdf = pdfExportService.generateSimplePdf("ĐƠN THUỐC", lines);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=prescription-" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}