import axiosClient from './axiosClient';

export const getDoctors = (params = {}) =>
  axiosClient.get('/doctors', {
    params: { page: 0, size: 12, sort: 'doctorId,asc', ...params },
  });

const doctorApi = {
  // Lấy tất cả bác sĩ với thông tin User và Role
  getAllDoctors: () => {
    return axiosClient.get('/doctors');
  },

  // Lấy bác sĩ theo ID
  getDoctorById: (doctorId) => {
    return axiosClient.get(`/doctors/${doctorId}`);
  },

  // Lấy bác sĩ theo khoa
  getDoctorsByDepartment: (departmentId) => {
    return axiosClient.get(`/doctors/department/${departmentId}`);
  },

  // Lấy bác sĩ theo chuyên khoa
  getDoctorsBySpecialty: (specialty) => {
    return axiosClient.get(`/doctors/specialty/${encodeURIComponent(specialty)}`);
  },

  // Lấy bác sĩ theo userId
  getDoctorByUserId: (userId) => {
    return axiosClient.get(`/doctors/user/${userId}`);
  },

  // Tạo bác sĩ mới từ user có sẵn
  createDoctor: (doctorData) => {
    return axiosClient.post('/doctors', doctorData);
  },

  // Đăng ký bác sĩ mới (tạo cả User và Doctor)
  registerDoctor: (doctorData) => {
    return axiosClient.post('/doctors/register', doctorData);
  },

  // Cập nhật thông tin bác sĩ
  updateDoctor: (doctorId, doctorData) => {
    return axiosClient.put(`/doctors/${doctorId}`, doctorData);
  },

  // Cập nhật thông tin bác sĩ và user
  updateDoctorWithUser: (doctorId, doctorData) => {
    return axiosClient.put(`/doctors/${doctorId}/with-user`, doctorData);
  },

  // Xóa bác sĩ (soft delete)
  deleteDoctor: (doctorId) => {
    return axiosClient.delete(`/doctors/${doctorId}`);
  },


  // Tìm kiếm bác sĩ theo tên
  searchDoctors: (keyword) => {
    return axiosClient.get(`/doctors/search?keyword=${encodeURIComponent(keyword)}`);
  },

  // Kiểm tra user đã có thông tin bác sĩ chưa
  isUserDoctor: (userId) => {
    return axiosClient.get(`/doctors/check/${userId}`);
  }
};

export default doctorApi;
