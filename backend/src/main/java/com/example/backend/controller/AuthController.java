package com.example.backend.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.AuthDTO;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.AuthService;
import com.example.backend.service.EmailOtpService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth") 
@RequiredArgsConstructor
// CORS đã được cấu hình toàn cục trong SecurityConfig
public class AuthController {

    private final AuthService authService;
    private final EmailOtpService emailOtpService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<AuthDTO.LoginResponse> login(@Valid @RequestBody AuthDTO.LoginRequest loginRequest) {
        AuthDTO.LoginResponse response = authService.login(loginRequest);
        
        if (response.isSuccess()) {
            if (response.getUser() != null && response.getUser().getId() != null) {
                // Chỉ lưu userId vào cookie
                Long userId = response.getUser().getId();
                ResponseCookie cookie = ResponseCookie.from("userId", String.valueOf(userId))
                        .path("/")
                        .maxAge(7 * 24 * 60 * 60) // 7 days
                        .sameSite("Lax")
                        .httpOnly(false)
                        .secure(false)
                        .build();

                return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(response);
            }
            return ResponseEntity.ok(response);
        } else {
            // Trả về 401 Unauthorized cho tất cả trường hợp lỗi đăng nhập
            // Frontend sẽ xử lý dựa vào response.locked và response.message
            return ResponseEntity.status(401).body(response);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthDTO.LogoutResponse> logout(@RequestBody(required = false) AuthDTO.LogoutRequest logoutRequest) {
        AuthDTO.LogoutResponse response = authService.logout(logoutRequest);
        // Clear userId cookie on logout
        ResponseCookie cookieUserId = ResponseCookie.from("userId", "")
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .httpOnly(false)
                .secure(false)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieUserId.toString())
                .body(response);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDTO.RegisterResponse> register(@Valid @RequestBody AuthDTO.RegisterRequest registerRequest) {
        AuthDTO.RegisterResponse response = authService.register(registerRequest);
        
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/google")
    public ResponseEntity<AuthDTO.LoginResponse> googleSignIn(@RequestBody Map<String, String> body) {
        try {
            // For now, accept both idToken and direct email/name (temporary solution)
            String email = body.get("email");
            String firstName = body.getOrDefault("firstName", "Google");
            String lastName = body.getOrDefault("lastName", "User");
            String idToken = body.get("idToken");
            String picture = body.get("picture"); // Lấy ảnh Google
            
            // If email not provided but idToken exists, we need to decode it
            if ((email == null || email.trim().isEmpty()) && idToken != null) {
                // For now, create a dummy user since we don't have proper JWT decoding
                // TODO: Implement proper Google ID token verification
                email = "test-google-user@example.com";
                firstName = "Google";
                lastName = "User";
            }

            AuthDTO.LoginResponse response = authService.oauthLogin(email, firstName, lastName, picture);
            if (response.isSuccess()) {
                if (response.getUser() != null && response.getUser().getId() != null) {
                    // Chỉ lưu userId vào cookie
                    Long userId = response.getUser().getId();
                    ResponseCookie cookie = ResponseCookie.from("userId", String.valueOf(userId))
                            .path("/")
                            .maxAge(7 * 24 * 60 * 60) // 7 days
                            .sameSite("Lax")
                            .httpOnly(false)
                            .secure(false)
                            .build();

                    return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(response);
                }
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthDTO.LoginResponse("OAuth error", false, null, null, null, false));
        }
    }

    // Email OTP Endpoints (no database storage)
    
    /**
     * Gửi OTP cho FORGOT PASSWORD - Kiểm tra email phải tồn tại
     */
    @PostMapping("/send-otp")
    public ResponseEntity<AuthDTO.OtpResponse> sendOtp(@Valid @RequestBody AuthDTO.SendOtpRequest request) {
        try {
            // Kiểm tra email có tồn tại trong database không
            Optional<User> user = userRepository.findByEmail(request.getEmail());
            if (!user.isPresent()) {
                AuthDTO.OtpResponse response = new AuthDTO.OtpResponse(
                    "Email không tồn tại trong hệ thống. Vui lòng kiểm tra lại email của bạn.",
                    false
                );
                return ResponseEntity.badRequest().body(response);
            }
            
            // Cho phép gửi OTP ngay cả khi tài khoản đang bị khóa để người dùng có thể đặt lại mật khẩu
            boolean success = emailOtpService.sendOtp(request.getEmail());
            
            AuthDTO.OtpResponse response = new AuthDTO.OtpResponse(
                success ? "Mã OTP đã được gửi đến email của bạn" : "Không thể gửi OTP, vui lòng thử lại",
                success
            );
            
            return success ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            AuthDTO.OtpResponse response = new AuthDTO.OtpResponse(
                "Lỗi hệ thống khi gửi OTP: " + e.getMessage(),
                false
            );
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * Gửi lại OTP cho REGISTRATION - KHÔNG kiểm tra email tồn tại
     */
    @PostMapping("/send-otp-register")
    public ResponseEntity<AuthDTO.OtpResponse> sendOtpForRegister(@Valid @RequestBody AuthDTO.SendOtpRequest request) {
        try {
            // Gửi OTP mà không kiểm tra email tồn tại (cho đăng ký mới)
            boolean success = emailOtpService.sendOtp(request.getEmail());
            
            AuthDTO.OtpResponse response = new AuthDTO.OtpResponse(
                success ? "Mã OTP đã được gửi đến email của bạn" : "Không thể gửi OTP, vui lòng thử lại",
                success
            );
            
            return success ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            AuthDTO.OtpResponse response = new AuthDTO.OtpResponse(
                "Lỗi hệ thống khi gửi OTP: " + e.getMessage(),
                false
            );
            return ResponseEntity.badRequest().body(response);
        }
    }


    @PostMapping("/verify-otp") 
    public ResponseEntity<AuthDTO.OtpResponse> verifyOtp(@Valid @RequestBody AuthDTO.VerifyOtpRequest request) {
        boolean success = emailOtpService.verifyOtp(request.getEmail(), request.getOtp());
        
        AuthDTO.OtpResponse response = new AuthDTO.OtpResponse(
            success ? "Mã OTP xác thực thành công" : "Mã OTP không hợp lệ hoặc đã hết hạn",
            success
        );
        
        return success ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/test-mail")
    public ResponseEntity<Map<String, Object>> testMailConfiguration() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Test gửi OTP đến email test
            boolean canSend = emailOtpService.sendOtp("test@example.com");
            result.put("mailConfigured", true);
            result.put("canSendOtp", canSend);
            result.put("message", canSend ? "Mail server hoạt động tốt" : "Không thể gửi email");
        } catch (Exception e) {
            result.put("mailConfigured", false);
            result.put("canSendOtp", false);
            result.put("message", "Lỗi cấu hình mail: " + e.getMessage());
            result.put("error", e.getClass().getSimpleName());
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthDTO.ResetPasswordResponse> resetPassword(@Valid @RequestBody AuthDTO.ResetPasswordRequest request) {
        AuthDTO.ResetPasswordResponse response = authService.resetPassword(
            request.getEmail(),
            request.getOtp(),
            request.getNewPassword()
        );
        
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }
    
    @PostMapping("/fix-google-users")
    public ResponseEntity<Map<String, Object>> fixGoogleUsers() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            authService.fixAllGoogleUsers();
            result.put("success", true);
            result.put("message", "Đã sửa tất cả user Google");
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Lỗi khi sửa user Google: " + e.getMessage());
        }
        
        return ResponseEntity.ok(result);
    }
}