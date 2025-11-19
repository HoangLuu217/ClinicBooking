import axiosClient from './axiosClient';

export const getDepartments = (params = {}) =>
  axiosClient.get('/departments', {
    params: { page: 0, size: 1000, sort: 'departmentName,asc', ...params },
  });

export const getAllDepartmentsList = () => getDepartments();

export const getActiveDepartmentList = () =>
  axiosClient.get('/departments/active/list');

const departmentApi = {
  // Get all departments with pagination
  getAllDepartments: (page = 0, size = 10, sort = 'departmentName,asc') =>
    axiosClient.get('/departments', { params: { page, size, sort } }),
  
  // Get all departments without pagination (for dropdowns)
  getAllDepartmentsList: () =>
    axiosClient.get('/departments?size=1000'),
  
  // Get department by ID
  getDepartmentById: (departmentId) =>
    axiosClient.get(`/departments/${departmentId}`),
  
  // Create new department
  createDepartment: (departmentData) =>
    axiosClient.post('/departments', departmentData),
  
  // Update department
  updateDepartment: (departmentId, departmentData) =>
    axiosClient.put(`/departments/${departmentId}`, departmentData),
  
  // Delete department
  deleteDepartment: (departmentId) =>
    axiosClient.delete(`/departments/${departmentId}`),
  
  // Search departments
  searchDepartments: (keyword) =>
    axiosClient.get(`/departments/search?keyword=${encodeURIComponent(keyword)}`),
  
  // Get departments with metadata (icon, image, etc.)
  getDepartmentsWithMetadata: () =>
    axiosClient.get('/departments?size=1000&include=metadata'),
};

export default departmentApi;


