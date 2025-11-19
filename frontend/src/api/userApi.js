import axiosClient from './axiosClient';

const userApi = {
  // Lấy tất cả users với phân trang
  getAllUsers: (page = 0, size = 20, sort = 'createdAt,desc') => {
    return axiosClient.get('/users', {
      params: { page, size, sort }
    });
  },

  // Lấy tất cả users với thông tin role (không phân trang)
  getAllUsersWithRoleInfo: () => {
    return axiosClient.get('/users/with-roles-info');
  },

  // Lấy tất cả users với thông tin role và thông tin bệnh nhân (nếu có)
  getAllUsersWithPatientInfo: () => {
    return axiosClient.get('/users/with-patient-info');
  },

  // Lấy user theo ID
  getUserById: (userId) => {
    return axiosClient.get(`/users/${userId}`);
  },

  // Lấy user theo email
  getUserByEmail: (email) => {
    return axiosClient.get(`/users/email/${email}`);
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: () => {
    return axiosClient.get('/users/me');
  },

  // Tìm kiếm users với bộ lọc
  searchUsers: (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.email) params.append('email', filters.email);
    if (filters.firstName) params.append('firstName', filters.firstName);
    if (filters.lastName) params.append('lastName', filters.lastName);
    if (filters.status) params.append('status', filters.status);
    if (filters.roleId) params.append('roleId', filters.roleId);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);
    if (filters.sort) params.append('sort', filters.sort);

    return axiosClient.get(`/users/search?${params.toString()}`);
  },

  // Tìm kiếm users theo tên với thông tin role
  searchUsersByName: (keyword) => {
    return axiosClient.get(`/users/search-with-roles-info?keyword=${encodeURIComponent(keyword)}`);
  },

  // Lấy users theo role ID
  getUsersByRoleId: (roleId) => {
    return axiosClient.get(`/users/role/${roleId}/with-roles-info`);
  },

  // Đếm số users theo role
  countUsersByRole: (roleId) => {
    return axiosClient.get(`/users/count-by-role/${roleId}`);
  },

  // Kiểm tra email đã tồn tại
  checkEmailExists: (email) => {
    return axiosClient.get(`/users/check-email/${encodeURIComponent(email)}`);
  },

  // Tạo user mới
  createUser: (userData) => {
    return axiosClient.post('/users', userData);
  },

  // Cập nhật user
  updateUser: (userId, userData) => {
    return axiosClient.put(`/users/${userId}`, userData);
  },

  // Cập nhật profile bao gồm Patient information
  updateUserProfile: (userId, profileData) => {
    return axiosClient.put(`/users/${userId}/profile`, profileData);
  },

  // Xóa user (soft delete)
  deleteUser: (userId) => {
    return axiosClient.delete(`/users/${userId}`);
  },

  // Xóa user vĩnh viễn (hard delete)
  hardDeleteUser: (userId) => {
    return axiosClient.delete(`/users/${userId}/hard`);
  },

  // Upload ảnh đại diện
  uploadAvatar: (userId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/users/${userId}/upload-avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Đổi mật khẩu cho user đã đăng nhập
  changePassword: (userId, passwordData) => {
    return axiosClient.put(`/users/${userId}/change-password`, passwordData);
  },

  // Thống kê users
  getUserStats: async () => {
    try {
      const [totalUsers, adminUsers, doctorUsers, patientUsers] = await Promise.all([
        userApi.getAllUsersWithRoleInfo(),
        userApi.countUsersByRole(1), // Assuming roleId 1 is ADMIN
        userApi.countUsersByRole(2), // Assuming roleId 2 is DOCTOR  
        userApi.countUsersByRole(3), // Assuming roleId 3 is PATIENT
      ]);

      return {
        total: totalUsers.data?.length || 0,
        admins: adminUsers.data || 0,
        doctors: doctorUsers.data || 0,
        patients: patientUsers.data || 0,
        active: totalUsers.data?.filter(user => user.status === 'ACTIVE')?.length || 0,
        inactive: totalUsers.data?.filter(user => user.status === 'INACTIVE')?.length || 0
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        total: 0,
        admins: 0,
        doctors: 0,
        patients: 0,
        active: 0,
        inactive: 0
      };
    }
  }
};

export default userApi;
