import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import paymentApi from '../../api/paymentApi';

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Lấy thông tin từ PayOS redirect
  const payOSId = searchParams.get('id');
  const status = searchParams.get('status');
  const orderCode = searchParams.get('orderCode');
  const code = searchParams.get('code');
  const doctorId = searchParams.get('doctorId');

  useEffect(() => {
    const handlePaymentCancel = async () => {
      if (!payOSId) {
        setError('Không tìm thấy thông tin thanh toán');
        setLoading(false);
        return;
      }

      // Set timeout để tránh loading vô hạn
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Payment cancel timeout - forcing loading to stop');
        setLoading(false);
      }, 10000); // 10 seconds timeout

      try {
        console.log('🔍 PayOS Cancel Redirect:', {
          payOSId,
          status,
          orderCode,
          code
        });

        // Cập nhật payment status thành CANCELLED
        console.log('🔄 Updating payment status to CANCELLED for PayOS ID:', payOSId);
        try {
          const updateResponse = await paymentApi.updatePaymentStatusFromPayOS(payOSId, 'CANCELLED', orderCode);
          console.log('✅ Payment status updated to CANCELLED:', updateResponse.data);
        } catch (updateError) {
          console.error('❌ Could not update payment status:', updateError);
          console.error('❌ Update error response:', updateError.response?.data);
          console.error('❌ Update error status:', updateError.response?.status);
          // Không dừng process nếu update status thất bại
        }

        // Lấy thông tin payment sau khi cập nhật
        console.log('🔍 Fetching payment info for PayOS ID:', payOSId);
        try {
          const response = await paymentApi.getPaymentByPayOSPaymentId(payOSId);
          if (response.data) {
            setPaymentInfo(response.data);
            console.log('✅ Payment info loaded:', response.data);
          } else {
            console.warn('⚠️ No payment data received');
            setError('Không tìm thấy thông tin thanh toán');
          }
        } catch (fetchError) {
          console.error('❌ Error fetching payment info:', fetchError);
          // Fallback: Tạo thông tin payment cơ bản từ URL params
          setPaymentInfo({
            paymentId: payOSId,
            status: 'CANCELLED',
            amount: 0,
            payOSPaymentId: payOSId,
            orderCode: orderCode
          });
          console.log('✅ Using fallback payment info');
        }

        // Broadcast trạng thái để trang đặt lịch cập nhật ngay
        try {
          localStorage.setItem('payosStatus', 'CANCELLED');
          localStorage.setItem('payosLastUpdate', String(Date.now()));
          window.dispatchEvent(new Event('payosStatusChanged'));
        } catch (_) {}
      } catch (err) {
        console.error('❌ Error in payment cancel process:', err);
        setError('Có lỗi xảy ra khi xử lý hủy thanh toán');
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        console.log('✅ Payment cancel process completed');
        if (doctorId) {
          setShouldRedirect(true);
        }
      }
    };

    handlePaymentCancel();
  }, [payOSId, status, orderCode, code, doctorId]);

  useEffect(() => {
    if (!doctorId || !shouldRedirect) return;

    const timer = setTimeout(() => {
      navigate(`/patient/booking/${doctorId}`, {
        replace: true,
        state: { paymentCancelled: true }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [doctorId, shouldRedirect, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleReturnToBooking = () => {
    if (doctorId) {
      navigate(`/patient/booking/${doctorId}`);
    } else {
      navigate('/patient/book-appointment');
    }
  };

  const handleTryAgain = () => {
    navigate(-1); // Go back to previous page
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang xử lý thông tin thanh toán...</p>
          <p className="text-sm text-gray-500 mt-2">
            Nếu trang này tải quá lâu, 
            <button 
              onClick={() => setLoading(false)}
              className="text-blue-600 hover:text-blue-800 underline ml-1"
            >
              nhấn vào đây
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Cancel Message */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán đã hủy</h1>
            <p className="text-gray-600 mb-6">
              Bạn đã hủy quá trình thanh toán. Lịch hẹn chưa được xác nhận.
            </p>
            {doctorId && (
              <p className="text-sm text-blue-600 mb-6">
                Hệ thống sẽ chuyển bạn về trang đặt lịch trong giây lát...
              </p>
            )}
            
            {/* Payment Info */}
            {paymentInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Thông tin thanh toán</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Mã thanh toán:</strong> {paymentInfo.paymentId}</p>
                  <p><strong>Trạng thái:</strong> 
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                      {paymentInfo.status}
                    </span>
                  </p>
                  {paymentInfo.amount && (
                    <p><strong>Số tiền:</strong> {paymentInfo.amount.toLocaleString('vi-VN')} VND</p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>
         
          {/* Action Buttons */}
          <div className="flex gap-4">
            {doctorId && (
              <button
                onClick={handleReturnToBooking}
                className="flex-1 px-6 py-3 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                Quay lại đặt lịch
              </button>
            )}
            <button
              onClick={handleGoHome}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2  "
            >
              Về trang chủ
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}
