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

import com.example.backend.dto.ReviewDTO;
import com.example.backend.service.ReviewService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ResponseEntity<List<ReviewDTO.Response>> getAll() {
        return ResponseEntity.ok(reviewService.getAll());
    }

    @GetMapping("/all")
    public ResponseEntity<List<ReviewDTO.Response>> getAllExplicit() {
        return ResponseEntity.ok(reviewService.getAll());
    }

    @GetMapping("/by-appointment/{appointmentId}")
    public ResponseEntity<ReviewDTO.Response> getByAppointment(@PathVariable("appointmentId") Long appointmentId) {
        return ResponseEntity.ok(reviewService.getByAppointment(appointmentId));
    }
    @PostMapping
    public ResponseEntity<ReviewDTO.Response> create(@Valid @RequestBody ReviewDTO.Create dto) {
        ReviewDTO.Response created = reviewService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ReviewDTO.Response> getById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(reviewService.getById(id));
    }

    @GetMapping("/by-patient")
    public ResponseEntity<List<ReviewDTO.Response>> getByPatient(@RequestParam("patientId") Long patientId) {
        return ResponseEntity.ok(reviewService.getByPatient(patientId));
    }

    @GetMapping("/by-doctor")
    public ResponseEntity<List<ReviewDTO.Response>> getByDoctor(@RequestParam("doctorId") Long doctorId) {
        return ResponseEntity.ok(reviewService.getByDoctor(doctorId));
    }

    @GetMapping("/active/by-doctor")
    public ResponseEntity<List<ReviewDTO.Response>> getActiveReviewsByDoctor(@RequestParam("doctorId") Long doctorId) {
        return ResponseEntity.ok(reviewService.getActiveReviewsByDoctor(doctorId));
    }

    @GetMapping("/average-rating/by-doctor")
    public ResponseEntity<Double> getAverageRatingByDoctor(@RequestParam("doctorId") Long doctorId) {
        Double averageRating = reviewService.getAverageRatingByDoctor(doctorId);
        return ResponseEntity.ok(averageRating != null ? averageRating : 0.0);
    }

    @GetMapping("/count/by-doctor")
    public ResponseEntity<Long> getReviewCountByDoctor(@RequestParam("doctorId") Long doctorId) {
        return ResponseEntity.ok(reviewService.getReviewCountByDoctor(doctorId));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<ReviewDTO.Response> update(@PathVariable("id") Long id,
                                                    @Valid @RequestBody ReviewDTO.Update dto) {
        return ResponseEntity.ok(reviewService.update(id, dto));
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        reviewService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id:\\d+}/deactivate")
    public ResponseEntity<ReviewDTO.Response> deactivateReview(@PathVariable("id") Long id) {
        ReviewDTO.Response updated = reviewService.deactivateReview(id);
        return ResponseEntity.ok(updated);
    }
}

