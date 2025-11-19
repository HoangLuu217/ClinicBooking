import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Calendar, Clock, User, CreditCard } from 'lucide-react';
import paymentApi from '../../api/paymentApi';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPaymentInfo = async () => {
      // Lấy thông tin từ URL params
      const doctorId = searchParams.get('doctorId');
      const doctorName = searchParams.get('doctorName');
      const specialty = searchParams.get('specialty');
      const date = searchParams.get('date');
      const time = searchParams.get('time');
      const fee = searchParams.get('fee');
      const note = searchParams.get('note');
      const appointmentId = searchParams.get('appointmentId');
      const paymentId = searchParams.get('paymentId');

      // Nếu có thông tin từ PatientBookingDetail (trường hợp bình thường)
      if (doctorId && appointmentId) {
        setPaymentInfo({
          doctorId,
          doctorName,
          specialty,
          date,
          time,
          fee: parseFloat(fee) || 0,
          note,
          appointmentId,
          paymentId
        });
        setLoading(false);
        return;
      }

      // Nếu là PayOS redirect, lấy thông tin từ PayOS
      const payOSId = searchParams.get('id');
      const payOSStatus = searchParams.get('status');
      const orderCode = searchParams.get('orderCode');
      const code = searchParams.get('code');

      console.log('🔍 PayOS redirect detected:', {
        payOSId,
        payOSStatus,
        orderCode,
        code
      });

      if (payOSId) {
        // Kiểm tra status và redirect tương ứng
        if (payOSStatus === 'CANCELLED') {
          console.log('🔄 Redirecting to cancel page...');
          navigate(`/payment/cancel?id=${payOSId}&status=${payOSStatus}&orderCode=${orderCode}&code=${code}`);
          return;
        }

        try {
          // Cập nhật payment status thành PAID
          console.log('🔄 Updating payment status to PAID for PayOS ID:', payOSId);
          try {
            const updateResponse = await paymentApi.updatePaymentStatusFromPayOS(payOSId, 'PAID', orderCode);
            console.log('✅ Payment status updated to PAID:', updateResponse.data);
          } catch (updateError) {
            console.error('❌ Could not update payment status:', updateError);
            console.error('❌ Update error response:', updateError.response?.data);
            console.error('❌ Update error status:', updateError.response?.status);
          }

          // Tìm payment theo PayOS Payment ID
          console.log('🔍 Looking up payment by PayOS ID:', payOSId);
          const response = await paymentApi.getPaymentByPayOSPaymentId(payOSId);
          
          if (response.data) {
            console.log('✅ Found payment:', response.data);
            const payment = response.data;
            
            // Lấy thông tin appointment từ payment
            if (payment.appointment) {
              setPaymentInfo({
                doctorId: payment.appointment.doctorId,
                doctorName: payment.appointment.doctorName || 'Bác sĩ',
                specialty: payment.appointment.specialty || 'Chuyên khoa',
                date: payment.appointment.date || new Date().toISOString().split('T')[0],
                time: payment.appointment.time || 'N/A',
                fee: payment.amount || 0,
                note: payment.appointment.note || '',
                appointmentId: payment.appointment.appointmentId,
                paymentId: payment.paymentId
              });
            } else {
              // Fallback nếu không có appointment info
              setPaymentInfo({
                doctorId: 'unknown',
                doctorName: 'Bác sĩ',
                specialty: 'Chuyên khoa',
                date: new Date().toISOString().split('T')[0],
                time: 'N/A',
                fee: payment.amount || 0,
                note: '',
                appointmentId: 'unknown',
                paymentId: payment.paymentId
              });
            }

            // Broadcast trạng thái để trang đặt lịch cập nhật ngay
            try {
              localStorage.setItem('payosStatus', 'PAID');
              localStorage.setItem('payosLastUpdate', String(Date.now()));
              window.dispatchEvent(new Event('payosStatusChanged'));
            } catch (_) {}
          }
        } catch (error) {
          console.error('❌ Error loading payment info:', error);
          // Vẫn hiển thị thông tin cơ bản
          setPaymentInfo({
            doctorId: 'unknown',
            doctorName: 'Bác sĩ',
            specialty: 'Chuyên khoa',
            date: new Date().toISOString().split('T')[0],
            time: 'N/A',
            fee: 0,
            note: '',
            appointmentId: 'unknown',
            paymentId: 'unknown'
          });
        }
      }
      
      setLoading(false);
    };

    loadPaymentInfo();
  }, [searchParams]);

  useEffect(() => {
    if (!paymentInfo) return;

    const timer = setTimeout(() => {
      navigate('/patient/appointments', {
        replace: true,
        state: {
          paymentSuccess: true,
          appointmentId: paymentInfo.appointmentId
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [paymentInfo, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleViewAppointments = () => {
    navigate('/patient/appointments');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Đang tải thông tin thanh toán...</h2>
          <p className="text-gray-600">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  if (!paymentInfo) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy thông tin thanh toán</h2>
          <p className="text-gray-600 mb-4">Có thể thanh toán chưa được xử lý hoặc có lỗi xảy ra.</p>
          <button 
            onClick={handleGoHome}
            className="text-blue-600 hover:text-blue-700"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
        <p className="text-gray-600 mb-4">
          Hệ thống đang chuyển bạn về trang lịch hẹn để xem chi tiết.
        </p>
        {paymentInfo.paymentId && (
          <p className="text-sm text-gray-500 mb-6">
            Mã thanh toán: <span className="font-mono font-semibold">#{paymentInfo.paymentId}</span>
          </p>
        )}
        <button
          onClick={handleViewAppointments}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Đến trang lịch hẹn ngay
        </button>
        <button
          onClick={handleGoHome}
          className="w-full mt-3 px-6 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Về trang chủ
        </button>
        <p className="text-xs text-gray-400 mt-4">Bạn sẽ được chuyển tự động trong giây lát...</p>
      </div>
    </div>
  );
}
