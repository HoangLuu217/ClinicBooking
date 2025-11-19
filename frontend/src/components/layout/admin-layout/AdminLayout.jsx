import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import AdminHeader from "./AdminHeader";
import "./AdminLayout.css";

const FULL_SIDEBAR_WIDTH = 260;
const COLLAPSED_SIDEBAR_WIDTH = 72;
const EXPANDED_HEADER_HEIGHT = 80;
const COMPACT_HEADER_HEIGHT = 56;

const AdminLayout = () => {
  // Sidebar có thể thu gọn/toggle bằng nút, nhưng không tự động theo scroll
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(EXPANDED_HEADER_HEIGHT);

  // Tự động thu gọn khi cửa sổ nhỏ (giữ lại nếu cần)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1180) setSidebarCollapsed(true);
      else setSidebarCollapsed(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sync với biến header động (đã set ở AdminHeader)
  useEffect(() => {
    const syncHeaderVar = () => {
      const h = getComputedStyle(document.documentElement)
        .getPropertyValue("--current-header-height")
        .trim()
        .replace("px", "");
      const num = parseInt(h || EXPANDED_HEADER_HEIGHT, 10);
      if (!isNaN(num)) setHeaderHeight(num);
    };
    syncHeaderVar();
    window.addEventListener("scroll", syncHeaderVar, { passive: true });
    return () => window.removeEventListener("scroll", syncHeaderVar);
  }, []);

  // Không thu gọn sidebar theo scroll nữa

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : FULL_SIDEBAR_WIDTH;

  return (
  <div className={"admin-shell" + (sidebarCollapsed ? " sidebar-collapsed" : "") }>
      {/* Header full width */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          zIndex: 1100,
        }}
      >
        <AdminHeader
          onToggleSidebar={() => setSidebarCollapsed((s) => !s)}
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>

      {/* Sidebar dưới header */}
      <nav
        className="bg-primary sidebar"
        style={{
          position: "fixed",
          top: EXPANDED_HEADER_HEIGHT,
          left: 0,
          width: sidebarWidth,
          height: `calc(100vh - ${EXPANDED_HEADER_HEIGHT}px)`,
          zIndex: 1090,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          transition: "width .25s",
        }}
      >
        <ul className="nav flex-column px-3 mt-3 mb-3 side-nav-list">
          <li className="nav-item mb-1">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-speedometer2 me-2 icon" />
              <span className="label">Dashboard</span>
            </NavLink>
          </li>
          <li className="nav-item mb-1">
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-people me-2 icon" />
              <span className="label">Người dùng</span>
            </NavLink>
          </li>
          <li className="nav-item mb-1">
            <NavLink
              to="/admin/departments"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-diagram-3 me-2 icon" />
              <span className="label">Khoa</span>
            </NavLink>
          </li>
          <li className="nav-item mb-1">
            <NavLink
              to="/admin/appointments"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-calendar-check me-2 icon" />
              <span className="label">Lịch hẹn</span>
            </NavLink>
          </li>
          <li className="nav-item mb-1">
            <NavLink
              to="/admin/articles"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-file-earmark-text me-2 icon" />
              <span className="label">Bài viết</span>
            </NavLink>
          </li>
          <li className="nav-item mb-1">
            <NavLink
              to="/admin/reviews"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-chat-dots me-2 icon" />
              <span className="label">Đánh giá</span>
            </NavLink>
          </li>
          <li className="nav-item mb-1">
            <NavLink
              to="/admin/medicines"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-capsule me-2 icon" />
              <span className="label">Thuốc</span>
            </NavLink>
          </li>
          <li className="nav-item mb-1">
            <NavLink
              to="/admin/prescriptions"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-file-medical me-2 icon" />
              <span className="label">Đơn thuốc</span>
            </NavLink>
          </li>
          <li className="nav-item mb-1">
            <NavLink
              to="/admin/payments"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center px-3 py-2 rounded-2 side-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <i className="bi bi-credit-card me-2 icon" />
              <span className="label">Thanh toán</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Main */}
      <main
        className="admin-main"
        style={{
          marginLeft: sidebarWidth,
          paddingTop: headerHeight + 16,
          transition: "margin-left .25s, padding-top .25s",
        }}
      >
        <div className="content-card p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;


