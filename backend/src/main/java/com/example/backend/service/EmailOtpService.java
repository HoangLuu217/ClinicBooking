package com.example.backend.service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailOtpService {

    private final JavaMailSender mailSender;
    private final EmailTemplateService emailTemplateService;
    private final ResendApiService resendApiService;
    
    @Value("${spring.mail.username:noreply@clinic.com}")
    private String fromEmail;
    
    // Email address để gửi email (có thể khác với MAIL_USERNAME)
    // Với Resend: MAIL_USERNAME=resend, nhưng MAIL_FROM_EMAIL phải là email đã verify
    @Value("${MAIL_FROM_EMAIL:${spring.mail.username}}")
    private String fromEmailAddress;

    // Lưu OTP tạm thời trong memory (email -> otp)
    private final Map<String, String> otpStorage = new ConcurrentHashMap<>();
    // Lưu pending patient registration (email -> PatientRegisterRequest)
    private final Map<String, com.example.backend.service.PatientService.PatientRegisterRequest> pendingRegistrations = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public boolean sendOtp(String email) {
        try {
            log.info("Starting OTP send process for email: {}", email);
            
            // Tạo OTP 6 số
            String otp = generateOtp();
            log.info("Generated OTP: {}", otp);
            
            // Lưu OTP vào memory với thời gian hết hạn 5 phút
            otpStorage.put(email, otp);
            scheduleOtpExpiry(email, 5); // 5 phút
            log.info("OTP stored in memory for email: {}", email);
            
            // Tạo email content HTML đẹp
            String subject = "🔐 Mã xác thực OTP - ClinicBooking";
            String htmlContent = emailTemplateService.buildOtpEmail(otp);
            
            // Kiểm tra mail server configuration
            boolean mailConfigured = isMailServerConfigured();
            log.info("Mail server configured: {}", mailConfigured);
            log.info("From email: {}", fromEmail);
            log.info("Mail sender: {}", mailSender != null ? "Available" : "Null");
            
            // Kiểm tra xem có nên dùng Resend API không (khi Railway block SMTP)
            if (resendApiService.isConfigured()) {
                log.info("📧 [Resend API] Using Resend API instead of SMTP (Railway may block SMTP)");
                boolean sent = resendApiService.sendEmail(email, subject, htmlContent);
                if (sent) {
                    log.info("✅ OTP HTML email sent successfully via Resend API to: {}", email);
                    return true;
                } else {
                    log.error("❌ FAILED to send email via Resend API to: {}. Email was NOT sent!", email);
                    return false;
                }
            }
            
            // Gửi email qua SMTP (có thể simulate nếu không có mail server)
            if (mailConfigured) {
                log.info("Attempting to send real HTML email via SMTP...");
                boolean sent = sendHtmlEmail(email, subject, htmlContent);
                if (sent) {
                    log.info("✅ OTP HTML email sent successfully via SMTP to: {}", email);
                    return true;
                } else {
                    // Email gửi thất bại - log chi tiết và return false
                    log.error("❌ FAILED to send email via SMTP to: {}. Email was NOT sent!", email);
                    log.error("OTP was generated but NOT delivered. User will NOT receive email.");
                    // KHÔNG fallback về simulation - return false để user biết email không được gửi
                    return false;
                }
            } else {
                // Mail server chưa được cấu hình - chỉ simulate
                log.warn("⚠️ Mail server not configured. Simulating email send.");
                simulateEmail(email, subject, otp);
                // Trong production, nên return false nếu không có mail server
                // Nhưng để tương thích, vẫn return true và log warning
                log.warn("⚠️ WARNING: Email was simulated, not actually sent!");
                return true;
            }
            
        } catch (Exception e) {
            log.error("Failed to send OTP to email: {}", email, e);
            return false;
        }
    }

    /**
     * Gửi OTP kèm thông báo khóa tài khoản (lockout) sau khi nhập sai quá số lần cho phép
     */
    public boolean sendLockoutOtp(String email) {
        try {
            log.info("Sending LOCKOUT OTP to email: {}", email);
            String otp = generateOtp();
            otpStorage.put(email, otp);
            scheduleOtpExpiry(email, 5);

            String subject = "Tài khoản của bạn đã bị khóa - Mã OTP đặt lại mật khẩu";
            String content = buildLockoutEmailContent(otp);

            boolean mailConfigured = isMailServerConfigured();
            if (mailConfigured) {
                boolean sent = sendEmail(email, subject, content);
                if (!sent) {
                    simulateLockoutEmail(email, subject, otp);
                }
            } else {
                simulateLockoutEmail(email, subject, otp);
            }
            return true;
        } catch (Exception e) {
            log.error("Failed to send lockout OTP to {}", email, e);
            return false;
        }
    }

    private String buildLockoutEmailContent(String otp) {
        return "Xin chào,\n\n" +
               "Tài khoản của bạn đã bị khóa do nhập sai mật khẩu quá số lần cho phép.\n" +
               "Để mở khóa và đặt lại mật khẩu mới, vui lòng sử dụng mã OTP sau: " + otp + "\n" +
               "Mã này có hiệu lực trong 5 phút.\n\n" +
               "Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ quản trị viên.\n\n" +
               "Trân trọng,\nĐội ngũ ClinicBooking";
    }

    private void simulateLockoutEmail(String email, String subject, String otp) {
        log.info("=== SIMULATED LOCKOUT EMAIL ===");
        log.info("To: {}", email);
        log.info("Subject: {}", subject);
        log.info("OTP: {}", otp);
        System.out.println("\n[LOCKOUT EMAIL] " + email + " | OTP: " + otp + " | Expires in 5 minutes\n");
    }

    // Save a pending registration (will send OTP)
    public void savePendingRegistration(com.example.backend.service.PatientService.PatientRegisterRequest req) {
        if (req == null || req.getEmail() == null) return;
        pendingRegistrations.put(req.getEmail(), req);
        // send OTP to email (simulate or real depending on config)
        sendOtp(req.getEmail());
    }

    // Consume (remove and return) pending registration
    public com.example.backend.service.PatientService.PatientRegisterRequest consumePendingRegistration(String email) {
        return pendingRegistrations.remove(email);
    }

    // Check if there is a pending registration for email
    public boolean hasPendingRegistration(String email) {
        return pendingRegistrations.containsKey(email);
    }

    public boolean verifyOtp(String email, String inputOtp) {
        // Debug logging
        System.out.println("\n🔍 === DEBUG VERIFY OTP ===");
        System.out.println("Email received: '" + email + "'");
        System.out.println("Input OTP: '" + inputOtp + "'");
        System.out.println("OTP storage size: " + otpStorage.size());
        System.out.println("All emails in storage: " + otpStorage.keySet());
        
        String savedOtp = otpStorage.get(email);
        
        if (savedOtp == null) {
            log.warn("No OTP found for email: {}", email);
            System.out.println("❌ No OTP found for email: '" + email + "'");
            System.out.println("=========================\n");
            return false;
        }
        
        System.out.println("Saved OTP: '" + savedOtp + "'");
        System.out.println("Match: " + savedOtp.equals(inputOtp));
        System.out.println("=========================\n");
        
        boolean isValid = savedOtp.equals(inputOtp);
        
        if (isValid) {
            log.info("OTP verified successfully for email: {}", email);
        } else {
            log.warn("Invalid OTP for email: {}", email);
        }
        
        return isValid;
    }

    /**
     * Xóa OTP sau khi sử dụng thành công (cho reset password)
     */
    public void consumeOtp(String email) {
        otpStorage.remove(email);
        log.info("OTP consumed and removed for email: {}", email);
    }

    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000); // 6 digit OTP
        return String.valueOf(otp);
    }

    private void scheduleOtpExpiry(String email, int minutes) {
        scheduler.schedule(() -> {
            otpStorage.remove(email);
            log.info("OTP expired and removed for email: {}", email);
        }, minutes, TimeUnit.MINUTES);
    }

    private String buildOtpEmailContent(String otp) {
        return "Chào bạn,\n\n"
             + "Mã xác thực OTP của bạn là: " + otp + "\n"
             + "Mã này có hiệu lực trong 5 phút.\n\n"
             + "Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.\n\n"
             + "Trân trọng,\n"
             + "Đội ngũ ClinicBooking";
    }

    private boolean isMailServerConfigured() {
        try {
            // Kiểm tra có JavaMailSender và email config
            if (mailSender == null) {
                log.debug("JavaMailSender is null");
                return false;
            }
            
            // Kiểm tra email configuration
            // Với Resend/Mailgun, MAIL_USERNAME có thể không phải email (ví dụ: "resend", "apikey")
            // Nên check MAIL_HOST và MAIL_PASSWORD thay vì fromEmail
            String mailHost = System.getenv("MAIL_HOST");
            String mailPassword = System.getenv("MAIL_PASSWORD");
            
            log.debug("Checking mail configuration - Host: {}, Username: {}, Password set: {}", 
                     mailHost, fromEmail, mailPassword != null && !mailPassword.isEmpty());
            
            // Enable real email mode nếu có MAIL_HOST và MAIL_PASSWORD được set
            // Và MAIL_HOST không phải là default/localhost
            boolean configured = mailHost != null && 
                   !mailHost.isEmpty() && 
                   !mailHost.equals("localhost") &&
                   mailPassword != null && 
                   !mailPassword.isEmpty() &&
                   mailSender != null;
                   
            log.info("Mail configuration check result: {} (Host: {}, Password configured: {})", 
                    configured, mailHost, mailPassword != null && !mailPassword.isEmpty());
            return configured;
                   
        } catch (Exception e) {
            log.error("Error checking mail server configuration", e);
            return false;
        }
    }

    /**
     * Gửi email HTML (dùng cho OTP)
     */
    private boolean sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            log.info("📧 Attempting to send real HTML email to: {}", to);
            log.info("📧 From email: {}", fromEmail);
            log.info("📧 Mail sender available: {}", mailSender != null);
            
            jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = 
                new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            // Set from email with display name "Clinic Booking"
            // Dùng fromEmailAddress (có thể là MAIL_FROM_EMAIL hoặc fallback về fromEmail)
            // Nếu fromEmailAddress không phải email hợp lệ (ví dụ: "resend"), dùng một email mặc định
            String actualFromEmail = fromEmailAddress;
            if (actualFromEmail == null || actualFromEmail.isEmpty() || !actualFromEmail.contains("@")) {
                // Nếu fromEmailAddress không hợp lệ, thử dùng fromEmail
                if (fromEmail != null && fromEmail.contains("@")) {
                    actualFromEmail = fromEmail;
                } else {
                    // Fallback: dùng noreply email (cần verify domain trên Resend)
                    actualFromEmail = "noreply@onboarding.resend.dev"; // Resend default domain
                    log.warn("⚠️ Using default Resend domain. Please set MAIL_FROM_EMAIL to your verified email/domain");
                }
            }
            log.info("📧 Using from email: {}", actualFromEmail);
            helper.setFrom(new InternetAddress(actualFromEmail, "Clinic Booking", "UTF-8"));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = HTML
            
            log.info("📧 Calling mailSender.send()...");
            mailSender.send(mimeMessage);
            log.info("✅ HTML Email sent successfully to: {}", to);
            return true;
            
        } catch (MailAuthenticationException e) {
            log.error("❌ Authentication failed when sending HTML email to {}. Check username/password.", to);
            log.error("❌ Error details: {}", e.getMessage(), e);
            return false;
        } catch (MailSendException e) {
            log.error("❌ Failed to send HTML email to {}: {}", to, e.getMessage());
            log.error("❌ Error details: ", e);
            if (e.getCause() != null) {
                log.error("❌ Root cause: {}", e.getCause().getMessage());
            }
            return false;
        } catch (jakarta.mail.MessagingException e) {
            log.error("❌ MessagingException when sending HTML email to {}: {}", to, e.getMessage());
            log.error("❌ Error details: ", e);
            return false;
        } catch (Exception e) {
            log.error("❌ Unexpected error when sending HTML email to {}: {}", to, e.getMessage());
            log.error("❌ Error details: ", e);
            return false;
        }
    }

    /**
     * Gửi email văn bản thuần (backward compatibility)
     */
    private boolean sendEmail(String to, String subject, String body) {
        try {
            log.info("Attempting to send real email to: {}", to);
            
            // Sử dụng SimpleMailMessage thay vì MimeMessage để đơn giản hóa
            SimpleMailMessage message = new SimpleMailMessage();
            // Set from email with display name "Clinic Booking"
            message.setFrom("Clinic Booking <" + fromEmail + ">");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            
            mailSender.send(message);
            log.info("Email sent successfully to: {}", to);
            return true;
            
        } catch (MailAuthenticationException e) {
            log.error("Authentication failed when sending email. Check username/password: {}", e.getMessage());
            return false;
        } catch (MailSendException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Unexpected error when sending email to {}: {}", to, e.getMessage());
            return false;
        }
    }

    private void simulateEmail(String email, String subject, String otp) {
        log.info("=== SIMULATED EMAIL ===");
        log.info("To: {}", email);
        log.info("Subject: {}", subject);
        log.info("OTP: {}", otp);
        log.info("======================");
        
        // In ra console để dễ thấy
        System.out.println("\n");
        System.out.println("╔════════════════════════════════════════════════════════════╗");
        System.out.println("║          📧 OTP ĐÃ ĐƯỢC GỬI (SIMULATED)                  ║");
        System.out.println("╠════════════════════════════════════════════════════════════╣");
        System.out.println("║  Email: " + email);
        System.out.println("║  OTP:   " + otp + "                                          ║");
        System.out.println("║  Hiệu lực: 5 phút                                        ║");
        System.out.println("╚════════════════════════════════════════════════════════════╝");
        System.out.println("\n");
    }

    // Method để clear OTP manually nếu cần
    public void clearOtp(String email) {
        otpStorage.remove(email);
        log.info("OTP cleared manually for email: {}", email);
    }
}