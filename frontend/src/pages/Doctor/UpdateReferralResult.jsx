import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import referralApi from '../../api/referralApi';

const UpdateReferralResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [referral, setReferral] = useState(null);
  const [resultText, setResultText] = useState('');
  const [resultFile, setResultFile] = useState(null);
  
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

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const doctorId = user.doctorId || localStorage.getItem('doctorId');

  useEffect(() => {
    loadReferral();
  }, [id]);

  const loadReferral = async () => {
    try {
      setLoading(true);
      const response = await referralApi.getReferralById(id);
      const data = response.data;
      setReferral(data);
      setResultText(data.resultText || '');
    } catch (error) {
      console.error('❌ Error loading referral:', error);
      showNotification('error', 'Lỗi Tải Dữ Liệu', 'Không thể tải thông tin chỉ định: ' + (error.response?.data?.message || error.message), () => {
        navigate('/doctor/department-referrals');
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resultText.trim()) {
      showNotification('warning', 'Thiếu Thông Tin', 'Vui lòng nhập kết quả');
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        performedByDoctorId: doctorId,
        resultText: resultText.trim(),
        resultFileUrl: null, // Có thể upload file sau
      };

      await referralApi.updateResult(id, updateData);
      showNotification('success', 'Thành Công', 'Đã cập nhật kết quả thành công!', () => {
        navigate('/doctor/department-referrals');
      });
    } catch (error) {
      console.error('❌ Error updating result:', error);
      showNotification('error', 'Lỗi Cập Nhật', 'Không thể cập nhật kết quả: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          Không tìm thấy thông tin chỉ định
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">
            <i className="bi bi-pencil-square text-primary me-2"></i>
            Nhập Kết Quả Cận Lâm Sàng
          </h3>
          <p className="text-muted mb-0">Chỉ định #{referral.referralId}</p>
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/doctor/department-referrals')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Quay lại
        </button>
      </div>

      <div className="row">
        {/* Thông tin chỉ định */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Thông tin chỉ định
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Khoa thực hiện:</label>
                <div className="fw-bold">{referral.toDepartment?.departmentName}</div>
              </div>

              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Bác sĩ yêu cầu:</label>
                <div className="fw-bold">
                  BS. {referral.fromDoctor?.user?.lastName} {referral.fromDoctor?.user?.firstName}
                </div>
              </div>

              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Bệnh nhân:</label>
                <div className="fw-bold">
                  {referral.appointment?.patient?.user?.lastName} {referral.appointment?.patient?.user?.firstName}
                </div>
                <small className="text-muted">
                  <i className="bi bi-telephone me-1"></i>
                  {referral.appointment?.patient?.user?.phone}
                </small>
              </div>

              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Thời gian tạo:</label>
                <div>{formatDateTime(referral.createdAt)}</div>
              </div>

              <div className="mb-0">
                <label className="text-muted small d-block mb-1">Yêu cầu:</label>
                <div className="bg-light p-3 rounded">
                  {referral.notes || 'Không có ghi chú'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form nhập kết quả */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <i className="bi bi-file-earmark-text me-2"></i>
                Nhập kết quả
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    Kết quả cận lâm sàng <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="15"
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    placeholder="Nhập kết quả xét nghiệm/chẩn đoán hình ảnh chi tiết...

Ví dụ:
- Các chỉ số xét nghiệm
- Mô tả hình ảnh
- Kết luận
- Khuyến nghị"
                    required
                  />
                  <small className="text-muted">
                    Nhập đầy đủ kết quả, bao gồm các chỉ số và kết luận
                  </small>
                </div>

                {/* Upload file - tính năng tương lai
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    Đính kèm file kết quả (nếu có)
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setResultFile(e.target.files[0])}
                  />
                  <small className="text-muted">
                    Chấp nhận file PDF, JPG, PNG (tối đa 5MB)
                  </small>
                </div>
                */}

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={saving || !resultText.trim()}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Lưu kết quả
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/doctor/department-referrals')}
                    disabled={saving}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Hướng dẫn */}
          <div className="card border-0 shadow-sm mt-3 bg-info bg-opacity-10">
            <div className="card-body">
              <h6 className="fw-bold mb-2">
                <i className="bi bi-lightbulb text-info me-2"></i>
                Hướng dẫn nhập kết quả:
              </h6>
              <ul className="mb-0 small">
                <li>Nhập đầy đủ các chỉ số xét nghiệm hoặc mô tả hình ảnh</li>
                <li>Ghi rõ kết luận và nhận xét</li>
                <li>Đưa ra khuyến nghị điều trị nếu cần</li>
                <li>Kiểm tra kỹ trước khi lưu</li>
              </ul>
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

export default UpdateReferralResult;
