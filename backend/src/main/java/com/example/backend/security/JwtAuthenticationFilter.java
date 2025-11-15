package com.example.backend.security;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * JWT Authentication Filter
 * Lọc và xác thực userId từ cookie trước khi request đến controller
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        try {
            // Bỏ qua các endpoint công khai
            String path = request.getRequestURI();
            if (isPublicEndpoint(path)) {
                filterChain.doFilter(request, response);
                return;
            }

            // Lấy userId từ Authorization header (JWT token) hoặc cookie
            String userIdStr = getUserIdFromAuthorizationHeader(request);
            if (userIdStr == null) {
                userIdStr = getUserIdFromCookie(request);
            }
            
            if (userIdStr != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    Long userId = Long.parseLong(userIdStr);
                    
                    // Lấy thông tin user từ database với role (eager fetch để tránh LazyInitializationException)
                    Optional<User> userOpt = userRepository.findByIdWithRole(userId);
                    
                    if (userOpt.isPresent()) {
                        User user = userOpt.get();
                        
                        // Kiểm tra trạng thái user
                        if (user.getStatus() == User.UserStatus.ACTIVE) {
                            // Tạo authentication token
                            String role = user.getRole() != null ? user.getRole().getName() : "USER";
                            
                            // Log chi tiết để debug
                            System.out.println("🔍 DEBUG Filter:");
                            System.out.println("   - User email: " + user.getEmail());
                            System.out.println("   - Role from DB: " + role);
                            System.out.println("   - Role uppercase: " + role.toUpperCase());
                            System.out.println("   - Authority created: ROLE_" + role.toUpperCase());
                            System.out.println("   - Request URI: " + request.getRequestURI());
                            
                            SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role.toUpperCase());
                            
                            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                    user.getEmail(),
                                    null,
                                    Collections.singletonList(authority)
                            );
                            
                            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            
                            // Lưu vào SecurityContext
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                            
                            System.out.println("✅ Authenticated user: " + user.getEmail() + " with role: ROLE_" + role.toUpperCase());
                        } else {
                            System.out.println("❌ User " + userId + " is not ACTIVE");
                        }
                    } else {
                        System.out.println("❌ User not found: " + userId);
                    }
                } catch (NumberFormatException e) {
                    System.out.println("❌ Invalid userId format: " + userIdStr);
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Error in JwtAuthenticationFilter: " + e.getMessage());
            e.printStackTrace();
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Lấy userId từ Authorization header (JWT token hoặc simple token)
     * Format: "Bearer <token>"
     * Hỗ trợ cả JWT token và simple token (userId)
     */
    private String getUserIdFromAuthorizationHeader(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7).trim(); // Remove "Bearer "
                
                // Case 1: Token là số (userId trực tiếp)
                try {
                    Long userId = Long.parseLong(token);
                    // Verify user exists
                    Optional<User> userOpt = userRepository.findById(userId);
                    if (userOpt.isPresent()) {
                        System.out.println("✅ Found userId from token (direct): " + userId);
                        return String.valueOf(userId);
                    }
                } catch (NumberFormatException e) {
                    // Not a number, try JWT decode
                }
                
                // Case 2: JWT token format (header.payload.signature)
                if (token.contains(".") && token.split("\\.").length >= 2) {
                    String[] parts = token.split("\\.");
                    if (parts.length >= 2) {
                        // Decode payload (base64url)
                        String payload = parts[1];
                        // Replace URL-safe base64 characters
                        payload = payload.replace('-', '+').replace('_', '/');
                        // Add padding if needed
                        while (payload.length() % 4 != 0) {
                            payload += "=";
                        }
                        
                        // Decode base64
                        byte[] decodedBytes = java.util.Base64.getDecoder().decode(payload);
                        String decodedPayload = new String(decodedBytes, java.nio.charset.StandardCharsets.UTF_8);
                        
                        System.out.println("🔍 Decoded JWT payload: " + decodedPayload);
                        
                        // Try to extract userId
                        String userIdStr = extractUserIdFromJson(decodedPayload);
                        if (userIdStr != null) {
                            return userIdStr;
                        }
                        
                        // Try to extract email and find user
                        String email = extractEmailFromJson(decodedPayload);
                        if (email != null) {
                            Optional<User> userOpt = userRepository.findByEmail(email);
                            if (userOpt.isPresent()) {
                                System.out.println("✅ Found userId from email in token: " + userOpt.get().getId());
                                return String.valueOf(userOpt.get().getId());
                            }
                        }
                    }
                }
                
                // Case 3: Token có thể là email
                if (token.contains("@")) {
                    Optional<User> userOpt = userRepository.findByEmail(token);
                    if (userOpt.isPresent()) {
                        System.out.println("✅ Found userId from email token: " + userOpt.get().getId());
                        return String.valueOf(userOpt.get().getId());
                    }
                }
                
            } catch (Exception e) {
                System.err.println("❌ Error processing Authorization header: " + e.getMessage());
                e.printStackTrace();
            }
        }
        return null;
    }
    
    /**
     * Extract userId from JSON string
     */
    private String extractUserIdFromJson(String json) {
        // Try "userId"
        String[] patterns = {"\"userId\"", "\"id\"", "\"sub\""};
        for (String pattern : patterns) {
            int index = json.indexOf(pattern);
            if (index >= 0) {
                int colonIndex = json.indexOf(':', index);
                if (colonIndex > 0) {
                    // Skip whitespace
                    int valueStart = colonIndex + 1;
                    while (valueStart < json.length() && Character.isWhitespace(json.charAt(valueStart))) {
                        valueStart++;
                    }
                    
                    // Check if value is quoted string or number
                    if (valueStart < json.length()) {
                        if (json.charAt(valueStart) == '"') {
                            // Quoted string
                            int valueEnd = json.indexOf('"', valueStart + 1);
                            if (valueEnd > valueStart) {
                                return json.substring(valueStart + 1, valueEnd);
                            }
                        } else {
                            // Number
                            int valueEnd = valueStart;
                            while (valueEnd < json.length() && 
                                   (Character.isDigit(json.charAt(valueEnd)) || json.charAt(valueEnd) == '.')) {
                                valueEnd++;
                            }
                            if (valueEnd > valueStart) {
                                return json.substring(valueStart, valueEnd);
                            }
                        }
                    }
                }
            }
        }
        return null;
    }
    
    /**
     * Extract email from JSON string
     */
    private String extractEmailFromJson(String json) {
        int emailIndex = json.indexOf("\"email\"");
        if (emailIndex >= 0) {
            int colonIndex = json.indexOf(':', emailIndex);
            if (colonIndex > 0) {
                int valueStart = json.indexOf('"', colonIndex) + 1;
                int valueEnd = json.indexOf('"', valueStart);
                if (valueStart > 0 && valueEnd > valueStart) {
                    return json.substring(valueStart, valueEnd);
                }
            }
        }
        return null;
    }

    /**
     * Lấy userId từ cookie
     */
    private String getUserIdFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("userId".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    /**
     * Kiểm tra xem endpoint có phải là công khai không
     */
    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/api/auth/") ||
               path.equals("/api/patients/register") ||
               path.startsWith("/api/departments") ||  // Cho phép xem danh sách departments (public)
               path.startsWith("/api/doctors") ||      // Cho phép xem danh sách doctors (public)
               path.startsWith("/api/articles") ||     // Cho phép xem articles (public)
               path.startsWith("/uploads/") ||
               path.startsWith("/ws/") ||
               path.equals("/") ||
               path.startsWith("/actuator/");
    }
}