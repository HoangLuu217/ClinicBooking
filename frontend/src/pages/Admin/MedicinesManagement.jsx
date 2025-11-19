import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Button, Table, Modal, Form, Alert } from "react-bootstrap";
import { Package, Plus, Edit, Search, Trash2 } from "lucide-react";
import medicineApi from "../../api/medicineApi";
import { toast } from "../../utils/toast";

const MedicinesManagement = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalData, setModalData] = useState({
    medicineId: '',
    name: '',
    strength: '',
    category: '',
    price: '',
    // unit removed per admin requirement
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);

  // Build unique category suggestions from current list
  const categoryOptions = React.useMemo(() => {
    try {
      const set = new Set();
      (medicines || []).forEach(m => {
        if (m && m.category && String(m.category).trim()) set.add(String(m.category).trim());
      });
      return Array.from(set);
    } catch (e) {
      return [];
    }
  }, [medicines]);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const response = await medicineApi.getAll();
      console.log('API response:', response.data);
      const medicinesData = (response.data || []).map((medicine, i) => ({
        seq: i + 1,
        id: medicine.medicineId, // sử dụng medicineId làm id
        medicineId: medicine.medicineId,
        name: medicine.name,
        strength: medicine.strength || '',
        category: medicine.note || 'Chưa phân loại', // sử dụng note làm category
        manufacturer: medicine.manufacturer || 'Chưa cập nhật',
        price: medicine.unitPrice || 0,
        expiryDate: medicine.expiryDate || '2025-12-31',
        description: medicine.note || medicine.description || ''
      }));
      setMedicines(medicinesData);
    } catch (error) {
        console.error('Lỗi khi tải danh sách thuốc:', error);
        // Notify user and show empty list when backend fails
        try { toast.error('Không thể tải danh sách thuốc từ backend. Vui lòng kiểm tra kết nối.'); } catch (e) { /* ignore */ }
        setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = (medicines || []).filter((medicine, idx) => {
    const raw = (searchTerm || '').toString().trim();
    if (!raw) return true;

    // If input contains only digits, commas, hyphens and spaces, treat as STT list/range
    // Examples supported: "12" (exact STT 12), "1,2,5", "1-5", "1,3-5,8"
    if (/^[\d,\-\s]+$/.test(raw)) {
      const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
      const sttSet = new Set();
      for (const part of parts) {
        if (part.includes('-')) {
          const [aStr, bStr] = part.split('-').map(x => x.trim());
          const a = Number(aStr);
          const b = Number(bStr);
          if (!Number.isNaN(a) && !Number.isNaN(b)) {
            const start = Math.min(a, b);
            const end = Math.max(a, b);
            for (let k = start; k <= end; k++) sttSet.add(k);
          }
        } else {
          const n = Number(part);
          if (!Number.isNaN(n)) sttSet.add(n);
        }
      }

      return sttSet.has(idx + 1);
    }

    // Fallback: text search in name or category
    const lower = raw.toLowerCase();
    return (
      (medicine.name || '').toString().toLowerCase().includes(lower) ||
      (medicine.category || '').toString().toLowerCase().includes(lower)
    );
  });

  const handleAddNew = () => {
    setSelectedMedicine(null);
    setModalData({
      medicineId: '', name: '', strength: '', category: '', price: ''
    });
    setShowModal(true);
  };

  const handleEdit = (medicine) => {
    setSelectedMedicine(medicine);
    setModalData({
      medicineId: medicine.medicineId || '',
      name: medicine.name || '',
      strength: medicine.strength || '',
      category: medicine.category || '',
      price: medicine.price || '',
    });
    setShowModal(true);
  };

  const handleDeleteClick = (medicine) => {
    setMedicineToDelete(medicine);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!medicineToDelete) return;
    try {
      await medicineApi.delete(medicineToDelete.id);
      setShowDeleteConfirm(false);
      setMedicineToDelete(null);
      loadMedicines();
      toast.success('Đã xóa thuốc thành công');
    } catch (error) {
      console.error('Lỗi khi xóa thuốc:', error);
      toast.error('Có lỗi khi xóa thuốc. Vui lòng thử lại.');
    }
  };

  const handleSave = async () => {
    // Minimal validation: medicineId, name, price required
    const trimmedId = String(modalData.medicineId || '').trim();
    const trimmedName = String(modalData.name || '').trim();
    const priceNumber = Number(modalData.price);

    if (!trimmedId || !trimmedName || modalData.price === '' || modalData.price === null || Number.isNaN(priceNumber)) {
      toast.warning('Vui lòng nhập đầy đủ và hợp lệ: Mã thuốc, Tên thuốc và Đơn giá.');
      return;
    }

    if (priceNumber <= 0) {
      toast.warning('Đơn giá phải lớn hơn 0');
      return;
    }

    // Duplicate ID check (exclude the item being edited)
    const duplicateId = medicines.some(m => String(m.medicineId).trim() === trimmedId && (!selectedMedicine || m.id !== selectedMedicine.id));
    if (duplicateId) {
      toast.error('Mã thuốc đã tồn tại. Vui lòng chọn mã khác.');
      return;
    }

    const payload = {
      medicineId: trimmedId,
      name: trimmedName,
      strength: modalData.strength || undefined,
      category: (modalData.category || '').trim() || undefined,
      // backend expects category in `note` field in current mapping, include it so updates persist
      note: (modalData.category || '').trim() || undefined,
      unitPrice: priceNumber || 0,
      // unit removed from admin payload
    };

    try {
      if (selectedMedicine) {
        await medicineApi.update(selectedMedicine.id, payload);
        toast.success('Cập nhật thuốc thành công');
      } else {
        await medicineApi.create(payload);
        toast.success('Thêm thuốc thành công');
      }
    setShowModal(false);
    // reset
    setSelectedMedicine(null);
    setModalData({ medicineId: '', name: '', strength: '', category: '', price: '' });
      loadMedicines();
    } catch (error) {
      console.error('Lỗi khi lưu thuốc:', error);
      toast.error('Có lỗi khi lưu thuốc. Vui lòng thử lại.');
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
        <h2>Quản Lý Thuốc</h2>
        <Button 
          variant="primary" 
          onClick={handleAddNew}
          className="d-flex align-items-center gap-2"
        >
          <Plus size={18} /> Thêm Thuốc Mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Tổng Loại Thuốc</div>
                  <div className="h4 mb-0">{medicines.length}</div>
                </div>
                <i className="bi bi-capsule fs-2 text-info"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card stats-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted">Danh Mục</div>
                  <div className="h4 mb-0">{categoryOptions.length}</div>
                </div>
                <i className="bi bi-list-ul fs-2 text-primary"></i>
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
              placeholder="Tìm kiếm theo STT, tên thuốc hoặc loại thuốc..."
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

      {/* Medicines Table */}
      <Card className="shadow-sm border-0" style={{borderRadius: '16px'}}>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <Alert variant="info" className="text-center">
              <Package size={48} className="mb-3 text-muted" />
              <h5>Không tìm thấy thuốc nào</h5>
              <p className="mb-0">Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra kết nối backend</p>
            </Alert>
          ) : (
            <Table responsive hover className="align-middle">
              <thead style={{backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6'}}>
                <tr>
                  <th style={{width: 60, fontWeight: 600}}>STT</th>
                  <th style={{fontWeight: 600}}>Tên Thuốc</th>
                  <th style={{fontWeight: 600}}>Hàm Lượng</th>
                  <th style={{fontWeight: 600}}>Loại</th>
                  <th style={{fontWeight: 600}}>Đơn Giá</th>
                  <th style={{fontWeight: 600, textAlign: 'center'}}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map((medicine, index) => (
                  <tr key={medicine.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                    <td>
                      <strong className="text-primary">{medicine.seq || (index + 1)}</strong>
                    </td>
                    <td>
                      <div>
                        <strong style={{fontSize: '0.95rem'}}>{medicine.name}</strong>
                        {medicine.description && (
                          <div>
                            <small className="text-muted">{medicine.description}</small>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark" style={{fontWeight: 500}}>
                        {medicine.strength || '-'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: medicine.category?.includes('kháng sinh') ? '#ffebee' :
                                       medicine.category?.includes('giảm đau') ? '#e3f2fd' :
                                       medicine.category?.includes('vitamin') ? '#f3e5f5' :
                                       medicine.category?.includes('tiêu hóa') ? '#fff3e0' : '#e8f5e9',
                        color: medicine.category?.includes('kháng sinh') ? '#c62828' :
                               medicine.category?.includes('giảm đau') ? '#1565c0' :
                               medicine.category?.includes('vitamin') ? '#6a1b9a' :
                               medicine.category?.includes('tiêu hóa') ? '#e65100' : '#2e7d32',
                        fontWeight: 500,
                        padding: '6px 12px',
                        borderRadius: '6px'
                      }}>
                        {medicine.category || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <strong className="text-success" style={{fontSize: '0.95rem'}}>
                        {(medicine.price || 0).toLocaleString('vi-VN')} ₫
                      </strong>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => handleEdit(medicine)}
                        style={{borderRadius: '8px'}}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDeleteClick(medicine)}
                        style={{borderRadius: '8px'}}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Medicine Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedMedicine ? 'Chỉnh Sửa Thuốc' : 'Thêm Thuốc Mới'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mã thuốc *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Mã thuốc"
                    value={modalData.medicineId}
                    onChange={(e) => setModalData(prev => ({...prev, medicineId: e.target.value}))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tên thuốc *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Tên thuốc"
                    value={modalData.name}
                    onChange={(e) => setModalData(prev => ({...prev, name: e.target.value}))}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Hàm lượng</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="VD: 500mg"
                    value={modalData.strength}
                    onChange={(e) => setModalData(prev => ({...prev, strength: e.target.value}))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Loại thuốc</Form.Label>
                  <Form.Control
                    type="text"
                    list="categoryOptions"
                    placeholder="Nhập hoặc chọn loại thuốc"
                    value={modalData.category}
                    onChange={(e) => setModalData(prev => ({...prev, category: e.target.value}))}
                  />
                  <datalist id="categoryOptions">
                    {categoryOptions.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Đơn giá *</Form.Label>
                  <Form.Control 
                    type="number" 
                    placeholder="Giá"
                    value={modalData.price}
                    onChange={(e) => setModalData(prev => ({...prev, price: e.target.value}))}
                  />
                </Form.Group>
              </Col>
              {/* unit select removed from admin modal */}
            </Row>
            {/* manufacturer removed - not required */}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={() => handleSave()}>
            {selectedMedicine ? 'Cập Nhật' : 'Thêm Thuốc'}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác Nhận Xóa Thuốc</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Bạn có chắc chắn muốn xóa thuốc <strong>{medicineToDelete?.name}</strong> ({medicineToDelete?.medicineId})?</p>
          <p className="text-muted">Thao tác này không thể hoàn tác.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Hủy</Button>
          <Button variant="danger" onClick={handleConfirmDelete}>Xóa</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default MedicinesManagement;


