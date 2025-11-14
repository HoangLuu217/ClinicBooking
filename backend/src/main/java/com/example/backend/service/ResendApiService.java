package com.example.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

/**
 * Service để gửi email qua Resend API (thay vì SMTP)
 * Dùng khi Railway block SMTP ports
 */
@Service
@Slf4j
public class ResendApiService {
    
    private static final String RESEND_API_URL = "https://api.resend.com/emails";
    
    private final WebClient webClient;
    
    @Value("${MAIL_PASSWORD:}")
    private String apiKey;
    
    @Value("${MAIL_FROM_EMAIL:noreply@onboarding.resend.dev}")
    private String fromEmail;
    
    public ResendApiService() {
        this.webClient = WebClient.builder()
                .baseUrl(RESEND_API_URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
    
    /**
     * Gửi email qua Resend API
     * @param to Email người nhận
     * @param subject Tiêu đề email
     * @param htmlContent Nội dung HTML
     * @return true nếu gửi thành công, false nếu thất bại
     */
    public boolean sendEmail(String to, String subject, String htmlContent) {
        try {
            log.info("📧 [Resend API] Attempting to send email to: {}", to);
            log.info("📧 [Resend API] From: {}", fromEmail);
            log.info("📧 [Resend API] API Key configured: {}", apiKey != null && !apiKey.isEmpty());
            
            if (apiKey == null || apiKey.isEmpty()) {
                log.error("❌ [Resend API] API Key is not configured!");
                return false;
            }
            
            // Build request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("from", fromEmail);
            requestBody.put("to", new String[]{to});
            requestBody.put("subject", subject);
            requestBody.put("html", htmlContent);
            
            // Send request
            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(); // Block để đợi response (vì đang trong synchronous context)
            
            if (response != null && response.containsKey("id")) {
                log.info("✅ [Resend API] Email sent successfully! ID: {}", response.get("id"));
                return true;
            } else {
                log.error("❌ [Resend API] Unexpected response: {}", response);
                return false;
            }
            
        } catch (WebClientResponseException e) {
            log.error("❌ [Resend API] Failed to send email. Status: {}, Body: {}", 
                    e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("❌ [Resend API] Unexpected error: {}", e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Kiểm tra xem Resend API có được cấu hình không
     */
    public boolean isConfigured() {
        String mailHost = System.getenv("MAIL_HOST");
        boolean isResend = mailHost != null && mailHost.contains("resend.com");
        boolean hasApiKey = apiKey != null && !apiKey.isEmpty() && apiKey.startsWith("re_");
        
        log.debug("📧 [Resend API] Configuration check - Host: {}, IsResend: {}, HasApiKey: {}", 
                 mailHost, isResend, hasApiKey);
        
        return isResend && hasApiKey;
    }
}

