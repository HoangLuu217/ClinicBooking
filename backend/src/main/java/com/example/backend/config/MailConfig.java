package com.example.backend.config;

import java.util.Properties;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration
public class MailConfig {

    @Bean
    @ConditionalOnProperty(prefix = "spring.mail", name = "host")
    public JavaMailSender javaMailSender(org.springframework.core.env.Environment env) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(env.getProperty("spring.mail.host"));
        String port = env.getProperty("spring.mail.port");
        if (port != null) {
            mailSender.setPort(Integer.parseInt(port));
        }
        mailSender.setUsername(env.getProperty("spring.mail.username"));
        mailSender.setPassword(env.getProperty("spring.mail.password"));

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", env.getProperty("spring.mail.properties.mail.smtp.auth", "true"));
        props.put("mail.smtp.starttls.enable", env.getProperty("spring.mail.properties.mail.smtp.starttls.enable", "true"));
        props.put("mail.smtp.starttls.required", env.getProperty("spring.mail.properties.mail.smtp.starttls.required", "true"));
        props.put("mail.debug", env.getProperty("spring.mail.debug", "false"));
        
        // SSL/TLS settings cho Gmail
        props.put("mail.smtp.ssl.trust", env.getProperty("spring.mail.properties.mail.smtp.ssl.trust", "smtp.gmail.com"));
        props.put("mail.smtp.ssl.protocols", env.getProperty("spring.mail.properties.mail.smtp.ssl.protocols", "TLSv1.2"));
        
        // Timeout settings để tránh lỗi timeout 3000ms
        // Connection timeout: thời gian chờ khi kết nối đến SMTP server
        props.put("mail.smtp.connectiontimeout", env.getProperty("spring.mail.properties.mail.smtp.connectiontimeout", "30000")); // 30 giây
        // I/O timeout: thời gian chờ khi đọc/ghi dữ liệu
        props.put("mail.smtp.timeout", env.getProperty("spring.mail.properties.mail.smtp.timeout", "30000")); // 30 giây
        // Write timeout: thời gian chờ khi ghi dữ liệu
        props.put("mail.smtp.writetimeout", env.getProperty("spring.mail.properties.mail.smtp.writetimeout", "30000")); // 30 giây

        return mailSender;
    }
}
