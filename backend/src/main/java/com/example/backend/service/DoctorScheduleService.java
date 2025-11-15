package com.example.backend.service;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.DoctorScheduleDTO;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.DoctorScheduleMapper;
import com.example.backend.model.Doctor;
import com.example.backend.model.DoctorSchedule;
import com.example.backend.model.Appointment;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.DoctorScheduleRepository;
import com.example.backend.repository.AppointmentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class DoctorScheduleService {

    private final DoctorScheduleRepository doctorScheduleRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleMapper doctorScheduleMapper;
    private final AppointmentRepository appointmentRepository;

    public DoctorScheduleDTO.Response create(DoctorScheduleDTO.Create dto) {
        log.info("🔍 DoctorScheduleService.create called - doctorId: {}, workDate: {}, startTime: {}, endTime: {}", 
                dto.getDoctorId(), dto.getWorkDate(), dto.getStartTime(), dto.getEndTime());
        
        try {
            // Validate doctor exists
            log.info("🔍 Finding doctor with ID: {}", dto.getDoctorId());
            Doctor doctor = findDoctor(dto.getDoctorId());
            log.info("✅ Doctor found: {}", doctor.getDoctorId());
            
            // Validate time range
            log.info("🔍 Validating time range: {} - {}", dto.getStartTime(), dto.getEndTime());
            validateTimeRange(dto.getStartTime(), dto.getEndTime());
            log.info("✅ Time range is valid");
            
            // Validate no overlap
            log.info("🔍 Checking for overlapping schedules");
            validateNoOverlap(dto.getDoctorId(), dto.getWorkDate(), dto.getStartTime(), dto.getEndTime());
            log.info("✅ No overlap found");
            
            // Create entity
            log.info("🔍 Creating DoctorSchedule entity");
            DoctorSchedule entity = doctorScheduleMapper.createDTOToEntity(dto, doctor);
            log.info("✅ Entity created - doctor: {}, workDate: {}, startTime: {}, endTime: {}", 
                    entity.getDoctor() != null ? entity.getDoctor().getDoctorId() : "null",
                    entity.getWorkDate(), entity.getStartTime(), entity.getEndTime());
            
            // Save to database
            log.info("🔍 Saving to database");
            DoctorSchedule saved = doctorScheduleRepository.save(entity);
            log.info("✅ Saved successfully - scheduleId: {}", saved.getScheduleId());
            
            // Convert to response DTO
            log.info("🔍 Converting to response DTO");
            DoctorScheduleDTO.Response response = doctorScheduleMapper.entityToResponseDTO(saved);
            log.info("✅ Response DTO created - scheduleId: {}", response.getScheduleId());
            
            return response;
            
        } catch (Exception e) {
            log.error("❌ Error in DoctorScheduleService.create: {}", e.getMessage(), e);
            throw e; // Re-throw to be handled by controller
        }
    }

    @Transactional(readOnly = true)
    public DoctorScheduleDTO.Response getById(Long scheduleId) {
        DoctorSchedule entity = findSchedule(scheduleId);
        return doctorScheduleMapper.entityToResponseDTO(entity);
    }

    @Transactional(readOnly = true)
    public List<DoctorScheduleDTO.Response> getByDoctor(Long doctorId, String status) {
        List<DoctorSchedule> list = (status == null || status.isBlank())
                ? doctorScheduleRepository.findByDoctor_DoctorId(doctorId)
                : doctorScheduleRepository.findByDoctor_DoctorIdAndStatus(doctorId, status);
        
        // Load appointment counts efficiently in a single query
        List<Long> scheduleIds = list.stream().map(DoctorSchedule::getScheduleId).toList();
        List<Appointment> appointments = appointmentRepository.findBySchedule_ScheduleIdIn(scheduleIds);
        
        // Create count map: scheduleId -> count
        Map<Long, Long> appointmentCountMap = appointments.stream()
                .collect(Collectors.groupingBy(
                    apt -> apt.getSchedule().getScheduleId(),
                    Collectors.counting()
                ));
        
        // Map to DTOs with appointment counts
        return list.stream().map(schedule -> {
            DoctorScheduleDTO.Response response = doctorScheduleMapper.entityToResponseDTO(schedule);
            response.setAppointmentCount(appointmentCountMap.getOrDefault(schedule.getScheduleId(), 0L));
            return response;
        }).toList();
    }

    public DoctorScheduleDTO.Response update(Long scheduleId, DoctorScheduleDTO.Update dto) {
        DoctorSchedule entity = findSchedule(scheduleId);

        if (dto.getStartTime() != null || dto.getEndTime() != null || dto.getWorkDate() != null) {
            LocalTime newStart = dto.getStartTime() != null ? dto.getStartTime() : entity.getStartTime();
            LocalTime newEnd = dto.getEndTime() != null ? dto.getEndTime() : entity.getEndTime();
            validateTimeRange(newStart, newEnd);
            java.time.LocalDate newDate = dto.getWorkDate() != null ? dto.getWorkDate() : entity.getWorkDate();
            validateNoOverlap(entity.getDoctor().getDoctorId(), newDate, newStart, newEnd, entity.getScheduleId());
        }

        doctorScheduleMapper.applyUpdateToEntity(entity, dto);
        DoctorSchedule saved = doctorScheduleRepository.save(entity);
        
        return doctorScheduleMapper.entityToResponseDTO(saved);
    }

    public List<Appointment> getScheduleAppointments(Long scheduleId) {
        return appointmentRepository.findBySchedule_ScheduleId(scheduleId);
    }


    public void delete(Long scheduleId) {
        DoctorSchedule entity = findSchedule(scheduleId);
        
        // Xóa schedule
        doctorScheduleRepository.delete(entity);
        System.out.println("Schedule " + scheduleId + " deleted successfully");
    }

    // Helpers
    private Doctor findDoctor(Long doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bác sĩ với ID: " + doctorId));
    }

    private DoctorSchedule findSchedule(Long scheduleId) {
        return doctorScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch với ID: " + scheduleId));
    }

    private void validateTimeRange(LocalTime start, LocalTime end) {
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
    }

    private void validateNoOverlap(Long doctorId, java.time.LocalDate date, LocalTime start, LocalTime end) {
        List<DoctorSchedule> sameDay = doctorScheduleRepository.findByDoctor_DoctorIdAndWorkDate(doctorId, date);
        boolean overlaps = sameDay.stream()
                .anyMatch(ds -> start.isBefore(ds.getEndTime()) && end.isAfter(ds.getStartTime()));
        if (overlaps) {
            throw new IllegalArgumentException("Khoảng thời gian bị trùng với lịch khác");
        }
    }

    private void validateNoOverlap(Long doctorId, java.time.LocalDate date, LocalTime start, LocalTime end, Long excludeScheduleId) {
        List<DoctorSchedule> sameDay = doctorScheduleRepository.findByDoctor_DoctorIdAndWorkDate(doctorId, date);
        boolean overlaps = sameDay.stream()
                .filter(ds -> !ds.getScheduleId().equals(excludeScheduleId))
                .anyMatch(ds -> start.isBefore(ds.getEndTime()) && end.isAfter(ds.getStartTime()));
        if (overlaps) {
            throw new IllegalArgumentException("Khoảng thời gian bị trùng với lịch khác");
        }
    }
}


