package com.example.backend.service;

import org.springframework.stereotype.Service;

/**
 * Service để tạo các email template HTML đẹp với CSS
 */
@Service
public class EmailTemplateService {

    /**
     * Template cơ bản cho tất cả email
     */
    private String getBaseTemplate(String title, String content) {
        return """
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7fa;
            padding: 20px;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .email-header {
            background: linear-gradient(135deg, #0d6efd 0%%, #0a58ca 100%%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .email-header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .email-header p {
            font-size: 14px;
            opacity: 0.95;
        }
        
        .email-body {
            padding: 40px 30px;
            color: #333;
        }
        
        .email-body h2 {
            color: #0d6efd;
            font-size: 22px;
            margin-bottom: 20px;
        }
        
        .email-body p {
            font-size: 16px;
            margin-bottom: 15px;
            color: #555;
        }
        
        .highlight-box {
            background: linear-gradient(135deg, #e3f2fd 0%%, #bbdefb 100%%);
            border-left: 4px solid #0d6efd;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
        }
        
        .otp-box {
            background: linear-gradient(135deg, #fff3cd 0%%, #ffe69c 100%%);
            border: 2px dashed #ffc107;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
            border-radius: 10px;
        }
        
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #0d6efd;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }
        
        .warning-box {
            background: linear-gradient(135deg, #fff3cd 0%%, #ffe69c 100%%);
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
        }
        
        .danger-box {
            background: linear-gradient(135deg, #f8d7da 0%%, #f5c2c7 100%%);
            border-left: 4px solid #dc3545;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
        }
        
        .success-box {
            background: linear-gradient(135deg, #d1e7dd 0%%, #a3cfbb 100%%);
            border-left: 4px solid #198754;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
        }
        
        .info-list {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .info-list ul {
            list-style-type: none;
            padding-left: 0;
        }
        
        .info-list li {
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
            font-size: 15px;
        }
        
        .info-list li:last-child {
            border-bottom: none;
        }
        
        .info-list li::before {
            content: "✓ ";
            color: #198754;
            font-weight: bold;
            margin-right: 8px;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #0d6efd 0%%, #0a58ca 100%%);
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
            text-align: center;
        }
        
        .btn:hover {
            background: linear-gradient(135deg, #0a58ca 0%%, #084298 100%%);
        }
        
        .email-footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 3px solid #0d6efd;
        }
        
        .email-footer p {
            font-size: 14px;
            color: #6c757d;
            margin: 5px 0;
        }
        
        .email-footer a {
            color: #0d6efd;
            text-decoration: none;
        }
        
        .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent 0%%, #0d6efd 50%%, transparent 100%%);
            margin: 30px 0;
        }
        
        .icon {
            font-size: 24px;
            margin-right: 10px;
        }
        
        @media only screen and (max-width: 600px) {
            .email-body {
                padding: 20px 15px;
            }
            
            .email-header h1 {
                font-size: 22px;
            }
            
            .otp-code {
                font-size: 28px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        %s
    </div>
</body>
</html>
""".formatted(title, content);
    }

