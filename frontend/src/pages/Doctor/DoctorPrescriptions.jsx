import React, { useState, useEffect, useMemo } from "react";
import { Card, Container, Row, Col, Button, Table, Modal, Form, Alert, Badge } from "react-bootstrap";
import { Pill, Plus, Eye, Search, Calendar, User, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import prescriptionApi from "../../api/prescriptionApi";
import Cookies from "js-cookie";
import doctorApi from "../../api/doctorApi";

const DoctorPrescriptions = () => {
  const location = useLocation();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [doctorId, setDoctorId] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  console.log('🎯 DoctorPrescriptions component rendered');
  console.log('📍 Current location:', location.pathname);
  console.log('📋 Location state:', location.state);

  // Get currentUser from localStorage (memoized) - same pattern as other pages
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  // Lấy doctorId từ cookie và API (với fallback sang localStorage)
  useEffect(() => {
    const userId = Cookies.get("userId") || currentUser?.id;
    console.log('🔍 Getting doctorId for userId:', userId);
    console.log('🔍 currentUser from localStorage:', currentUser);
    if (userId) {
      doctorApi
        .getDoctorByUserId(userId)
        .then((res) => {
          const data = res.data || res;
          setDoctorId(data.doctorId);
        })
        .catch((err) => {
          console.error("Error getting doctor info:", err);
        });
    } else {
      console.warn('⚠️ No userId found in cookies or localStorage');
    }
  }, [currentUser]);

  useEffect(() => {
    console.log('🔍 DoctorId changed:', doctorId);
    if (doctorId) {
      loadPrescriptions();
    } else {
      console.log('⚠️ Chưa có doctorId, không thể tải đơn thuốc');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  // Auto refresh when page becomes visible (when user comes back from prescription form)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && doctorId) {
        console.log('🔄 Trang được focus lại, refresh danh sách đơn thuốc...');
        loadPrescriptions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [doctorId]);

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.message && location.state?.newPrescription) {
      setShowSuccessMessage(true);
      console.log('🎉 Đã nhận thông báo từ PrescriptionForm:', location.state.message);
      
      // Reload prescriptions from backend to get the latest data
      loadPrescriptions();
      
      // Auto hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);

      // Clear the navigation state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Đang tải danh sách đơn thuốc...');
      console.log('👨‍⚕️ Doctor ID:', doctorId);
      
      let response;
      if (doctorId) {
        response = await prescriptionApi.getPrescriptionsByDoctor(doctorId);
      } else {
        // Fallback: get all prescriptions if no doctorId
        console.log('⚠️ No doctorId, trying to get all prescriptions...');
        response = await prescriptionApi.getAllPrescriptions();
      }
      console.log('✅ Đã tải danh sách đơn thuốc:', response.data);
      console.log('📊 Số lượng đơn thuốc:', response.data?.length || 0);
      console.log('📋 Chi tiết đơn thuốc đầu tiên:', response.data?.[0]);
      
      // Ensure response.data is an array
      const prescriptionsData = Array.isArray(response.data) ? response.data : [];
      
      // Map and normalize prescription data for frontend
      const normalizedPrescriptions = prescriptionsData.map(prescription => {
        // Debug: Log prescription items BEFORE mapping
        console.log('🔍 Raw prescription before mapping:', {
          prescriptionId: prescription.prescriptionId,
          hasItems: !!prescription.items,
          itemsLength: prescription.items?.length || 0,
          items: prescription.items
        });
        
        // Create normalized prescription with items preserved
        const normalized = {
          ...prescription,
          // Map items to prescriptionItems for compatibility (used in modal)
          prescriptionItems: prescription.items ? [...prescription.items] : [],
          // Ensure diagnosis is from notes if not available
          diagnosis: prescription.diagnosis || prescription.notes || '',
          // Keep original items array - make sure it's a COPY, not reference
          items: prescription.items ? [...prescription.items] : []
        };
        
        // Debug: Log after mapping
        console.log('✅ After mapping:', {
          prescriptionId: normalized.prescriptionId,
          hasItems: !!normalized.items,
          itemsLength: normalized.items?.length || 0,
          hasPrescriptionItems: !!normalized.prescriptionItems,
          prescriptionItemsLength: normalized.prescriptionItems?.length || 0
        });
        
        return normalized;
      });
      
      // Sort by prescription ID ascending (smallest to largest)
      const sortedPrescriptions = normalizedPrescriptions.sort((a, b) => {
        const idA = parseInt(a.prescriptionId || a.id || 0);
        const idB = parseInt(b.prescriptionId || b.id || 0);
        return idA - idB;
      });
      
      console.log('🔄 Sau khi sắp xếp:', sortedPrescriptions.length, 'đơn thuốc');
      if (sortedPrescriptions.length > 0) {
        const firstPrescription = sortedPrescriptions[0];
        console.log('🔍 First prescription after sorting:', {
          prescriptionId: firstPrescription.prescriptionId,
          hasItems: !!firstPrescription.items,
          itemsLength: firstPrescription.items?.length || 0,
          hasPrescriptionItems: !!firstPrescription.prescriptionItems,
          prescriptionItemsLength: firstPrescription.prescriptionItems?.length || 0,
          items: firstPrescription.items,
          prescriptionItems: firstPrescription.prescriptionItems,
          fullObject: firstPrescription
        });
      }
      setPrescriptions(sortedPrescriptions);
    } catch (error) {
      console.error('❌ Lỗi khi tải danh sách đơn thuốc từ backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Show error message instead of mock data
      if (error.response?.status === 404) {
        console.log('ℹ️ Không tìm thấy đơn thuốc nào');
        setPrescriptions([]);
      } else if (error.response?.status === 401) {
        console.error('🔒 Không có quyền truy cập đơn thuốc');
        setPrescriptions([]);
      } else {
        console.error('🔌 Không thể kết nối đến server backend');
        setPrescriptions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    if (!searchTerm.trim()) {
      return true; // Show all if search is empty
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Search by patient name
    const matchesPatientName = (prescription.patientName || '')
      .toLowerCase()
      .includes(searchLower);
    
    // Search by prescription ID (convert to string for comparison)
    const prescriptionIdStr = String(prescription.prescriptionId || prescription.id || '');
    const matchesPrescriptionId = prescriptionIdStr.includes(searchTerm.trim());
    
    // Search by diagnosis
    const matchesDiagnosis = (prescription.diagnosis || '')
      .toLowerCase()
      .includes(searchLower);
    
    return matchesPatientName || matchesPrescriptionId || matchesDiagnosis;
  });


  const handleViewPrescription = async (prescription) => {
    console.log('🔍 Viewing prescription:', {
      prescriptionId: prescription.prescriptionId,
      hasItems: !!prescription.items,
      itemsLength: prescription.items?.length || 0,
      hasPrescriptionItems: !!prescription.prescriptionItems,
      prescriptionItemsLength: prescription.prescriptionItems?.length || 0,
      items: prescription.items,
      prescriptionItems: prescription.prescriptionItems,
      totalAmount: prescription.totalAmount
    });
    
    // Set prescription immediately to show modal
    setSelectedPrescription(prescription);
    setShowModal(true);
    
    // If no items found, try to reload prescription details in background
    // Check if items array exists but is empty (length === 0) or doesn't exist
    const hasNoItems = (!prescription.items || prescription.items.length === 0) && 
                       (!prescription.prescriptionItems || prescription.prescriptionItems.length === 0);
    
    if (hasNoItems) {
      try {
        console.log('⚠️ No items found, reloading prescription details...');
        const response = await prescriptionApi.getPrescriptionById(prescription.prescriptionId);
        console.log('📦 API Response:', response);
        console.log('📦 Response data:', response.data);
        console.log('📦 Response items:', response.data?.items);
        console.log('📦 Response items length:', response.data?.items?.length);
        
        if (response.data) {
          // Normalize the response data to ensure items are properly set
          const reloadedPrescription = {
            ...response.data,
            items: response.data.items || [],
            prescriptionItems: response.data.items || [],
            totalAmount: response.data.totalAmount || 0
          };
          
          console.log('✅ Reloaded prescription:', reloadedPrescription);
          console.log('✅ Reloaded items:', reloadedPrescription.items);
          setSelectedPrescription(reloadedPrescription);
        }
      } catch (error) {
        console.error('❌ Error reloading prescription:', error);
        console.error('❌ Error details:', error.response?.data);
        // Keep showing original prescription even if reload fails
      }
    }
  };


  return (
    <Container fluid className="py-4">
      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
     

      {/* Success Message */}
      {showSuccessMessage && (
        <Row className="mb-4">
          <Col>
            <Alert variant="success" className="d-flex align-items-center" dismissible onClose={() => setShowSuccessMessage(false)}>
              <Pill className="me-2" size={20} />
              <div>
                <strong>Thành công!</strong> {location.state?.message || 'Đã kê đơn thuốc thành công!'}
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Modern Header */}
      <Row className="mb-4">
        <Col>
          <Card style={{border: 'none', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'}}>
            <Card.Body className="p-3 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg,#48bb78 0%,#3182ce 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <Pill size={26} color="white" />
                </div>
                <div>
                  <h4 style={{margin: 0, fontWeight: 700, color: '#1a202c'}}>Quản Lý Đơn Thuốc <Badge bg="primary" className="ms-2">{filteredPrescriptions.length}</Badge></h4>
                  <small style={{color: '#718096'}}>Danh sách đơn thuốc đã kê cho bệnh nhân{prescriptions.length > 0 ? ` • Tổng ${prescriptions.length} đơn thuốc` : ''}</small>
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => loadPrescriptions()}
                  disabled={loading}
                  title="Làm mới danh sách"
                  style={{height: 44, minWidth: 120, borderRadius: 12, padding: '0 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}
                >
                  <RefreshCw className={`me-1 ${loading ? 'spin' : ''}`} size={16} />
                  <span style={{fontSize: 14}}>{loading ? 'Đang tải...' : 'Làm mới'}</span>
                </Button>
                <Link to="/doctor/prescriptions/new" style={{textDecoration: 'none'}}>
                  <Button variant="success" style={{height: 44, minWidth: 160, borderRadius: 12, padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>
                    <Plus className="me-2" size={18} />
                    <span style={{fontSize: 15, fontWeight: 600}}>Kê Đơn Thuốc Mới</span>
                  </Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <Row className="mb-4">
        <Col md={8} lg={7}>
          <div className="position-relative">
            <Search className="position-absolute" size={18} style={{left: 14, top: 12, color: '#a0aec0'}} />
            <Form.Control
              type="text"
              placeholder="Tìm kiếm theo tên bệnh nhân, mã đơn thuốc, chẩn đoán..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{paddingLeft: 48, height: 48, borderRadius: 12, border: '2px solid #e2e8f0'}}
            />
          </div>
        </Col>
      </Row>

      {/* Prescriptions List */}
      <Row>
        <Col>
          <Card style={{borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
            <Card.Body>
              <h6 style={{marginBottom: 16, fontWeight: 600, color: '#1a202c'}}>Danh Sách Đơn Thuốc</h6>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" style={{width: 40, height: 40}}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Đang tải danh sách đơn thuốc...</p>
                </div>
              ) : filteredPrescriptions.length === 0 ? (
                <div style={{background: '#dff6fb', borderRadius: 10, padding: '36px', textAlign: 'center'}}>
                  <Pill size={56} style={{color: '#2b6cb0', marginBottom: 12}} />
                  <h5 style={{marginBottom: 6, color: '#1a202c'}}>Không có đơn thuốc nào</h5>
                  <p style={{margin: 0, color: '#4a5568'}}>Chưa có đơn thuốc nào phù hợp với tiêu chí tìm kiếm.</p>
                </div>
              ) : (
                <div>
                  {/* Keep table for now, but with subtle rounded container */}
                  <div style={{overflowX: 'auto'}}>
                    <Table responsive hover className="mb-0" style={{borderRadius: 8, overflow: 'hidden'}}>
                      <thead className="table-light">
                        <tr>
                          <th>Mã đơn</th>
                          <th>Bệnh nhân</th>
                          <th>Chẩn đoán</th>
                          <th>Tổng tiền</th>
                          <th>Ngày kê</th>
                          <th className="text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPrescriptions.map((prescription) => (
                          <tr key={prescription.prescriptionId || prescription.id}>
                            <td className="fw-bold text-primary">{prescription.prescriptionId || prescription.id}</td>
                            <td>
                              <div>
                                <strong>{prescription.patientName}</strong>
                                <br />
                                <small className="text-muted">ID: {prescription.patientId}</small>
                              </div>
                            </td>
                            <td style={{maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{prescription.diagnosis}</td>
                            <td className="fw-bold text-success">{prescription.totalAmount?.toLocaleString('vi-VN')} ₫</td>
                            <td>
                              <Calendar size={14} className="me-1" />
                              {prescription.createdDate || prescription.createdAt ? new Date(prescription.createdDate || prescription.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                            </td>
                            <td className="text-center">
                              <Button variant="outline-primary" size="sm" onClick={() => handleViewPrescription(prescription)} title="Xem chi tiết">
                                <Eye size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Prescription Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Pill className="me-2" size={24} />
            Chi Tiết Đơn Thuốc
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPrescription && (
            <>
              {/* Prescription Info */}
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Thông tin đơn thuốc</h6>
                  <p><strong>Mã đơn:</strong> {selectedPrescription.prescriptionId}</p>
                  <p><strong>Ngày kê:</strong> {new Date(selectedPrescription.createdDate).toLocaleDateString('vi-VN')}</p>
                </Col>
                <Col md={6}>
                  <h6>Thông tin bệnh nhân</h6>
                  <p><strong>Tên:</strong> {selectedPrescription.patientName}</p>
                  <p><strong>Mã BN:</strong> {selectedPrescription.patientId}</p>
                  <p><strong>Chẩn đoán:</strong> {selectedPrescription.diagnosis || selectedPrescription.notes || 'Chưa có chẩn đoán'}</p>
                </Col>
              </Row>

              {/* Prescription Items */}
              <h6>Danh sách thuốc</h6>
              <Table striped bordered size="sm">
                <thead>
                  <tr>
                    <th>Tên thuốc</th>
                    <th>SL</th>
                    <th>Liều dùng</th>
                    <th>Thời gian</th>
                    <th>Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Check both items and prescriptionItems, prefer non-empty array
                    const itemsFromItems = selectedPrescription.items && selectedPrescription.items.length > 0 
                      ? selectedPrescription.items 
                      : null;
                    const itemsFromPrescriptionItems = selectedPrescription.prescriptionItems && selectedPrescription.prescriptionItems.length > 0
                      ? selectedPrescription.prescriptionItems
                      : null;
                    
                    const items = itemsFromItems || itemsFromPrescriptionItems || [];
                    
                    console.log('🔍 Rendering prescription items in modal:', {
                      selectedPrescription: selectedPrescription,
                      hasItems: !!selectedPrescription.items,
                      itemsLength: selectedPrescription.items?.length || 0,
                      hasPrescriptionItems: !!selectedPrescription.prescriptionItems,
                      prescriptionItemsLength: selectedPrescription.prescriptionItems?.length || 0,
                      itemsArray: selectedPrescription.items,
                      prescriptionItemsArray: selectedPrescription.prescriptionItems,
                      finalItemsLength: items.length,
                      finalItems: items
                    });
                    
                    if (items.length === 0) {
                      return (
                        <tr>
                          <td colSpan="5" className="text-center text-muted py-3">
                            <div>
                              <Pill size={48} className="mb-2" style={{opacity: 0.3}} />
                              <p className="mb-0">Không có thuốc nào được kê trong đơn này</p>
                              <small className="text-muted">Đơn thuốc này có thể đã được tạo mà chưa có thuốc được kê</small>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    
                    return items.map((item, index) => (
                      <tr key={index}>
                        <td><strong>{item.medicineName || `Thuốc ${index + 1}`}</strong></td>
                        <td>{item.quantity || 1}</td>
                        <td>{item.dosage || 'N/A'}</td>
                        <td>{item.duration || 'N/A'}</td>
                        <td className="text-success fw-bold">
                          {(item.price || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="4" className="text-end">Tổng cộng:</th>
                    <th className="text-success">
                      {selectedPrescription.totalAmount?.toLocaleString('vi-VN')} ₫
                    </th>
                  </tr>
                </tfoot>
              </Table>
            </>
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

export default DoctorPrescriptions;