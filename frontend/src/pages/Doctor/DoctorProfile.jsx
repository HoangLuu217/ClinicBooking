import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Alert, Badge, Modal, Spinner } from 'react-bootstrap';
import { BiEdit, BiSave, BiX, BiUser, BiEnvelope, BiPhone, BiCalendar, BiMapPin, BiBriefcase, BiStar, BiImage, BiBuilding } from 'react-icons/bi';
import doctorApi from '../../api/doctorApi';
import userApi from '../../api/userApi';
import fileUploadApi from '../../api/fileUploadApi';
import departmentApi from '../../api/departmentApi';
import reviewApi from '../../api/reviewApi';
import { getFullAvatarUrl } from '../../utils/avatarUtils';

const DoctorProfile = () => {
  const [doctor, setDoctor] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    avatarUrl: '',
    bio: '',
    specialty: '',
    departmentId: null
  });

  useEffect(() => {
    fetchDoctorProfile();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAllDepartmentsList();
      setDepartments(response.data.content || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      // Get current user info from localStorage or context
      const currentUser = JSON.parse(localStorage.getItem('user'));
      
      // 🔍 DEBUG: Log current user
      console.log('=== DOCTOR PROFILE DEBUG ===');
      console.log('Current user from localStorage:', currentUser);
      console.log('=============================');
      
      if (!currentUser) {
        setError('Không tìm thấy thông tin người dùng trong localStorage');
        return;
      }

      // 🔍 DEBUG: Check if user has doctor role
      if (currentUser.role?.name !== 'Doctor') {
        setError('Tài khoản này không phải là bác sĩ');
        return;
      }

      // Fetch doctor and user info in parallel (faster!)
      console.log('Fetching doctor and user info for user ID:', currentUser.id);
      
      const [doctorResponse, userResponse] = await Promise.all([
        doctorApi.getDoctorByUserId(currentUser.id),
        userApi.getUserById(currentUser.id),
      ]);
      
      console.log('Doctor response:', doctorResponse.data);
      console.log('User response:', userResponse.data);
      
      const doctorData = doctorResponse.data;
      const userData = userResponse.data;
      
      setDoctor(doctorData);
      setUser(userData);

      // Load rating stats
      try {
        const [avg, count] = await Promise.all([
          reviewApi.getAverageRatingByDoctor(doctorData.doctorId || doctorData.id),
          reviewApi.getReviewCountByDoctor(doctorData.doctorId || doctorData.id),
        ]);
        setAvgRating(Number(avg) || 0);
        setReviewCount(Number(count) || 0);
      } catch (_) {
        setAvgRating(0);
        setReviewCount(0);
      }

      // Set form data
      setFormData({
        email: userData.email || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || '',
        gender: userData.gender || '',
        dateOfBirth: userData.dateOfBirth || '',
        address: userData.address || '',
        avatarUrl: userData.avatarUrl || '',
        bio: doctorData.bio || '',
        specialty: doctorData.specialty || '',
        departmentId: doctorData.department?.id || null
      });

    } catch (err) {
      console.error('Error fetching doctor profile:', err);
      setError('Lỗi khi tải thông tin hồ sơ: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Chỉ cho phép file ảnh (JPEG, PNG, GIF)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    setUploading(true);
    try {
  const response = await fileUploadApi.upload(file, user?.id, 'user');
      
      if (response.data.success) {
        const newAvatarUrl = response.data.url;
        setFormData(prev => ({
          ...prev,
          avatarUrl: newAvatarUrl
        }));
        setSuccess('Upload ảnh đại diện thành công!');
      } else {
        setError('Lỗi: ' + response.data.message);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Lỗi khi upload ảnh: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Update user info
      const userData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        avatarUrl: formData.avatarUrl
      };

      await userApi.updateUser(user.id, userData);

      // Update doctor info
      const doctorData = {
        bio: formData.bio,
        specialty: formData.specialty,
        departmentId: formData.departmentId
      };

      await doctorApi.updateDoctorWithUser(doctor.doctorId, doctorData);

      setSuccess('Cập nhật hồ sơ thành công!');
      setEditing(false);
      fetchDoctorProfile(); // Refresh data
      
      // Refresh parent layout if needed
      window.dispatchEvent(new CustomEvent('doctorProfileUpdated'));
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Lỗi khi cập nhật hồ sơ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form data to original values
    if (user && doctor) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth || '',
        address: user.address || '',
        avatarUrl: user.avatarUrl || '',
        bio: doctor.bio || '',
        specialty: doctor.specialty || '',
        departmentId: doctor.department?.id || null
      });
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <Spinner animation="border" role="status" />
                <p className="mt-3">Đang tải thông tin hồ sơ...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor || !user) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: "4rem" }}></i>
                <h4 className="mt-3">Không tìm thấy thông tin hồ sơ</h4>
                <p className="text-muted">Vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2><BiUser className="me-2" />Hồ sơ cá nhân</h2>
            {!editing ? (
              <Button variant="primary" onClick={() => setEditing(true)}>
                <BiEdit className="me-2" />Chỉnh sửa
              </Button>
            ) : (
              <div>
                <Button variant="success" onClick={handleSave} disabled={saving} className="me-2">
                  {saving ? <Spinner size="sm" className="me-2" /> : <BiSave className="me-2" />}
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
                <Button variant="secondary" onClick={handleCancel}>
                  <BiX className="me-2" />Hủy
                </Button>
              </div>
            )}
          </div>

          {/* Alert Messages */}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Row>
            {/* Avatar Section */}
            <Col md={4}>
              <Card className="mb-4">
                <Card.Body className="text-center">
                  <div className="position-relative d-inline-block">
                    {formData.avatarUrl ? (
                      <img
                        src={getFullAvatarUrl(formData.avatarUrl)}
                        alt="Avatar"
                        style={{
                          width: '150px',
                          height: '150px',
                          objectFit: 'cover',
                          borderRadius: '50%',
                          border: '4px solid #dee2e6'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '150px',
                          height: '150px',
                          borderRadius: '50%',
                          backgroundColor: '#6c757d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '48px',
                          border: '4px solid #dee2e6'
                        }}
                      >
                        <BiUser />
                      </div>
                    )}
                    {editing && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="position-absolute bottom-0 end-0"
                        onClick={() => setShowAvatarModal(true)}
                        style={{ borderRadius: '50%' }}
                        title="Thay đổi ảnh đại diện"
                      >
                        <BiImage />
                      </Button>
                    )}
                  </div>
                  <h4 className="mt-3">{formData.firstName} {formData.lastName}</h4>
                  <p className="text-muted">{formData.specialty}</p>
                  <div className="d-inline-flex align-items-center fs-6">
                    <BiStar className="me-1" style={{ color: '#fbbf24' }} />
                    <span>{avgRating.toFixed(1)}{reviewCount > 0 && <span className="ms-1">({reviewCount})</span>}</span>
                  </div>
                  
                  {editing && (
                    <div className="mt-3">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowAvatarModal(true)}
                        className="w-100"
                      >
                        <BiImage className="me-2" />
                        Thay đổi ảnh đại diện
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Profile Information */}
            <Col md={8}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Thông tin cá nhân</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label><BiEnvelope className="me-2" />Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={!editing}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label><BiPhone className="me-2" />Số điện thoại</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          disabled={!editing}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Họ</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          disabled={!editing}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tên</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          disabled={!editing}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Giới tính</Form.Label>
                        <Form.Select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          disabled={!editing}
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="MALE">Nam</option>
                          <option value="FEMALE">Nữ</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label><BiCalendar className="me-2" />Ngày sinh</Form.Label>
                        <Form.Control
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          disabled={!editing}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label><BiMapPin className="me-2" />Địa chỉ</Form.Label>
                    <Form.Control
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!editing}
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label><BiBriefcase className="me-2" />Chuyên khoa</Form.Label>
                        <Form.Control
                          type="text"
                          name="specialty"
                          value={formData.specialty}
                          onChange={handleInputChange}
                          disabled={!editing}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label><BiBuilding className="me-2" />Khoa</Form.Label>
                        {editing ? (
                          <Form.Select
                            value={formData.departmentId || ''}
                            onChange={handleInputChange}
                            name="departmentId"
                          >
                            <option value="">Chọn khoa</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.departmentName}
                              </option>
                            ))}
                          </Form.Select>
                        ) : (
                          <Form.Control
                            type="text"
                            value={doctor.department?.departmentName || 'Chưa phân công'}
                            disabled
                          />
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Giới thiệu bản thân</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      disabled={!editing}
                      placeholder="Viết giới thiệu về bản thân, kinh nghiệm làm việc..."
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>
          </Row>
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
                Đang upload ảnh...
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

export default DoctorProfile;
