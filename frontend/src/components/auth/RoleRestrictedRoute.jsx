import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Component để chặn admin/doctor truy cập các route không được phép
 * Nếu user là admin hoặc doctor, tự động redirect về /admin hoặc /doctor
 * 
 * Props:
 * - children: component(s) to render if allowed
 */
export default function RoleRestrictedRoute({ children }) {
  try {
    const raw = localStorage.getItem('user');
    // Nếu chưa đăng nhập, cho phép truy cập (để login/register)
    if (!raw) {
      return children;
    }
    
    const user = JSON.parse(raw);
    const roleName = (user?.role?.name || user?.role?.roleName || '').toString().toLowerCase();
    
    // Nếu user là admin hoặc doctor, redirect về dashboard tương ứng
    if (roleName.includes('admin')) {
      return <Navigate to="/admin" replace />;
    }
    
    if (roleName.includes('doctor')) {
      return <Navigate to="/doctor" replace />;
    }
    
    // Nếu không phải admin/doctor, cho phép truy cập
    return children;
  } catch (e) {
    // Nếu có lỗi khi parse, cho phép truy cập
    return children;
  }
}

