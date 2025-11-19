import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load email from localStorage if available
    const savedEmail = localStorage.getItem('resetPasswordEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      // Chỉ cần gọi reset-password, API này sẽ tự verify OTP
      const resetRes = await axiosClient.post('/auth/reset-password', {
        email,
        otp,
        newPassword
      });

      if (resetRes.data?.success) {
        setSuccess(true);
        // Clear saved email
        localStorage.removeItem('resetPasswordEmail');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(resetRes.data?.message || 'Không thể đặt lại mật khẩu');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await axiosClient.post('/auth/send-otp', { email });
      if (res.data?.success) {
        alert('Mã OTP mới đã được gửi đến email của bạn');
      }
    } catch (err) {
      alert('Không thể gửi lại mã OTP');
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow">
        <h2 className="mb-4 text-2xl font-semibold text-[#0d6efd]">Đặt lại mật khẩu</h2>
        <p className="mb-6 text-sm text-gray-600">
          Nhập mã OTP đã được gửi đến email của bạn và mật khẩu mới.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Đặt lại mật khẩu thành công! Đang chuyển hướng đến trang đăng nhập...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-200 px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
              readOnly
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Mã OTP</label>
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-xs text-[#0d6efd] hover:underline"
              >
                Gửi lại mã
              </button>
            </div>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              placeholder="Nhập mã OTP"
              maxLength={6}
              className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Nhập mật khẩu mới"
              minLength={6}
              className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Nhập lại mật khẩu mới"
              minLength={6}
              className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-[#0d6efd] px-4 py-2 text-white disabled:opacity-60"
              disabled={loading || success}
            >
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
            <a href="/login" className="text-sm text-[#0d6efd] hover:underline">
              Quay lại đăng nhập
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
