import axiosClient from './axiosClient';

const doctorScheduleApi = {
  // Tạo lịch trình mới cho bác sĩ
  createSchedule: (scheduleData) => {
    return axiosClient.post('/doctor-schedules', scheduleData);
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
