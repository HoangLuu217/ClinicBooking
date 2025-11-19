import axiosClient from './axiosClient';

const notificationApi = {
  // Lấy danh sách thông báo của user (trả về { content, unreadCount, ... })
  getNotifications: (userId, page = 0, size = 50) => {
    return axiosClient.get(`/notifications/user/${userId}`, { 
      params: { page, size },
      timeout: 60000 // Tăng timeout lên 60 giây
    });
  },

  // Đánh dấu thông báo đã đọc
  markAsRead: (notificationId) => {
    return axiosClient.post(`/notifications/${notificationId}/read`);
  },

  // Đánh dấu tất cả thông báo đã đọc cho user
  markAllAsRead: (userId) => {
    return axiosClient.post(`/notifications/user/${userId}/read-all`);
  },

  // Tạo nhanh 1 thông báo (tuỳ chọn dùng cho test/admin)
  create: (payload) => {
    return axiosClient.post(`/notifications`, payload);
  }
};

export default notificationApi;
