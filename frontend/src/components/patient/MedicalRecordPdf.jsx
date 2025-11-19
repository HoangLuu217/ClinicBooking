import React from 'react';

const thStyle = { border: '1px solid #1976d2', padding: 8, textAlign: 'center' };
const tdStyle = { border: '1px solid #1976d2', padding: 8, textAlign: 'center' };

const MedicalRecordPdf = ({ record }) => {
  if (!record) return null;
  console.log('MedicalRecordPdf record:', record);
  console.log('MedicalRecordPdf referralResults:', record.referralResults);
  const { patientName, patientDob, patientGender, patientAddress, doctorName, visitDate, diagnosis, advice, prescription, referralResults } = record;
  return (
    <div style={{ width: 700, margin: 'auto', fontFamily: 'Roboto, Arial' }}>
      <h1 style={{ textAlign: 'center', fontWeight: 'bold', color: '#1976d2' }}>HỒ SƠ BỆNH ÁN</h1>
      <div style={{ marginBottom: 16 }}>
        <strong>Họ tên bệnh nhân:</strong> {patientName}<br />
        <strong>Ngày sinh:</strong> {patientDob || '-'} &nbsp; <strong>Giới tính:</strong> {patientGender || '-'}<br />
        <strong>Địa chỉ:</strong> {patientAddress || '-'}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Bác sĩ khám:</strong> {doctorName}<br />
        <strong>Ngày khám:</strong> {visitDate || '-'}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Chẩn đoán:</strong> {diagnosis || '-'}<br />
        <strong>Lời khuyên:</strong> {advice || '-'}
      </div>
      {prescription && (
        <div style={{ marginBottom: 16 }}>
          <strong>Đơn thuốc:</strong>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ background: '#e3f2fd' }}>
                <th style={thStyle}>STT</th>
                <th style={thStyle}>Tên thuốc</th>
                <th style={thStyle}>Liều dùng</th>
                <th style={thStyle}>Số lượng</th>
                <th style={thStyle}>Thời gian</th>
                <th style={thStyle}>Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              {prescription.items?.map((med, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>{med.medicineName}</td>
                  <td style={tdStyle}>{med.dosage}</td>
                  <td style={tdStyle}>{med.quantity}</td>
                  <td style={tdStyle}>{med.duration}</td>
                  <td style={tdStyle}>{med.price?.toLocaleString('vi-VN')} ₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {referralResults && referralResults.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Hình ảnh y học:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {referralResults.map((img, idx) => {
              const src = img.result_file_url || img.resultFileUrl || img.imageUrl || img.imageLink || img.image || '';
              return (
                <div key={idx} style={{ border: '1px solid #ccc', padding: 6, borderRadius: 8, width: 180 }}>
                  {src ? (
                    <img src={src} alt={`referral-${idx + 1}`} style={{ width: '100%', maxHeight: 120, objectFit: 'contain', marginBottom: 4 }} />
                  ) : (
                    <div style={{ width: '100%', height: 120, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                      Không có ảnh
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: '#555' }}>{img.description || img.result || 'Kết quả hình ảnh'}</div>
                  {img.date || img.completed_at || img.completedAt ? (
                    <div style={{ fontSize: 12, color: '#888' }}>Ngày chụp: {img.date || img.completed_at || img.completedAt}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <span>Ngày ký: {visitDate || '-'}</span><br />
        <span><strong>Bác sĩ khám</strong></span><br /><br /><br />
        <span>(Ký, ghi rõ họ tên)</span>
      </div>
    </div>
  );
};

export default MedicalRecordPdf;
