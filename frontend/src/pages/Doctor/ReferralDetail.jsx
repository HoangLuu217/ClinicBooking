import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import referralApi from '../../api/referralApi';

const ReferralDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Notification Modal State
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'success',
    title: '',
    message: '',
    onClose: null
  });
  
  // Show notification modal
  const showNotification = (type, title, message, onClose = null) => {
    setNotificationData({ type, title, message, onClose });
    setShowNotificationModal(true);
  };
  
  // Close notification modal
  const closeNotification = () => {
    setShowNotificationModal(false);
    if (notificationData.onClose) {
      notificationData.onClose();
    }
  };

  useEffect(() => {
    loadReferral();
  }, [id]);

  const loadReferral = async () => {
    try {
      setLoading(true);
      const response = await referralApi.getReferral(id);
      setReferral(response.data);
    } catch (error) {
      console.error('Error loading referral:', error);
      showNotification('error', 'Lỗi Tải Dữ Liệu', 'Không thể tải thông tin chỉ định: ' + (error.response?.data?.message || error.message), () => {
        navigate('/doctor/referrals');
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrescribe = () => {
    navigate(`/doctor/prescriptions/new/${referral.appointment?.appointmentId}`);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!referral) return null;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">
            <i className="bi bi-file-medical text-info me-2"></i>
            Kết quả Cận Lâm Sàng
          </h3>
          <p className="text-muted mb-0">#{referral.referralId}</p>
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/doctor/referrals')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Quay lại
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-person-fill me-2"></i>
                Thông tin Bệnh nhân
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <small className="text-muted">Họ tên:</small>
                <div className="fw-bold">
                  {referral.appointment?.patient?.user?.lastName} {referral.appointment?.patient?.user?.firstName}
                </div>
              </div>
              <div className="mb-3">
                <small className="text-muted">Email:</small>
                <div>{referral.appointment?.patient?.user?.email}</div>
              </div>
              <div className="mb-0">
                <small className="text-muted">SĐT:</small>
                <div>{referral.appointment?.patient?.user?.phone || '-'}</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0">
                <i className="bi bi-clipboard2-pulse me-2"></i>
                Thông tin Chỉ định
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <small className="text-muted">Khoa thực hiện:</small>
                <div className="fw-bold">{referral.toDepartment?.departmentName}</div>
              </div>
              <div className="mb-3">
                <small className="text-muted">Ngày chỉ định:</small>
                <div>{formatDateTime(referral.createdAt)}</div>
              </div>
              <div className="mb-3">
                <small className="text-muted">Yêu cầu:</small>
                <div className="bg-light p-3 rounded">
                  {referral.notes || 'Không có ghi chú'}
                </div>
              </div>
              {referral.performedByDoctor && (
                <div className="mb-0">
                  <small className="text-muted">Người thực hiện:</small>
                  <div>
                    {referral.performedByDoctor.user?.lastName} {referral.performedByDoctor.user?.firstName}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">
                <i className="bi bi-file-earmark-medical me-2"></i>
                Kết quả
              </h6>
            </div>
            <div className="card-body">
              {referral.status !== 'DONE' ? (
                <div className="text-center py-5">
                  <i className="bi bi-hourglass-split text-warning" style={{ fontSize: '4rem' }}></i>
                  <h5 className="text-muted mt-3">
                    {referral.status === 'IN_PROGRESS' 
                      ? 'Đang thực hiện xét nghiệm...' 
                      : 'Chờ thực hiện'}
                  </h5>
                </div>
              ) : (
                <>
                  <div className="alert alert-success mb-4">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <strong>Hoàn thành lúc:</strong> {formatDateTime(referral.completedAt)}
                  </div>

                  {referral.resultFileUrl && (
                    <div className="mb-4">
                      <h6 className="mb-3">
                        <i className="bi bi-image me-2"></i>
                        Hình ảnh kết quả:
                      </h6>
                      <div className="text-center bg-light p-3 rounded">
                        <img 
                          src={referral.resultFileUrl} 
                          alt="Kết quả"
                          className="img-fluid rounded shadow"
                          style={{ maxHeight: '400px', cursor: 'pointer' }}
                          onClick={() => window.open(referral.resultFileUrl, '_blank')}
                        />
                        <div className="mt-2">
                          <a 
                            href={referral.resultFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-download me-2"></i>
                            Tải xuống
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <h6 className="mb-3">
                      <i className="bi bi-file-text me-2"></i>
                      Kết quả chi tiết:
                    </h6>
                    <div className="bg-light p-4 rounded" style={{ whiteSpace: 'pre-wrap' }}>
                      {referral.resultText || 'Không có kết quả văn bản'}
                    </div>
                  </div>

                  <div className="border-top pt-4">
                    <div className="d-grid gap-2">
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={handlePrescribe}
                      >
                        <i className="bi bi-pencil-square me-2"></i>
                        Kê đơn thuốc cho bệnh nhân
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className={`modal-header ${
                notificationData.type === 'success' ? 'bg-success' :
                notificationData.type === 'error' ? 'bg-danger' :
                notificationData.type === 'warning' ? 'bg-warning' :
                'bg-info'
              } text-white`}>
                <h5 className="modal-title">
                  <i className={`bi ${
                    notificationData.type === 'success' ? 'bi-check-circle' :
                    notificationData.type === 'error' ? 'bi-x-circle' :
                    notificationData.type === 'warning' ? 'bi-exclamation-triangle' :
                    'bi-info-circle'
                  } me-2`}></i>
                  {notificationData.title}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeNotification}></button>
              </div>
              <div className="modal-body">
                <p style={{ whiteSpace: 'pre-wrap' }}>{notificationData.message}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className={`btn ${
                  notificationData.type === 'success' ? 'btn-success' :
                  notificationData.type === 'error' ? 'btn-danger' :
                  notificationData.type === 'warning' ? 'btn-warning' :
                  'btn-info'
                }`} onClick={closeNotification}>
                  <i className="bi bi-check-lg me-2"></i>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralDetail;
