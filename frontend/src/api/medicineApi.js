import axiosClient from './axiosClient';

const medicineApi = {
  // Lấy danh sách thuốc
  getAll: () => {
    const url = '/medicines';
    return axiosClient.get(url);
  },

  // Lấy thông tin một thuốc
  getById: (id) => {
    const url = `/medicines/${id}`;
    return axiosClient.get(url);
  },

  // Thêm thuốc mới
  create: (data) => {
    const url = '/medicines';
    return axiosClient.post(url, data);
  },

  // Cập nhật thông tin thuốc
  update: (id, data) => {
    const url = `/medicines/${id}`;
    return axiosClient.put(url, data);
  },

  // Xóa thuốc
  delete: (id) => {
    const url = `/medicines/${id}`;
    return axiosClient.delete(url);
  },

  // Tìm kiếm thuốc
  search: (params) => {
    const url = '/medicines/search';
    return axiosClient.get(url, { params });
  },

  // Lấy thống kê thuốc
  getStatistics: () => {
    const url = '/medicines/statistics';
    return axiosClient.get(url);
  }
};

export default medicineApi;