    /**
     * Email chào mừng cho user mới
     */
    public String buildWelcomeEmail(String userName, String roleName, String email, boolean isGoogleUser) {
        String roleIcon = switch (roleName.toLowerCase()) {
            case "doctor" -> "👨‍⚕️";
            case "patient" -> "👤";
            case "admin" -> "🔧";
            default -> "👋";
        };

        String roleFeatures = switch (roleName.toLowerCase()) {
            case "doctor" -> """
                <ul>
                    <li>Quản lý lịch khám và lịch làm việc</li>
                    <li>Xem danh sách bệnh nhân</li>
                    <li>Tạo đơn thuốc và hồ sơ bệnh án</li>
                    <li>Nhận thông báo về lịch khám mới</li>
                </ul>
                """;
            case "patient" -> """
                <ul>
                    <li>Đặt lịch khám với bác sĩ chuyên khoa</li>
                    <li>Xem lịch sử khám bệnh</li>
                    <li>Nhận nhắc nhở lịch khám</li>
                    <li>Quản lý hồ sơ sức khỏe cá nhân</li>
                </ul>
                """;
            default -> """
                <ul>
                    <li>Truy cập các tính năng phù hợp với vai trò</li>
                    <li>Nhận thông báo quan trọng</li>
                </ul>
                """;
        };

        String loginInfo = isGoogleUser ? 
            "<p><strong>🔗 Đăng nhập:</strong> Sử dụng tài khoản Google (không cần mật khẩu)</p>" :
            "<p><strong>🔐 Mật khẩu:</strong> [Mật khẩu bạn đã đặt]</p>";

        String content = """
            <div class="email-header">
                <h1>🎉 Chào mừng đến với ClinicBooking!</h1>
                <p>Hệ thống quản lý phòng khám hiện đại</p>
            </div>
            <div class="email-body">
                <h2>Xin chào %s!</h2>
                <p>Chúc mừng bạn đã đăng ký thành công tài khoản <strong>%s %s</strong> tại ClinicBooking!</p>
                
                <div class="success-box">
                    <h3 style="margin-top: 0; color: #198754;">%s Với tài khoản %s, bạn có thể:</h3>
                    <div class="info-list">
                        %s
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #0d6efd;">📧 Thông tin đăng nhập</h3>
                    <p><strong>Email:</strong> %s</p>
                    %s
                </div>
                
                <div class="info-list">
                    <h3 style="margin-top: 0; margin-bottom: 15px;">💡 Mẹo sử dụng:</h3>
                    <ul>
                        <li>Luôn kiểm tra email để nhận thông báo quan trọng</li>
                        <li>Cập nhật thông tin cá nhân để được phục vụ tốt nhất</li>
                        <li>Liên hệ hỗ trợ nếu cần trợ giúp</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000" class="btn">🏥 Truy cập ClinicBooking</a>
                </div>
            </div>
            <div class="email-footer">
                <p><strong>ClinicBooking</strong> - Hệ thống quản lý phòng khám hiện đại</p>
                <p>📧 Email: support@clinicbooking.com | 📞 Hotline: 1900-xxxx</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    Email này được gửi tự động. Vui lòng không trả lời email này.
                </p>
            </div>
        """.formatted(userName, roleName, roleIcon, roleIcon, roleName, roleFeatures, email, loginInfo);

        return getBaseTemplate("Chào mừng đến với ClinicBooking", content);
    }

    /**
     * Email OTP để xác thực
     */
    public String buildOtpEmail(String otp) {
        String content = """
            <div class="email-header">
                <h1>🔐 Mã xác thực OTP</h1>
                <p>ClinicBooking</p>
            </div>
            <div class="email-body">
                <h2>Xin chào!</h2>
                <p>Bạn đã yêu cầu mã xác thực OTP để đặt lại mật khẩu tại ClinicBooking.</p>
                
                <div class="otp-box">
                    <p style="margin: 0; font-size: 14px; color: #666;">Mã OTP của bạn là:</p>
                    <div class="otp-code">%s</div>
                    <p style="margin: 0; font-size: 13px; color: #999;">Mã này có hiệu lực trong <strong>5 phút</strong></p>
                </div>
                
                <div class="warning-box">
                    <p style="margin: 0;"><strong>⚠️ Lưu ý bảo mật:</strong></p>
                    <ul style="margin: 10px 0 0 20px; padding: 0;">
                        <li>Không chia sẻ mã OTP với bất kỳ ai</li>
                        <li>ClinicBooking không bao giờ yêu cầu mã OTP qua điện thoại</li>
                        <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email</li>
                    </ul>
                </div>
                
                <p style="margin-top: 30px;">Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi.</p>
            </div>
            <div class="email-footer">
                <p><strong>ClinicBooking</strong> - Hệ thống quản lý phòng khám hiện đại</p>
                <p>📧 Email: support@clinicbooking.com | 📞 Hotline: 1900-xxxx</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    Email này được gửi tự động. Vui lòng không trả lời email này.
                </p>
            </div>
        """.formatted(otp);

        return getBaseTemplate("Mã xác thực OTP - ClinicBooking", content);
    }

