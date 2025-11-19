import axiosClient from "./axiosClient";

const paymentApi = {
   // Tạo payment cho appointment
  createPayment: (paymentData) => {
    return axiosClient.post('/payments', paymentData);
  },

  // Lấy payment theo ID
  getPaymentById: (paymentId) => {
    return axiosClient.get(`/payments/${paymentId}`);
  },

  // Lấy payment theo PayOS Payment ID
  getPaymentByPayOSPaymentId: (payOSPaymentId) => {
    return axiosClient.get(`/payments/payos/${payOSPaymentId}`);
  },

  // Lấy payments theo appointment ID
  getPaymentsByAppointmentId: (appointmentId) => {
    return axiosClient.get(`/payments/appointment/${appointmentId}`);
  },

  // Lấy payments theo patient ID
  getPaymentsByPatientId: (patientId) => {
    return axiosClient.get(`/payments/patient/${patientId}`);
  },

  // Lấy payments theo doctor ID
  getPaymentsByDoctorId: (doctorId) => {
    return axiosClient.get(`/payments/doctor/${doctorId}`);
  },

  // Lấy tất cả payments với phân trang
  getAllPayments: (page = 0, size = 20) => {
    return axiosClient.get('/payments', {
      params: { page, size }
    });
  },

  // Lấy payments theo status
  getPaymentsByStatus: (status) => {
    return axiosClient.get(`/payments/status/${status}`);
  },

  // Cập nhật trạng thái payment
  updatePaymentStatus: (paymentId, status) => {
    return axiosClient.put(`/payments/${paymentId}/status`, null, {
      params: { status }
    });
  },

  // Cập nhật payment status từ PayOS redirect
  updatePaymentStatusFromPayOS: (payOSPaymentId, status, orderCode) => {
    return axiosClient.put(`/payments/payos/${payOSPaymentId}/status`, null, {
      params: { status, orderCode }
    });
  },

  // Kiểm tra trạng thái payment
  checkPaymentStatus: (paymentId) => {
    return axiosClient.get(`/payments/${paymentId}/status`);
  },

  // Xóa payment
  deletePayment: (paymentId) => {
    return axiosClient.delete(`/payments/${paymentId}`);
  },
  exportInvoicePdf: (id) =>
    axiosClient.get(`/payments/${id}/invoice-pdf`, { responseType: "blob" }),
};

export default paymentApi;
