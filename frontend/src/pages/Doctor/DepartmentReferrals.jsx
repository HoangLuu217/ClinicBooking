import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import referralApi from '../../api/referralApi';
import doctorApi from '../../api/doctorApi';

const DepartmentReferrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [resultData, setResultData] = useState({
    resultText: '',
    resultFileUrl: '',
    status: 'DONE'
  });
  
  // Notification Modal State
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'success', // 'success', 'error', 'warning', 'info'
    title: '',
    message: '',
    onClose: null
  });
  
  const navigate = useNavigate();
  
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
      loadDoctorInfo();
    } else {
      console.error('❌ No doctorId found');
      setLoading(false);
    }
  }, [doctorId]);

  const loadDoctorInfo = async () => {
    try {
      console.log('🔍 Loading doctor info for ID:', doctorId);
      const response = await doctorApi.getDoctorById(doctorId);
      console.log('✅ Doctor info loaded:', response.data);
      console.log('📌 Doctor department:', response.data?.department);
      
      setDoctorInfo(response.data);
      
      // Department model uses 'id' field, not 'departmentId'
      const deptId = response.data?.department?.id;
      
      if (deptId) {
        console.log('🏥 Department ID found:', deptId);
        console.log('🏥 Department Name:', response.data.department.departmentName);
        console.log('🔍 IMPORTANT: Trang này chỉ hiển thị referrals có to_departmentid =', deptId);
        console.log('🔍 Nếu referrals trong DB có to_departmentid khác, chúng sẽ KHÔNG hiển thị!');
        loadReferrals(deptId);
      } else {
        console.error('❌ Doctor has no department assigned');
        console.error('❌ Doctor data:', response.data);
        showNotification('error', 'Lỗi Phân Công', 'Bác sĩ chưa được phân công vào khoa nào.\n\nVui lòng liên hệ quản trị viên để được phân công khoa.');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error loading doctor info:', error);
      console.error('❌ Error response:', error.response);
      showNotification('error', 'Lỗi Tải Dữ Liệu', 'Không thể tải thông tin bác sĩ: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  const loadReferrals = async (departmentId) => {
    try {
      setLoading(true);
      console.log('📊 ========================================');
      console.log('📊 Loading referrals for department ID:', departmentId);
      console.log('📊 Current filter:', filter);
      console.log('📊 ========================================');
      
      // ALWAYS load ALL referrals, filter will be applied in UI
      console.log('🔍 Calling getReferralsByDepartment (ALL referrals)');
      const response = await referralApi.getReferralsByDepartment(departmentId);
      
      console.log('✅ Referrals API response:', response);
      console.log('✅ Response data:', response.data);
      console.log('✅ Response data type:', typeof response.data);
      console.log('✅ Response data is array?', Array.isArray(response.data));
      console.log('✅ Response data constructor:', response.data?.constructor?.name);
      
      // Ensure response.data is an array
      let referralsData = [];
      
      if (Array.isArray(response.data)) {
        // Already an array - use directly
        referralsData = response.data;
        console.log('✅ Data is already an array, length:', referralsData.length);
        console.log('✅ referralsData assigned:', referralsData);
        console.log('✅ referralsData[0]:', referralsData[0]);
        
        // SET STATE IMMEDIATELY to prevent data loss
        console.log('🚀 Setting referrals state directly with response.data');
        const validItems = response.data.filter(r => r && r.referralId);
        console.log('🚀 Valid items count:', validItems.length);
        setReferrals(validItems);
        setLoading(false);
        return; // Early return to prevent further processing
      } else if (typeof response.data === 'string') {
        // Backend returned JSON string - parse it
        try {
          console.log('🔄 Attempting to parse JSON string...');
          console.log('🔄 String length:', response.data.length);
          console.log('🔄 String preview (first 300 chars):', response.data.substring(0, 300));
          const parsed = JSON.parse(response.data);
          referralsData = Array.isArray(parsed) ? parsed : [];
          console.log('✅ Parsed JSON string to array, length:', referralsData.length);
        } catch (e) {
          console.error('❌ Failed to parse JSON string:', e.message);
          console.error('❌ String that failed to parse:', response.data.substring(0, 500));
          referralsData = [];
        }
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object, try to extract array from common properties
        console.log('🔄 Data is object, keys:', Object.keys(response.data));
        console.log('🔄 Checking for array properties...');
        referralsData = response.data.content || response.data.data || response.data.referrals || [];
        if (referralsData.length === 0) {
          console.warn('⚠️ Object has no common array properties, trying direct conversion');
          // If object is not a wrapper, maybe it IS the array-like object?
          // Try converting object to array if it has numeric keys
          const keys = Object.keys(response.data);
          if (keys.length > 0 && keys.every(k => !isNaN(k))) {
            referralsData = Object.values(response.data);
            console.log('✅ Converted numeric-keyed object to array, length:', referralsData.length);
          }
        }
      }
      
      console.log('📊 ========================================');
      console.log('📊 TOTAL REFERRALS RETURNED:', referralsData.length);
      console.log('📊 ========================================');
      
      if (referralsData.length > 0) {
        console.log('📋 ALL REFERRALS:');
        referralsData.forEach((ref, idx) => {
          console.log(`   ${idx + 1}. ReferralID: ${ref.referralId}, Status: ${ref.status}, ToDept: ${ref.toDepartment?.id} (${ref.toDepartment?.departmentName})`);
        });
        console.log('� ========================================');
      } else {
        console.warn('⚠️ NO REFERRALS RETURNED FROM API!');
        console.warn('⚠️ Kiểm tra:');
        console.warn('   1. Có referrals trong DB với to_departmentid =', departmentId, '?');
        console.warn('   2. Backend có filter đúng không?');
        console.warn('   3. Bác sĩ có thuộc đúng khoa không?');
        console.warn('   4. Backend entity có @JsonIgnoreProperties để tránh circular reference không?');
        console.log('📊 ========================================');
      }
      
      console.log('🔍 BEFORE FILTER - referralsData.length:', referralsData.length);
      if (referralsData.length > 0) {
        console.log('🔍 First item full object:', referralsData[0]);
        console.log('🔍 First item keys:', Object.keys(referralsData[0]));
        console.log('🔍 First item.referralId:', referralsData[0].referralId);
        console.log('🔍 First item type:', typeof referralsData[0]);
      }
      
      const validReferrals = referralsData.filter(r => {
        const isValid = r && r.referralId;
        if (!isValid) {
          console.log('❌ FILTERED OUT item:', r);
        } else {
          console.log('✅ KEPT item with referralId:', r.referralId);
        }
        return isValid;
      });
      console.log('✅ Valid referrals after filter:', validReferrals.length);
      setReferrals(validReferrals);
    } catch (error) {
      console.error('❌ Error loading referrals:', error);
      console.error('❌ Error response:', error.response);
      showNotification('error', 'Lỗi Tải Dữ Liệu', 'Không thể tải danh sách chỉ định: ' + (error.response?.data?.message || error.message));
      setReferrals([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResult = (referral) => {
    setSelectedReferral(referral);
    setResultData({
      resultText: referral.resultText || '',
      resultFileUrl: referral.resultFileUrl || '',
      status: referral.status === 'PENDING' ? 'IN_PROGRESS' : referral.status
    });
    setShowUpdateModal(true);
  };

  const handleSubmitResult = async () => {
    if (!selectedReferral) return;

    if (!resultData.resultText.trim()) {
      showNotification('warning', 'Thiếu Thông Tin', 'Vui lòng nhập kết quả cận lâm sàng');
      return;
    }

    // Validate doctor belongs to the department
    console.log('🔍 Validation Check:');
    console.log('   Doctor ID:', doctorId);
    console.log('   Doctor Department ID:', doctorInfo?.department?.id);
    console.log('   Referral To Department ID:', selectedReferral.toDepartmentId);
    
    if (doctorInfo?.department?.id !== selectedReferral.toDepartmentId) {
      showNotification('error', 'Lỗi Phân Quyền', 
        'Bạn không thuộc khoa được chỉ định!\n\n' +
        'Khoa của bạn: ' + (doctorInfo?.department?.departmentName || 'N/A') + '\n' +
        'Khoa được chỉ định: ' + (selectedReferral.toDepartmentName || 'N/A')
      );
      return;
    }

    try {
      const payload = {
        performedByDoctorId: parseInt(doctorId),
        resultText: resultData.resultText.trim(),
        resultFileUrl: resultData.resultFileUrl.trim() || null,
        status: resultData.status
      };

      console.log('📤 Submitting result:', payload);
      console.log('📤 Referral ID:', selectedReferral.referralId);
      
      await referralApi.updateResult(selectedReferral.referralId, payload);
      
      showNotification('success', 'Thành Công', 'Đã cập nhật kết quả thành công!', () => {
        setShowUpdateModal(false);
        setSelectedReferral(null);
        setResultData({ resultText: '', resultFileUrl: '', status: 'DONE' });
        
        // Reload referrals
        if (doctorInfo?.department?.id) {
          loadReferrals(doctorInfo.department.id);
        }
      });
    } catch (error) {
      console.error('❌ Error updating result:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      
      let errorMsg = 'Không thể cập nhật kết quả';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data) {
        errorMsg = error.response.data;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      showNotification('error', 'Lỗi Cập Nhật', errorMsg);
    }
  };

  const handleUpdateStatus = async (referralId, newStatus) => {
    try {
      await referralApi.updateStatus(referralId, newStatus);
      
      const statusText = newStatus === 'IN_PROGRESS' ? 'Đang thực hiện' : 
                        newStatus === 'DONE' ? 'Hoàn thành' :
                        newStatus === 'PENDING' ? 'Chờ thực hiện' : newStatus;
      
      showNotification('success', 'Thành Công', `Đã cập nhật trạng thái thành: ${statusText}`, () => {
        if (doctorInfo?.department?.id) {
          loadReferrals(doctorInfo.department.id);
        }
      });
    } catch (error) {
      console.error('❌ Error updating status:', error);
      showNotification('error', 'Lỗi Cập Nhật', 'Không thể cập nhật trạng thái: ' + (error.response?.data?.message || error.message));
    }
  };

  const safeReferrals = Array.isArray(referrals) ? referrals : [];
  
  const filteredReferrals = filter === 'ALL' 
    ? safeReferrals 
    : safeReferrals.filter(r => r.status === filter);

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
      <style>{`
        .stats-card {
          border: none;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .stats-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
        
        .stats-card .h4 {
          font-weight: 700;
          color: #5a5c69;
        }
        
        .stats-card:hover .h4 {
          color: #3a3b45;
        }
        
        .stats-card .text-muted {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .stats-card small {
          font-size: 0.75rem;
          opacity: 0.7;
        }
        
        .stats-card i {
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }
        
        .stats-card:hover i {
          opacity: 1;
        }
      `}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">
            <i className="bi bi-clipboard-pulse text-primary me-2"></i>
            Chỉ định Cận Lâm Sàng - {doctorInfo?.department?.departmentName || 'Khoa'}
          </h3>
          <p className="text-muted mb-0">
            Xử lý các chỉ định từ bác sĩ chính và cập nhật kết quả
          </p>
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
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Chờ thực hiện</div>
                  <div className="h4 mb-0">{safeReferrals.filter(r => r.status === 'PENDING').length}</div>
                </div>
                <i className="bi bi-hourglass-split fs-2 text-warning"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Đang thực hiện</div>
                  <div className="h4 mb-0">{safeReferrals.filter(r => r.status === 'IN_PROGRESS').length}</div>
                </div>
                <i className="bi bi-arrow-repeat fs-2 text-primary"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Đã hoàn thành</div>
                  <div className="h4 mb-0">{safeReferrals.filter(r => r.status === 'DONE').length}</div>
                </div>
                <i className="bi bi-check-circle-fill fs-2 text-success"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Tổng chỉ định</div>
                  <div className="h4 mb-0">{safeReferrals.length}</div>
                </div>
                <i className="bi bi-clipboard-data fs-2 text-info"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <ul className="nav nav-pills">
            {['PENDING', 'IN_PROGRESS', 'DONE', 'ALL'].map(status => (
              <li key={status} className="nav-item">
                <button
                  className={`nav-link ${filter === status ? 'active' : ''}`}
                  onClick={() => {
                    setFilter(status);
                    if (doctorInfo?.department?.departmentId) {
                      loadReferrals(doctorInfo.department.departmentId);
                    }
                  }}
                >
                  {status === 'ALL' ? '🗂️ Tất cả' : 
                   status === 'PENDING' ? '⏳ Chờ thực hiện' :
                   status === 'IN_PROGRESS' ? '🔄 Đang thực hiện' : 
                   '✅ Đã hoàn thành'}
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
            <h5 className="text-muted mt-3">Không có chỉ định nào</h5>
            <p className="text-muted">Các chỉ định từ bác sĩ chính sẽ hiển thị tại đây</p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filteredReferrals.map(referral => (
            <div key={referral.referralId} className="col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  {/* Header with Status */}
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="flex-grow-1">
                      <small className="text-muted d-block">
                        <i className="bi bi-calendar3 me-1"></i>
                        {formatDateTime(referral.createdAt)}
                      </small>
                      <small className="text-muted d-block">
                        <i className="bi bi-hash me-1"></i>
                        ID: {referral.referralId}
                      </small>
                    </div>
                    {getStatusBadge(referral.status)}
                  </div>

                  {/* From Doctor */}
                  <div className="border-start border-4 border-warning ps-3 mb-3">
                    <small className="text-muted d-block mb-1">Bác sĩ yêu cầu (Bác sĩ chính):</small>
                    <div className="fw-bold">
                      <i className="bi bi-person-badge text-warning me-2"></i>
                      BS. {referral.fromDoctorName || 'N/A'}
                    </div>
                    <small className="text-muted">
                      Khoa: {referral.fromDoctorSpecialty || 'N/A'}
                    </small>
                  </div>

                  {/* Patient Info */}
                  <div className="border-start border-4 border-info ps-3 mb-3">
                    <small className="text-muted d-block mb-1">Bệnh nhân:</small>
                    <div className="fw-bold text-dark">
                      <i className="bi bi-person-fill me-2 text-info"></i>
                      {referral.patientName || 'N/A'}
                    </div>
                    <small className="text-muted d-block">
                      <i className="bi bi-telephone me-1"></i>
                      {referral.patientPhone || 'N/A'}
                    </small>
                  </div>

                  {/* Request Notes */}
                  {referral.notes && (
                    <div className="mb-3">
                      <small className="text-muted d-block mb-1 fw-bold">
                        <i className="bi bi-clipboard-check me-1"></i>
                        Yêu cầu khám:
                      </small>
                      <p className="mb-0 small bg-light p-2 rounded" style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {referral.notes}
                      </p>
                    </div>
                  )}

                  {/* Result (if exists) */}
                  {referral.resultText && (
                    <div className="mb-3">
                      <small className="text-success d-block mb-1 fw-bold">
                        <i className="bi bi-check-circle me-1"></i>
                        Kết quả:
                      </small>
                      <p className="mb-0 small bg-success bg-opacity-10 p-2 rounded text-dark">
                        {referral.resultText}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-top pt-3 mt-3">
                    {referral.status === 'PENDING' && (
                      <div className="d-grid gap-2">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateStatus(referral.referralId, 'IN_PROGRESS')}
                        >
                          <i className="bi bi-play-circle me-2"></i>
                          Bắt đầu thực hiện
                        </button>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleUpdateResult(referral)}
                        >
                          <i className="bi bi-pencil-square me-2"></i>
                          Nhập kết quả
                        </button>
                      </div>
                    )}

                    {referral.status === 'IN_PROGRESS' && (
                      <div className="d-grid gap-2">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleUpdateResult(referral)}
                        >
                          <i className="bi bi-check-circle me-2"></i>
                          Cập nhật kết quả
                        </button>
                      </div>
                    )}

                    {referral.status === 'DONE' && (
                      <div>
                        <small className="text-success d-block mb-2">
                          <i className="bi bi-check-circle-fill me-1"></i>
                          Đã hoàn thành: {formatDateTime(referral.completedAt)}
                        </small>
                        {referral.performedByDoctorName && (
                          <small className="text-muted d-block">
                            <i className="bi bi-person me-1"></i>
                            Thực hiện bởi: BS. {referral.performedByDoctorName}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Result Modal */}
      {showUpdateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-clipboard-plus me-2"></i>
                  Cập nhật Kết quả Cận Lâm Sàng
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowUpdateModal(false)}></button>
              </div>
              <div className="modal-body">
                {selectedReferral && (
                  <>
                    {/* Patient Info */}
                    <div className="alert alert-info mb-3">
                      <strong>Bệnh nhân:</strong> {selectedReferral.patientName || 'N/A'}
                      <br />
                      <strong>Yêu cầu:</strong> {selectedReferral.notes}
                    </div>

                    {/* Result Text */}
                    <div className="mb-3">
                      <label className="form-label fw-bold">
                        <i className="bi bi-file-text me-2"></i>
                        Kết quả khám / Kết luận <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows="6"
                        placeholder="Nhập kết quả chi tiết của xét nghiệm / chẩn đoán hình ảnh..."
                        value={resultData.resultText}
                        onChange={(e) => setResultData({ ...resultData, resultText: e.target.value })}
                      />
                      <small className="text-muted">
                        Ví dụ: "Kết quả X-quang phổi: Phổi trong sạch, không có tổn thương..."
                      </small>
                    </div>

                    {/* Result File URL (Optional) */}
                    <div className="mb-3">
                      <label className="form-label fw-bold">
                        <i className="bi bi-link-45deg me-2"></i>
                        Link file kết quả (nếu có)
                      </label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://..."
                        value={resultData.resultFileUrl}
                        onChange={(e) => setResultData({ ...resultData, resultFileUrl: e.target.value })}
                      />
                      <small className="text-muted">
                        Link hình ảnh X-quang, siêu âm, hoặc file PDF kết quả xét nghiệm
                      </small>
                    </div>

                    {/* Status */}
                    <div className="mb-3">
                      <label className="form-label fw-bold">
                        <i className="bi bi-flag me-2"></i>
                        Trạng thái
                      </label>
                      <select
                        className="form-select"
                        value={resultData.status}
                        onChange={(e) => setResultData({ ...resultData, status: e.target.value })}
                      >
                        <option value="IN_PROGRESS">Đang thực hiện</option>
                        <option value="DONE">Hoàn thành (gửi kết quả cho bác sĩ chính)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>
                  <i className="bi bi-x-circle me-2"></i>
                  Hủy
                </button>
                <button type="button" className="btn btn-success" onClick={handleSubmitResult}>
                  <i className="bi bi-check-circle me-2"></i>
                  Lưu kết quả
                </button>
              </div>
            </div>
          </div>
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

export default DepartmentReferrals;
