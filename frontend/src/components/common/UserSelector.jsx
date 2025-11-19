import React, { useState, useEffect } from 'react';
import { Form, Modal, Button, Table, Alert } from 'react-bootstrap';
import { BiSearch, BiCheck } from 'react-icons/bi';

const UserSelector = ({ show, onHide, onSelect, departments }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (show) {
      fetchDoctorUsers();
    }
  }, [show]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDoctorUsers = async () => {
    try {
      setLoading(true);
      // Lấy tất cả users có role Doctor (roleId = 2)
      const response = await fetch('http://localhost:8080/api/users/role/2/with-roles-info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Lỗi khi tải danh sách users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  const handleSelect = () => {
    if (selectedUserId) {
      const selectedUser = users.find(user => user.id.toString() === selectedUserId);
      onSelect(selectedUser);
      setSelectedUserId('');
      onHide();
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setSearchTerm('');
    setError('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Chọn User để tạo Bác sĩ</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search */}
        <div className="mb-3">
          <div className="input-group">
            <span className="input-group-text">
              <BiSearch />
            </span>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm">
            <thead className="table-dark sticky-top">
              <tr>
                <th width="50">Chọn</th>
                <th>ID</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Điện thoại</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center">Đang tải...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">Không có user nào</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <Form.Check
                        type="radio"
                        name="selectedUser"
                        value={user.id}
                        checked={selectedUserId === user.id.toString()}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                      />
                    </td>
                    <td>{user.id}</td>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span className={`badge ${
                        user.status === 'ACTIVE' ? 'bg-success' :
                        user.status === 'INACTIVE' ? 'bg-warning' :
                        'bg-danger'
                      }`}>
                        {user.status === 'ACTIVE' ? 'Hoạt động' :
                         user.status === 'INACTIVE' ? 'Không hoạt động' :
                         'Đã xóa'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Hủy
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSelect}
          disabled={!selectedUserId}
        >
          <BiCheck /> Chọn User
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UserSelector;
