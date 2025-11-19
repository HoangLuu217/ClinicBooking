import axiosClient from './axiosClient';

const referralApi = {
  // Doctor endpoints
  createReferral: (data) => {
    return axiosClient.post('/clinical-referrals', data);
  },

  getReferralsByDoctor: (doctorId) => {
    return axiosClient.get(`/clinical-referrals/doctor/${doctorId}`);
  },

  getDoctorStats: (doctorId) => {
    return axiosClient.get(`/clinical-referrals/doctor/${doctorId}/stats`);
  },

  getReferralsByAppointment: (appointmentId) => {
    return axiosClient.get(`/clinical-referrals/appointment/${appointmentId}`);
  },

  // Lab endpoints
  getReferralsByDepartment: (departmentId) => {
    return axiosClient.get(`/clinical-referrals/department/${departmentId}`);
  },

  getPendingReferrals: (departmentId) => {
    return axiosClient.get(`/clinical-referrals/department/${departmentId}/pending`);
  },

  updateStatus: (referralId, status) => {
    return axiosClient.put(`/clinical-referrals/${referralId}/status`, null, {
      params: { status }
    });
  },

  updateResult: (referralId, data) => {
    return axiosClient.put(`/clinical-referrals/${referralId}/result`, data);
  },

  // Patient endpoints
  getReferralsByPatient: (patientId) => {
    return axiosClient.get(`/clinical-referrals/patient/${patientId}`);
  },

  // Common
  getReferralById: (referralId) => {
    return axiosClient.get(`/clinical-referrals/${referralId}`);
  },

  getReferral: (referralId) => {
    return axiosClient.get(`/clinical-referrals/${referralId}`);
  },

  deleteReferral: (referralId) => {
    return axiosClient.delete(`/clinical-referrals/${referralId}`);
  },
};

export default referralApi;
