import React, { useState, useEffect, useMemo } from "react";
import { Card, Container, Row, Col, Button, Table, Modal, Form, Badge, Alert } from "react-bootstrap";
import { Search, Plus, Eye, Edit, FileText, User, Calendar, Clock, Pill } from "lucide-react";
import medicalRecordApi from "../../api/medicalRecordApi";
import doctorApi from "../../api/doctorApi";
import Cookies from "js-cookie";

const MedicalRecords = () => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [doctorId, setDoctorId] = useState(null);

  // Get currentUser from localStorage (memoized) - same pattern as other pages
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  // Lấy doctorId từ cookie (với fallback sang localStorage)
  useEffect(() => {
    const userId = Cookies.get("userId") || currentUser?.id;
    console.log('🔍 Getting doctorId for userId:', userId);
    console.log('🔍 currentUser from localStorage:', currentUser);
    if (userId) {
      doctorApi
        .getDoctorByUserId(userId)
        .then((res) => {
          console.log('✅ Doctor API response:', res);
          const data = res.data || res;
          console.log('📋 Doctor data:', data);
          // Có thể doctorId nằm ở data.doctorId hoặc data.doctor?.doctorId
          const id = data.doctorId || data.doctor?.doctorId || data.id;
          console.log('👨‍⚕️ Extracted doctorId:', id);
          if (id) {
            setDoctorId(id);
          } else {
            console.error('❌ Could not find doctorId in response:', data);
          }
        })
        .catch((err) => {
          console.error("❌ Error getting doctor info:", err);
          console.error("❌ Error details:", err.response?.data);
        });
    } else {
      console.warn('⚠️ No userId found in cookies or localStorage');
    }
  }, [currentUser]);

  // Lấy dữ liệu từ backend
  useEffect(() => {
    if (doctorId) {
      loadMedicalRecords();
    }
  }, [doctorId]);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading medical records for doctorId:', doctorId, 'Type:', typeof doctorId);
      
      // Lấy hồ sơ bệnh án theo doctor hoặc tất cả
      let response;
      if (doctorId && doctorId !== 'null' && doctorId !== 'undefined') {
        // Đảm bảo doctorId là số
        const id = typeof doctorId === 'string' ? parseInt(doctorId, 10) : doctorId;
        if (isNaN(id)) {
          console.error('❌ Invalid doctorId:', doctorId);
          setMedicalRecords([]);
          return;
        }
        console.log('📞 Calling API with doctorId:', id);
        response = await medicalRecordApi.getMedicalRecordsByDoctor(id);
      } else {
        console.log('📞 Calling getAllMedicalRecords (no doctorId)');
        response = await medicalRecordApi.getAllMedicalRecords();
      }
      
      console.log('✅ Medical records loaded:', response);
      console.log('✅ Response data:', response.data);
      console.log('✅ Response status:', response.status);
      
      // Chuyển đổi dữ liệu từ backend format sang frontend format
      const records = (response.data || []).map(record => {
        // Debug prescription data
        if (record.prescription) {
          console.log('🔍 Prescription found:', {
            prescriptionId: record.prescription.prescriptionId,
            notes: record.prescription.notes,
            itemsCount: record.prescription.items?.length || 0,
            items: record.prescription.items
          });
        }
        
        return {
          id: record.recordId,
          patientId: record.patientId,
          patientName: record.patientName || 'Chưa xác định',
          age: record.patientAge || 'N/A',
          gender: record.patientGender || 'N/A',
          phone: record.patientPhone || '',
          diagnosis: record.diagnosis || '',
          advice: record.advice || '',
          doctorName: record.doctorName || 'Chưa xác định',
          appointmentDate: record.appointmentDate || record.createdAt,
          createdDate: record.createdAt,
          status: 'completed', // Medical record luôn completed khi đã tạo
          notes: record.notes || "",
          prescription: record.prescription // Thêm prescription data
        };
      });
      
      console.log('📊 Mapped records:', records.length);
      if (records.length > 0) {
        console.log('🔍 First record:', {
          id: records[0].id,
          patientName: records[0].patientName,
          patientId: records[0].patientId,
          age: records[0].age,
          gender: records[0].gender,
          diagnosis: records[0].diagnosis,
          hasPrescription: !!records[0].prescription
        });
      }

      setMedicalRecords(records);
    } catch (error) {
      console.error('❌ Lỗi khi tải hồ sơ bệnh án từ backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Show error message instead of mock data
      if (error.response?.status === 400) {
        console.error('❌ Bad Request - Có thể doctorId không hợp lệ:', doctorId);
        console.error('❌ Error response:', error.response?.data);
        // Thử gọi getAllMedicalRecords nếu doctorId có vấn đề
        try {
          console.log('🔄 Retrying with getAllMedicalRecords...');
          const fallbackResponse = await medicalRecordApi.getAllMedicalRecords();
          const records = (fallbackResponse.data || []).map(record => ({
            id: record.recordId,
            patientId: record.patientId,
            patientName: record.patientName || 'Chưa xác định',
            age: record.patientAge || 'N/A',
            gender: record.patientGender || 'N/A',
            phone: record.patientPhone || '',
            diagnosis: record.diagnosis || '',
            advice: record.advice || '',
            doctorName: record.doctorName || 'Chưa xác định',
            appointmentDate: record.appointmentDate || record.createdAt,
            createdDate: record.createdAt,
            status: 'completed',
            notes: record.notes || "",
            prescription: record.prescription
          }));
          setMedicalRecords(records);
          return;
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
        }
        setMedicalRecords([]);
      } else if (error.response?.status === 404) {
        console.log('ℹ️ Không tìm thấy hồ sơ bệnh án');
        setMedicalRecords([]);
      } else if (error.response?.status === 401) {
        console.error('🔒 Không có quyền truy cập hồ sơ bệnh án');
        setMedicalRecords([]);
      } else {
        console.error('🔌 Không thể kết nối đến server backend');
        setMedicalRecords([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      new: { variant: "primary", text: "Mới" },
      "in-progress": { variant: "warning", text: "Đang điều trị" },
      completed: { variant: "success", text: "Hoàn thành" }
    };
    return statusConfig[status] || { variant: "secondary", text: "Không xác định" };
  };

  const filteredRecords = medicalRecords.filter(record => {
    const matchesSearch = (record.patientName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                         (record.patientId || '').toString().toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                         (record.diagnosis || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesStatus = filterStatus === "all" || record.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
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

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
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
                  <div className="h4 mb-0">{medicalRecords.filter(r => r.status === 'in-progress').length}</div>
                </div>
                <i className="bi bi-hourglass-split fs-2 text-warning"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="row mb-3">
        <div className="col-md-9">
          <div className="input-group">
            <span className="input-group-text">
              <Search size={18} />
            </span>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm theo tên bệnh nhân, mã BN, chẩn đoán..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{height: '48px', fontSize: '0.95rem'}}
            />
          </div>
        </div>
        <div className="col-md-3">
          <Form.Select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={{height: '48px'}}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="new">Mới</option>
            <option value="in-progress">Đang điều trị</option>
            <option value="completed">Hoàn thành</option>
          </Form.Select>
        </div>
      </div>

      {/* Medical Records Table */}
      <Card className="shadow-sm border-0" style={{borderRadius: '16px'}}>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <Alert variant="info" className="text-center">
              <FileText size={48} className="mb-3 text-muted" />
              <h5>Không tìm thấy bệnh án nào</h5>
              <p className="mb-0">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </Alert>
          ) : (
            <Table responsive hover>
              <thead className="table-light">
                <tr>
                  <th>Mã BN</th>
                  <th>Bệnh nhân</th>
                  <th>Tuổi/Giới tính</th>
                  <th>Chẩn đoán</th>
                  <th>Bác sĩ</th>

                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => {
                  const statusConfig = getStatusBadge(record.status);
                  return (
                    <tr key={record.id}>
                      <td>
                        <strong className="text-primary">{record.patientId}</strong>
                      </td>
                      <td>
                        <div>
                          <strong>{record.patientName}</strong>
                          <br />
                          <small className="text-muted">{record.phone}</small>
                        </div>
                      </td>
                      <td>{record.age} tuổi / {record.gender}</td>
                      <td>
                        <strong>{record.diagnosis}</strong>
                        {record.advice && (
                          <>
                            <br />
                            <small className="text-muted">Lời khuyên: {record.advice}</small>
                          </>
                        )}
                      </td>
                      <td>
                        <div>
                          <strong>{record.doctorName}</strong>
                        </div>
                      </td>
                   
                      <td>
                        <div className="d-flex align-items-center">
                          <Calendar size={14} className="me-1 text-muted" />
                          {new Date(record.createdDate).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewRecord(record)}
                          className="me-2"
                        >
                          <Eye size={14} className="" />
                          
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Medical Record Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedRecord && `Bệnh Án - ${selectedRecord.patientName}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord ? (
            <div>
              {/* Patient Info */}
              <Card className="mb-3">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">
                    <User className="me-2" size={18} />
                    Thông Tin Bệnh Nhân
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p><strong>Mã BN:</strong> {selectedRecord.patientId}</p>
                      <p><strong>Họ tên:</strong> {selectedRecord.patientName}</p>
                      <p><strong>Tuổi:</strong> {selectedRecord.age}</p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Giới tính:</strong> {selectedRecord.gender}</p>
                      <p><strong>Điện thoại:</strong> {selectedRecord.phone}</p>
                      <p><strong>Bác sĩ khám:</strong> {selectedRecord.doctorName}</p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Medical Details */}
              <Card className="mb-3">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">
                    <FileText className="me-2" size={18} />
                    Thông Tin Y Tế
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={12}>
                      <p><strong>Chẩn đoán:</strong></p>
                      <p className="ps-3">{selectedRecord.diagnosis}</p>
                      
                      {selectedRecord.advice && (
                        <>
                          <p><strong>Lời khuyên:</strong></p>
                          <p className="ps-3">{selectedRecord.advice}</p>
                        </>
                      )}
                      
                      {selectedRecord.notes && (
                        <>
                          <p><strong>Ghi chú:</strong></p>
                          <p className="ps-3">{selectedRecord.notes}</p>
                        </>
                      )}
                    </Col>
                  </Row>
                  
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted">
                      <strong>Trạng thái:</strong> 
                      <Badge bg="success" className="ms-2">Đã hoàn thành</Badge>
                    </div>
                    <div className="text-muted">
                      <Clock size={14} className="me-1" />
                      Ngày tạo: {new Date(selectedRecord.createdDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {/* Prescription Details */}
              {selectedRecord.prescription && (
                <Card className="mb-3">
                  <Card.Header className="bg-light">
                    <h6 className="mb-0">
                      <Pill className="me-2" size={18} />
                      Đơn Thuốc
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={12}>
                        <p><strong>Ghi chú đơn thuốc:</strong></p>
                        <p className="ps-3">{selectedRecord.prescription.notes}</p>
                        
                        <p><strong>Thuốc kê đơn:</strong></p>
                        {(() => {
                          const items = selectedRecord.prescription.items || [];
                          if (items.length > 0) {
                            return (
                              <div className="ps-3">
                                <Table bordered size="sm" className="mt-2">
                                  <thead className="table-light">
                                    <tr>
                                      <th>STT</th>
                                      <th>Tên thuốc</th>
                                      <th>Liều dùng</th>
                                      <th>Thời gian</th>
                                      <th>Số lượng</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, index) => (
                                      <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td><strong>{item.medicineName || `Thuốc ${index + 1}`}</strong></td>
                                        <td>{item.dosage || 'N/A'}</td>
                                        <td>{item.duration || 'N/A'}</td>
                                        <td>{item.quantity || 1}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </div>
                            );
                          } else {
                            return <p className="ps-3 text-muted">Không có thuốc nào được kê</p>;
                          }
                        })()}
                      </Col>
                    </Row>
                    
                    <div className="text-muted mt-2">
                      <Clock size={14} className="me-1" />
                      Ngày kê đơn: {selectedRecord.prescription.createdAt ? 
                        new Date(selectedRecord.prescription.createdAt).toLocaleDateString('vi-VN') : 
                        'N/A'}
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">Không có thông tin bệnh án</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MedicalRecords;