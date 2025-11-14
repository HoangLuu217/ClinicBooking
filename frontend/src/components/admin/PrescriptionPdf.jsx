import React from 'react';

const thStyle = { border: '1px solid #1976d2', padding: 8, textAlign: 'center' };
const tdStyle = { border: '1px solid #1976d2', padding: 8, textAlign: 'center' };

const PrescriptionPdf = ({ prescription }) => {
  const { prescriptionId, patientName, patientDob, patientGender, patientAddress, doctorName, prescriptionDate, totalAmount, medicines } = prescription;
  return (
    <div style={{ width: 700, margin: 'auto', fontFamily: 'Roboto, Arial' }}>
      <h1 style={{ textAlign: 'center', fontWeight: 'bold', color: '#1976d2' }}>ĐƠN THUỐC</h1>
      <div style={{ marginBottom: 16 }}>
        <strong>Mã đơn thuốc:</strong> {prescriptionId}<br />
        <strong>Họ tên bệnh nhân:</strong> {patientName}<br />
        <strong>Ngày sinh:</strong> {patientDob} &nbsp; <strong>Giới tính:</strong> {patientGender}<br />
        <strong>Địa chỉ:</strong> {patientAddress}<br />
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Họ tên bác sĩ:</strong> {doctorName}<br />
        <strong>Ngày kê đơn:</strong> {prescriptionDate}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#e3f2fd' }}>
            <th style={thStyle}>STT</th>
            <th style={thStyle}>Tên thuốc</th>
            <th style={thStyle}>Hàm lượng</th>
            <th style={thStyle}>Số lượng</th>
            <th style={thStyle}>Cách dùng</th>
            <th style={thStyle}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {medicines.map((med, idx) => (
            <tr key={idx}>
              <td style={tdStyle}>{idx + 1}</td>
              <td style={tdStyle}>{med.medicineName}</td>
              <td style={tdStyle}>{med.dosage}</td>
              <td style={tdStyle}>{med.quantity}</td>
              <td style={tdStyle}>{med.instructions}</td>
              <td style={tdStyle}>{med.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginBottom: 16 }}>
        <strong>Tổng tiền đơn thuốc:</strong> {totalAmount} đ
      </div>
      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <span>Ngày ký: {prescriptionDate}</span><br />
        <span><strong>Bác sĩ kê đơn</strong></span><br /><br /><br />
        <span>(Ký, ghi rõ họ tên)</span>
      </div>
      <div style={{ marginTop: 24, fontSize: 13, color: '#555' }}>
        Đơn thuốc chỉ có giá trị khi có chữ ký bác sĩ.
      </div>
    </div>
  );
};

export default PrescriptionPdf;
