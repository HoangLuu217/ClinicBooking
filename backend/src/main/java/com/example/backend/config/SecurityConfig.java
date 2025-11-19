package com.example.backend.config;


import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.backend.security.JwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(authz -> authz
                // Public endpoints - Ai cũng xem được
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/patients/register").permitAll()
                .requestMatchers("/api/patients/confirm-register").permitAll()  // Xác thực OTP khi đăng ký
                .requestMatchers("/api/departments/**").permitAll()  // Xem departments public
                .requestMatchers("/api/doctors/**").permitAll()      // Xem doctors public  
                .requestMatchers("/api/articles/**").permitAll()     // Xem articles public
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/api/export/**").permitAll() // Cho phép export PDF public
                .requestMatchers("/api/auth/**", "/api/gemini-chat/**").permitAll() // <--- thêm dòng này
                // Protected Admin endpoints - CHỈ ADMIN
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/users/**").hasAnyRole("ADMIN", "DOCTOR", "PATIENT")  // Cho phép DOCTOR và PATIENT xem thông tin user
                .requestMatchers(HttpMethod.PUT, "/api/users/**").hasAnyRole("ADMIN", "DOCTOR", "PATIENT")  // Cho phép user cập nhật thông tin của mình
                .requestMatchers("/api/users/**").hasAnyRole("ADMIN", "DOCTOR", "PATIENT")           // POST/DELETE chỉ ADMIN
                // Medicines - ADMIN có thể quản lý (POST/PUT/DELETE), DOCTOR có thể đọc (GET) để kê đơn
                .requestMatchers(HttpMethod.GET, "/api/medicines/**").hasAnyRole("ADMIN", "DOCTOR")
                .requestMatchers("/api/medicines/**").hasRole("ADMIN")       // POST/PUT/DELETE chỉ ADMIN
                .requestMatchers("/api/prescriptions/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/appointments/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/payments/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/reviews/admin/**").hasRole("ADMIN")
                
                // Các endpoints còn lại - cần đăng nhập
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
            
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

}