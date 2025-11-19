import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(localStorage.getItem('pendingOtpEmail') || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (email) {
      // Do NOT auto-send OTP here. The backend already sent OTP when you submitted the registration
      // to /api/patients/register. Showing a hint instead and allow the user to click "Gửi lại OTP"
      setMessage('Mã OTP đã được gửi tới email của bạn khi đăng ký. Nếu bạn không nhận được, nhấn Gửi lại OTP.');
    }
  }, [email]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      // Call patient confirm endpoint so the pending registration is consumed
      const res = await axiosClient.post('/patients/confirm-register', { email, otp });
      // Backend returns 201 Created when registration completed
      if (res.status === 201 || res.status === 200) {
        localStorage.removeItem('pendingOtpEmail');
        setMessage('Xác thực thành công, chuyển tới trang đăng nhập...');
        navigate('/login');
      } else {
        setMessage(res.data?.message || 'Xác thực thất bại');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Lỗi xác thực');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (!email) return;
    const key = `otpSent_${email}`;
    // force resend regardless of guard
    sessionStorage.setItem(key, String(Date.now()));
    axiosClient.post('/auth/send-otp-register', { email })
      .then(() => setMessage('Mã OTP đã được gửi lại'))
      .catch(err => {
        // if resend fails, allow future retry
        sessionStorage.removeItem(key);
        setMessage(err.response?.data?.message || 'Không thể gửi OTP');
      });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow">
        <h2 className="mb-4 text-2xl font-semibold text-[#0d6efd]">Xác thực OTP</h2>
        <p className="mb-4 text-sm text-gray-600">Nhập mã OTP đã được gửi tới email <strong>{email}</strong></p>
        {message && <div className="mb-4 text-sm text-gray-700">{message}</div>}

        <form onSubmit={handleVerify}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Mã OTP</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} required className="w-full rounded-md border border-gray-200 px-3 py-2" />
          </div>

          <div className="flex items-center justify-between">
            <button type="submit" className="rounded-md bg-[#0d6efd] px-4 py-2 text-white" disabled={loading}>{loading ? 'Đang xác thực...' : 'Xác thực'}</button>
            <button type="button" onClick={handleResend} className="text-sm text-[#0d6efd] hover:underline">Gửi lại OTP</button>
          </div>
        </form>
      </div>
    </div>
  );
}