    /**
     * Email thông báo tài khoản bị khóa
     */
    public String buildAccountLockedEmail() {
        String content = """
            <div class="email-header">
                <h1>🔒 Tài khoản đã bị khóa</h1>
                <p>Thông báo bảo mật</p>
            </div>
            <div class="email-body">
                <h2>Xin chào!</h2>
                
                <div class="danger-box">
                    <h3 style="margin-top: 0; color: #dc3545;">⚠️ Tài khoản của bạn đã bị khóa</h3>
                    <p style="margin: 0;">Tài khoản của bạn tại <strong>ClinicBooking</strong> đã bị khóa do nhập sai mật khẩu <strong>quá 5 lần</strong>.</p>
                </div>
                
                <div class="divider"></div>
                
                <h3 style="color: #0d6efd;">🔓 Cách mở khóa tài khoản:</h3>
                <div class="info-list">
                    <ol style="margin-left: 20px; padding: 0;">
                        <li style="border: none; padding: 8px 0;">Truy cập trang đăng nhập ClinicBooking</li>
                        <li style="border: none; padding: 8px 0;">Nhấn vào <strong>"Quên mật khẩu"</strong></li>
                        <li style="border: none; padding: 8px 0;">Nhập email của bạn để nhận mã OTP</li>
                        <li style="border: none; padding: 8px 0;">Sử dụng mã OTP để đặt lại mật khẩu mới</li>
                        <li style="border: none; padding: 8px 0;">Đăng nhập với mật khẩu mới</li>
                    </ol>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/forgot-password" class="btn">🔑 Đặt lại mật khẩu ngay</a>
                </div>
                
                <div class="warning-box">
                    <p style="margin: 0;"><strong>🛡️ Bảo mật tài khoản:</strong></p>
                    <ul style="margin: 10px 0 0 20px; padding: 0;">
                        <li>Nếu bạn không thực hiện các lần đăng nhập này, có thể tài khoản của bạn đang bị tấn công</li>
                        <li>Vui lòng đặt lại mật khẩu ngay và sử dụng mật khẩu mạnh</li>
                        <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                    </ul>
                </div>
            </div>
            <div class="email-footer">
                <p><strong>ClinicBooking</strong> - Hệ thống quản lý phòng khám hiện đại</p>
                <p>📧 Email: support@clinicbooking.com | 📞 Hotline: 1900-xxxx</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    Email này được gửi tự động. Vui lòng không trả lời email này.
                </p>
            </div>
        """;

        return getBaseTemplate("Tài khoản đã bị khóa - ClinicBooking", content);
    }

    /**
     * Email nhắc lịch khám
     */
    public String buildAppointmentReminderEmail(String patientName, String doctorName, 
                                                String appointmentDate, String appointmentTime, 
                                                String department) {
        String content = """
            <div class="email-header">
                <h1>📅 Nhắc lịch khám sắp tới</h1>
                <p>ClinicBooking</p>
            </div>
            <div class="email-body">
                <h2>Xin chào %s!</h2>
                <p>Đây là lời nhắc về lịch khám sắp tới của bạn tại ClinicBooking.</p>
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #0d6efd;">📋 Thông tin lịch khám</h3>
                    <div class="info-list">
                        <ul>
                            <li><strong>Bác sĩ:</strong> %s</li>
                            <li><strong>Chuyên khoa:</strong> %s</li>
                            <li><strong>Ngày khám:</strong> %s</li>
                            <li><strong>Giờ khám:</strong> %s</li>
                        </ul>
                    </div>
                </div>
                
                <div class="warning-box">
                    <h3 style="margin-top: 0; color: #856404;">📌 Lưu ý quan trọng:</h3>
                    <ul style="margin: 10px 0 0 20px; padding: 0;">
                        <li>Vui lòng đến trước <strong>15 phút</strong> để làm thủ tục</li>
                        <li>Mang theo <strong>CMND/CCCD</strong> và các giấy tờ y tế liên quan</li>
                        <li>Nếu không thể đến, vui lòng hủy lịch trước <strong>4 giờ</strong></li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/patient/profile" class="btn">📱 Xem chi tiết lịch khám</a>
                </div>
                
                <p style="margin-top: 30px;">Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của ClinicBooking!</p>
            </div>
            <div class="email-footer">
                <p><strong>ClinicBooking</strong> - Hệ thống quản lý phòng khám hiện đại</p>
                <p>📧 Email: support@clinicbooking.com | 📞 Hotline: 1900-xxxx</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    Email này được gửi tự động. Vui lòng không trả lời email này.
                </p>
            </div>
        """.formatted(patientName, doctorName, department, appointmentDate, appointmentTime);

        return getBaseTemplate("Nhắc lịch khám - ClinicBooking", content);
    }

