import React, { useState, useEffect, useMemo } from "react";
import { Card, Container, Row, Col, Button, Table, Modal, Form, Badge, Alert } from "react-bootstrap";
import { FileText, Eye, User, Calendar, Search, Trash2 } from "lucide-react";
import prescriptionApi, { exportPrescriptionPdf } from "../../api/prescriptionApi";
import appointmentApi from "../../api/appointmentApi";
import userApi from '../../api/userApi';
import { toast } from "../../utils/toast";
import PrescriptionPdf from '../../components/admin/PrescriptionPdf';
import html2pdf from 'html2pdf.js';

const PrescriptionsManagement = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [exportId, setExportId] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, diagnosis: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ patientId: "", appointmentId: "", diagnosis: "", items: [{ medicineId: "", quantity: 1, dosage: "" }] });
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPrescription, setPdfPrescription] = useState(null);

  useEffect(() => {
    loadPrescriptions();
    loadAppointments();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const prescriptionsRes = await prescriptionApi.getAllPrescriptions();
      
      const prescriptionsData = (prescriptionsRes.data || []).map(prescription => ({
        id: prescription.prescriptionId, // Backend returns prescriptionId as the primary key
        prescriptionId: prescription.prescriptionId || 'N/A',
        patientId: prescription.patientId,
        patientName: prescription.patientName || 'Chưa có tên',
        doctorId: prescription.doctorId,
        doctorName: prescription.doctorName || 'Chưa có tên',
        diagnosis: prescription.notes || prescription.diagnosis || 'Chưa có chẩn đoán',
        prescriptionDate: prescription.createdAt || prescription.createdDate,
        totalAmount: prescription.totalAmount || 0,
        status: 'new', // Default status since backend doesn't have status field
        medicines: (prescription.items || []).map(item => ({
          id: item.itemId,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          quantity: item.quantity || 1,
          dosage: item.dosage,
          duration: item.duration,
          price: item.price || 0,
          instructions: item.note || item.instructions
        }))
      }));

      setPrescriptions(prescriptionsData);
    } catch (error) {
      console.error('Lỗi khi tải đơn thuốc:', error);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      // Get all unique patient IDs from prescriptions first
      const prescriptionsRes = await prescriptionApi.getAllPrescriptions();
      const patientIds = [...new Set((prescriptionsRes.data || []).map(p => p.patientId).filter(Boolean))];
      
      // Fetch appointments for all patients
      const allAppointments = [];
      for (const patientId of patientIds) {
        try {
          const response = await appointmentApi.getAppointmentsByPatient(patientId);
          if (response.data) {
            allAppointments.push(...(Array.isArray(response.data) ? response.data : [response.data]));
          }
        } catch (err) {
          console.log(`Could not fetch appointments for patient ${patientId}`);
        }
      }
      setAppointments(allAppointments);
    } catch (error) {
      console.error('Đỗi lấy danh sách lịch hẹn:', error);
      setAppointments([]);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      new: { variant: "primary", text: "Mới" },
      pending: { variant: "warning", text: "Chờ xử lý" },
      completed: { variant: "success", text: "Hoàn thành" },
      cancelled: { variant: "danger", text: "Hủy" }
    };
    return statusConfig[status] || { variant: "secondary", text: "Không xác định" };
  };

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(prescription =>
      (prescription.patientName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (prescription.prescriptionId || '').toString().toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (prescription.diagnosis || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );
  }, [prescriptions, searchTerm]);

  const handleViewPrescription = (prescription) => {
    setSelectedPrescription(prescription);
    setShowModal(true);
  };

  const handleDeleteClick = (prescription) => {
    setPrescriptionToDelete(prescription);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await prescriptionApi.deletePrescription(prescriptionToDelete.id);
      setShowDeleteConfirm(false);
      setPrescriptionToDelete(null);
      loadPrescriptions();
      toast.success("Đã xóa đơn thuốc thành công");
    } catch (error) {
      console.error('Lỗi khi xóa đơn thuốc:', error);
      toast.error('Không thể xóa đơn thuốc. Vui lòng thử lại.');
    }
  };

  const openEdit = (prescription) => {
    setEditForm({ id: prescription.id, diagnosis: prescription.diagnosis || "" });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.id) return;
    try {
      // Find the prescription being edited
      const currentPrescription = prescriptions.find(p => p.id === editForm.id);
      if (!currentPrescription) {
        toast.error('Không tìm thấy đơn thuốc');
        return;
      }
      
      // Only update notes (diagnosis), don't send items to avoid recreating them
      // Backend will keep existing items unchanged when items is null/not provided
      const payload = {
        notes: editForm.diagnosis // Backend uses 'notes' field and syncs with MedicalRecord diagnosis
      };
      
      console.log('📤 Updating prescription notes only:', editForm.id, payload);
      await prescriptionApi.updatePrescription(editForm.id, payload);
      setShowEditModal(false);
      toast.success("Cập nhật đơn thuốc thành công");
      // Reload prescriptions to see the changes
      await loadPrescriptions();
    } catch (err) {
      console.error('❌ Lỗi cập nhật đơn thuốc:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật đơn thuốc');
    }
  };

  const addCreateItem = () => {
    setCreateForm(prev => ({ ...prev, items: [...prev.items, { medicineId: "", quantity: 1, dosage: "" }] }));
  };

  const removeCreateItem = (idx) => {
    setCreateForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleSaveCreate = async () => {
    // Basic validation similar to doctor flow
    if (!createForm.diagnosis || createForm.items.length === 0) {
      toast.warning('Vui lòng nhập chẩn đoán và ít nhất 1 thuốc');
      return;
    }
    const invalid = createForm.items.some(it => !it.medicineId || !it.dosage || !it.quantity || Number(it.quantity) <= 0);
    if (invalid) {
      toast.warning('Thông tin thuốc không hợp lệ');
      return;
    }
    try {
      const payload = {
        ...(createForm.appointmentId && { appointmentId: parseInt(createForm.appointmentId) }),
        // backend uses notes in create (the doctor flow maps diagnosis -> notes)
        notes: createForm.diagnosis,
        items: createForm.items.map(it => ({
          medicineId: parseInt(it.medicineId),
          quantity: parseInt(it.quantity) || 1,
          dosage: it.dosage,
          duration: it.duration || "",
          note: it.note || "",
        }))
      };
      await prescriptionApi.createPrescription(payload);
      setShowCreateModal(false);
      setCreateForm({ patientId: "", appointmentId: "", diagnosis: "", items: [{ medicineId: "", quantity: 1, dosage: "" }] });
      toast.success('Tạo đơn thuốc thành công');
      loadPrescriptions();
    } catch (err) {
      console.error('Lỗi tạo đơn thuốc:', err);
      toast.error('Không thể tạo đơn thuốc');
    }
  };

  const downloadBlob = (data, filename) => {
    const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPrescription = async (id) => {
    if (!id) return;
    const res = await exportPrescriptionPdf(id);
    downloadBlob(res.data, `prescription-${id}.pdf`);
  };

  const handleShowPdf = async (prescription) => {
    let patientInfo = {};
    try {
      const userRes = await userApi.getUserById(prescription.patientId);
      patientInfo = userRes.data || {};
      console.log('PDF Patient Info from users:', patientInfo);
    } catch (e) {
      patientInfo = appointments.find(a => a.patientId === prescription.patientId) || {};
      if (Array.isArray(patientInfo)) patientInfo = patientInfo[0] || {};
      console.log('PDF Patient Info from appointments:', patientInfo);
    }
    const pdfData = {
      ...prescription,
      patientDob: patientInfo.dateOfBirth || '',
      patientGender: patientInfo.gender || '',
      patientAddress: patientInfo.address || '',
      patientName: (patientInfo.fullName || `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim()) || prescription.patientName || '',
    };
    console.log('PDF Data for PrescriptionPdf:', pdfData);
    setPdfPrescription(pdfData);
    setShowPdfModal(true);
  };

  const handleClosePdf = () => {
    setShowPdfModal(false);
    setPdfPrescription(null);
  };

  const handleExportPdfFile = () => {
    const element = document.getElementById('pdf-preview-content');
    if (element) {
      html2pdf().set({
        margin: 10,
        filename: `prescription-${pdfPrescription.prescriptionId}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(element).save();
    }
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
        <h2>Quản Lý Đơn Thuốc</h2>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Tổng Đơn Thuốc</div>
                  <div className="h4 mb-0">{prescriptions.length}</div>
                </div>
                <i className="bi bi-file-text fs-2 text-primary"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Đã Hoàn Thành</div>
                  <div className="h4 mb-0">{appointments.filter(a => a.status && a.status.toLowerCase() === 'completed').length}</div>
                </div>
                <i className="bi bi-check-circle fs-2 text-success"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Chờ Xử Lý</div>
                  <div className="h4 mb-0">{prescriptions.filter(p => p.status === 'pending').length}</div>
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
                  <div className="text-muted">Tổng Hóa Đơn</div>
                  <div className="h4 mb-0">{prescriptions.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString('vi-VN')} ₫</div>
                </div>
                <i className="bi bi-cash-stack fs-2 text-success"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="row mb-3">
        <div className="col-md-12">
          <div className="input-group">
            <span className="input-group-text">
              <Search size={18} />
            </span>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm theo tên bệnh nhân, mã đơn thuốc, chẩn đoán..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                height: '48px',
                fontSize: '0.95rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Prescriptions Table */}
      <Card className="shadow-sm border-0" style={{borderRadius: '16px'}}>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <Alert variant="info" className="text-center m-4">
              <FileText size={48} className="mb-3 text-muted" />
              <h5>Không tìm thấy đơn thuốc nào</h5>
              <p className="mb-0">Thử thay đổi từ khóa tìm kiếm</p>
            </Alert>
          ) : (
            <Table responsive hover className="align-middle">
              <thead style={{backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6'}}>
                <tr>
                  <th style={{fontWeight: 600}}>Mã Đơn</th>
                  <th style={{fontWeight: 600}}>Bệnh Nhân</th>
                  <th style={{fontWeight: 600}}>Bác Sĩ</th>
                  <th style={{fontWeight: 600}}>Chẩn Đoán</th>
                  <th style={{fontWeight: 600}}>Ngày Kê</th>
                  <th style={{fontWeight: 600}}>Số Thuốc</th>
                  <th style={{fontWeight: 600}}>Tổng Tiền</th>
                  <th style={{fontWeight: 600, textAlign: 'center'}}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrescriptions.map(prescription => {
                  return (
                    <tr key={prescription.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                      <td>
                        <strong className="text-primary" style={{fontSize: '0.95rem'}}>{prescription.prescriptionId}</strong>
                      </td>
                      <td>
                        <strong style={{fontSize: '0.95rem'}}>{prescription.patientName}</strong>
                      </td>
                      <td>
                        <span style={{fontSize: '0.95rem'}}>{prescription.doctorName}</span>
                      </td>
                      <td>
                        <span style={{fontSize: '0.9rem'}}>{prescription.diagnosis}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <Calendar size={14} className="me-1 text-muted" />
                          <span style={{fontSize: '0.9rem'}}>{new Date(prescription.prescriptionDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          fontWeight: 500,
                          padding: '6px 12px',
                          borderRadius: '6px'
                        }}>
                          {prescription.medicines.length} loại
                        </span>
                      </td>
                      <td>
                        <strong className="text-success" style={{fontSize: '0.95rem'}}>
                          {(prescription.totalAmount || 0).toLocaleString('vi-VN')} ₫
                        </strong>
                      </td>
                      <td style={{textAlign: 'center'}}>
                        <div className="d-flex gap-2 justify-content-center">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewPrescription(prescription)}
                            title="Xem chi tiết"
                            style={{borderRadius: '8px'}}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => openEdit(prescription)}
                            title="Chỉnh sửa"
                            style={{borderRadius: '8px'}}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleShowPdf(prescription)}
                            title="Xem PDF"
                            style={{borderRadius: '8px'}}
                          >
                            PDF
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteClick(prescription)}
                            title="Xóa đơn thuốc"
                            style={{borderRadius: '8px'}}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Prescription Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Chi Tiết Đơn Thuốc - {selectedPrescription?.prescriptionId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPrescription && (
            <div>
              {/* Prescription Header */}
              <Card className="mb-3">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">
                    <User className="me-2" size={18} />
                    Thông Tin Đơn Thuốc
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p><strong>Mã đơn:</strong> {selectedPrescription.prescriptionId}</p>
                      <p><strong>Bệnh nhân:</strong> {selectedPrescription.patientName}</p>
                      <p><strong>Mã BN:</strong> {selectedPrescription.patientId}</p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Bác sĩ:</strong> {selectedPrescription.doctorName}</p>
                      <p><strong>Chẩn đoán:</strong> {selectedPrescription.diagnosis}</p>
                      <p><strong>Ngày kê:</strong> {new Date(selectedPrescription.prescriptionDate).toLocaleDateString('vi-VN')}</p>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-between align-items-center">
                    <Badge bg={getStatusBadge(selectedPrescription.status).variant} className="fs-6">
                      {getStatusBadge(selectedPrescription.status).text}
                    </Badge>
                    
                  </div>
                </Card.Body>
              </Card>

              {/* Medicines List */}
              <Card>
                <Card.Header className="bg-light">
                  <h6 className="mb-0">
                    <FileText className="me-2" size={18} />
                    Danh Sách Thuốc ({selectedPrescription.medicines.length})
                  </h6>
                </Card.Header>
                <Card.Body>
                  {selectedPrescription.medicines.map((medicine, index) => (
                    <div key={medicine.id} className={`border rounded p-3 ${index < selectedPrescription.medicines.length - 1 ? 'mb-3' : ''}`}>
                      <Row>
                        <Col md={8}>
                          <h6 className="text-primary">{medicine.medicineName}</h6>
                          <p className="mb-1"><strong>Mã thuốc:</strong> {medicine.medicineId}</p>
                          <p className="mb-1"><strong>Liều dùng:</strong> {medicine.dosage}</p>
                          <p className="mb-1"><strong>Thời gian:</strong> {medicine.duration}</p>
                          <p className="mb-0"><strong>Hướng dẫn:</strong> {medicine.instructions}</p>
                        </Col>
                        <Col md={4} className="text-end">
                          <p className="mb-1"><strong>Số lượng:</strong> {medicine.quantity || 0}</p>
                          <h6 className="text-success">Thành tiền: {(medicine.price || 0).toLocaleString('vi-VN')} ₫</h6>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác Nhận Xóa Đơn Thuốc</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Bạn có chắc chắn muốn xóa đơn thuốc <strong>{prescriptionToDelete?.prescriptionId}</strong>?</p>
          <p className="text-muted">Thao tác này không thể hoàn tác.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            <Trash2 size={14} className="me-1" />
            Xóa
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Chỉnh Sửa Đơn Thuốc</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Chẩn đoán</Form.Label>
              <Form.Control
                type="text"
                value={editForm.diagnosis}
                onChange={(e) => setEditForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Nhập chẩn đoán"
              />
            </Form.Group>
            <Alert variant="info" className="mt-3">
              <small>Lưu ý: Chỉ có thể cập nhật chẩn đoán. Để thay đổi thuốc, vui lòng tạo đơn thuốc mới.</small>
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Hủy</Button>
          <Button variant="success" onClick={handleSaveEdit}>Lưu</Button>
        </Modal.Footer>
      </Modal>

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Tạo Đơn Thuốc</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mã lịch hẹn (tùy chọn)</Form.Label>
                  <Form.Control
                    type="text"
                    value={createForm.appointmentId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, appointmentId: e.target.value }))}
                    placeholder="Nhập appointmentId nếu có"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Chẩn đoán</Form.Label>
                  <Form.Control
                    type="text"
                    value={createForm.diagnosis}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <h6 className="mt-2">Thuốc trong đơn</h6>
            {createForm.items.map((it, idx) => (
              <Row key={idx} className="g-2 align-items-end mb-2">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Mã thuốc</Form.Label>
                    <Form.Control
                      type="number"
                      value={it.medicineId}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        items: prev.items.map((x, i) => i === idx ? { ...x, medicineId: e.target.value } : x)
                      }))}
                      placeholder="VD: 101"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Số lượng</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        items: prev.items.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x)
                      }))}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Liều dùng</Form.Label>
                    <Form.Control
                      type="text"
                      value={it.dosage}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        items: prev.items.map((x, i) => i === idx ? { ...x, dosage: e.target.value } : x)
                      }))}
                      placeholder="VD: 1 viên x 3 lần/ngày"
                    />
                  </Form.Group>
                </Col>
                <Col md={1} className="text-end">
                  <Button variant="outline-danger" size="sm" onClick={() => removeCreateItem(idx)}>×</Button>
                </Col>
              </Row>
            ))}
            <Button variant="outline-primary" size="sm" onClick={addCreateItem} className="mt-1">Thêm thuốc</Button>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleSaveCreate}>Tạo</Button>
        </Modal.Footer>
      </Modal>

      {/* PDF Preview Modal */}
      {showPdfModal && (
        <Modal show={showPdfModal} onHide={handleClosePdf} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Xem trước Đơn thuốc PDF</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div id="pdf-preview-content">
              {pdfPrescription && <PrescriptionPdf prescription={pdfPrescription} />}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClosePdf}>Đóng</Button>
            <Button variant="primary" onClick={handleExportPdfFile}>Xuất file PDF</Button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
};

export default PrescriptionsManagement;