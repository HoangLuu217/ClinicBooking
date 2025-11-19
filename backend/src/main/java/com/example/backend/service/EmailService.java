package com.example.backend.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.example.backend.model.User;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    private final JavaMailSender mailSender;

    /**
     * Gửi email văn bản thuần (plain text) - để tương thích ngược
     */
    public void sendSimpleEmail(String to, String subject, String text) {
        System.out.println("📧 EmailService.sendSimpleEmail() called");
        System.out.println("📧 To: " + to);
        System.out.println("📧 Subject: " + subject);
        System.out.println("📧 Text length: " + (text != null ? text.length() : 0));
        
        if (to == null || to.isBlank()) {
            System.out.println("⚠️ Email to is null/blank, skipping send");
            log.warn("Email to is null/blank, skipping send. subject={}", subject);
            return;
        }
        
        try {
            System.out.println("📧 Creating SimpleMailMessage...");
            SimpleMailMessage message = new SimpleMailMessage();
            // Set from email with display name "Clinic Booking"
            String fromEmail = mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl 
                ? ((org.springframework.mail.javamail.JavaMailSenderImpl) mailSender).getUsername()
                : "noreply@clinicbooking.com";
            message.setFrom("Clinic Booking <" + fromEmail + ">");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            
            System.out.println("📧 Sending email via JavaMailSender...");
            mailSender.send(message);
            
            System.out.println("✅ Email sent successfully to: " + to);
            log.debug("Sent email to {} subject={}", to, subject);
        } catch (Exception ex) {
            System.err.println("❌ FAILED to send email to " + to + ": " + ex.getMessage());
            log.error("Failed to send email to {} subject={} error={}", to, subject, ex.getMessage());
        }
    }

    /**
     * Gửi email HTML với CSS đẹp
     */
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        System.out.println("📧 EmailService.sendHtmlEmail() called");
        System.out.println("📧 To: " + to);
        System.out.println("📧 Subject: " + subject);
        
        if (to == null || to.isBlank()) {
            System.out.println("⚠️ Email to is null/blank, skipping send");
            log.warn("Email to is null/blank, skipping send. subject={}", subject);
            return;
        }
        
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            // Set from email with display name "Clinic Booking"
            String fromEmail = mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl 
                ? ((org.springframework.mail.javamail.JavaMailSenderImpl) mailSender).getUsername()
                : "noreply@clinicbooking.com";
            helper.setFrom(new InternetAddress(fromEmail, "Clinic Booking", "UTF-8"));
            
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML content
            
            System.out.println("📧 Sending HTML email via JavaMailSender...");
            mailSender.send(mimeMessage);
            
            System.out.println("✅ HTML Email sent successfully to: " + to);
            log.debug("Sent HTML email to {} subject={}", to, subject);
        } catch (Exception ex) {
            System.err.println("❌ FAILED to send HTML email to " + to + ": " + ex.getMessage());
            log.error("Failed to send HTML email to {} subject={} error={}", to, subject, ex.getMessage());
        }
    }

    // Convenience helper for welcome emails
    public void sendWelcomeEmail(User user) {
        if (user == null) return;
        String to = user.getEmail();
        String fullName = (user.getFirstName() != null ? user.getFirstName() : "")
                + (user.getLastName() != null ? (" " + user.getLastName()) : "");
        String subject = "Chào mừng bạn đến với ClinicBooking";
        String body = "Xin chào " + (fullName.trim().isEmpty() ? "bạn" : fullName.trim()) + ",\n\n" +
                "Tài khoản của bạn đã được tạo thành công.\n" +
                "Bạn có thể đăng nhập và quản lý hồ sơ khám bệnh, đặt lịch hẹn nhanh chóng.\n\n" +
                "Trân trọng,\nClinicBooking";
        sendSimpleEmail(to, subject, body);
    }
}
