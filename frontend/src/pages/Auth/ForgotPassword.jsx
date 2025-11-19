import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await axiosClient.post('/auth/send-otp', { email });
      if (res.data?.success) {
        setSuccess(true);
        // Save email to localStorage to use in reset password page
        localStorage.setItem('resetPasswordEmail', email);
        // Redirect to reset password page after 2 seconds
        setTimeout(() => {
          navigate('/reset-password');
        }, 2000);
      } else {
        setError(res.data?.message || 'Không thể gửi mã OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi gửi mã OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow">
        <h2 className="mb-4 text-2xl font-semibold text-[#0d6efd]">Quên mật khẩu</h2>
        <p className="mb-6 text-sm text-gray-600">
          Nhập email của bạn để nhận mã OTP xác thực và đặt lại mật khẩu.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Mã OTP đã được gửi đến email của bạn. Đang chuyển hướng...
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
              placeholder="Nhập email của bạn"
              className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-[#0d6efd] px-4 py-2 text-white disabled:opacity-60"
              disabled={loading || success}
            >
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
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
