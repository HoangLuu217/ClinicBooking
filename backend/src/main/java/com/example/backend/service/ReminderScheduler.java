package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.model.Appointment;
import com.example.backend.repository.AppointmentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {
    private final AppointmentRepository appointmentRepository;
    private final EmailService emailService;
    private final EmailTemplateService emailTemplateService;
    
    // Set để track appointments đã gửi nhắc nhở (trong memory)
    private final Set<Long> sentReminders = ConcurrentHashMap.newKeySet();

    // every 5 minutes check for appointments in next 30 minutes
    @Scheduled(fixedDelay = 300000)
    @Transactional
    public void sendUpcomingReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime until = now.plusMinutes(30);
        List<Appointment> list = appointmentRepository.findAll().stream()
                .filter(a -> a.getStartTime() != null && a.getStartTime().isAfter(now)
                        && a.getStartTime().isBefore(until) && !sentReminders.contains(a.getAppointmentId()))
                .toList();
        for (Appointment a : list) {
            try {
                String patientEmail = a.getPatient() != null && a.getPatient().getUser() != null
                        ? a.getPatient().getUser().getEmail()
                        : null;
                String patientName = a.getPatient() != null && a.getPatient().getUser() != null
                        ? a.getPatient().getUser().getFirstName() + " " + a.getPatient().getUser().getLastName()
                        : "Bệnh nhân";
                String doctorName = a.getDoctor() != null && a.getDoctor().getUser() != null
                        ? "BS. " + a.getDoctor().getUser().getFirstName() + " " + a.getDoctor().getUser().getLastName()
                        : "Bác sĩ";
                String department = a.getDoctor() != null && a.getDoctor().getDepartment() != null
                        ? a.getDoctor().getDepartment().getDepartmentName()
                        : "Khoa khám bệnh";
                String appointmentDate = a.getStartTime() != null 
                        ? a.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                        : "";
                String appointmentTime = a.getStartTime() != null 
                        ? a.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"))
                        : "";
                
                String subject = "📅 Nhắc lịch khám sắp tới - ClinicBooking";
                String htmlContent = emailTemplateService.buildAppointmentReminderEmail(
                    patientName, doctorName, appointmentDate, appointmentTime, department
                );
                emailService.sendHtmlEmail(patientEmail, subject, htmlContent);
                // Track trong memory để tránh spam, không thay đổi status appointment
                sentReminders.add(a.getAppointmentId());
                log.debug("Reminder sent for appointment {}", a.getAppointmentId());
            } catch (Exception ex) {
                log.error("Failed sending reminder for appointment {}: {}", a.getAppointmentId(), ex.getMessage());
            }
        }
    }
    
    // Method để clear memory tracking nếu cần (restart server sẽ tự clear)
    public void clearReminderTracking() {
        sentReminders.clear();
        log.info("Reminder tracking cleared");
    }
    
    // Method để xem appointments đã gửi nhắc nhở
    public Set<Long> getSentReminders() {
        return Set.copyOf(sentReminders);
    }
}
