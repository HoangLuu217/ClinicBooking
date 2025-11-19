import axiosClient from './axiosClient';

const messageApi = {
  // Tạo message mới
  createMessage: (data) => axiosClient.post('/messages', data),

  // Lấy messages theo conversationId
  getByConversation: (conversationId) =>
    axiosClient.get(`/messages/by-conversation?conversationId=${conversationId}`),

  // Lấy messages mới từ thời điểm since (ISO string)
  getNewMessages: (conversationId, sinceIso) =>
    axiosClient.get(`/messages/new?conversationId=${conversationId}&since=${sinceIso}`),

  // Lấy tin nhắn mới nhất của conversation
  getLatestByConversation: (conversationId) =>
    axiosClient.get(`/messages/latest/by-conversation?conversationId=${conversationId}`),

  // Lấy message theo ID
  getById: (id) => axiosClient.get(`/messages/${id}`),

  // Cập nhật message
  update: (id, data) => axiosClient.put(`/messages/${id}`, data),

  // Xoá message
  remove: (id) => axiosClient.delete(`/messages/${id}`),

  // Lấy số lượng tin nhắn chưa đọc
  getUnreadCount: (conversationId, userId) =>
    axiosClient.get(`/messages/unread-count?conversationId=${conversationId}&userId=${userId}`),

  // Lấy danh sách tin nhắn chưa đọc
  getUnreadMessages: (conversationId, userId) =>
    axiosClient.get(`/messages/unread?conversationId=${conversationId}&userId=${userId}`),

  // Đánh dấu tất cả tin nhắn trong conversation là đã đọc
  markMessagesAsRead: (conversationId, userId) =>
    axiosClient.put(`/messages/mark-as-read?conversationId=${conversationId}&userId=${userId}`),

  // Đánh dấu một tin nhắn cụ thể là đã đọc
  markMessageAsRead: (messageId) =>
    axiosClient.put(`/messages/${messageId}/mark-as-read`),
};

export default messageApi;


