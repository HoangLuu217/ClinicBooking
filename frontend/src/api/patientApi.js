import axiosClient from './axiosClient';

const patientApi = {
  // Lấy tất cả bệnh nhân
  getAllPatients: () => axiosClient.get('/patients'),

  // Lấy bệnh nhân theo ID
  getPatientById: (patientId) => axiosClient.get(`/patients/${patientId}`),

  // Lấy bệnh nhân theo UserID
  getPatientByUserId: (userId) => axiosClient.get(`/patients/user/${userId}`),

  // Tìm kiếm theo tên (nếu backend hỗ trợ)
  searchByName: (keyword) => axiosClient.get(`/patients/search`, { params: { keyword } }),

  // Cập nhật thông tin bệnh nhân
  updatePatient: (patientId, data) => axiosClient.put(`/patients/${patientId}`, data),
};

export default patientApi;



