import axiosClient from './axiosClient';

const doctorScheduleApi = {
  // Tạo lịch trình mới cho bác sĩ
  createSchedule: (scheduleData) => {
    console.log('🔍 doctorScheduleApi.createSchedule called with:', scheduleData);
    console.log('🔍 API endpoint: /api/doctor-schedules');
    const promise = axiosClient.post('/doctor-schedules', scheduleData);
    promise
      .then((response) => {
        console.log('✅ doctorScheduleApi.createSchedule - Success:', response.data);
      })
      .catch((error) => {
        console.error('❌ doctorScheduleApi.createSchedule - Error:', error);
        console.error('❌ Error response:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
      });
    return promise;
  },

  // Lấy lịch trình theo ID
  getScheduleById: (scheduleId) => {
    return axiosClient.get(`/doctor-schedules/${scheduleId}`);
  },

  // Lấy tất cả lịch trình của một bác sĩ
  getSchedulesByDoctor: (doctorId) => {
    return axiosClient.get(`/doctor-schedules?doctorId=${doctorId}`);
  },

  // Cập nhật lịch trình
  updateSchedule: (scheduleId, scheduleData) => {
    return axiosClient.put(`/doctor-schedules/${scheduleId}`, scheduleData);
  },

  // Xóa lịch trình
  deleteSchedule: (scheduleId) => {
    return axiosClient.delete(`/doctor-schedules/${scheduleId}`);
  },

  // Lấy lịch trình theo ngày (có thể mở rộng thêm endpoint này ở backend)
  getSchedulesByDate: (doctorId, date) => {
    return axiosClient.get(`/doctor-schedules?doctorId=${doctorId}&date=${date}`);
  }
};

export default doctorScheduleApi;
