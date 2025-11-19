import React from "react";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="border-t bg-white">
      <div className="container mx-auto px-4 py-8 sm:py-10 sm:px-6">
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="mb-3 sm:mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl overflow-hidden bg-white p-1">
                <img 
                  src="/images/logo.png" 
                  alt="ClinicBooking Logo" 
                  className="h-full w-full object-cover rounded-lg"
                  onError={(e) => {
                    // Fallback to original design if logo fails to load
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `
                      <div class="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-[#0d6efd]">
                        <svg class="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                      </div>
                    `;
                  }}
                />
              </div>
              <span className="text-lg sm:text-xl font-semibold text-[#0d6efd]">ClinicBooking</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-pretty leading-relaxed">
              Hệ thống đặt lịch khám bệnh trực tuyến hàng đầu Việt Nam. Kết nối bạn với các bác sĩ chuyên khoa uy tín.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-foreground">Liên kết nhanh</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#home" className="text-muted-foreground hover:text-primary transition-colors block">
                  Trang chủ
                </a>
              </li>
              <li>
                <a href="#doctors" className="text-muted-foreground hover:text-primary transition-colors block">
                  Bác sĩ
                </a>
              </li>
              <li>
                <a href="#booking" className="text-muted-foreground hover:text-primary transition-colors block">
                  Đặt lịch
                </a>
              </li>
              <li>
                <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors block">
                  Liên hệ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-foreground">Thông tin liên hệ</h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#0d6efd] mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 break-words">1900 1234</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#0d6efd] mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 break-all text-[11px] sm:text-xs">tungdtde180564@fpt.edu.vn</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#0d6efd] mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 break-words text-[11px] sm:text-xs leading-relaxed">Trường đại học FPT University Da Nang</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-foreground">Kết nối với chúng tôi</h3>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              <a href="https://www.facebook.com" target="_blank" rel="noreferrer" className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[#f0f8ff] text-[#0d6efd] hover:bg-[#0d6efd] hover:text-white transition-colors">
                <Facebook className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[#f0f8ff] text-[#0d6efd] hover:bg-[#0d6efd] hover:text-white transition-colors">
                <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[#f0f8ff] text-[#0d6efd] hover:bg-[#0d6efd] hover:text-white transition-colors">
                <Twitter className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
              <a href="https://www.youtube.com" target="_blank" rel="noreferrer" className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[#f0f8ff] text-[#0d6efd] hover:bg-[#0d6efd] hover:text-white transition-colors">
                <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </div>
            <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground leading-relaxed">Giờ làm việc: 8:00 - 20:00 (Thứ 2 - Chủ nhật)</p>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 border-t pt-6 sm:pt-8 text-center text-[11px] sm:text-sm text-gray-500">
          <p>© 2025 ClinicBooking. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