    /**
     * Email xác nhận đặt lịch khám
     */
    public String buildAppointmentConfirmationEmail(String patientName, String doctorName,
                                                   String appointmentDate, String appointmentTime,
                                                   String department) {
        String content = """
            <div class="email-header">
                <h1>✅ Xác nhận đặt lịch khám</h1>
                <p>ClinicBooking</p>
            </div>
            <div class="email-body">
                <h2>Xin chào %s!</h2>
                <p>Lịch khám của bạn đã được xác nhận thành công!</p>
                
                <div class="success-box">
                    <h3 style="margin-top: 0; color: #0f5132;">📋 Thông tin lịch khám</h3>
                    <div class="info-list">
                        <ul>
                            <li><strong>Bác sĩ:</strong> %s</li>
                            <li><strong>Chuyên khoa:</strong> %s</li>
                            <li><strong>Ngày khám:</strong> %s</li>
                            <li><strong>Giờ khám:</strong> %s</li>
                            <li><strong>Địa điểm:</strong> ClinicBooking - 123 Đường ABC, TP.HCM</li>
                        </ul>
                    </div>
                </div>
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #0d6efd;">📋 Chuẩn bị trước khi đến khám:</h3>
                    <ul style="margin: 10px 0 0 20px; padding: 0;">
                        <li>Mang theo CMND/CCCD</li>
                        <li>Mang theo sổ khám bệnh (nếu có)</li>
                        <li>Các kết quả xét nghiệm gần đây (nếu có)</li>
                        <li>Danh sách thuốc đang dùng</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/patient/profile?tab=appointments" class="btn">📅 Xem lịch khám của tôi</a>
                </div>
                
                <div class="warning-box">
                    <h3 style="margin-top: 0; color: #856404;">⚠️ Hủy hoặc đổi lịch:</h3>
                    <p style="margin: 5px 0;">Nếu bạn cần thay đổi lịch khám, vui lòng liên hệ hotline ít nhất 2 giờ trước giờ hẹn.</p>
                </div>
                
                <p style="margin-top: 30px;">Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của ClinicBooking!</p>
            </div>
            <div class="email-footer">
                <p><strong>ClinicBooking</strong> - Hệ thống quản lý phòng khám hiện đại</p>
                <p>📧 Email: support@clinicbooking.com | 📞 Hotline: 1900-xxxx</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    Email này được gửi tự động. Vui lòng không trả lời email này.
                </p>
            </div>
        """.formatted(patientName, doctorName, department, appointmentDate, appointmentTime);

        return getBaseTemplate("Xác nhận lịch khám - ClinicBooking", content);
    }

    /**
     * Email thông báo đặt lại mật khẩu thành công
     */
    public String buildPasswordResetSuccessEmail(String userName) {
        String content = """
            <div class="email-header">
                <h1>🔑 Mật khẩu đã được đặt lại</h1>
                <p>ClinicBooking</p>
            </div>
            <div class="email-body">
                <h2>Xin chào %s!</h2>
                
                <div class="success-box">
                    <h3 style="margin-top: 0; color: #0f5132;">✅ Đặt lại mật khẩu thành công</h3>
                    <p style="margin: 10px 0;">Mật khẩu của bạn đã được thay đổi thành công.</p>
                    <div class="info-list">
                        <ul>
                            <li><strong>Thời gian:</strong> Vừa xong</li>
                            <li><strong>Trạng thái tài khoản:</strong> Đã được mở khóa (nếu bị khóa trước đó)</li>
                        </ul>
                    </div>
                </div>
                
                <p>Bạn có thể đăng nhập ngay bây giờ với mật khẩu mới.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/login" class="btn">🔑 Đăng nhập ngay</a>
                </div>
                
                <div class="danger-box">
                    <h3 style="margin-top: 0; color: #842029;">🛡️ Bảo mật:</h3>
                    <p style="margin: 5px 0;">Nếu bạn không thực hiện thao tác này, tài khoản của bạn có thể đang bị xâm nhập. Vui lòng liên hệ hỗ trợ ngay lập tức!</p>
                </div>
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #0d6efd;">💡 Mẹo bảo mật:</h3>
                    <ul style="margin: 10px 0 0 20px; padding: 0;">
                        <li>Sử dụng mật khẩu mạnh (ít nhất 8 ký tự)</li>
                        <li>Không sử dụng cùng mật khẩu cho nhiều tài khoản</li>
                        <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                        <li>Thay đổi mật khẩu định kỳ</li>
                    </ul>
                </div>
                
                <p style="margin-top: 30px;">Trân trọng,<br><strong>Đội ngũ ClinicBooking</strong></p>
            </div>
            <div class="email-footer">
                <p><strong>ClinicBooking</strong> - Hệ thống quản lý phòng khám hiện đại</p>
                <p>📧 Email: support@clinicbooking.com | 📞 Hotline: 1900-xxxx</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    Email này được gửi tự động. Vui lòng không trả lời email này.
                </p>
            </div>
        """.formatted(userName);

        return getBaseTemplate("Đặt lại mật khẩu thành công - ClinicBooking", content);
    }
}