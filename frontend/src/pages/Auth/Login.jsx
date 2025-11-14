import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import axiosClient from '../../api/axiosClient';
import { useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// ============================================
// FLAG ĐỂ BẬT/TẮT RECAPTCHA
// Đổi thành true để bật lại reCAPTCHA
// Chỉ cần sửa dòng này!
// ============================================
const ENABLE_RECAPTCHA = true;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    // Load Google Identity Services script and initialize
    const initializeGoogle = () => {
      const existing = document.getElementById('google-client-script');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.id = 'google-client-script';
        script.async = true;
        document.body.appendChild(script);
        script.onload = () => {
          renderGoogleButton();
        };
      } else {
        // Script already exists, just render button
        renderGoogleButton();
      }
    };

    const renderGoogleButton = () => {
      /* global google */
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '431674926667-5l2r6pp7vqre0mkv6ujuj1oj2j2q7kfl.apps.googleusercontent.com',
          callback: handleGoogleCallback
        });
        const buttonDiv = document.getElementById('googleSignInDiv');
        if (buttonDiv) {
          // Clear any existing content
          buttonDiv.innerHTML = '';
          window.google.accounts.id.renderButton(
            buttonDiv,
            { theme: 'outline', size: 'large' }
          );
        }
      }
    };

    initializeGoogle();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Kiểm tra reCAPTCHA (chỉ khi ENABLE_RECAPTCHA = true)
    if (ENABLE_RECAPTCHA && !recaptchaValue) {
      setError('Vui lòng xác nhận reCAPTCHA');
      return;
    }

    setLoading(true);
    try {
      const requestData = { 
        email, 
        password
      };
      
      // Chỉ gửi recaptcha khi được bật
      if (ENABLE_RECAPTCHA && recaptchaValue) {
        requestData.recaptcha = recaptchaValue;
      }
      
      const res = await axiosClient.post('/auth/login', requestData);
      const data = res.data;
      if (data.success) {
        // Save or clear remember me credentials
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }
        // Save token and user to localStorage
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        // Notify other parts of the app that user changed
        window.dispatchEvent(new Event('userChanged'));
        // Redirect based on role
        const roleName = data.user?.role?.name || data.user?.role?.roleName || '';
        const rn = String(roleName).toLowerCase();
        if (rn.includes('admin')) {
          navigate('/admin');
        } else if (rn.includes('doctor')) {
          navigate('/doctor/dashboard');
        } else {
          navigate('/'); // Redirect to home page for patients
        }
      } else {
        setError(data.message || 'Đăng nhập thất bại');
        // Reset reCAPTCHA on error and require user to verify again (chỉ khi bật)
        if (ENABLE_RECAPTCHA) {
          try { recaptchaRef.current?.reset(); } catch (e) { /* noop */ }
          setRecaptchaValue(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi mạng');
      // Reset reCAPTCHA on error and require user to verify again (chỉ khi bật)
      if (ENABLE_RECAPTCHA) {
        try { recaptchaRef.current?.reset(); } catch (e) { /* noop */ }
        setRecaptchaValue(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle reCAPTCHA change
  const handleRecaptchaChange = (value) => {
    setRecaptchaValue(value);
    console.log('reCAPTCHA value:', value);
  };

  // Handle reCAPTCHA expired
  const handleRecaptchaExpired = () => {
    setRecaptchaValue(null);
    console.log('reCAPTCHA expired');
  };

  const decodeJwtPayload = (token) => {
    try {
      const base64Url = token?.split?.('.')[1];
      if (!base64Url) return {};
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const binary = window.atob(base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const json = new TextDecoder('utf-8').decode(bytes);
      return JSON.parse(json);
    } catch (err) {
      console.error('Error decoding JWT payload:', err);
      return {};
    }
  };


  // Handle Google sign-in callback
  const handleGoogleCallback = async (response) => {
    try {
      const idToken = response?.credential;
      
      // Decode JWT payload (basic decode, no verification)
      const payload = decodeJwtPayload(idToken);
      const email = payload.email;
      // Google's given_name is first name (tên), family_name is last name (họ)
      // Map correctly: given_name -> firstName (tên), family_name -> lastName (họ)
      const firstName = payload.given_name || 'Google';
      const lastName = payload.family_name || 'User';
      const picture = payload.picture; // Lấy ảnh Google
      
      console.log('🔍 Google login data:', { email, firstName, lastName, picture });
      console.log('🔍 Raw payload:', payload);
      
      // Send extracted data to backend
      const res = await axiosClient.post('/auth/google', { email, firstName, lastName, picture, idToken });
      if (res.data?.success) {
        console.log('🔍 Frontend - Received user data:', res.data.user);
        console.log('🔍 Frontend - User avatarUrl:', res.data.user?.avatarUrl);
        console.log('🔍 Frontend - User firstName:', res.data.user?.firstName);
        console.log('🔍 Frontend - User lastName:', res.data.user?.lastName);
        
        // Save token and user to localStorage
        if (res.data.token) localStorage.setItem('token', res.data.token);
        if (res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user));
        
        // Notify other parts of the app that user changed
        window.dispatchEvent(new Event('userChanged'));
        
        // Redirect based on role
        const roleName = res.data.user?.role?.name || res.data.user?.role?.roleName || '';
        const rn = String(roleName).toLowerCase();
        if (rn.includes('admin')) {
          navigate('/admin');
        } else if (rn.includes('doctor')) {
          navigate('/doctor/dashboard');
        } else {
          navigate('/'); // Redirect to home page for patients
        }
      }
    } catch (err) {
      console.error('❌ Google sign-in error:', err);
      console.error('❌ Error response:', err.response?.data);
      
      // Extract error message from backend response
      let errorMessage = 'Google sign-in failed';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data) {
        errorMessage = typeof err.response.data === 'string' ? err.response.data : 'Google sign-in failed';
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow">
        <h2 className="mb-4 text-2xl font-semibold text-[#0d6efd]">Đăng nhập</h2>
        <p className="mb-6 text-sm text-gray-600">Đăng nhập để quản lý hồ sơ, đặt lịch và xem lịch sử.</p>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-gray-200 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-gray-300 text-[#0d6efd] focus:ring-2 focus:ring-[#cfe9ff]"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer">
                Ghi nhớ đăng nhập
              </label>
            </div>
            <a href="/forgot-password" className="text-sm text-[#0d6efd] hover:underline">
              Quên mật khẩu?
            </a>
          </div>

          {/* reCAPTCHA - Chỉ hiển thị khi ENABLE_RECAPTCHA = true */}
          {ENABLE_RECAPTCHA && ReCAPTCHA && (
            <div className="mb-4">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY || "6LfeffErAAAAAJ-GRzSFQ3NcwFpKn-HAyiu_Jfku"}
                onChange={handleRecaptchaChange}
                onExpired={handleRecaptchaExpired}
                theme="light"
                size="normal"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-[#0d6efd] px-4 py-2 text-white disabled:opacity-60"
              disabled={loading || (ENABLE_RECAPTCHA && !recaptchaValue)}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <a href="/register" className="text-sm text-[#0d6efd] hover:underline">Đăng ký</a>
          </div>
        </form>
        <div className="mt-4 text-center">
          <div id="googleSignInDiv" />
        </div>
      </div>
    </div>
  );
}
