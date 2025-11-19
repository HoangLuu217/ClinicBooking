import React from 'react';
import { Card } from 'react-bootstrap';

const ReferralResults = ({ referrals, loading }) => {
  // Ensure referrals is an array
  let referralList = [];
  
  if (Array.isArray(referrals)) {
    referralList = referrals;
  } else if (typeof referrals === 'string') {
    try {
      const parsed = JSON.parse(referrals);
      referralList = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      referralList = [];
    }
  } else if (referrals && typeof referrals === 'object') {
    referralList = [referrals];
  }
  
  if (!referralList || referralList.length === 0) return null;

  return (
    <Card className="mb-3" style={{border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #48bb78'}}>
      <Card.Body className="p-4">
        <div className="d-flex align-items-center mb-3">
          <i className="bi bi-clipboard-check text-success me-2" style={{fontSize: '20px'}}></i>
          <h6 className="mb-0" style={{fontWeight: 600, color: '#1a202c'}}>
            Kết quả Cận Lâm Sàng
            <span className="badge bg-success ms-2">{referralList.length}</span>
          </h6>
        </div>

        {loading ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {referralList.map((referral, index) => (
              <div 
                key={referral.referralId} 
                className={`p-3 rounded ${index > 0 ? 'mt-3' : ''}`}
                style={{
                  backgroundColor: referral.status === 'DONE' ? '#f0fdf4' : '#fef3c7',
                  border: `1px solid ${referral.status === 'DONE' ? '#86efac' : '#fcd34d'}`
                }}
              >
                {/* Header */}
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div className="fw-bold text-dark mb-1">
                      <i className={`bi ${
                        referral.toDepartment?.departmentName?.includes('Xét nghiệm') ? 'bi-droplet-fill text-danger' :
                        referral.toDepartment?.departmentName?.includes('X-quang') || referral.toDepartment?.departmentName?.includes('Chẩn đoán') ? 'bi-x-diamond-fill text-primary' :
                        referral.toDepartment?.departmentName?.includes('Siêu âm') ? 'bi-soundwave text-info' :
                        'bi-hospital text-secondary'
                      } me-2`}></i>
                      {referral.toDepartment?.departmentName || 'N/A'}
                    </div>
                    <small className="text-muted d-block">
                      <i className="bi bi-calendar3 me-1"></i>
                      Tạo: {new Date(referral.createdAt).toLocaleString('vi-VN')}
                    </small>
                  </div>
                  <span className={`badge ${
                    referral.status === 'DONE' ? 'bg-success' :
                    referral.status === 'IN_PROGRESS' ? 'bg-primary' :
                    referral.status === 'PENDING' ? 'bg-warning' :
                    'bg-secondary'
                  }`}>
                    {referral.status === 'DONE' ? '✅ Đã có kết quả' :
                     referral.status === 'IN_PROGRESS' ? '🔄 Đang thực hiện' :
                     referral.status === 'PENDING' ? '⏳ Chờ thực hiện' :
                     referral.status}
                  </span>
                </div>

                {/* Request */}
                {referral.notes && (
                  <div className="mb-2">
                    <small className="fw-bold text-muted d-block mb-1">
                      📋 Yêu cầu khám:
                    </small>
                    <small className="d-block bg-white p-2 rounded" style={{whiteSpace: 'pre-wrap'}}>
                      {referral.notes}
                    </small>
                  </div>
                )}

                {/* Result */}
                {referral.status === 'DONE' && referral.resultText && (
                  <div className="mt-2 p-3 bg-white rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      <strong className="text-success">Kết quả khám:</strong>
                    </div>
                    <p className="mb-2" style={{whiteSpace: 'pre-wrap', fontSize: '14px'}}>
                      {referral.resultText}
                    </p>
                    
                    {referral.performedByDoctor && (
                      <small className="text-muted d-block">
                        <i className="bi bi-person-badge me-1"></i>
                        Thực hiện bởi: BS. {referral.performedByDoctor.user?.lastName} {referral.performedByDoctor.user?.firstName}
                      </small>
                    )}
                    
                    {referral.completedAt && (
                      <small className="text-muted d-block">
                        <i className="bi bi-clock me-1"></i>
                        Hoàn thành: {new Date(referral.completedAt).toLocaleString('vi-VN')}
                      </small>
                    )}

                    {referral.resultFileUrl && (
                      <a 
                        href={referral.resultFileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary mt-2"
                      >
                        <i className="bi bi-file-earmark-pdf me-1"></i>
                        Xem file kết quả
                      </a>
                    )}
                  </div>
                )}

                {referral.status === 'PENDING' && (
                  <small className="text-warning d-block mt-2">
                    ⏳ Đang chờ bác sĩ chuyên khoa thực hiện...
                  </small>
                )}

                {referral.status === 'IN_PROGRESS' && (
                  <small className="text-primary d-block mt-2">
                    🔄 Bác sĩ chuyên khoa đang thực hiện...
                  </small>
                )}
              </div>
            ))}
          </div>
        )}

        <small className="text-muted d-block mt-3" style={{fontSize: '12px'}}>
          💡 <strong>Lưu ý:</strong> Sử dụng kết quả CLS để chẩn đoán chính xác và kê đơn thuốc phù hợp
        </small>
      </Card.Body>
    </Card>
  );
};

export default ReferralResults;
