import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Props:
 * - allowed: array of role names allowed (case-insensitive substring match)
 * - children: component(s) to render if allowed
 */
export default function RoleProtectedRoute({ allowed = [], children }) {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return <Navigate to="/login" replace />;
    const user = JSON.parse(raw);
    const roleName = (user?.role?.name || user?.role?.roleName || '').toString().toLowerCase();
    const ok = allowed.some(r => roleName.includes(r.toLowerCase()));
    if (!ok) {
      // if the user is logged in but not allowed, send them to home
      return <Navigate to="/" replace />;
    }
    return children;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
}
