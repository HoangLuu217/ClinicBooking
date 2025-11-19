import axiosClient from "./axiosClient";

export const exportPrescriptionPdf = (id) =>
  axiosClient.get(`/prescriptions/${id}/export-pdf`, { responseType: "blob" });

const prescriptionApi = {
  // Lấy tất cả đơn thuốc
  getAllPrescriptions: () => {
    return axiosClient.get("/prescriptions");
  },

  // Lấy đơn thuốc theo ID
  getPrescriptionById: (prescriptionId) => {
    return axiosClient.get(`/prescriptions/${prescriptionId}`);
  },

  // Lấy đơn thuốc theo bệnh nhân
  getPrescriptionsByPatient: (patientId) => {
    return axiosClient.get(`/prescriptions/patient/${patientId}`);
  },

  // Lấy đơn thuốc theo bác sĩ
  getPrescriptionsByDoctor: (doctorId) => {
    return axiosClient.get(`/prescriptions/doctor/${doctorId}`);
  },

  // Tạo đơn thuốc mới
  createPrescription: (prescriptionData) => {
    console.log(
      "📡 Sending prescription data to backend:",
      JSON.stringify(prescriptionData, null, 2)
    );
    return axiosClient.post("/prescriptions", prescriptionData);
  },

  // Cập nhật đơn thuốc
  updatePrescription: (prescriptionId, prescriptionData) => {
    return axiosClient.put(`/prescriptions/${prescriptionId}`, prescriptionData);
  },

  // Xóa đơn thuốc
  deletePrescription: (prescriptionId) => {
    return axiosClient.delete(`/prescriptions/${prescriptionId}`);
  },

  // Lấy chi tiết đơn thuốc (bao gồm prescription items)
  getPrescriptionWithItems: (prescriptionId) => {
    return axiosClient.get(`/prescriptions/${prescriptionId}/items`);
  },

  // Thêm thuốc vào đơn
  addPrescriptionItem: (prescriptionId, itemData) => {
    return axiosClient.post(`/prescriptions/${prescriptionId}/items`, itemData);
  },

  // Cập nhật thuốc trong đơn
  updatePrescriptionItem: (prescriptionId, itemId, itemData) => {
    return axiosClient.put(
      `/prescriptions/${prescriptionId}/items/${itemId}`,
      itemData
    );
  },

  // Xóa thuốc khỏi đơn
  removePrescriptionItem: (prescriptionId, itemId) => {
    return axiosClient.delete(
      `/prescriptions/${prescriptionId}/items/${itemId}`
    );
  },

  // Cập nhật trạng thái đơn thuốc
  updatePrescriptionStatus: (prescriptionId, status) => {
    return axiosClient.patch(
      `/prescriptions/${prescriptionId}/status`,
      { status }
    );
  },

  // Tìm kiếm đơn thuốc
  searchPrescriptions: (keyword) => {
    return axiosClient.get(
      `/prescriptions/search?keyword=${encodeURIComponent(keyword)}`
    );
  },
  exportPrescriptionPdf,
};
export default prescriptionApi;