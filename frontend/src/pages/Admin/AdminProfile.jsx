import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Alert, Badge, Modal, Spinner } from 'react-bootstrap';
import { BiEdit, BiSave, BiX, BiUser, BiEnvelope, BiPhone, BiCalendar, BiMapPin, BiImage } from 'react-icons/bi';
import userApi from '../../api/userApi';
import fileUploadApi from '../../api/fileUploadApi';
import { getFullAvatarUrl } from '../../utils/avatarUtils';

// Utility functions
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
    ? age - 1 
    : age;
};

const validateAdminProfile = (formData) => {
  const requiredFields = [
    { field: 'email', message: 'Email là bắt buộc' },
    { field: 'firstName', message: 'Tên là bắt buộc' },
    { field: 'lastName', message: 'Họ là bắt buộc' },
    { field: 'phone', message: 'Số điện thoại là bắt buộc' },
    { field: 'gender', message: 'Giới tính là bắt buộc' },
    { field: 'dateOfBirth', message: 'Ngày sinh là bắt buộc' },
    { field: 'address', message: 'Địa chỉ là bắt buộc' }
  ];

  for (const { field, message } of requiredFields) {
    if (!formData[field] || !formData[field].toString().trim()) {
      return message;
    }
  }

  // Validation số điện thoại (10-11 số)
  const phoneRegex = /^[0-9]{10,11}$/;
  if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
    return 'Số điện thoại phải có từ 10-11 chữ số';
  }

  // Validation tuổi cho admin (phải từ 18 tuổi trở lên)
  const age = calculateAge(formData.dateOfBirth);
  if (age < 18) {
    return 'Admin phải từ 18 tuổi trở lên';
  }

  return null; // No error
};

const AdminProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    avatarUrl: ''
  });

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user info from localStorage
      const currentUser = JSON.parse(localStorage.getItem('user'));
      
      if (!currentUser) {
        setError('Không tìm thấy thông tin người dùng trong localStorage');
        return;
      }

      // Fetch user info from API
      const response = await userApi.getUserById(currentUser.id);
      
      if (response.data) {
        setUser(response.data);
        setFormData({
          email: response.data.email || '',
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          phone: response.data.phone || '',
          gender: response.data.gender || '',
          dateOfBirth: response.data.dateOfBirth || '',
          address: response.data.address || '',
          avatarUrl: response.data.avatarUrl || ''
        });
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      setError('Không thể tải thông tin cá nhân: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Validation
      const validationError = validateAdminProfile(formData);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      const updateData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        avatarUrl: formData.avatarUrl
      };

      await userApi.updateUser(user.id, updateData);
      
      setSuccess('Cập nhật thông tin thành công!');
      setEditing(false);
      
      // Update localStorage with new data
      const updatedUser = { ...user, ...updateData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('userChanged'));
      
      fetchAdminProfile(); // Refresh data
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Lỗi khi cập nhật thông tin: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Chỉ cho phép file ảnh (JPEG, PNG, GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 5MB');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');

  // Gọi upload thống nhất
  const response = await fileUploadApi.upload(file, null, 'user');
      console.log('[Upload] raw response:', response);

      // Chuẩn hóa lấy url
  const data = response?.data;
      const url =
        data?.url ||
        data?.fileUrl ||
        data?.path ||
        data?.avatarUrl ||
        data?.data?.url ||
        data?.data?.fileUrl;

      if (!url) {
        setError('Phản hồi upload không chứa trường url hợp lệ.');
        return;
      }

      setFormData(prev => ({ ...prev, avatarUrl: url }));
      setSuccess('Upload ảnh thành công!');
      // Reset input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Lỗi khi upload ảnh: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setSuccess('');
    // Reset form data to original user data
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth || '',
        address: user.address || '',
        avatarUrl: user.avatarUrl || ''
      });
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4 className="mb-0">
                <BiUser className="me-2" />
                Thông tin cá nhân
              </h4>
              {!editing && (
                <Button 
                  variant="primary" 
                  onClick={() => setEditing(true)}
                  className="d-flex align-items-center"
                >
                  <BiEdit className="me-1" />
                  Chỉnh sửa
                </Button>
              )}
            </Card.Header>
            
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Row>
                {/* Avatar Section */}
                <Col md={3} className="text-center">
                  <div className="position-relative d-inline-block">
                    <div 
                      className="rounded-circle overflow-hidden mb-3"
                      style={{ width: '150px', height: '150px', cursor: editing ? 'pointer' : 'default' }}
                      onClick={editing ? () => setShowAvatarModal(true) : undefined}
                    >
                      {formData.avatarUrl ? (
                        <img
                          src={getFullAvatarUrl(formData.avatarUrl)}
                          alt="Avatar"
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = '/images/default-doctor.png'; }}
                        />
                      ) : (
                        <div className="w-100 h-100 bg-primary d-flex align-items-center justify-content-center">
                          <BiUser size={60} className="text-white" />
                        </div>
                      )}
                    </div>
                    {editing && (
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => setShowAvatarModal(true)}
                        className="position-absolute bottom-0 end-0"
                      >
                        <BiImage />
                      </Button>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <h5 className="mb-1">{formData.firstName} {formData.lastName}</h5>
                    <Badge bg="success">Admin</Badge>
                  </div>
                </Col>

                {/* Profile Information */}
                <Col md={9}>
                  <Form>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <BiEnvelope className="me-1" />
                            Email *
                          </Form.Label>
                          <Form.Control
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            disabled={!editing}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <BiPhone className="me-1" />
                            Số điện thoại
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            disabled={!editing}
                            placeholder="Nhập số điện thoại"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Họ *</Form.Label>
                          <Form.Control
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            disabled={!editing}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Tên *</Form.Label>
                          <Form.Control
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            disabled={!editing}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Giới tính</Form.Label>
                          <Form.Select
                            value={formData.gender}
                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                            disabled={!editing}
                          >
                            <option value="">Chọn giới tính</option>
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            <BiCalendar className="me-1" />
                            Ngày sinh
                          </Form.Label>
                          <Form.Control
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                            disabled={!editing}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>
                        <BiMapPin className="me-1" />
                        Địa chỉ
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        disabled={!editing}
                        placeholder="Nhập địa chỉ"
                      />
                    </Form.Group>

                    {editing && (
                      <div className="d-flex gap-2">
                        <Button 
                          variant="success" 
                          onClick={handleSave}
                          disabled={saving}
                          className="d-flex align-items-center"
                        >
                          {saving ? (
                            <>
                              <Spinner size="sm" className="me-1" />
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <BiSave className="me-1" />
                              Lưu thay đổi
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={handleCancel}
                          className="d-flex align-items-center"
                        >
                          <BiX className="me-1" />
                          Hủy
                        </Button>
                      </div>
                    )}
                  </Form>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      <Modal show={showAvatarModal} onHide={() => setShowAvatarModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Thay đổi ảnh đại diện</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Chọn ảnh mới</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading && (
              <div className="mt-2">
                <Spinner size="sm" className="me-2" />
                <small>Đang upload...</small>
              </div>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAvatarModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminProfile;
