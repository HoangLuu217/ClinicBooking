package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.SystemNotificationDTO;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.SystemNotificationMapper;
import com.example.backend.model.Appointment;
import com.example.backend.model.SystemNotification;
import com.example.backend.repository.AppointmentRepository;
import com.example.backend.repository.SystemNotificationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service class cho SystemNotification entity
 * Chứa business logic để xử lý các thao tác CRUD với SystemNotification
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SystemNotificationService {

    private final SystemNotificationRepository systemNotificationRepository;
    private final AppointmentRepository appointmentRepository;
    private final SystemNotificationMapper systemNotificationMapper;

    /**
     * Tạo notification mới
     */
    @Transactional
    public SystemNotificationDTO.Response createNotification(SystemNotificationDTO.Create dto) {
        Appointment appointment = null;
        
        // Lấy appointment nếu có appointmentId
        if (dto.getAppointmentId() != null) {
            appointment = appointmentRepository.findById(dto.getAppointmentId())
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy appointment với ID: " + dto.getAppointmentId()));
        }
        
        // Tạo notification
        SystemNotification notification = systemNotificationMapper.createDTOToEntity(dto, appointment);
        SystemNotification saved = systemNotificationRepository.save(notification);
        
        return systemNotificationMapper.entityToResponseDTO(saved);
    }

    /**
     * Lấy notification theo ID
     */
    @Transactional(readOnly = true)
    public SystemNotificationDTO.Response getNotificationById(Long notificationId) {
        SystemNotification notification = systemNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy notification với ID: " + notificationId));
        
        return systemNotificationMapper.entityToResponseDTO(notification);
    }

    /**
     * Lấy tất cả notifications
     */
    @Transactional(readOnly = true)
    public List<SystemNotificationDTO.Response> getAllNotifications() {
        List<SystemNotification> notifications = systemNotificationRepository.findAllWithAppointmentAndPatient();
        return systemNotificationMapper.entitiesToResponseDTOs(notifications);
    }

    /**
     * Lấy notifications với pagination
     */
    @Transactional(readOnly = true)
    public SystemNotificationDTO.ListResponse getNotificationsPaginated(Pageable pageable) {
        Page<SystemNotification> notificationsPage = systemNotificationRepository.findLatestNotifications(pageable);
        
        List<SystemNotificationDTO.Response> notifications = 
                systemNotificationMapper.entitiesToResponseDTOs(notificationsPage.getContent());
        
        return systemNotificationMapper.createListResponse(
                notifications,
                notificationsPage.getTotalElements(),
                notificationsPage.getTotalPages(),
                notificationsPage.getNumber(),
                notificationsPage.getSize()
        );
    }

    /**
     * Lấy notifications theo appointment
     */
    @Transactional(readOnly = true)
    public List<SystemNotificationDTO.Response> getNotificationsByAppointment(Long appointmentId) {
        List<SystemNotification> notifications = systemNotificationRepository.findByAppointmentId(appointmentId);
        return systemNotificationMapper.entitiesToResponseDTOs(notifications);
    }

    /**
     * Lấy notifications hệ thống (không liên quan appointment)
     */
    @Transactional(readOnly = true)
    public List<SystemNotificationDTO.Response> getSystemNotifications() {
        List<SystemNotification> notifications = systemNotificationRepository.findSystemNotifications();
        return systemNotificationMapper.entitiesToResponseDTOs(notifications);
    }

    /**
     * Tìm kiếm notifications
     */
    @Transactional(readOnly = true)
    public List<SystemNotificationDTO.Response> searchNotifications(SystemNotificationDTO.SearchRequest searchRequest) {
        List<SystemNotification> notifications;
        
        if (searchRequest.getKeyword() != null && !searchRequest.getKeyword().trim().isEmpty()) {
            // Tìm kiếm theo keyword
            notifications = systemNotificationRepository.findByTitleOrMessageContaining(searchRequest.getKeyword().trim());
        } else if (searchRequest.getStartDate() != null && searchRequest.getEndDate() != null) {
            // Tìm kiếm theo thời gian
            notifications = systemNotificationRepository.findByCreatedAtBetween(
                    searchRequest.getStartDate(), searchRequest.getEndDate());
        } else if (searchRequest.getSystemOnly() != null && searchRequest.getSystemOnly()) {
            // Chỉ notifications hệ thống
            notifications = systemNotificationRepository.findSystemNotifications();
        } else {
            // Lấy tất cả
            notifications = systemNotificationRepository.findAllWithAppointmentAndPatient();
        }
        
        return systemNotificationMapper.entitiesToResponseDTOs(notifications);
    }

    /**
     * Cập nhật notification
     */
    public SystemNotificationDTO.Response updateNotification(Long notificationId, SystemNotificationDTO.Update dto) {
        SystemNotification notification = systemNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy notification với ID: " + notificationId));
        
        systemNotificationMapper.applyUpdateToEntity(notification, dto);
        SystemNotification saved = systemNotificationRepository.save(notification);
        
        return systemNotificationMapper.entityToResponseDTO(saved);
    }

    /**
     * Xóa notification
     */
    public void deleteNotification(Long notificationId) {
        SystemNotification notification = systemNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy notification với ID: " + notificationId));
        
        systemNotificationRepository.delete(notification);
    }

    /**
     * Xóa notifications cũ (cleanup)
     */
    public void deleteOldNotifications(int daysOld) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysOld);
        systemNotificationRepository.deleteByCreatedAtBefore(cutoffDate);
    }

    /**
     * Đếm số notifications theo appointment
     */
    @Transactional(readOnly = true)
    public Long countNotificationsByAppointment(Long appointmentId) {
        return systemNotificationRepository.countByAppointmentAppointmentId(appointmentId);
    }

    /**
     * Đếm số notifications hệ thống
     */
    @Transactional(readOnly = true)
    public Long countSystemNotifications() {
        return systemNotificationRepository.countByAppointmentIsNull();
    }

    /**
     * Tạo notification tự động cho appointment events
     */
    public SystemNotificationDTO.Response createAppointmentNotification(
            Long appointmentId, String title, String message) {
        
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy appointment với ID: " + appointmentId));
        
        SystemNotificationDTO.Create dto = new SystemNotificationDTO.Create();
        dto.setTitle(title);
        dto.setMessage(message);
        dto.setAppointmentId(appointmentId);
        
        return createNotification(dto);
    }

    /**
     * Tạo notification hệ thống
     */
    public SystemNotificationDTO.Response createSystemNotification(String title, String message) {
        SystemNotificationDTO.Create dto = new SystemNotificationDTO.Create();
        dto.setTitle(title);
        dto.setMessage(message);
        dto.setAppointmentId(null); // System notification
        
        return createNotification(dto);
    }

    public SystemNotification create(Long userId, String title, String message, String type) {
        log.info("🔨 Creating notification for userId: {}", userId);
        SystemNotification n = new SystemNotification();
        n.setUserId(userId);
        n.setTitle(title);
        n.setMessage(message);
        n.setType(type);
        n.setIsRead(false);
        n.setCreatedAt(LocalDateTime.now());
        
        log.info("🔨 Before save - isRead: {}", n.getIsRead());
        SystemNotification saved = systemNotificationRepository.save(n);
        log.info("🔨 After save - notificationId: {}, userId: {}, isRead: {}", 
                 saved.getNotificationId(), saved.getUserId(), saved.getIsRead());
        
        return saved;
    }

    public Page<SystemNotification> listByUser(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        return systemNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long unreadCount(Long userId) {
        return systemNotificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public SystemNotification markRead(Long id) {
        return systemNotificationRepository.findById(id).map(n -> {
            if (Boolean.FALSE.equals(n.getIsRead())) {
                n.setIsRead(true);
                n.setReadAt(LocalDateTime.now());
                return systemNotificationRepository.save(n);
            }
            return n;
        }).orElseThrow(() -> new IllegalArgumentException("Notification not found: " + id));
    }

    public int markAllRead(Long userId) {
        Page<SystemNotification> page = listByUser(userId, 0, 1000);
        int updated = 0;
        for (SystemNotification n : page.getContent()) {
            if (Boolean.FALSE.equals(n.getIsRead())) {
                n.setIsRead(true);
                n.setReadAt(LocalDateTime.now());
                systemNotificationRepository.save(n);
                updated++;
            }
        }
        return updated;
    }

    /**
     * Helpers: typed notifications
     */
    public SystemNotification createRegisterSuccess(Long userId) {
        return create(userId,
                "Đăng ký tài khoản thành công",
                "Chào mừng bạn đã tạo tài khoản thành công.",
                SystemNotification.NotificationType.SYSTEM.getValue());
    }

    public SystemNotification createBookingCreated(Long userId, Long appointmentId) {
        SystemNotification n = create(userId,
                "Đặt lịch thành công",
                "Lịch khám của bạn đã được tạo thành công.",
                SystemNotification.NotificationType.APPOINTMENT.getValue());
        n.setAppointment(new Appointment());
        n.getAppointment().setAppointmentId(appointmentId);
        return systemNotificationRepository.save(n);
    }

    public SystemNotification createBookingCancelled(Long userId, Long appointmentId) {
        SystemNotification n = create(userId,
                "Huỷ lịch khám",
                "Lịch khám của bạn đã được huỷ.",
                SystemNotification.NotificationType.CANCELLATION.getValue());
        n.setAppointment(new Appointment());
        n.getAppointment().setAppointmentId(appointmentId);
        return systemNotificationRepository.save(n);
    }

    public SystemNotification createReminder(Long userId, Long appointmentId, String whenText) {
        String msg = "Nhắc lịch khám: " + (whenText != null ? whenText : "Sắp đến giờ khám");
        SystemNotification n = create(userId,
                "Nhắc nhở khám bệnh",
                msg,
                SystemNotification.NotificationType.REMINDER.getValue());
        n.setAppointment(new Appointment());
        n.getAppointment().setAppointmentId(appointmentId);
        return systemNotificationRepository.save(n);
    }
}
