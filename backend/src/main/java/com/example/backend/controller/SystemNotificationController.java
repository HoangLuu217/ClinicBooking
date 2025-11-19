package com.example.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.model.SystemNotification;
import com.example.backend.service.SystemNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
@Slf4j
public class SystemNotificationController {

    private final SystemNotificationService notificationService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> listByUser(@PathVariable Long userId,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "50") int size) {
        log.info("🔔 Fetching notifications for userId: {}, page: {}, size: {}", userId, page, size);
        
        Page<SystemNotification> data = notificationService.listByUser(userId, page, size);
        long unread = notificationService.unreadCount(userId);
        
        log.info("📊 Found {} notifications, {} unread", data.getTotalElements(), unread);
        
        // Convert to simple DTOs to avoid circular reference
        List<Map<String, Object>> simpleNotifications = data.getContent().stream()
            .map(n -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("notificationId", n.getNotificationId());
                dto.put("userId", n.getUserId());
                dto.put("title", n.getTitle());
                dto.put("message", n.getMessage());
                dto.put("type", n.getType());
                dto.put("isRead", n.getIsRead());
                dto.put("createdAt", n.getCreatedAt());
                dto.put("readAt", n.getReadAt());
                // Don't include appointment to avoid circular reference
                return dto;
            })
            .collect(Collectors.toList());
        
        Map<String, Object> body = new HashMap<>();
        body.put("content", simpleNotifications);
        body.put("totalElements", data.getTotalElements());
        body.put("totalPages", data.getTotalPages());
        body.put("unreadCount", unread);
        
        log.info("📤 Returning {} notifications", simpleNotifications.size());
        
        return ResponseEntity.ok(body);
    }

    @PostMapping
    public ResponseEntity<SystemNotification> create(@RequestBody CreateRequest req) {
        SystemNotification n = notificationService.create(req.userId, req.title, req.message, req.type);
        return ResponseEntity.ok(n);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<SystemNotification> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markRead(id));
    }

    @PostMapping("/user/{userId}/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead(@PathVariable Long userId) {
        int updated = notificationService.markAllRead(userId);
        Map<String, Object> resp = new HashMap<>();
        resp.put("updated", updated);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/events/register-success")
    public ResponseEntity<SystemNotification> registerSuccess(@RequestParam Long userId) {
        return ResponseEntity.ok(notificationService.createRegisterSuccess(userId));
    }

    @PostMapping("/events/booking-created")
    public ResponseEntity<SystemNotification> bookingCreated(@RequestParam Long userId,
                                                             @RequestParam Long appointmentId) {
        return ResponseEntity.ok(notificationService.createBookingCreated(userId, appointmentId));
    }

    @PostMapping("/events/booking-cancelled")
    public ResponseEntity<SystemNotification> bookingCancelled(@RequestParam Long userId,
                                                               @RequestParam Long appointmentId) {
        return ResponseEntity.ok(notificationService.createBookingCancelled(userId, appointmentId));
    }

    @PostMapping("/events/reminder")
    public ResponseEntity<SystemNotification> reminder(@RequestParam Long userId,
                                                       @RequestParam Long appointmentId,
                                                       @RequestParam(required = false) String when) {
        return ResponseEntity.ok(notificationService.createReminder(userId, appointmentId, when));
    }

    public static class CreateRequest {
        public Long userId;
        public String title;
        public String message;
        public String type;
    }
}
