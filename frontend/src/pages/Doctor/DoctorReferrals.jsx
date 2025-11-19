import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import referralApi from '../../api/referralApi';

const DoctorReferrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [stats, setStats] = useState({ pendingReferrals: 0, completedToday: 0 });
  const navigate = useNavigate();
  
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
    if (doctorId) {
      loadReferrals();
      loadStats();
    } else {
      console.error('❌ No doctorId found');
      setLoading(false);
    }
  }, [doctorId]);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading referrals for doctor:', doctorId);
      const response = await referralApi.getReferralsByDoctor(doctorId);
      console.log('✅ Referrals loaded:', response.data);
      setReferrals(response.data || []);
    } catch (error) {
      console.error('❌ Error loading referrals:', error);
      console.error('❌ Error response:', error.response);
      showNotification('error', 'Lỗi Tải Dữ Liệu', 'Không thể tải danh sách chỉ định: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await referralApi.getDoctorStats(doctorId);
      setStats(response.data || { pendingReferrals: 0, completedToday: 0 });
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  };

  // Đảm bảo referrals luôn là array
  const safeReferrals = Array.isArray(referrals) ? referrals : [];
  
  const filteredReferrals = safeReferrals.filter(r => 
    filter === 'ALL' ? true : r.status === filter
  );

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { bg: 'warning', icon: 'hourglass-split', text: 'Chờ thực hiện' },
      IN_PROGRESS: { bg: 'primary', icon: 'arrow-repeat', text: 'Đang thực hiện' },
      DONE: { bg: 'success', icon: 'check-circle-fill', text: 'Đã hoàn thành' },
      CANCELLED: { bg: 'danger', icon: 'x-circle-fill', text: 'Đã hủy' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`badge bg-${config.bg} text-white`}>
        <i className={`bi bi-${config.icon} me-1`}></i>
        {config.text}
      </span>
    );
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

  const getDepartmentIcon = (deptName) => {
    if (!deptName) return 'bi-hospital text-secondary';
    if (deptName.includes('Xét nghiệm')) return 'bi-droplet-fill text-danger';
    if (deptName.includes('Chẩn đoán hình ảnh') || deptName.includes('X-quang')) 
      return 'bi-x-diamond-fill text-primary';
    if (deptName.includes('Siêu âm')) return 'bi-soundwave text-info';
    return 'bi-hospital text-secondary';
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

  return (
    <div className="container-fluid py-4">
      {/* Header with Stats */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h3 className="mb-1">
                <i className="bi bi-clipboard2-pulse text-info me-2"></i>
                Quản lý Chỉ định Cận Lâm Sàng
              </h3>
              <p className="text-muted mb-0">Theo dõi kết quả xét nghiệm và chẩn đoán hình ảnh</p>
            </div>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => navigate('/doctor/dashboard')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Quay lại
            </button>
          </div>

          {/* Stats Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm bg-warning bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="rounded-circle bg-warning bg-opacity-25 p-3">
                        <i className="bi bi-hourglass-split text-warning fs-4"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="text-muted mb-0">Chờ thực hiện</h6>
                      <h3 className="mb-0">{stats.pendingReferrals}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm bg-success bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="rounded-circle bg-success bg-opacity-25 p-3">
                        <i className="bi bi-check-circle-fill text-success fs-4"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="text-muted mb-0">Hoàn thành hôm nay</h6>
                      <h3 className="mb-0">{stats.completedToday}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm bg-info bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="rounded-circle bg-info bg-opacity-25 p-3">
                        <i className="bi bi-file-medical text-info fs-4"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="text-muted mb-0">Tổng chỉ định</h6>
                      <h3 className="mb-0">{safeReferrals.length}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm bg-primary bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="rounded-circle bg-primary bg-opacity-25 p-3">
                        <i className="bi bi-arrow-repeat text-primary fs-4"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="text-muted mb-0">Đang thực hiện</h6>
                      <h3 className="mb-0">{safeReferrals.filter(r => r.status === 'IN_PROGRESS').length}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <ul className="nav nav-pills">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'].map(status => (
              <li key={status} className="nav-item">
                <button
                  className={`nav-link ${filter === status ? 'active' : ''}`}
                  onClick={() => setFilter(status)}
                >
                  {status === 'ALL' ? '🗂️ Tất cả' : 
                   status === 'PENDING' ? '⏳ Chờ thực hiện' :
                   status === 'IN_PROGRESS' ? '🔄 Đang thực hiện' : 
                   status === 'DONE' ? '✅ Đã hoàn thành' : '❌ Đã hủy'}
                  <span className="badge bg-light text-dark ms-2">
                    {status === 'ALL' 
                      ? safeReferrals.length 
                      : safeReferrals.filter(r => r.status === status).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Referrals List */}
      {filteredReferrals.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-inbox text-muted" style={{ fontSize: '4rem' }}></i>
            <h5 className="text-muted mt-3">
              {filter === 'ALL' 
                ? 'Chưa có chỉ định nào' 
                : `Không có chỉ định ${filter === 'PENDING' ? 'chờ thực hiện' : 
                    filter === 'IN_PROGRESS' ? 'đang thực hiện' : 
                    filter === 'DONE' ? 'đã hoàn thành' : 'đã hủy'}`}
            </h5>
            <p className="text-muted">Các chỉ định cận lâm sàng sẽ hiển thị tại đây</p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filteredReferrals.map(referral => (
            <div key={referral.referralId} className="col-md-6 col-xl-4">
              <div 
                className="card border-0 shadow-sm h-100 hover-card" 
                style={{ 
                  cursor: 'pointer', 
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
                onClick={() => navigate(`/doctor/referrals/${referral.referralId}`)}
              >
                <div className="card-body">
                  {/* Status & Department Header */}
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="flex-grow-1">
                      <h6 className="mb-1 fw-bold">
                        <i className={`${getDepartmentIcon(referral.toDepartment?.departmentName)} me-2`}></i>
                        {referral.toDepartment?.departmentName || 'ClinicBooking'}
                      </h6>
                      <small className="text-muted">
                        <i className="bi bi-calendar3 me-1"></i>
                        {formatDateTime(referral.createdAt)}
                      </small>
                    </div>
                    {getStatusBadge(referral.status)}
                  </div>

                  {/* Patient Info */}
                  <div className="border-start border-4 border-info ps-3 mb-3">
                    <div className="fw-bold text-dark">
                      <i className="bi bi-person-fill me-2 text-info"></i>
                      {referral.appointment?.patient?.user?.lastName} {referral.appointment?.patient?.user?.firstName}
                    </div>
                    <small className="text-muted d-block">
                      <i className="bi bi-envelope me-1"></i>
                      {referral.appointment?.patient?.user?.email || 'N/A'}
                    </small>
                    <small className="text-muted d-block">
                      <i className="bi bi-telephone me-1"></i>
                      {referral.appointment?.patient?.user?.phone || 'N/A'}
                    </small>
                  </div>

                  {/* Notes */}
                  {referral.notes && (
                    <div className="mb-3">
                      <small className="text-muted d-block mb-1 fw-bold">
                        <i className="bi bi-chat-left-text me-1"></i>
                        Yêu cầu cận lâm sàng:
                      </small>
                      <p className="mb-0 small bg-light p-2 rounded" style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {referral.notes}
                      </p>
                    </div>
                  )}

                  {/* Result Preview for DONE status */}
                  {referral.status === 'DONE' && (
                    <div className="border-top pt-3 mt-3">
                      <div className="d-flex align-items-center mb-2">
                        <small className="text-success fw-bold flex-grow-1">
                          <i className="bi bi-check-circle-fill me-1"></i>
                          Đã có kết quả
                        </small>
                        {referral.completedAt && (
                          <small className="text-muted">
                            <i className="bi bi-clock me-1"></i>
                            {formatDateTime(referral.completedAt)}
                          </small>
                        )}
                      </div>
                      
                      {referral.performedByDoctor && (
                        <small className="text-muted d-block mb-2">
                          <i className="bi bi-person-badge me-1"></i>
                          BS thực hiện: {referral.performedByDoctor.user?.lastName} {referral.performedByDoctor.user?.firstName}
                        </small>
                      )}

                      {referral.resultText && (
                        <div className="bg-success bg-opacity-10 p-2 rounded mb-2">
                          <small className="text-success d-block fw-bold mb-1">
                            Kết luận:
                          </small>
                          <small className="d-block" style={{ 
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {referral.resultText}
                          </small>
                        </div>
                      )}

                      <button
                        className="btn btn-sm btn-success w-100 mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/doctor/referrals/${referral.referralId}`);
                        }}
                      >
                        <i className="bi bi-eye me-2"></i>
                        Xem chi tiết kết quả
                      </button>
                    </div>
                  )}

                  {/* Pending/In Progress Actions */}
                  {(referral.status === 'PENDING' || referral.status === 'IN_PROGRESS') && (
                    <div className="border-top pt-3 mt-3">
                      <button
                        className="btn btn-sm btn-outline-info w-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/doctor/referrals/${referral.referralId}`);
                        }}
                      >
                        <i className="bi bi-info-circle me-2"></i>
                        Xem chi tiết
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
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

export default DoctorReferrals;
