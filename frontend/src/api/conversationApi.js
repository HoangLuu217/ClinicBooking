import axiosClient from './axiosClient';

const conversationApi = {
  createConversation: (data) => axiosClient.post('/conversations', data),

  getConversationById: (id) => axiosClient.get(`/conversations/${id}`),

  getConversationWithMessages: (id) => axiosClient.get(`/conversations/${id}/messages`),

  getConversationsByPatient: (params = {}) => {
    const { patientId, patientUserId } =
      typeof params === "object" && params !== null
        ? params
        : { patientId: params };
    const searchParams = new URLSearchParams();
    if (patientId) searchParams.append("patientId", patientId);
    if (patientUserId) searchParams.append("patientUserId", patientUserId);
    const query = searchParams.toString();
    return axiosClient.get(
      `/conversations/by-patient${query ? `?${query}` : ""}`
    );
  },

  getConversationsByDoctor: (doctorId) =>
    axiosClient.get(`/conversations/by-doctor?doctorId=${doctorId}`),

  getConversationByPatientAndDoctor: (patientId, doctorId) =>
    axiosClient.get(
      `/conversations/by-patient-and-doctor?patientId=${patientId}&doctorId=${doctorId}`
    ),

  deleteConversation: (id) => axiosClient.delete(`/conversations/${id}`),

  countByPatient: (patientId) =>
    axiosClient.get(`/conversations/count/by-patient?patientId=${patientId}`),

  countByDoctor: (doctorId) =>
    axiosClient.get(`/conversations/count/by-doctor?doctorId=${doctorId}`),
};

export default conversationApi;
