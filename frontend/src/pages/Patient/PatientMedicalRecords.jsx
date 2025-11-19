import React, { useState, useEffect, useCallback } from "react";
import { Card, Container, Row, Col, Table, Modal, Badge, Alert, Tabs, Tab } from "react-bootstrap";
import { FileText, Eye, Calendar, TestTube, Camera, Download, User, Stethoscope, Pill, Clock, Search } from "lucide-react";
import medicalRecordApi from "../../api/medicalRecordApi";
import patientApi from "../../api/patientApi";
import referralApi from "../../api/referralApi";
import MedicalRecordPdf from '../../components/patient/MedicalRecordPdf';
import html2pdf from 'html2pdf.js';

const PatientMedicalRecords = () => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [referralResults, setReferralResults] = useState([]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfRecord, setPdfRecord] = useState(null);

  // Lấy patientId từ localStorage và API
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        const userId = userData.id;
        if (userId) {
          patientApi
            .getPatientByUserId(userId)
            .then((res) => {
              const data = res.data || res;
              setPatientId(data.patientId);
            })
            .catch((err) => {
              console.error("Error getting patient info:", err);
            });
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const loadMedicalRecords = useCallback(async () => {
    if (!patientId) {
      console.log('⚠️ Chưa có patientId, bỏ qua việc tải hồ sơ bệnh án');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Đang tải hồ sơ bệnh án của bệnh nhân ID:', patientId);
      
      const response = await medicalRecordApi.getMedicalRecordsByPatient(patientId);
      console.log('✅ Response từ backend:', response);
      console.log('API response data:', response.data);
      
      // Transform data from backend format to frontend format
      const records = Array.isArray(response.data) ? response.data.map(record => {
        console.log('🔍 Processing record:', {
          recordId: record.recordId,
          diagnosis: record.diagnosis,
          advice: record.advice,
          prescription: record.prescription,
          appointmentDate: record.appointmentDate
        });
        
        return {
          id: record.recordId,
          recordId: record.recordId,
          doctorName: record.doctorName || "Chưa cập nhật",
          visitDate: record.appointmentDate || record.createdAt,
          chiefComplaint: record.advice || "Chưa cập nhật",
          diagnosis: record.diagnosis || "Chưa cập nhật",
          treatment: record.advice || "Chưa cập nhật",
          status: "completed",
          vitalSigns: {},
          testResults: [],
          prescription: record.prescription,
          advice: record.advice || "",
          createdAt: record.createdAt,
          appointmentId: record.appointmentId,
          patientId: record.patientId,
          patientName: record.patientName,
          patientDob: record.patientDob,
          patientGender: record.patientGender,
          patientAddress: record.patientAddress
        };
      }) : [];
      
      console.log('📋 Đã xử lý', records.length, 'hồ sơ bệnh án');
      setMedicalRecords(records);
      
    } catch (error) {
      console.error('❌ Lỗi khi tải hồ sơ bệnh án từ backend:', error);
      
      // Show error message instead of mock data
      if (error.response?.status === 404) {
        setError('Không tìm thấy hồ sơ bệnh án cho bệnh nhân này');
        console.log('ℹ️ Không tìm thấy hồ sơ bệnh án cho bệnh nhân này');
        setMedicalRecords([]);
      } else if (error.response?.status === 401) {
        setError('Không có quyền truy cập hồ sơ bệnh án');
        console.error('🔒 Không có quyền truy cập hồ sơ bệnh án');
        setMedicalRecords([]);
      } else {
        setError(`Không thể kết nối đến server: ${error.message}`);
        console.error('🔌 Không thể kết nối đến server backend');
        setMedicalRecords([]);
      }
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      loadMedicalRecords();
    }
  }, [patientId, loadMedicalRecords]);

  // Filtered list based on search and status filter
  const filteredRecords = (medicalRecords || []).filter(record => {
    const raw = (searchTerm || '').toString().trim().toLowerCase();
    if (filterStatus && filterStatus !== 'all' && record.status !== filterStatus) return false;
    if (!raw) return true;
    return (
      (String(record.recordId) || '').toLowerCase().includes(raw) ||
      (record.doctorName || '').toLowerCase().includes(raw) ||
      (record.diagnosis || '').toLowerCase().includes(raw)
    );
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: "primary", text: "Đang điều trị" },
      completed: { variant: "success", text: "Hoàn thành" },
      followup: { variant: "warning", text: "Cần tái khám" },
      cancelled: { variant: "danger", text: "Đã hủy" }
    };
    
    const config = statusConfig[status] || { variant: "secondary", text: "Không xác định" };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const handleViewRecord = async (record) => {
    setSelectedRecord(record);
    setShowModal(true);
    
    console.log('📋 Xem chi tiết hồ sơ:', record);
    
    // Try loading by appointment first, then by patient
    let loadedReferrals = [];
    
    if (record.appointmentId) {
      try {
        console.log('🔍 Tải CLS theo appointmentId:', record.appointmentId);
        const response = await referralApi.getReferralsByAppointment(record.appointmentId);
        console.log('✅ Kết quả CLS theo appointment:', response.data);
        loadedReferrals = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
      } catch (err) {
        console.log('⚠️ Không tải được CLS theo appointment:', err.message);
      }
    }
    
    // If no results from appointment, try loading by patient
    if (loadedReferrals.length === 0 && patientId) {
      try {
        console.log('🔍 Tải CLS theo patientId:', patientId);
        const response = await referralApi.getReferralsByPatient(patientId);
        console.log('✅ Kết quả CLS theo patient:', response.data);
        loadedReferrals = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
      } catch (err) {
        console.log('⚠️ Không tải được CLS theo patient:', err.message);
      }
    }
    
    console.log('📊 Tổng số referral results:', loadedReferrals.length);
    if (loadedReferrals.length > 0) {
      console.log('🔍 Chi tiết referral đầu tiên:', JSON.stringify(loadedReferrals[0], null, 2));
      loadedReferrals.forEach((r, idx) => {
        console.log(`Referral ${idx + 1}:`, {
          id: r.id || r.referralId,
          imageUrl: r.imageUrl,
          imageLink: r.imageLink,
          image: r.image,
          resultImage: r.resultImage,
          allKeys: Object.keys(r)
        });
      });
    }
    console.log('🖼️ Referrals có hình ảnh:', loadedReferrals.filter(r => r.imageUrl).length);
    setReferralResults(loadedReferrals);
  };

  const handleShowPdfModal = (record) => {
    // Lấy referralResults đang hiển thị ở tab hình ảnh
    setPdfRecord({ ...record, referralResults });
    setShowPdfModal(true);
  };

  const handleClosePdfModal = () => {
    setShowPdfModal(false);
    setPdfRecord(null);
  };

  const handleExportPDF = async (recordId) => {
    const record = medicalRecords.find(r => r.id === recordId);
    if (!record) return;
    // Lấy referralResults đang hiển thị ở tab hình ảnh
    setPdfRecord({ ...record, referralResults });
    setShowPdfModal(true);
    // Preload all images in referralResults
    const preloadImages = async (images) => {
      const promises = images.map(img => {
        const src = img.result_file_url || img.resultFileUrl || img.imageUrl || img.imageLink || img.image || '';
        if (!src) return Promise.resolve();
        return new Promise((resolve) => {
          const image = new window.Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = src;
        });
      });
      await Promise.all(promises);
    };
    preloadImages(referralResults).then(() => {
      setTimeout(() => {
        const element = document.getElementById('medical-record-pdf-preview');
        if (element) {
          html2pdf().set({
            margin: 10,
            filename: `medical-record-${recordId}.pdf`,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
          }).from(element).save();
        }
      }, 500);
    });
  };

  return (
    <Container fluid className="py-4">
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
        <h2>Hồ Sơ Bệnh Án</h2>
      </div>

      {/* Stats Cards - Hidden */}
      {/* <div className="row g-3 mb-4 d-none">
        <div className="col-md-4">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Tổng Bệnh Án</div>
                  <div className="h4 mb-0">{medicalRecords.length}</div>
                </div>
                <i className="bi bi-file-text fs-2 text-primary"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Đã Hoàn Thành</div>
                  <div className="h4 mb-0">{medicalRecords.filter(r => r.status === 'completed').length}</div>
                </div>
                <i className="bi bi-check-circle fs-2 text-success"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Đang Điều Trị</div>
                  <div className="h4 mb-0">{medicalRecords.filter(r => r.status === 'active').length}</div>
                </div>
                <i className="bi bi-hourglass-split fs-2 text-warning"></i>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Search */}
      <div className="row mb-3">
        <div className="col-md-9">
          <div className="input-group">
            <span className="input-group-text">
              <Search size={18} />
            </span>
            <input
              className="form-control"
              type="text"
              placeholder="Tìm kiếm theo mã hồ sơ, bác sĩ hoặc chẩn đoán..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{height: '48px', fontSize: '0.95rem'}}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select 
            className="form-select" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={{height: '48px'}}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Hoàn thành</option>
            <option value="active">Đang điều trị</option>
            <option value="followup">Cần tái khám</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Medical Records Cards */}
      <Row>
        <Col>
          {loading ? (
            <Card className="shadow-sm border-0" style={{borderRadius: '16px'}}>
              <Card.Body>
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Đang tải hồ sơ bệnh án...</p>
                </div>
              </Card.Body>
            </Card>
          ) : error ? (
            <Card className="shadow-sm border-0" style={{borderRadius: '16px'}}>
              <Card.Body>
                <Alert variant="danger" className="text-center border-0">
                  <FileText size={48} className="mb-3 text-danger" />
                  <h5>Lỗi tải dữ liệu</h5>
                  <p>{error}</p>
                  <button 
                    className="btn btn-outline-danger btn-sm" 
                    onClick={() => {
                      setError(null);
                      loadMedicalRecords();
                    }}
                  >
                    Thử lại
                  </button>
                </Alert>
              </Card.Body>
            </Card>
          ) : filteredRecords.length === 0 ? (
            <Card className="shadow-sm border-0" style={{borderRadius: '16px'}}>
              <Card.Body>
                <Alert variant="info" className="text-center m-4" style={{backgroundColor: '#e6f7fb', borderRadius: 8}}>
                  <FileText size={48} className="mb-3 text-muted" />
                  <h5>Không tìm thấy hồ sơ bệnh án nào</h5>
                  <p className="mb-0">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                </Alert>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {filteredRecords.map((record) => (
                <Col key={record.id} md={6} lg={4}>
                  <Card 
                    className="h-100 shadow-sm border-0"
                    style={{ borderRadius: 12, cursor: 'pointer', transition: 'all 0.22s ease' }}
                    onClick={() => handleViewRecord(record)}
                  >
                    <div style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: '12px 16px'}}>
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 text-white">Hồ sơ #{record.recordId}</h6>
                        {getStatusBadge(record.status)}
                      </div>
                    </div>
                    <Card.Body>
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-2">
                          <User size={16} className="me-2 text-primary" />
                          <strong className="text-dark">{record.doctorName}</strong>
                        </div>
                        <div className="d-flex align-items-center mb-2 text-muted">
                          <Calendar size={16} className="me-2" />
                          <small>{record.visitDate ? new Date(record.visitDate).toLocaleDateString('vi-VN') : 'N/A'}</small>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="d-flex align-items-start">
                          <Stethoscope size={16} className="me-2 text-success mt-1" />
                          <div className="flex-grow-1">
                            <small className="text-muted d-block mb-1">Chẩn đoán</small>
                            <p className="mb-0 fw-semibold" style={{ fontSize: '0.9rem' }}>
                              {record.diagnosis || "Chưa cập nhật"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <div>
                          {record.prescription ? (
                            <Badge bg="success" className="d-flex align-items-center" style={{ width: 'fit-content' }}>
                              <Pill size={12} className="me-1" />
                              Có đơn thuốc
                            </Badge>
                          ) : (
                            <Badge bg="secondary" className="d-flex align-items-center" style={{ width: 'fit-content' }}>
                              <Pill size={12} className="me-1" />
                              Chưa kê đơn
                            </Badge>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={(e) => { e.stopPropagation(); handleViewRecord(record); }}
                          title="Xem chi tiết"
                        >
                          <Eye size={14} className="me-1" />
                          Xem
                        </button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>

      {/* View Medical Record Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" centered>
        <Modal.Header closeButton style={{borderBottom: 'none', paddingBottom: 0}}>
          <Modal.Title>
            <FileText className="me-2" size={24} />
            Chi Tiết Hồ Sơ Bệnh Án
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {selectedRecord && (
            <Tabs defaultActiveKey="general" className="mb-0 px-3 pt-3">
              <Tab eventKey="general" title={<span><Stethoscope size={16} className="me-1" />Thông tin khám</span>}>
                <div className="p-3">
                  {/* Header Card */}
                  <div className="card mb-3" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '12px'}}>
                    <div className="card-body p-3">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="d-flex align-items-center mb-2">
                            <FileText size={18} className="me-2" />
                            <strong>Hồ sơ #{selectedRecord.recordId}</strong>
                          </div>
                          <div className="d-flex align-items-center">
                            <User size={16} className="me-2" />
                            <span>{selectedRecord.doctorName}</span>
                          </div>
                        </div>
                        <div className="col-md-6 text-md-end">
                          <div className="d-flex align-items-center justify-content-md-end mb-2">
                            <Calendar size={16} className="me-2" />
                            <span>{new Date(selectedRecord.visitDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          {getStatusBadge(selectedRecord.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="card mb-3">
                    <div className="card-header bg-light">
                      <h6 className="mb-0 d-flex align-items-center">
                        <Stethoscope size={18} className="me-2 text-primary" />
                        Chẩn đoán
                      </h6>
                    </div>
                    <div className="card-body">
                      <p className="mb-0">{selectedRecord.diagnosis || "Chưa cập nhật"}</p>
                    </div>
                  </div>

                  {/* Advice */}
                  {selectedRecord.advice && (
                    <div className="card mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0 d-flex align-items-center">
                          <FileText size={18} className="me-2 text-success" />
                          Lời khuyên
                        </h6>
                      </div>
                      <div className="card-body">
                        <p className="mb-0">{selectedRecord.advice}</p>
                      </div>
                    </div>
                  )}

                  {/* Prescription */}
                  {selectedRecord.prescription && (
                    <div className="card mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0 d-flex align-items-center">
                          <Pill size={18} className="me-2 text-danger" />
                          Đơn thuốc
                        </h6>
                      </div>
                      <div className="card-body">
                        {selectedRecord.prescription.notes && (
                          <div className="mb-3 p-3 bg-light rounded">
                            <strong>Ghi chú:</strong>
                            <p className="mb-0 mt-1">{selectedRecord.prescription.notes}</p>
                          </div>
                        )}
                        {selectedRecord.prescription.items && selectedRecord.prescription.items.length > 0 ? (
                          <div>
                            <strong className="mb-3 d-block">Thuốc kê đơn:</strong>
                            <div className="row g-3">
                              {selectedRecord.prescription.items.map((item, index) => (
                                <div className="col-md-6" key={index}>
                                  <div className="card border h-100">
                                    <div className="card-body p-3">
                                      <div className="d-flex align-items-start mb-2">
                                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                                             style={{ width: '28px', height: '28px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                          {index + 1}
                                        </div>
                                        <div className="flex-grow-1">
                                          <h6 className="mb-1 text-primary">{item.medicineName || `Thuốc ${index + 1}`}</h6>
                                          <div className="small text-muted">
                                            <div className="mb-1"><strong>Liều dùng:</strong> {item.dosage || 'N/A'}</div>
                                            <div className="mb-1"><strong>Thời gian:</strong> {item.duration || 'N/A'}</div>
                                            <div className="mb-1"><strong>Số lượng:</strong> {item.quantity || 1}</div>
                                            {item.price && (
                                              <div className="mb-1"><strong>Đơn giá:</strong> <span className="text-success fw-bold">{item.price.toLocaleString('vi-VN')} ₫</span></div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Alert variant="info" className="mb-0">
                            <Pill size={16} className="me-2" />
                            Không có thuốc nào được kê
                          </Alert>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Tab>
              
              <Tab eventKey="images" title={<span><Camera size={16} className="me-1" />Hình ảnh</span>}>
                <div className="p-3">
                  <h6 className="mb-3 d-flex align-items-center">
                    <Camera size={20} className="me-2 text-warning" />
                    Hình ảnh y học
                  </h6>
                  {referralResults.length > 0 && referralResults.some(r => r.result_file_url || r.resultFileUrl) ? (
                    <div className="row g-3">
                      {referralResults.filter(r => r.result_file_url || r.resultFileUrl).map((referral, index) => {
                        const imageUrl = referral.result_file_url || referral.resultFileUrl;
                        return (
                        <div className="col-md-4" key={index}>
                          <div className="card border-0 shadow-sm h-100">
                            <img 
                              src={imageUrl} 
                              alt={`Kết quả CLS ${index + 1}`}
                              style={{ height: '200px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/400x300?text=Kh%C3%B4ng+t%E1%BA%A1i+%C4%91%C6%B0%E1%BB%A3c+h%C3%ACnh';
                              }}
                            />
                            <div className="card-body">
                              <h6 className="card-title">{referral.clinical_service || referral.clinicalService || 'Kết quả hình ảnh'}</h6>
                              <small className="text-muted d-block mb-1">
                                <Clock size={14} className="me-1" />
                                {referral.completed_at || referral.completedAt ? new Date(referral.completed_at || referral.completedAt).toLocaleDateString('vi-VN') : 'N/A'}
                              </small>
                              {referral.result && (
                                <p className="mb-0 small text-muted mt-2">
                                  <strong>Kết quả:</strong> {referral.result}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="alert alert-info border-0 text-center" style={{backgroundColor: '#e3f2fd'}}>
                      <Camera size={48} className="mb-3 text-primary" />
                      <h5>Chưa có hình ảnh y học nào</h5>
                    </div>
                  )}
                </div>
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 bg-light">
          <button className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
            Đóng
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleShowPdfModal(selectedRecord)}
          >
            <FileText className="me-2" size={16} />
            Xem trước PDF
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleExportPDF(selectedRecord?.id)}
          >
            <Download className="me-2" size={16} />
            Xuất PDF
          </button>
        </Modal.Footer>
      </Modal>
      {/* PDF Preview Modal */}
      {showPdfModal && pdfRecord && (
        <Modal show={showPdfModal} onHide={handleClosePdfModal} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Xem trước Hồ sơ bệnh án PDF</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div id="medical-record-pdf-preview">
              <MedicalRecordPdf record={pdfRecord} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn btn-outline-secondary" onClick={handleClosePdfModal}>Đóng</button>
            <button className="btn btn-primary" onClick={() => handleExportPDF(pdfRecord.id)}>
              <Download className="me-2" size={16} />
              Xuất PDF
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
};

export default PatientMedicalRecords;