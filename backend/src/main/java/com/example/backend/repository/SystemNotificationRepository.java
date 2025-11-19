package com.example.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.SystemNotification;

/**
 * Repository interface cho SystemNotification entity
 * Chứa các query methods để truy vấn dữ liệu thông báo hệ thống
 */
@Repository
public interface SystemNotificationRepository extends JpaRepository<SystemNotification, Long> {
    
    /**
     * Tìm notification theo ID
     */
    SystemNotification findByNotificationId(Long notificationId);
    
    /**
     * Lấy tất cả notifications với thông tin Appointment
     */
    @Query("SELECT sn FROM SystemNotification sn " +
           "LEFT JOIN FETCH sn.appointment a " +
           "LEFT JOIN FETCH a.patient p " +
           "LEFT JOIN FETCH p.user u " +
           "ORDER BY sn.createdAt DESC")
    List<SystemNotification> findAllWithAppointmentAndPatient();
    
    /**
     * Lấy notifications theo appointment
     */
    @Query("SELECT sn FROM SystemNotification sn " +
           "LEFT JOIN FETCH sn.appointment a " +
           "WHERE a.appointmentId = :appointmentId " +
           "ORDER BY sn.createdAt DESC")
    List<SystemNotification> findByAppointmentId(@Param("appointmentId") Long appointmentId);
    
    /**
     * Lấy notifications hệ thống (không liên quan appointment)
     */
    @Query("SELECT sn FROM SystemNotification sn " +
           "WHERE sn.appointment IS NULL " +
           "ORDER BY sn.createdAt DESC")
    List<SystemNotification> findSystemNotifications();
    
    /**
     * Lấy notifications theo thời gian tạo
     */
    @Query("SELECT sn FROM SystemNotification sn " +
           "LEFT JOIN FETCH sn.appointment a " +
           "WHERE sn.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY sn.createdAt DESC")
    List<SystemNotification> findByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, 
                                                   @Param("endDate") LocalDateTime endDate);
    
    /**
     * Lấy notifications theo title (tìm kiếm)
     */
    @Query("SELECT sn FROM SystemNotification sn " +
           "LEFT JOIN FETCH sn.appointment a " +
           "WHERE LOWER(sn.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(sn.message) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY sn.createdAt DESC")
    List<SystemNotification> findByTitleOrMessageContaining(@Param("keyword") String keyword);
    
    /**
     * Lấy notifications mới nhất
     */
    @Query("SELECT sn FROM SystemNotification sn " +
           "LEFT JOIN FETCH sn.appointment a " +
           "ORDER BY sn.createdAt DESC")
    Page<SystemNotification> findLatestNotifications(Pageable pageable);
    
    /**
     * Đếm số notifications theo appointment
     */
    Long countByAppointmentAppointmentId(Long appointmentId);
    
    /**
     * Đếm số notifications hệ thống
     */
    Long countByAppointmentIsNull();
    
    /**
     * Xóa notifications cũ hơn một thời gian nhất định
     */
    void deleteByCreatedAtBefore(LocalDateTime cutoffDate);

    Page<SystemNotification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    long countByUserIdAndIsReadFalse(Long userId);
}
