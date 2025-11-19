package com.example.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.AppointmentDTO;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.AppointmentMapper;
import com.example.backend.model.Appointment;
import com.example.backend.model.Doctor;
import com.example.backend.model.DoctorSchedule;
import com.example.backend.model.Patient;
import com.example.backend.model.SystemNotification;
import com.example.backend.repository.AppointmentRepository;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.DoctorScheduleRepository;
import com.example.backend.repository.PatientRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository doctorScheduleRepository;
    private final AppointmentMapper appointmentMapper;
    private final EmailService emailService;
    private final EmailTemplateService emailTemplateService;
    private final SystemNotificationService systemNotificationService;

    public AppointmentDTO.Response create(AppointmentDTO.Create dto) {
        // Cho phép patient null khi bác sĩ tạo slot trống
        Patient patient = null;
        if (dto.getPatientId() != null) {
            patient = patientRepository.findById(dto.getPatientId())
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy bệnh nhân với ID: " + dto.getPatientId()));
        }
        
        Doctor doctor = doctorRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bác sĩ với ID: " + dto.getDoctorId()));
        
        // ScheduleID là BẮT BUỘC - Appointment phải thuộc về một DoctorSchedule
        DoctorSchedule schedule = doctorScheduleRepository.findById(dto.getScheduleId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + dto.getScheduleId()));
        
        // Validate: Schedule phải thuộc về doctor này
        if (!schedule.getDoctor().getDoctorId().equals(dto.getDoctorId())) {
            throw new IllegalStateException("Lịch trình không thuộc về bác sĩ này");
        }
        
        // Validate: Schedule phải Available
        if (!"Available".equals(schedule.getStatus())) {
            throw new IllegalStateException("Lịch trình không khả dụng");
        }
        
        // Validate: Appointment phải nằm TRONG khoảng thời gian của DoctorSchedule
        java.time.LocalDate scheduleDate = schedule.getWorkDate();
        java.time.LocalTime scheduleStartTime = schedule.getStartTime();
        java.time.LocalTime scheduleEndTime = schedule.getEndTime();
        
        java.time.LocalDate appointmentDate = dto.getStartTime().toLocalDate();
        java.time.LocalTime appointmentStartTime = dto.getStartTime().toLocalTime();
        java.time.LocalTime appointmentEndTime = dto.getEndTime().toLocalTime();
        
        // Kiểm tra ngày phải trùng
        if (!appointmentDate.equals(scheduleDate)) {
            throw new IllegalStateException(
                "Ngày khám (" + appointmentDate + ") phải trùng với ngày làm việc (" + scheduleDate + ")"
            );
        }
        
        // Kiểm tra giờ phải nằm trong khoảng
        if (appointmentStartTime.isBefore(scheduleStartTime)) {
            throw new IllegalStateException(
                "Giờ bắt đầu (" + appointmentStartTime + ") phải sau giờ bắt đầu làm việc (" + scheduleStartTime + ")"
            );
        }
        
        if (appointmentEndTime.isAfter(scheduleEndTime)) {
            throw new IllegalStateException(
                "Giờ kết thúc (" + appointmentEndTime + ") phải trước giờ kết thúc làm việc (" + scheduleEndTime + ")"
            );
        }
        
        // =====================================================================
        // Validate: Không cho phép tạo khung giờ trùng lặp
        // Kiểm tra xem đã có appointment nào của bác sĩ này trong khoảng thời gian này chưa
        // =====================================================================
        List<Appointment> existingAppointments = appointmentRepository.findByDoctor_DoctorId(dto.getDoctorId());
        for (Appointment existing : existingAppointments) {
            // Kiểm tra overlap: 
            // Appointment mới overlap nếu startTime < existing.endTime VÀ endTime > existing.startTime
            if (dto.getStartTime().isBefore(existing.getEndTime()) && 
                dto.getEndTime().isAfter(existing.getStartTime())) {
                throw new IllegalStateException(
                    String.format("Khung giờ bị trùng với appointment đã tồn tại (ID: %d) từ %s đến %s",
                        existing.getAppointmentId(),
                        existing.getStartTime(),
                        existing.getEndTime()
                    )
                );
            }
        }

        Appointment entity = appointmentMapper.createDTOToEntity(dto, patient, doctor, schedule);
        Appointment saved = appointmentRepository.save(entity);

        return appointmentMapper.entityToResponseDTO(saved);
    }

    // Helper to send notification emails for appointment events
    private void notifyPatient(Appointment appointment, String subject, String body) {
        if (appointment == null || appointment.getPatient() == null || appointment.getPatient().getUser() == null) return;
        String email = appointment.getPatient().getUser().getEmail();
        String patientName = appointment.getPatient().getUser().getFirstName() + " " + appointment.getPatient().getUser().getLastName();
        String doctorName = appointment.getDoctor() != null && appointment.getDoctor().getUser() != null
                ? "BS. " + appointment.getDoctor().getUser().getFirstName() + " " + appointment.getDoctor().getUser().getLastName()
                : "Bác sĩ";
        String department = appointment.getDoctor() != null && appointment.getDoctor().getDepartment() != null
                ? appointment.getDoctor().getDepartment().getDepartmentName()
                : "Khoa khám bệnh";
        String appointmentDate = appointment.getStartTime() != null
                ? appointment.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "";
        String appointmentTime = appointment.getStartTime() != null
                ? appointment.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"))
                : "";
        
        String htmlContent = emailTemplateService.buildAppointmentConfirmationEmail(
                patientName, doctorName, appointmentDate, appointmentTime, department
        );
        emailService.sendHtmlEmail(email, "✅ Xác nhận lịch khám - ClinicBooking", htmlContent);
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO.Response> getAll() {
        List<Appointment> entities = appointmentRepository.findAll();
        return entities.stream()
                .map(appointmentMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public AppointmentDTO.Response getById(Long appointmentId) {
        Appointment entity = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cuộc hẹn với ID: " + appointmentId));
        return appointmentMapper.entityToResponseDTO(entity);
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO.Response> getByPatient(Long patientId) {
        List<Appointment> list = appointmentRepository.findByPatient_PatientId(patientId);
        return list.stream().map(appointmentMapper::entityToResponseDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO.Response> getByDoctor(Long doctorId) {
        List<Appointment> list = appointmentRepository.findByDoctor_DoctorId(doctorId);
        return list.stream().map(appointmentMapper::entityToResponseDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO.Response> getAvailableSlotsByDoctor(Long doctorId) {
        List<Appointment> list = appointmentRepository.findByDoctor_DoctorId(doctorId);
        // Lọc các appointment có patient = null và status = "Available"
        return list.stream()
                .filter(apt -> apt.getPatient() == null && "Available".equals(apt.getStatus()))
                .map(appointmentMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO.Response> getAvailableSlotsByDoctorAndDateRange(
            Long doctorId, 
            java.time.LocalDateTime startDate, 
            java.time.LocalDateTime endDate) {
        List<Appointment> list = appointmentRepository.findByDoctor_DoctorIdAndDateRange(
                doctorId, startDate, endDate);
        // Lọc các appointment có patient = null và status = "Available"
        return list.stream()
                .filter(apt -> apt.getPatient() == null && "Available".equals(apt.getStatus()))
                .map(appointmentMapper::entityToResponseDTO)
                .toList();
    }

    public AppointmentDTO.Response bookAppointment(Long appointmentId, Long patientId, String notes) {
        Appointment entity = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cuộc hẹn với ID: " + appointmentId));
        
        // Kiểm tra appointment còn available không
        if (entity.getPatient() != null) {
            throw new IllegalStateException("Khung giờ này đã được đặt");
        }
        if (!"Available".equals(entity.getStatus())) {
            throw new IllegalStateException("Khung giờ này không còn khả dụng");
        }
        
        // Tìm patient
        log.info("🔍 Searching for patient with ID: {}", patientId);
        Optional<Patient> patientOpt = patientRepository.findById(patientId);
        if (patientOpt.isPresent()) {
            log.info("✅ Found patient: {}", patientOpt.get().getPatientId());
        } else {
            log.error("❌ No patient found with ID: {}", patientId);
            // Debug: List all patients
            List<Patient> allPatients = patientRepository.findAll();
            log.info("📊 Total patients in database: {}", allPatients.size());
            for (Patient p : allPatients) {
                log.info("👤 Patient ID: {}", p.getPatientId());
            }
        }
        Patient patient = patientOpt
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bệnh nhân với ID: " + patientId));
        
        // Cập nhật appointment
        entity.setPatient(patient);
        entity.setStatus("Scheduled");
        if (notes != null && !notes.trim().isEmpty()) {
            entity.setNotes(notes);
        }
        
        Appointment saved = appointmentRepository.save(entity);
        
        // Gửi email thông báo
        try {
            String subject = "Đặt lịch khám thành công";
            String body = "Bạn đã đặt lịch khám thành công vào " + saved.getStartTime() + 
                         " với bác sĩ " + saved.getDoctor().getUser().getFirstName() + " " + 
                         saved.getDoctor().getUser().getLastName();
            notifyPatient(saved, subject, body);
        } catch (Exception ex) {
            // ignore email failures
        }
        
        AppointmentDTO.Response response = appointmentMapper.entityToResponseDTO(saved);
        
        // Tạo thông báo cho bệnh nhân
        try {
            Long patientUserId = saved.getPatient().getUser().getId();
            log.info("📧 Creating notification for patient userId: {}", patientUserId);
            systemNotificationService.createBookingCreated(patientUserId, saved.getAppointmentId());
            log.info("✅ Patient notification created successfully");
        } catch (Exception e) {
            log.error("❌ Error creating patient notification: ", e);
        }
        
        // Tạo thông báo cho bác sĩ khi bệnh nhân đặt lịch
        try {
            // Debug logging
            log.info("🔍 Appointment saved with ID: {}", saved.getAppointmentId());
            
            // Fetch doctor với eager loading để đảm bảo có User
            Doctor doctor = doctorRepository.findById(saved.getDoctor().getDoctorId())
                .orElseThrow(() -> new NotFoundException("Doctor not found"));
            
            log.info("🔍 Doctor ID: {}", doctor.getDoctorId());
            log.info("🔍 Doctor User: {}", doctor.getUser());
            
            if (doctor.getUser() == null) {
                log.error("❌ Doctor User is NULL! Doctor ID: {}", doctor.getDoctorId());
                return response;
            }
            
            Long doctorUserId = doctor.getUser().getId();
            log.info("🔍 Doctor User ID: {}", doctorUserId);
            
            if (doctorUserId == null || doctorUserId == 0) {
                log.error("❌ Doctor User ID is NULL or 0!");
                return response;
            }
            
            String patientName = saved.getPatient().getUser().getFirstName() + " " + 
                                saved.getPatient().getUser().getLastName();
            String title = "Lịch hẹn mới";
            String message = "Bệnh nhân " + patientName + " đã đặt lịch khám vào " + saved.getStartTime();
            
            log.info("📧 Creating notification for doctor userId: {}", doctorUserId);
            log.info("📧 Title: {}, Message: {}", title, message);
            
            SystemNotification notification = systemNotificationService.create(doctorUserId, title, message, "APPOINTMENT");
            
            log.info("✅ Doctor notification created successfully with ID: {}, userId: {}", 
                     notification.getNotificationId(), notification.getUserId());
        } catch (Exception e) {
            log.error("❌ Error creating doctor notification: ", e);
        }
        
        return response;
    }

    public AppointmentDTO.Response update(Long appointmentId, AppointmentDTO.Update dto) {
        Appointment entity = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cuộc hẹn với ID: " + appointmentId));
        appointmentMapper.applyUpdateToEntity(entity, dto);
        Appointment saved = appointmentRepository.save(entity);
        try {
            String subject = "Lịch khám đã được cập nhật";
            String body = "Lịch khám của bạn đã được cập nhật. Vui lòng kiểm tra chi tiết trong ứng dụng.";
            notifyPatient(saved, subject, body);
        } catch (Exception ex) {
            // swallow - email failures shouldn't prevent update
        }
        return appointmentMapper.entityToResponseDTO(saved);
    }

    public void delete(Long appointmentId) {
        if (!appointmentRepository.existsById(appointmentId)) {
            throw new NotFoundException("Không tìm thấy cuộc hẹn với ID: " + appointmentId);
        }
        appointmentRepository.deleteById(appointmentId);
    }

    public AppointmentDTO.Response cancelAppointment(Long appointmentId) {
        Appointment entity = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cuộc hẹn với ID: " + appointmentId));
        
        // Cập nhật status thành "từ chối lịch hẹn"
        entity.setStatus("Từ chối lịch hẹn");
        
        // Nếu có schedule, giải phóng slot
        if (entity.getSchedule() != null) {
            entity.getSchedule().setStatus("Available");
            doctorScheduleRepository.save(entity.getSchedule());
        }
        
        Appointment saved = appointmentRepository.save(entity);
        try {
            String subject = "Lịch khám đã bị hủy";
            String body = "Lịch khám của bạn đã bị hủy. Vui lòng liên hệ nếu cần đặt lại.";
            notifyPatient(saved, subject, body);
        } catch (Exception ex) {
            // ignore
        }
        AppointmentDTO.Response response = appointmentMapper.entityToResponseDTO(saved);
        try {
            Long userId = saved.getPatient().getUser().getId();
            systemNotificationService.createBookingCancelled(userId, saved.getAppointmentId());
        } catch (Exception ignore) {}
        return response;
    }

    public void permanentDelete(Long appointmentId) {
        Appointment entity = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cuộc hẹn với ID: " + appointmentId));
        
        // Nếu có schedule, giải phóng slot
        if (entity.getSchedule() != null) {
            entity.getSchedule().setStatus("Available");
            doctorScheduleRepository.save(entity.getSchedule());
        }
        
        // Xóa vĩnh viễn appointment
        appointmentRepository.deleteById(appointmentId);
        log.info("Đã xóa vĩnh viễn appointment với ID: {}", appointmentId);
    }

    @Transactional(readOnly = true)
    public List<AppointmentDTO.Response> getAppointmentsByPatientAndDoctor(Long patientId, Long doctorId) {
        List<Appointment> appointments = appointmentRepository.findByPatientIdAndDoctorId(patientId, doctorId);
        return appointments.stream()
                .map(appointmentMapper::entityToResponseDTO)
                .toList();
    }

    // Bulk create appointments - tối ưu để tránh timeout
    public AppointmentDTO.BulkCreateResponse bulkCreate(AppointmentDTO.BulkCreate bulkCreate) {
        List<AppointmentDTO.Create> appointmentDTOs = bulkCreate.getAppointments();
        if (appointmentDTOs == null || appointmentDTOs.isEmpty()) {
            throw new IllegalArgumentException("Danh sách appointments không được để trống");
        }

        // Validate doctor tồn tại
        Doctor doctor = doctorRepository.findById(bulkCreate.getDoctorId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bác sĩ với ID: " + bulkCreate.getDoctorId()));

        // Lấy tất cả existing appointments một lần để tránh query nhiều lần
        List<Appointment> existingAppointments = appointmentRepository.findByDoctor_DoctorId(bulkCreate.getDoctorId());
        
        AppointmentDTO.BulkCreateResponse response = new AppointmentDTO.BulkCreateResponse();
        response.setTotalRequested(appointmentDTOs.size());
        response.setCreatedAppointments(new java.util.ArrayList<>());
        response.setErrors(new java.util.ArrayList<>());
        
        // Tạo danh sách appointments để save batch
        java.util.List<Appointment> appointmentsToSave = new java.util.ArrayList<>();

        for (int i = 0; i < appointmentDTOs.size(); i++) {
            AppointmentDTO.Create dto = appointmentDTOs.get(i);
            try {
                // Set doctorId nếu chưa có
                if (dto.getDoctorId() == null) {
                    dto.setDoctorId(bulkCreate.getDoctorId());
                }
                
                // Validate doctorId phải khớp
                if (!dto.getDoctorId().equals(bulkCreate.getDoctorId())) {
                    response.getErrors().add("Appointment #" + (i + 1) + ": DoctorId không khớp");
                    response.setFailedCount(response.getFailedCount() + 1);
                    continue;
                }

                Patient patient = null;
                if (dto.getPatientId() != null) {
                    patient = patientRepository.findById(dto.getPatientId())
                            .orElse(null);
                    if (patient == null) {
                        response.getErrors().add("Appointment #" + (i + 1) + ": Không tìm thấy bệnh nhân");
                        response.setFailedCount(response.getFailedCount() + 1);
                        continue;
                    }
                }

                DoctorSchedule schedule = doctorScheduleRepository.findById(dto.getScheduleId())
                        .orElse(null);
                if (schedule == null) {
                    response.getErrors().add("Appointment #" + (i + 1) + ": Không tìm thấy lịch trình");
                    response.setFailedCount(response.getFailedCount() + 1);
                    continue;
                }

                // Validate schedule
                if (!schedule.getDoctor().getDoctorId().equals(dto.getDoctorId())) {
                    response.getErrors().add("Appointment #" + (i + 1) + ": Lịch trình không thuộc về bác sĩ này");
                    response.setFailedCount(response.getFailedCount() + 1);
                    continue;
                }

                if (!"Available".equals(schedule.getStatus())) {
                    response.getErrors().add("Appointment #" + (i + 1) + ": Lịch trình không khả dụng");
                    response.setFailedCount(response.getFailedCount() + 1);
                    continue;
                }

                // Validate time range
                java.time.LocalDate scheduleDate = schedule.getWorkDate();
                java.time.LocalTime scheduleStartTime = schedule.getStartTime();
                java.time.LocalTime scheduleEndTime = schedule.getEndTime();
                java.time.LocalDate appointmentDate = dto.getStartTime().toLocalDate();
                java.time.LocalTime appointmentStartTime = dto.getStartTime().toLocalTime();
                java.time.LocalTime appointmentEndTime = dto.getEndTime().toLocalTime();

                if (!appointmentDate.equals(scheduleDate) ||
                    appointmentStartTime.isBefore(scheduleStartTime) ||
                    appointmentEndTime.isAfter(scheduleEndTime)) {
                    response.getErrors().add("Appointment #" + (i + 1) + ": Thời gian không hợp lệ với lịch trình");
                    response.setFailedCount(response.getFailedCount() + 1);
                    continue;
                }

                // Check overlap với existing appointments
                boolean hasOverlap = false;
                for (Appointment existing : existingAppointments) {
                    if (dto.getStartTime().isBefore(existing.getEndTime()) && 
                        dto.getEndTime().isAfter(existing.getStartTime())) {
                        hasOverlap = true;
                        break;
                    }
                }
                
                // Check overlap với appointments đang được tạo trong batch
                for (Appointment pending : appointmentsToSave) {
                    if (dto.getStartTime().isBefore(pending.getEndTime()) && 
                        dto.getEndTime().isAfter(pending.getStartTime())) {
                        hasOverlap = true;
                        break;
                    }
                }

                if (hasOverlap) {
                    response.getErrors().add("Appointment #" + (i + 1) + ": Khung giờ bị trùng");
                    response.setFailedCount(response.getFailedCount() + 1);
                    continue;
                }

                // Tạo appointment entity
                Appointment entity = appointmentMapper.createDTOToEntity(dto, patient, doctor, schedule);
                appointmentsToSave.add(entity);

            } catch (Exception e) {
                log.error("Lỗi khi tạo appointment #{}: {}", i + 1, e.getMessage());
                response.getErrors().add("Appointment #" + (i + 1) + ": " + e.getMessage());
                response.setFailedCount(response.getFailedCount() + 1);
            }
        }

        // Save tất cả appointments cùng lúc (batch insert)
        if (!appointmentsToSave.isEmpty()) {
            List<Appointment> saved = appointmentRepository.saveAll(appointmentsToSave);
            List<AppointmentDTO.Response> responseDTOs = saved.stream()
                    .map(appointmentMapper::entityToResponseDTO)
                    .toList();
            response.setCreatedAppointments(responseDTOs);
            response.setSuccessCount(saved.size());
            log.info("Đã tạo thành công {} appointments trong {} requests", saved.size(), appointmentDTOs.size());
        }

        return response;
    }
    
}


