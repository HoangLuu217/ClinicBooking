import axiosClient from './axiosClient';

const medicalRecordApi = {
  // Lấy tất cả hồ sơ bệnh án
  getAllMedicalRecords: () => {
    return axiosClient.get('/medical-records');
  },

  // Lấy hồ sơ bệnh án theo ID
  getMedicalRecordById: (recordId) => {
    return axiosClient.get(`/medical-records/${recordId}`);
  },

  // Lấy hồ sơ bệnh án theo bệnh nhân
  getMedicalRecordsByPatient: (patientId) => {
    return axiosClient.get(`/medical-records/patient/${patientId}`);
  },

  // Lấy hồ sơ bệnh án theo bác sĩ
  getMedicalRecordsByDoctor: (doctorId) => {
    return axiosClient.get(`/medical-records/doctor/${doctorId}`);
  },

  // Lấy hồ sơ bệnh án theo appointment
  getMedicalRecordsByAppointment: (appointmentId) => {
    return axiosClient.get(`/medical-records/appointment/${appointmentId}`);
  },

  // Tạo hồ sơ bệnh án mới
  createMedicalRecord: (recordData) => {
    return axiosClient.post('/medical-records', recordData);
  },

  // Cập nhật hồ sơ bệnh án
  updateMedicalRecord: (recordId, recordData) => {
    return axiosClient.put(`/medical-records/${recordId}`, recordData);
  },

  // Xóa hồ sơ bệnh án
  deleteMedicalRecord: (recordId) => {
    return axiosClient.delete(`/medical-records/${recordId}`);
  },

  // Tìm kiếm hồ sơ bệnh án
  searchMedicalRecords: (keyword) => {
    return axiosClient.get(`/medical-records/search?keyword=${encodeURIComponent(keyword)}`);
  },

  // Lấy hồ sơ theo trạng thái
  getMedicalRecordsByStatus: (status) => {
    return axiosClient.get(`/medical-records/status/${status}`);
  },

  // Lấy hồ sơ theo ngày
  getMedicalRecordsByDate: (startDate, endDate) => {
    return axiosClient.get(`/medical-records/date?start=${startDate}&end=${endDate}`);
  },

  // Cập nhật trạng thái hồ sơ
  updateMedicalRecordStatus: (recordId, status) => {
    return axiosClient.patch(`/medical-records/${recordId}/status`, { status });
  }
};

export default medicalRecordApi;