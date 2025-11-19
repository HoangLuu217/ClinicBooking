import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Card, Row, Col, Badge } from 'react-bootstrap';
import { BiEdit, BiTrash, BiPlus, BiSearch, BiRefresh, BiBuilding, BiUserCheck, BiUserX, BiStats } from 'react-icons/bi';
import departmentApi from '../../api/departmentApi';
import { toast } from '../../utils/toast';

const DepartmentsManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    departmentName: '',
    description: '',
    imageUrl: '',
    status: 'ACTIVE'
  });

  // Image upload states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả trạng thái');
  // Applied filters (only change when user presses "Tìm")
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('Tất cả trạng thái');
  // Sort option: NAME_ASC | NAME_DESC | ID_ASC | ID_DESC
  const [sortOption, setSortOption] = useState('NAME_ASC');

  
  useEffect(() => {
    // Move toast to bottom-right to avoid covering header
    if (typeof toast?.setPosition === 'function') {
      toast.setPosition('bottom-right');
    }
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentApi.getAllDepartmentsList();
      // API trả về Page object, cần lấy content
      setDepartments(response.data?.content || []);
      console.log('✅ Loaded departments successfully');
    } catch (err) {
      const errorMsg = 'Lỗi khi tải danh sách khoa: ' + err.message;
      setError(errorMsg);
      toast.error('❌ ' + errorMsg);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const getDepartmentStats = () => {
    const total = departments.length;
    const active = departments.filter(d => d.status === 'ACTIVE').length;
    const maintenance = departments.filter(d => d.status === 'INACTIVE' || d.status === 'MAINTENANCE').length;
    const closed = departments.filter(d => d.status === 'CLOSED').length;

    return { total, active, maintenance, closed };
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'MAINTENANCE': return 'warning';
      case 'CLOSED': return 'danger';
      default: return 'secondary';
    }
  };

  // Get status display text
  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động';
      case 'INACTIVE': return 'Bảo trì';
      case 'MAINTENANCE': return 'Bảo trì';
      case 'CLOSED': return 'Đóng cửa';
      default: return 'Không xác định';
    }
  };

  // Normalize Vietnamese for search
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, '');
  };
  const collator = new Intl.Collator('vi', { sensitivity: 'base' });

  // Filter departments (use applied values only)
  const getFilteredDepartments = () => {
    let filtered = departments;

    // Filter by search term
    if (appliedSearchTerm) {
      const q = normalizeText(appliedSearchTerm);
      filtered = filtered.filter(d => {
        const name = normalizeText(d.departmentName);
        const desc = normalizeText(d.description);
        return name.includes(q) || desc.includes(q);
      });
    }

    // Filter by status
    if (appliedStatus !== 'Tất cả trạng thái') {
      let statusValue;
      switch (appliedStatus) {
        case 'Hoạt động': statusValue = 'ACTIVE'; break;
        case 'Bảo trì': statusValue = 'INACTIVE'; break;
        case 'Đóng cửa': statusValue = 'CLOSED'; break;
        default: statusValue = appliedStatus;
      }
      filtered = filtered.filter(d => d.status === statusValue);
    }

    // Sort
    const copy = [...filtered];
    switch (sortOption) {
      case 'NAME_DESC':
        copy.sort((a, b) => collator.compare(b.departmentName || '', a.departmentName || ''));
        break;
      case 'ID_ASC':
        copy.sort((a, b) => (a.id ?? a.departmentId ?? 0) - (b.id ?? b.departmentId ?? 0));
        break;
      case 'ID_DESC':
        copy.sort((a, b) => (b.id ?? b.departmentId ?? 0) - (a.id ?? a.departmentId ?? 0));
        break;
      case 'NAME_ASC':
      default:
        copy.sort((a, b) => collator.compare(a.departmentName || '', b.departmentName || ''));
        break;
    }

    return copy;
  };

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8080/api/files/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setFormData(prev => ({ ...prev, imageUrl: result.url }));
        return result.url;
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Lỗi khi upload ảnh: ' + err.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadImageWithDepartmentId = async (departmentId, file, departmentName) => {
    try {
      setUploadingImage(true);
      
      // Tạo tên file mới từ tên khoa
      const sanitizedDepartmentName = departmentName
        .toLowerCase()
        .normalize('NFD') // Chuẩn hóa Unicode
        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu thanh
        .replace(/đ/g, 'd') // Thay thế đ thành d
        .replace(/[^a-z0-9\s-]/g, '') // Loại bỏ ký tự đặc biệt nhưng giữ dấu gạch ngang
        .replace(/\s+/g, '_') // Thay thế khoảng trắng bằng underscore
        .replace(/-/g, '_') // Thay thế dấu gạch ngang bằng underscore
        .replace(/_+/g, '_') // Thay thế nhiều dấu gạch dưới liên tiếp bằng một dấu
        .replace(/^_|_$/g, '') // Loại bỏ dấu gạch dưới ở đầu và cuối
        .trim();
      
      // Lấy extension của file gốc
      const fileExtension = file.name.split('.').pop();
      
      // Tạo file mới với tên đã đổi
      const renamedFile = new File([file], `${sanitizedDepartmentName}.${fileExtension}`, {
        type: file.type,
        lastModified: file.lastModified
      });
      
      console.log('=== FILE RENAMING DEBUG ===');
      console.log('Original department name:', departmentName);
      console.log('Sanitized name:', sanitizedDepartmentName);
      console.log('Original filename:', file.name);
      console.log('New filename:', renamedFile.name);
      console.log('File extension:', fileExtension);
      
      const formData = new FormData();
      formData.append('file', renamedFile);
      formData.append('departmentId', departmentId.toString());
      
      console.log('uploadImageWithDepartmentId - departmentId:', departmentId);
      console.log('Original filename:', file.name);
      console.log('Renamed filename:', renamedFile.name);
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      const response = await fetch(`http://localhost:8080/api/departments/${departmentId}/upload-image`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.imageUrl;
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      throw new Error('Lỗi khi upload ảnh: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Create department first to get ID
      const departmentData = {
        departmentName: formData.departmentName,
        description: formData.description,
        imageUrl: '', // Will be updated after upload
        status: formData.status
      };
      
      console.log('=== CREATING DEPARTMENT ===');
      console.log('Department data:', departmentData);
      console.log('Status from form:', formData.status);
      
      const createdDepartment = await departmentApi.createDepartment(departmentData);
      const departmentId = createdDepartment.data.id;
      
      // Upload image with department ID if selected
      if (selectedImage) {
        try {
          const imageUrl = await uploadImageWithDepartmentId(departmentId, selectedImage, formData.departmentName);
          if (imageUrl) {
            // Update department with image URL
            await departmentApi.updateDepartment(departmentId, {
              departmentName: formData.departmentName,
              description: formData.description,
              imageUrl: imageUrl,
              status: formData.status
            });
          }
        } catch (imageErr) {
          console.error('Error uploading image:', imageErr);
          // Department is already created, just show warning
          const warningMsg = 'Khoa đã được tạo nhưng có lỗi khi upload ảnh: ' + imageErr.message;
          setError(warningMsg);
          toast.warning('⚠️ ' + warningMsg);
        }
      }
      
      setSuccess('Tạo khoa thành công!');
      toast.success('✅ Tạo khoa thành công!');
      setShowCreateModal(false);
      resetForm();
      fetchDepartments();
    } catch (err) {
      const errorMsg = 'Lỗi khi tạo khoa: ' + (err.response?.data?.message || err.message);
      setError(errorMsg);
      toast.error('❌ ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Upload image first if selected using department-specific endpoint
      let imageUrl = formData.imageUrl;
      if (selectedImage) {
        try {
          imageUrl = await uploadImageWithDepartmentId(selectedDepartment.id, selectedImage, formData.departmentName);
          console.log('Upload successful, new imageUrl:', imageUrl);
        } catch (imageErr) {
          const errorMsg = 'Lỗi khi upload ảnh: ' + imageErr.message;
          setError(errorMsg);
          toast.error('❌ ' + errorMsg);
          return;
        }
      }
      
      const departmentData = {
        departmentName: formData.departmentName,
        description: formData.description,
        imageUrl: imageUrl,
        status: formData.status
      };
      
      console.log('Updating department with data:', departmentData);
      await departmentApi.updateDepartment(selectedDepartment.id, departmentData);
      setSuccess('Cập nhật thông tin khoa thành công!');
      toast.success('✅ Cập nhật thông tin khoa thành công!');
      setShowEditModal(false);
      resetForm();
      fetchDepartments();
    } catch (err) {
      const errorMsg = 'Lỗi khi cập nhật khoa: ' + (err.response?.data?.message || err.message);
      setError(errorMsg);
      toast.error('❌ ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      setLoading(true);
      await departmentApi.deleteDepartment(selectedDepartment.id);
      setSuccess('Xóa khoa thành công!');
      toast.success('✅ Xóa khoa thành công!');
      setShowDeleteModal(false);
      fetchDepartments();
    } catch (err) {
      const errorMsg = 'Lỗi khi xóa khoa: ' + (err.response?.data?.message || err.message);
      setError(errorMsg);
      toast.error('❌ ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      departmentName: '',
      description: '',
      imageUrl: '',
      status: 'ACTIVE'
    });
    setSelectedDepartment(null);
    setSelectedImage(null);
    setImagePreview(null);
    toast.info('🔄 Đã reset form');
  };

  const openEditModal = (department) => {
    setSelectedDepartment(department);
    setFormData({
      departmentName: department.departmentName || '',
      description: department.description || '',
      imageUrl: department.imageUrl || '',
      status: department.status || 'ACTIVE'
    });
    setSelectedImage(null);
    setImagePreview(department.imageUrl || null);
    setShowEditModal(true);
    toast.info(`📝 Đang chỉnh sửa khoa: ${department.departmentName}`);
  };

  const openDeleteModal = (department) => {
    setSelectedDepartment(department);
    setShowDeleteModal(true);
    toast.warning(`⚠️ Bạn có chắc chắn muốn xóa khoa "${department.departmentName}"?`);
  };

  const handleRefresh = async () => {
    try {
      await fetchDepartments();
      toast.info('🔄 Đã làm mới danh sách khoa');
    } catch (err) {
      toast.error('❌ Lỗi khi làm mới danh sách');
    }
  };

  const handleSearch = () => {
    // Apply filters only when clicking "Tìm"
    setAppliedSearchTerm(searchTerm.trim());
    setAppliedStatus(selectedStatus);
  };

  const stats = getDepartmentStats();
  const filteredDepartments = getFilteredDepartments();

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Quản lý Khoa</h2>
      </div>

      {/* Inline alerts removed in favor of toast notifications */}

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="text-center h-100">
            <Card.Body className="py-3">
              <BiBuilding className="text-primary mb-2" style={{ fontSize: '24px' }} />
              <h6 className="mb-1">Tổng số</h6>
              <h4 className="mb-0 text-primary">{stats.total} / {stats.total}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100">
            <Card.Body className="py-3">
              <BiStats className="text-success mb-2" style={{ fontSize: '24px' }} />
              <h6 className="mb-1">Hoạt động</h6>
              <h4 className="mb-0 text-success">{stats.active} / {stats.total}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100">
            <Card.Body className="py-3">
              <BiUserCheck className="text-warning mb-2" style={{ fontSize: '24px' }} />
              <h6 className="mb-1">Bảo trì</h6>
              <h4 className="mb-0 text-warning">{stats.maintenance}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center h-100">
            <Card.Body className="py-3">
              <BiUserX className="text-danger mb-2" style={{ fontSize: '24px' }} />
              <h6 className="mb-1">Đóng cửa</h6>
              <h4 className="mb-0 text-danger">{stats.closed}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search and Filter + Actions Row */}
      <Row className="mb-3 align-items-center">
        <Col md={4}>
          <div className="input-group">
            <span className="input-group-text">
              <BiSearch />
            </span>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm theo tên hoặc mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              variant="outline-secondary" 
              onClick={handleSearch}
              disabled={loading}
            >
              Tìm
            </Button>
          </div>
        </Col>
        <Col md={2}>
          <Form.Select
            style={{ minWidth: '160px' }}
            value={selectedStatus}
            onChange={(e) => {
              const value = e.target.value;
              // Update both local and applied state so filtering happens immediately
              setSelectedStatus(value);
              setAppliedStatus(value);
              // Toast when user changes filter by status
              if (value === 'Tất cả trạng thái') {
                toast.info('🔄 Hiển thị tất cả trạng thái');
              } else {
                toast.info(`🔎 Lọc theo trạng thái: ${value}`);
              }
            }}
          >
            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
            <option value="Hoạt động">Hoạt động</option>
            <option value="Bảo trì">Bảo trì</option>
            <option value="Đóng cửa">Đóng cửa</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            style={{ minWidth: '220px' }}
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="NAME_ASC">Sắp xếp: Tên A → Z</option>
            <option value="NAME_DESC">Sắp xếp: Tên Z → A</option>
            <option value="ID_ASC">Sắp xếp: ID tăng dần</option>
            <option value="ID_DESC">Sắp xếp: ID giảm dần</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <div className="d-flex justify-content-end gap-2">
            <Button 
              variant="outline-secondary" 
              onClick={handleRefresh}
              className="d-flex align-items-center gap-2"
              style={{ height: '40px' }}
              disabled={loading}
            >
              <BiRefresh /> Làm mới
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                setShowCreateModal(true);
                toast.info('📝 Đang tạo khoa mới');
              }}
              className="d-flex align-items-center gap-2"
              style={{ height: '40px' }}
            >
              <BiPlus /> Thêm Khoa
            </Button>
          </div>
        </Col>
      </Row>

      {/* Departments Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Ảnh</th>
              <th>Tên khoa</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center">Đang tải...</td>
              </tr>
            ) : filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">Không có khoa nào</td>
              </tr>
            ) : (
              filteredDepartments.map(department => (
                <tr key={department.id}>
                  <td>{department.id}</td>
                  <td>
                    {department.imageUrl && department.imageUrl.trim() !== '' ? (
                      <img 
                        src={`http://localhost:8080${department.imageUrl.startsWith('/') ? department.imageUrl : '/' + department.imageUrl}`} 
                        alt={department.departmentName}
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          objectFit: 'cover',
                          borderRadius: '4px',
                          display: 'block'
                        }}
                        onError={(e) => {
                          // Hide image and show placeholder
                          const img = e.target;
                          const placeholder = img.nextElementSibling;
                          if (img) img.style.display = 'none';
                          if (placeholder) placeholder.style.display = 'flex';
                          console.error('Failed to load image:', department.imageUrl);
                        }}
                      />
                    ) : null}
                    <div 
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        display: (department.imageUrl && department.imageUrl.trim() !== '') ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6c757d',
                        fontSize: '12px',
                        border: '1px solid #dee2e6'
                      }}
                    >
                      No Image
                    </div>
                  </td>
                  <td>{department.departmentName}</td>
                  <td>{department.description || '-'}</td>
                  <td>
                    <Badge bg={getStatusBadgeColor(department.status)}>
                      {getStatusDisplayText(department.status)}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openEditModal(department)}
                      >
                        <BiEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => openDeleteModal(department)}
                      >
                        <BiTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Create Department Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered dialogClassName="modal-sm-custom">
        <Modal.Header closeButton style={{ padding: '10px 16px' }}>
          <Modal.Title style={{ fontSize: '1.08rem' }}>Thêm Khoa Mới</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateDepartment}>
          <Modal.Body style={{ maxHeight: '38vh', minHeight: 'auto', overflowY: 'auto', padding: '12px 16px' }}>
            <Form.Group className="mb-2">
              <Form.Label style={{ fontSize: '0.97rem' }}>Tên khoa</Form.Label>
              <Form.Control
                type="text"
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                required
                placeholder="Nhập tên khoa"
                style={{ fontSize: '0.97rem', padding: '6px 10px' }}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label style={{ fontSize: '0.97rem' }}>Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả khoa"
                style={{ fontSize: '0.97rem', padding: '6px 10px' }}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label style={{ fontSize: '0.97rem' }}>Trạng thái</Form.Label>
              <Form.Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                style={{ fontSize: '0.97rem', padding: '6px 10px' }}
              >
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Bảo trì</option>
                <option value="CLOSED">Đóng cửa</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label style={{ fontSize: '0.97rem' }}>Ảnh khoa</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mb-1"
                style={{ fontSize: '0.97rem', padding: '4px 8px' }}
              />
              {imagePreview && (
                <div className="mt-1">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '90px',
                      height: '90px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid #ddd'
                    }}
                  />
                </div>
              )}
              {uploadingImage && (
                <div className="text-muted small mt-1">
                  Đang upload ảnh...
                </div>
              )}
              {/* Inline image upload notification */}
              {error && error.includes('upload ảnh') && (
                <div className="alert alert-danger py-1 px-2 mt-2 mb-0" style={{ fontSize: '0.97rem' }}>
                  {error}
                </div>
              )}
              {success && success.includes('ảnh') && (
                <div className="alert alert-success py-1 px-2 mt-2 mb-0" style={{ fontSize: '0.97rem' }}>
                  {success}
                </div>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer style={{ padding: '8px 16px' }}>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} style={{ fontSize: '0.97rem', padding: '4px 16px' }}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={loading} style={{ fontSize: '0.97rem', padding: '4px 16px' }}>
              {loading ? 'Đang tạo...' : 'Tạo Khoa'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Custom modal size for add department */}
      <style>{`
        .modal-sm-custom .modal-dialog {
          max-width: 370px;
        }
        @media (max-width: 500px) {
          .modal-sm-custom .modal-dialog {
            max-width: 98vw;
          }
        }
      `}</style>

      {/* Edit Department Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered dialogClassName="modal-sm-custom">
        <Modal.Header closeButton style={{ padding: '10px 16px' }}>
          <Modal.Title style={{ fontSize: '1.08rem' }}>Chỉnh sửa Thông tin Khoa</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditDepartment}>
          <Modal.Body style={{ maxHeight: '38vh', minHeight: 'auto', overflowY: 'auto', padding: '12px 16px' }}>
            <Form.Group className="mb-2">
              <Form.Label style={{ fontSize: '0.97rem' }}>Tên khoa</Form.Label>
              <Form.Control
                type="text"
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                required
                placeholder="Nhập tên khoa"
                style={{ fontSize: '0.97rem', padding: '6px 10px' }}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label style={{ fontSize: '0.97rem' }}>Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả khoa"
                style={{ fontSize: '0.97rem', padding: '6px 10px' }}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label style={{ fontSize: '0.97rem' }}>Trạng thái</Form.Label>
              <Form.Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                style={{ fontSize: '0.97rem', padding: '6px 10px' }}
              >
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Bảo trì</option>
                <option value="CLOSED">Đóng cửa</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label style={{ fontSize: '0.97rem' }}>Ảnh khoa</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mb-1"
                style={{ fontSize: '0.97rem', padding: '4px 8px' }}
              />
              {imagePreview && (
                <div className="mt-1">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '90px',
                      height: '90px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid #ddd'
                    }}
                  />
                </div>
              )}
              {uploadingImage && (
                <div className="text-muted small mt-1">
                  Đang upload ảnh...
                </div>
              )}
              {/* Inline image upload notification */}
              {error && error.includes('upload ảnh') && (
                <div className="alert alert-danger py-1 px-2 mt-2 mb-0" style={{ fontSize: '0.97rem' }}>
                  {error}
                </div>
              )}
              {success && success.includes('ảnh') && (
                <div className="alert alert-success py-1 px-2 mt-2 mb-0" style={{ fontSize: '0.97rem' }}>
                  {success}
                </div>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer style={{ padding: '8px 16px' }}>
            <Button variant="secondary" onClick={() => setShowEditModal(false)} style={{ fontSize: '0.97rem', padding: '4px 16px' }}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={loading} style={{ fontSize: '0.97rem', padding: '4px 16px' }}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận xóa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn có chắc chắn muốn xóa khoa <strong>{selectedDepartment?.departmentName}</strong>?
          <br />
          <small className="text-muted">Hành động này không thể hoàn tác.</small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDeleteDepartment} disabled={loading}>
            {loading ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DepartmentsManagement;



