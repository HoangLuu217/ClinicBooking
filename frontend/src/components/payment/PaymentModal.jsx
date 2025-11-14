import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, AlertCircle, CheckCircle, Clock, ExternalLink, Loader2, FileText } from 'lucide-react';
import paymentApi from '../../api/paymentApi';
import PaymentPdf from './PaymentPdf';
import html2pdf from 'html2pdf.js';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  appointmentData, 
  onPaymentSuccess, 
  onPaymentError 
}) => {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    if (isOpen && appointmentData) {
      createPayment();
    }
  }, [isOpen, appointmentData]);

  const createPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!appointmentData.appointmentId) {
        throw new Error('Appointment ID is required');
      }
      if (!appointmentData.fee || appointmentData.fee <= 0) {
        throw new Error('Valid fee amount is required');
      }

      const cancelParams = new URLSearchParams({
        paymentStatus: 'cancelled',
        appointmentId: String(appointmentData.appointmentId)
      });
      const cancelPath = appointmentData.doctorId
        ? `/patient/booking/${appointmentData.doctorId}?${cancelParams.toString()}`
        : `/patient/book-appointment?${cancelParams.toString()}`;
      const cancelUrl = `${window.location.origin}${cancelPath}`;
      const successParams = new URLSearchParams({
        paymentStatus: 'success',
        appointmentId: String(appointmentData.appointmentId)
      });
      const successUrl = `${window.location.origin}/patient/appointments?${successParams.toString()}`;
      const paymentData = {
        appointmentId: Number(appointmentData.appointmentId), // Ensure it's a number
        amount: appointmentData.fee.toString(), // Convert to string for BigDecimal
        description: `Phí khám #${appointmentData.appointmentId}`, // Ngắn hơn cho PayOS
        returnUrl: successUrl,
        cancelUrl
      };

      console.log('Creating payment with data:', paymentData);
      const response = await paymentApi.createPayment(paymentData);
      
      if (response.data) {
        setPayment(response.data);
        setPaymentStatus(response.data.status);
        console.log('Payment created successfully:', response.data);
        
        // Tự động mở PayOS link ngay khi có
        if (response.data.payOSLink) {
          console.log('🚀 Auto-opening PayOS link:', response.data.payOSLink);
          window.open(response.data.payOSLink, '_blank');
          
          // Bắt đầu polling để kiểm tra trạng thái thanh toán
          startPaymentStatusPolling();
        }
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      setError(error.response?.data?.message || 'Không thể tạo thanh toán');
      onPaymentError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    if (payment?.payOSLink) {
      // Mở PayOS link trong tab mới
      window.open(payment.payOSLink, '_blank');
      
      // Bắt đầu polling để kiểm tra trạng thái thanh toán
      startPaymentStatusPolling();
    }
  };

  const startPaymentStatusPolling = () => {
    const interval = setInterval(async () => {
      try {
        if (payment?.paymentId) {
          const response = await paymentApi.checkPaymentStatus(payment.paymentId);
          const newStatus = response.data?.status;
          
          if (newStatus && newStatus !== paymentStatus) {
            setPaymentStatus(newStatus);
            
            if (newStatus === 'PAID') {
              clearInterval(interval);
              onPaymentSuccess?.(response.data);
            } else if (newStatus === 'FAILED' || newStatus === 'CANCELLED') {
              clearInterval(interval);
              onPaymentError?.(new Error('Thanh toán thất bại'));
            }
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000); // Check every 3 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
    }, 600000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'FAILED':
      case 'CANCELLED':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'PENDING':
      default:
        return <Clock className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán thành công';
      case 'FAILED':
        return 'Thanh toán thất bại';
      case 'CANCELLED':
        return 'Thanh toán đã hủy';
      case 'PENDING':
      default:
        return payment?.payOSLink ? 'Đang mở PayOS...' : 'Chờ thanh toán';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'FAILED':
      case 'CANCELLED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'PENDING':
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  // PDF Preview & Export
  const handleShowPdfModal = () => setShowPdfModal(true);
  const handleClosePdfModal = () => setShowPdfModal(false);
  const handleExportPdf = () => {
    const element = document.getElementById('payment-pdf-preview');
    if (element) {
      html2pdf().set({
        margin: 10,
        filename: `phieu-thanh-toan-${payment?.paymentId || 'payment'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
      }).from(element).save();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Thanh toán</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tạo thanh toán...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700 font-medium">Lỗi thanh toán</p>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {payment && (
            <div className="space-y-6">
              {/* Payment Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Thông tin thanh toán</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mã thanh toán:</span>
                    <span className="font-medium">#{payment.paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số tiền:</span>
                    <span className="font-medium text-green-600">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(payment.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái:</span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(paymentStatus)}`}>
                      {getStatusIcon(paymentStatus)}
                      {getStatusText(paymentStatus)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Phương thức thanh toán</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <span className="text-sm">Thẻ tín dụng/ghi nợ</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Ví điện tử</span>
                  </div>
                </div>
              </div>

              {/* PayOS Link */}
              {payment.payOSLink && paymentStatus === 'PENDING' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ExternalLink className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Đã mở PayOS</span>
                  </div>
                  <p className="text-sm text-green-700 mb-4">
                    Trang thanh toán PayOS đã được mở trong tab mới. Vui lòng hoàn tất thanh toán.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang chờ thanh toán...</span>
                  </div>
                </div>
              )}

              {/* Payment Success */}
              {paymentStatus === 'PAID' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Thanh toán thành công!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Lịch hẹn của bạn đã được xác nhận. Bạn sẽ nhận được thông báo qua email.
                  </p>
                  {/* PDF Preview & Export Button */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleShowPdfModal}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <FileText className="h-4 w-4" /> Xem phiếu thanh toán
                    </button>
                    <button
                      onClick={handleExportPdf}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      <FileText className="h-4 w-4" /> Xuất PDF
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Failed */}
              {(paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900">Thanh toán thất bại</span>
                  </div>
                  <p className="text-sm text-red-700 mb-3">
                    {paymentStatus === 'FAILED' 
                      ? 'Thanh toán không thành công. Vui lòng thử lại.'
                      : 'Bạn đã hủy thanh toán.'
                    }
                  </p>
                  <button
                    onClick={createPayment}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PDF Modal */}
        {showPdfModal && payment && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full relative">
              <button
                onClick={handleClosePdfModal}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
              <div id="payment-pdf-preview">
                <PaymentPdf payment={payment} />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
          {paymentStatus === 'PAID' && (
            <button
              onClick={() => {
                onPaymentSuccess?.(payment);
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Hoàn thành
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
