import axiosClient from "./axiosClient";

const appointmentApi = {
  // Tạo lịch hẹn mới
  createAppointment: (appointmentData) => {
    return axiosClient.post("/appointments", appointmentData);
  },

  // Tạo hàng loạt lịch hẹn (tối ưu để tránh timeout)
  bulkCreateAppointments: (doctorId, appointments) => {
    return axiosClient.post("/appointments/bulk", {
      doctorId,
      appointments,
    });
  },

  // Lấy lịch hẹn theo ID
  getAppointmentById: (appointmentId) => {
    return axiosClient.get(`/appointments/${appointmentId}`);
  },

  // Lấy lịch hẹn theo bệnh nhân
  getAppointmentsByPatient: (patientId) => {
    return axiosClient.get(`/appointments/by-patient?patientId=${patientId}`);
  },

  // Lấy lịch hẹn theo bác sĩ
  getAppointmentsByDoctor: (doctorId) => {
    return axiosClient.get(`/appointments/by-doctor?doctorId=${doctorId}`);
  },

  // Cập nhật lịch hẹn
  updateAppointment: (appointmentId, appointmentData) => {
    return axiosClient.put(`/appointments/${appointmentId}`, appointmentData);
  },

  // Hủy lịch hẹn
  cancelAppointment: (appointmentId) => {
    return axiosClient.delete(`/appointments/${appointmentId}`);
  },

  // Xóa lịch hẹn (cancel - chỉ đổi status)
  deleteAppointment: (appointmentId) => {
    return axiosClient.delete(`/appointments/${appointmentId}`);
  },

  // Xóa vĩnh viễn khung giờ trống (permanent delete - xóa khỏi database)
  permanentDeleteAppointment: (appointmentId) => {
    return axiosClient.delete(`/appointments/${appointmentId}/permanent`);
  },

  // Lấy lịch hẹn theo ngày
  getAppointmentsByDate: (date) => {
    return axiosClient.get(`/appointments?date=${date}`);
  },

  // Lấy các khung giờ trống (available slots) của bác sĩ
  getAvailableSlots: (doctorId, startDate = null, endDate = null) => {
    let url = `/appointments/available-slots?doctorId=${doctorId}`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return axiosClient.get(url);
  },

  // Bệnh nhân đặt lịch (book appointment)
  bookAppointment: (appointmentId, patientId, notes) => {
    return axiosClient.put(`/appointments/${appointmentId}/book`, {
      patientId,
      notes,
    });
  },

  // Tạo payment cho appointment
  createPaymentForAppointment: (appointmentId, paymentData) => {
    return axiosClient.post(
      `/appointments/${appointmentId}/create-payment`,
      paymentData
    );
  },

  // Kiểm tra xem có appointment nào giữa patient và doctor không
  checkAppointmentBetweenPatientAndDoctor: (patientId, doctorId) => {
    return axiosClient.get(
      `/appointments/by-patient-and-doctor?patientId=${patientId}&doctorId=${doctorId}`
    );
  },
};

export default appointmentApi;
