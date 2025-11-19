import axiosClient from './axiosClient';

const reviewApi = {
  // Get all reviews
  getAll: () => axiosClient.get(`/reviews/all`).then(r => r.data),
  // Get reviews by doctor
  getByDoctor: (doctorId) => axiosClient.get(`/reviews/by-doctor`, { params: { doctorId } }).then(r => r.data),

  // Get active reviews by doctor
  getActiveByDoctor: (doctorId) => axiosClient.get(`/reviews/active/by-doctor`, { params: { doctorId } }).then(r => r.data),

  // Get reviews by patient
  getByPatient: (patientId) => axiosClient.get(`/reviews/by-patient`, { params: { patientId } }).then(r => r.data),

  // Average rating and count by doctor
  getAverageRatingByDoctor: (doctorId) => axiosClient.get(`/reviews/average-rating/by-doctor`, { params: { doctorId } }).then(r => r.data),
  getReviewCountByDoctor: (doctorId) => axiosClient.get(`/reviews/count/by-doctor`, { params: { doctorId } }).then(r => r.data),

  // Update review
  update: (id, payload) => axiosClient.put(`/reviews/${id}`, payload).then(r => r.data),

  // Create new review
  createReview: (data) => axiosClient.post('/reviews', data).then(r => r.data),

  // Get review by appointment
  getReviewByAppointment: (appointmentId) => axiosClient.get(`/reviews/by-appointment/${appointmentId}`).then(r => r.data),

  // Deactivate review
  deactivate: (id) => axiosClient.put(`/reviews/${id}/deactivate`).then(r => r.data),

  // Delete review
  delete: (id) => axiosClient.delete(`/reviews/${id}`).then(r => r.data),
};

export default reviewApi;


