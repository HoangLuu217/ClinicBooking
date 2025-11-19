import axios from 'axios';
import config from '../config/config';

// Tạo instance axios với cấu hình cơ bản
const axiosClient = axios.create({
  baseURL: config.API.BASE_URL + '/api', // Backend chạy trên devtunnels
  timeout: config.FRONTEND.REQUEST_TIMEOUT, // tăng timeout lên 30 giây để giảm lỗi timeout trên mạng chậm
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor để thêm token vào header
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để xử lý lỗi
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Retry nhẹ nhàng 1 lần cho GET khi timeout (ECONNABORTED)
    const config = error.config || {};
    const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(String(error.message));
    const isGet = (config.method || '').toLowerCase() === 'get';
    if (isTimeout && isGet && !config._retriedOnce) {
      config._retriedOnce = true;
      // đợi ngắn trước khi thử lại
      await new Promise((r) => setTimeout(r, 400));
      return axiosClient(config);
    }

    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      // Chỉ xóa token và redirect nếu KHÔNG phải từ trang auth
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/login') || 
                         currentPath.includes('/register') || 
                         currentPath.includes('/verify-otp') ||
                         currentPath.includes('/forgot-password') ||
                         currentPath.includes('/reset-password');
      
      if (!isAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
