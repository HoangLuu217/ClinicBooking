import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import conversationApi from "../../../api/conversationApi";
import messageApi from "../../../api/messageApi";
import doctorApi from "../../../api/doctorApi";

const DoctorSidebar = ({
  doctorInfo,
  loading = false,
  sidebarOpen = true,
  onClose,
}) => {
  const location = useLocation();
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let intervalId;
    const fetchUnreadTotal = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "null");
        const currentUserId = storedUser?.id;
        const storedDoctorId = localStorage.getItem("doctorId");
        let doctorId = storedDoctorId || doctorInfo?.doctorId;
        if (!doctorId && currentUserId) {
          try {
            const res = await doctorApi.getDoctorByUserId(currentUserId);
            doctorId = res?.data?.doctorId || res?.doctorId || null;
            if (doctorId) localStorage.setItem("doctorId", String(doctorId));
          } catch (_) {}
        }
        if (!doctorId || !currentUserId) {
          if (isMounted) setTotalUnread(0);
          return;
        }
        const convRes = await conversationApi.getConversationsByDoctor(
          doctorId
        );
        const conversations = Array.isArray(convRes?.data) ? convRes.data : [];
        if (conversations.length === 0) {
          if (isMounted) setTotalUnread(0);
          return;
        }
        const counts = await Promise.all(
          conversations.map(async (c) => {
            const convId = c.conversationId || c.id;
            if (!convId) return 0;
            try {
              const res = await messageApi.getUnreadCount(
                convId,
                currentUserId
              );
              return Number(res?.data) || 0;
            } catch (_) {
              return 0;
            }
          })
        );
        const sum = counts.reduce((a, b) => a + b, 0);
        if (isMounted) setTotalUnread(sum);
      } catch (e) {
        if (isMounted) setTotalUnread(0);
      }
    };

    fetchUnreadTotal();
    // Polling to keep badge fresh
    intervalId = window.setInterval(fetchUnreadTotal, 10000);

    const onUserChanged = () => fetchUnreadTotal();
    window.addEventListener("userChanged", onUserChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("userChanged", onUserChanged);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [doctorInfo?.doctorId, location.pathname]);

  const menuItems = [
    {
      path: "/doctor/dashboard",
      icon: "bi-speedometer2",
      label: "Dashboard",
      description: "Tổng quan hoạt động",
    },
    {
      path: "/doctor/schedule",
      icon: "bi-calendar3",
      label: "Quản lý lịch trình",
      description: "Lịch làm việc cá nhân",
    },
    {
      path: "/doctor/available-slots",
      icon: "bi-clock-history",
      label: "Quản lý khung giờ khám",
      description: "Tạo & quản lý slot khám bệnh",
    },
    {
      path: "/doctor/appointments",
      icon: "bi-calendar-check",
      label: "Lịch hẹn bệnh nhân",
      description: "Danh sách lịch hẹn",
    },
    {
      path: "/doctor/reviews",
      icon: "bi-star",
      label: "Đánh Giá",
      description: "Phản hồi từ bệnh nhân",
    },
    {
      path: "/doctor/medical-records",
      icon: "bi-file-text",
      label: "Hồ sơ bệnh án",
      description: "Quản lý bệnh án",
    },
    {
      path: "/doctor/prescriptions",
      icon: "bi-capsule",
      label: "Kê đơn thuốc",
      description: "Tạo đơn thuốc mới",
    },
    {
      path: "/doctor/department-referrals",
      icon: "bi-clipboard-check",
      label: "Xử lý Chỉ định CLS",
      description: "Cập nhật kết quả cận lâm sàng",
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && window.innerWidth < 992 && (
        <div
          className="position-fixed w-100 h-100 bg-dark bg-opacity-50"
          style={{
            top: 0,
            left: 0,
            zIndex: 1039,
            cursor: "pointer",
          }}
          onClick={onClose}
        />
      )}

      <nav
        className={`bg-light doctor-sidebar ${
          sidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
        style={{
          position: "fixed",
          top: "20px",
          left: sidebarOpen ? "0" : "-280px",
          height: "100vh",
          width: "280px",
          overflowY: "auto",
          borderRight: "1px solid #eee",
          zIndex: 1040,
          transition: "left 0.3s ease-in-out",
        }}
      >
        <div className="d-flex flex-column h-100">
          {/* Doctor Info */}
          <div className="doctor-info mb-1">
            <div className="text-center">
              <div className="doctor-avatar mb-2">
                {doctorInfo.avatar ? (
                  <img
                    src={doctorInfo.avatar}
                    alt="avatar"
                    className="rounded-circle"
                    style={{ width: 90, height: 90 }}
                  />
                ) : (
                  <i
                    className="bi bi-person-circle text-primary"
                    style={{ fontSize: "3rem" }}
                  ></i>
                )}
              </div>
              {loading ? (
                <>
                  <h6 className="mb-1">Đang tải...</h6>
                  <small className="text-muted">Bác sĩ</small>
                </>
              ) : (
                <>
                  <h6 className="mb-1">{doctorInfo.name}</h6>
                  <small className="text-muted">{doctorInfo.department}</small>
                </>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <ul className="nav flex-column">
            {menuItems.map((item) => (
              <li key={item.path} className="nav-item mb-2">
                <Link
                  className={`nav-link doctor-menu-item ${
                    location.pathname === item.path ? "active" : ""
                  }`}
                  to={item.path}
                >
                  <div className="d-flex align-items-center w-100 justify-content-between">
                    <div className="d-flex align-items-center">
                      <i className={`bi ${item.icon} me-3`}></i>
                      <div>
                        <div className="fw-semibold">{item.label}</div>
                        <small className="text-muted">{item.description}</small>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
};

export default DoctorSidebar;
