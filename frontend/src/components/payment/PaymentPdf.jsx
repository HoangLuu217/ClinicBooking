import React from 'react';

const thStyle = { border: '1px solid #1976d2', padding: 8, textAlign: 'center' };
const tdStyle = { border: '1px solid #1976d2', padding: 8, textAlign: 'center' };

const PaymentPdf = ({ payment }) => {
  const { paymentId, patientName, doctorName, specialty, createdAt, amount, status, service } = payment;
  return (
    <div style={{ width: 700, margin: 'auto', fontFamily: 'Roboto, Arial' }}>
      <h1 style={{ textAlign: 'center', fontWeight: 'bold', color: '#1976d2' }}>PHIẾU THANH TOÁN</h1>
      <div style={{ marginBottom: 16 }}>
        <strong>Mã thanh toán:</strong> {paymentId}<br />
        <strong>Họ tên bệnh nhân:</strong> {patientName}<br />
        <strong>Bác sĩ:</strong> {doctorName}<br />
        <strong>Chuyên khoa:</strong> {specialty}<br />
        <strong>Ngày thanh toán:</strong> {createdAt || '-'}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#e3f2fd' }}>
            <th style={thStyle}>STT</th>
            <th style={thStyle}>Dịch vụ</th>
            <th style={thStyle}>Số tiền</th>
            <th style={thStyle}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>1</td>
            <td style={tdStyle}>{service || 'Khám bệnh'}</td>
            <td style={tdStyle}>{amount?.toLocaleString('vi-VN')} ₫</td>
            <td style={tdStyle}>{status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginBottom: 16 }}>
        <strong>Tổng tiền thanh toán:</strong> {amount?.toLocaleString('vi-VN')} ₫
      </div>
      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <span>Ngày ký: {createdAt || '-'}</span><br />
        <span><strong>Người thanh toán</strong></span><br /><br /><br />
        <span>(Ký, ghi rõ họ tên)</span>
      </div>
      <div style={{ marginTop: 24, fontSize: 13, color: '#555' }}>
        Phiếu thanh toán chỉ có giá trị khi có chữ ký xác nhận.
      </div>
    </div>
  );
};

export default PaymentPdf;
