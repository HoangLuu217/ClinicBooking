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

            // Lấy userId từ cookie
            String userIdStr = getUserIdFromCookie(request);
            
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