import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import doctorScheduleApi from "../../api/doctorScheduleApi";
import doctorApi from "../../api/doctorApi";
import appointmentApi from "../../api/appointmentApi";
import paymentApi from "../../api/paymentApi";
import Cookies from "js-cookie";

const DoctorDashboard = () => {
  const [stats, setStats] = useState({
    totalSchedules: 0,
    todaySchedules: 0,
    availableSchedules: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    totalPatients: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);

  // Get doctorId from localStorage (memoized)
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  // Fetch doctorId
  useEffect(() => {
    const fetchDoctorId = async () => {
      const userId = Cookies.get("userId") || currentUser?.id;
      if (userId) {
        try {
          const res = await doctorApi.getDoctorByUserId(userId);
          const data = res.data || res;
          setDoctorId(data.doctorId);
        } catch (err) {
          console.error("Error fetching doctorId:", err);
        }
      }
    };
    fetchDoctorId();
  }, [currentUser]);

  // Helper function to add timeout to promises
  const withTimeout = useCallback((promise, timeoutMs = 10000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
      ),
    ]);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!doctorId) return;

    try {
      setLoading(true);

      // Load schedules, appointments, and payments in parallel with timeout
      const [schedulesRes, appointmentsRes, paymentsRes] =
        await Promise.allSettled([
          withTimeout(doctorScheduleApi.getSchedulesByDoctor(doctorId), 8000),
          withTimeout(appointmentApi.getAppointmentsByDoctor(doctorId), 8000),
          withTimeout(paymentApi.getPaymentsByDoctorId(doctorId), 8000),
        ]);

      // Extract data with fallback to empty arrays
      const schedules =
        schedulesRes.status === "fulfilled"
          ? schedulesRes.value?.data || schedulesRes.value || []
          : [];
      const appointments =
        appointmentsRes.status === "fulfilled"
          ? appointmentsRes.value?.data || appointmentsRes.value || []
          : [];
      const payments =
        paymentsRes.status === "fulfilled"
          ? paymentsRes.value?.data || paymentsRes.value || []
          : [];

      // Debug logging - detailed
      console.log("📋 Total appointments loaded:", appointments.length);
      const appointmentsWithPatients = appointments.filter(
        (apt) => apt.patientId
      );
      console.log(
        "📋 Appointments with patients:",
        appointmentsWithPatients.length
      );
      console.log(
        "📋 All appointments with patients:",
        appointmentsWithPatients
      );
      console.log("📋 Appointments status breakdown:", {
        scheduled: appointments.filter((apt) => apt.status === "Scheduled")
          .length,
        confirmed: appointments.filter((apt) => apt.status === "Confirmed")
          .length,
        available: appointments.filter((apt) => apt.status === "Available")
          .length,
        completed: appointments.filter((apt) => apt.status === "Completed")
          .length,
        cancelled: appointments.filter((apt) => apt.status === "Cancelled")
          .length,
      });

      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Filter today's schedules
      const todaySchedules = schedules.filter((s) => s.workDate === today);

      // Filter appointments
      const todayAppointments = appointments.filter(
        (apt) =>
          apt.startTime?.split("T")[0] === today && apt.status !== "Cancelled"
      );

      // Calculate revenue from paid payments (not from appointments)
      // Filter only paid/successful payments
      const paidPayments = payments.filter(
        (p) =>
          p.status === "PAID" ||
          p.status === "SUCCESS" ||
          p.status === "COMPLETED"
      );

      // Today's revenue from payments
      const todayPaid = paidPayments.filter((p) => {
        if (!p.paidAt && !p.createdAt) return false;
        const paymentDate = p.paidAt
          ? new Date(p.paidAt)
          : new Date(p.createdAt);
        return paymentDate.toISOString().split("T")[0] === today;
      });
      const todayRevenue = todayPaid.reduce((sum, p) => {
        return sum + (p.amount ? Number(p.amount) : 0);
      }, 0);

      // Monthly revenue from payments (current month)
      const monthlyPaid = paidPayments.filter((p) => {
        if (!p.paidAt && !p.createdAt) return false;
        const paymentDate = p.paidAt
          ? new Date(p.paidAt)
          : new Date(p.createdAt);
        return (
          paymentDate.getMonth() === currentMonth &&
          paymentDate.getFullYear() === currentYear
        );
      });
      const monthlyRevenue = monthlyPaid.reduce((sum, p) => {
        return sum + (p.amount ? Number(p.amount) : 0);
      }, 0);

      // Total revenue from all paid payments
      const totalRevenue = paidPayments.reduce((sum, p) => {
        return sum + (p.amount ? Number(p.amount) : 0);
      }, 0);

      // Calculate completed appointments (for stats display)
      const completedAppointments = appointments.filter(
        (apt) => apt.status === "Completed"
      );

      // Filter and sort patient appointments (only appointments with patients, not empty slots)
      // "Lịch hẹn bệnh nhân" = những lịch hẹn đã có người đặt với status "Scheduled"
      const upcomingAppointmentsList = appointments
        .filter((apt) => {
          // Chỉ lấy appointments có patientId và status là "Scheduled"
          return (
            apt.patientId !== null &&
            apt.patientId !== undefined &&
            apt.status === "Scheduled"
          );
        })
        .sort((a, b) => {
          // Sắp xếp: tương lai trước, sau đó đến quá khứ gần đây
          const dateA = new Date(a.startTime || 0);
          const dateB = new Date(b.startTime || 0);
          const isAFuture = dateA > now;
          const isBFuture = dateB > now;

          // Tương lai luôn ưu tiên hơn quá khứ
          if (isAFuture && !isBFuture) return -1;
          if (!isAFuture && isBFuture) return 1;

          // Cùng loại (cùng tương lai hoặc cùng quá khứ) thì sắp xếp theo thời gian giảm dần (mới nhất trước)
          return dateB - dateA;
        })
        .slice(0, 5);

      // Debug logging
      console.log(
        "📋 Upcoming appointments filtered:",
        upcomingAppointmentsList.length
      );
      console.log("📋 Upcoming appointments list:", upcomingAppointmentsList);

      // If no upcoming appointments, show all appointments with patients (for debugging)
      if (upcomingAppointmentsList.length === 0) {
        const allWithPatients = appointments.filter(
          (apt) => apt.patientId && apt.patientId !== null
        );
        console.log(
          "⚠️ No upcoming appointments found. All appointments with patients:",
          allWithPatients
        );
        console.log("⚠️ Current time:", now);
        console.log(
          "⚠️ Sample appointment times:",
          allWithPatients.slice(0, 3).map((apt) => ({
            id: apt.appointmentId,
            startTime: apt.startTime,
            patientName: apt.patientName,
            status: apt.status,
            isFuture: new Date(apt.startTime) > now,
          }))
        );
      }

      // Get unique patients
      const uniquePatients = new Set(
        appointments.filter((apt) => apt.patientId).map((apt) => apt.patientId)
      );

      setStats({
        totalSchedules: schedules.length,
        todaySchedules: todaySchedules.length,
        availableSchedules: schedules.filter((s) => s.status === "Available")
          .length,
        totalAppointments: appointments.filter(
          (apt) => apt.status !== "Cancelled"
        ).length,
        todayAppointments: todayAppointments.length,
        upcomingAppointments: appointments.filter((apt) => {
          if (
            !apt.startTime ||
            apt.status === "Cancelled" ||
            apt.status === "Completed"
          )
            return false;
          return new Date(apt.startTime) > now;
        }).length,
        completedAppointments: completedAppointments.length,
        totalPatients: uniquePatients.size,
        todayRevenue: todayRevenue,
        monthlyRevenue: monthlyRevenue,
        totalRevenue: totalRevenue,
      });

      setUpcomingAppointments(upcomingAppointmentsList);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      // Set empty data on error to prevent UI crash
      setStats({
        totalSchedules: 0,
        todaySchedules: 0,
        availableSchedules: 0,
        totalAppointments: 0,
        todayAppointments: 0,
        upcomingAppointments: 0,
        completedAppointments: 0,
        totalPatients: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
      });
      setUpcomingAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, withTimeout]);

  useEffect(() => {
    if (doctorId) {
      loadDashboardData();
    }
  }, [doctorId, loadDashboardData]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-3">
      {/* Page Header */}
      <div className="mb-3">
        <h2 className="fw-bold mb-1" style={{ fontSize: "1.5rem" }}>
          <i className="bi bi-speedometer2 me-2 text-primary"></i>
          Dashboard
        </h2>
        <p className="text-muted mb-0 small">Tổng quan hoạt động của bạn</p>
      </div>

      {/* Stats Cards - Minimal Design */}
      <div className="row g-3 mb-3">
        <div className="col-xl-3 col-md-6">
          <div
            className="card border-0 shadow-sm h-100"
            style={{ borderRadius: "12px" }}
          >
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div
                    className="text-muted small mb-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Tổng lịch trình
                  </div>
                  <div
                    className="h4 mb-1 fw-bold text-dark"
                    style={{ fontSize: "1.5rem" }}
                  >
                    {stats.totalSchedules}
                  </div>
                  <div
                    className="text-muted small"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <i className="bi bi-calendar-day me-1"></i>
                    {stats.todaySchedules} hôm nay
                  </div>
                </div>
                <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                  <i
                    className="bi bi-calendar3 text-primary"
                    style={{ fontSize: "1.5rem" }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card border-0 shadow-sm h-100"
            style={{ borderRadius: "12px" }}
          >
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div
                    className="text-muted small mb-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Lịch hẹn hôm nay
                  </div>
                  <div
                    className="h4 mb-1 fw-bold text-dark"
                    style={{ fontSize: "1.5rem" }}
                  >
                    {stats.todayAppointments}
                  </div>
                  <div
                    className="text-muted small"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <i className="bi bi-clock me-1"></i>
                    {stats.upcomingAppointments} sắp tới
                  </div>
                </div>
                <div className="bg-success bg-opacity-10 rounded-circle p-2">
                  <i
                    className="bi bi-calendar-check text-success"
                    style={{ fontSize: "1.5rem" }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card border-0 shadow-sm h-100"
            style={{ borderRadius: "12px" }}
          >
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div
                    className="text-muted small mb-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Tổng bệnh nhân
                  </div>
                  <div
                    className="h4 mb-1 fw-bold text-dark"
                    style={{ fontSize: "1.5rem" }}
                  >
                    {stats.totalPatients}
                  </div>
                  <div
                    className="text-muted small"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <i className="bi bi-person-check me-1"></i>
                    Đã điều trị
                  </div>
                </div>
                <div className="bg-info bg-opacity-10 rounded-circle p-2">
                  <i
                    className="bi bi-people text-info"
                    style={{ fontSize: "1.5rem" }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card border-0 shadow-sm h-100"
            style={{ borderRadius: "12px" }}
          >
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div
                    className="text-muted small mb-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Hoàn thành
                  </div>
                  <div
                    className="h4 mb-1 fw-bold text-dark"
                    style={{ fontSize: "1.5rem" }}
                  >
                    {stats.completedAppointments}
                  </div>
                  <div
                    className="text-muted small"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    Tổng cộng
                  </div>
                </div>
                <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                  <i
                    className="bi bi-check2-all text-warning"
                    style={{ fontSize: "1.5rem" }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Section */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <div
            className="card border-0 shadow-sm"
            style={{ borderRadius: "12px" }}
          >
            <div className="card-header bg-white border-0 py-2 px-3">
              <h6 className="mb-0 fw-bold" style={{ fontSize: "1rem" }}>
                <i className="bi bi-cash-coin text-success me-2"></i>
                Doanh thu
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="row g-3">
                {/* Today's Revenue */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                    <div>
                      <div
                        className="text-muted small mb-1"
                        style={{ fontSize: "0.75rem" }}
                      >
                        Doanh thu hôm nay
                      </div>
                      <div
                        className="h5 mb-0 fw-bold text-success"
                        style={{ fontSize: "1.25rem" }}
                      >
                        {formatCurrency(stats.todayRevenue)}
                      </div>
                      <div
                        className="text-muted small mt-1"
                        style={{ fontSize: "0.7rem" }}
                      >
                        <i className="bi bi-calendar-day me-1"></i>
                        Hôm nay
                      </div>
                    </div>
                    <div className="bg-success bg-opacity-10 rounded-circle p-3">
                      <i
                        className="bi bi-cash-stack text-success"
                        style={{ fontSize: "1.5rem" }}
                      ></i>
                    </div>
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="col-md-6">
                  <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                    <div>
                      <div
                        className="text-muted small mb-1"
                        style={{ fontSize: "0.75rem" }}
                      >
                        Doanh thu tháng này
                      </div>
                      <div
                        className="h5 mb-0 fw-bold text-primary"
                        style={{ fontSize: "1.25rem" }}
                      >
                        {formatCurrency(stats.monthlyRevenue)}
                      </div>
                      <div
                        className="text-muted small mt-1"
                        style={{ fontSize: "0.7rem" }}
                      >
                        <i className="bi bi-calendar-month me-1"></i>
                        Tháng {new Date().getMonth() + 1}/
                        {new Date().getFullYear()}
                      </div>
                    </div>
                    <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                      <i
                        className="bi bi-calendar-range text-primary"
                        style={{ fontSize: "1.5rem" }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Appointments - Full Width */}
      <div className="row mb-3">
        <div className="col-12">
          <div
            className="card border-0 shadow-sm"
            style={{ borderRadius: "12px" }}
          >
            <div className="card-header bg-white border-0 py-2 px-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold" style={{ fontSize: "1rem" }}>
                <i className="bi bi-calendar-event text-success me-2"></i>
                Lịch hẹn bệnh nhân
              </h6>
              <Link
                to="/doctor/appointments"
                className="btn btn-sm btn-outline-primary"
              >
                Xem tất cả
                <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="card-body px-3 py-3">
              {upcomingAppointments.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {upcomingAppointments.map((apt) => {
                    const isScheduled = apt.status === "Scheduled";
                    const isConfirmed = apt.status === "Confirmed";
                    const isPending = apt.status === "Pending";

                    return (
                      <div
                        key={apt.appointmentId}
                        className="d-flex align-items-center gap-3 p-3 rounded-3 position-relative"
                        style={{
                          background:
                            "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
                          border: "1px solid #e9ecef",
                          transition: "all 0.2s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(4px)";
                          e.currentTarget.style.boxShadow =
                            "0 2px 8px rgba(0,0,0,0.08)";
                          e.currentTarget.style.borderColor = "#dee2e6";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.borderColor = "#e9ecef";
                        }}
                      >
                        {/* Status indicator line */}
                        <div
                          className="position-absolute start-0 top-0 bottom-0 rounded-start"
                          style={{
                            width: "4px",
                            background: isConfirmed
                              ? "#28a745"
                              : isScheduled
                              ? "#0d6efd"
                              : isPending
                              ? "#ffc107"
                              : "#6c757d",
                          }}
                        />

                        {/* Avatar */}
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: "50px",
                            height: "50px",
                            background: isConfirmed
                              ? "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)"
                              : isScheduled
                              ? "linear-gradient(135deg, #cfe2ff 0%, #b6d4fe 100%)"
                              : isPending
                              ? "linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)"
                              : "linear-gradient(135deg, #e2e3e5 0%, #d6d8db 100%)",
                            border: `2px solid ${
                              isConfirmed
                                ? "#28a745"
                                : isScheduled
                                ? "#0d6efd"
                                : isPending
                                ? "#ffc107"
                                : "#6c757d"
                            }`,
                          }}
                        >
                          <i
                            className={`bi bi-person-fill ${
                              isConfirmed
                                ? "text-success"
                                : isScheduled
                                ? "text-primary"
                                : isPending
                                ? "text-warning"
                                : "text-secondary"
                            }`}
                            style={{ fontSize: "1.3rem" }}
                          />
                        </div>

                        {/* Patient name */}
                        <div
                          className="d-flex flex-column"
                          style={{ minWidth: "140px", maxWidth: "140px" }}
                        >
                          <span
                            className="fw-bold text-dark mb-1"
                            style={{ fontSize: "0.95rem" }}
                          >
                            {apt.patientName || "Bệnh nhân"}
                          </span>
                          <span
                            className={`badge align-self-start ${
                              isConfirmed
                                ? "bg-success"
                                : isScheduled
                                ? "bg-primary"
                                : isPending
                                ? "bg-warning text-dark"
                                : "bg-secondary"
                            }`}
                            style={{ fontSize: "0.65rem", padding: "3px 7px" }}
                          >
                            {isConfirmed
                              ? "✓ Đã xác nhận"
                              : isScheduled
                              ? "• Đã đặt"
                              : isPending
                              ? "⏱ Chờ xác nhận"
                              : apt.status}
                          </span>
                        </div>

                        {/* Divider */}
                        <div
                          className="vr opacity-25 mx-1"
                          style={{ height: "40px" }}
                        />

                        {/* Date */}
                        <div
                          className="d-flex align-items-center gap-2 px-3 py-2 rounded-2"
                          style={{ background: "#f8f9fa" }}
                        >
                          <i
                            className="bi bi-calendar3 text-primary"
                            style={{ fontSize: "1rem" }}
                          />
                          <span
                            className="text-dark fw-medium"
                            style={{ fontSize: "0.85rem" }}
                          >
                            {formatDate(apt.startTime)}
                          </span>
                        </div>

                        {/* Time */}
                        <div
                          className="d-flex align-items-center gap-2 px-3 py-2 rounded-2"
                          style={{ background: "#f8f9fa" }}
                        >
                          <i
                            className="bi bi-clock text-primary"
                            style={{ fontSize: "1rem" }}
                          />
                          <span
                            className="text-dark fw-medium"
                            style={{ fontSize: "0.85rem" }}
                          >
                            {formatTime(apt.startTime)} -{" "}
                            {formatTime(apt.endTime)}
                          </span>
                        </div>

                        {/* Schedule indicator */}
                        {apt.scheduleId && (
                          <div
                            className="d-flex align-items-center gap-1 px-2 py-1 rounded-2"
                            style={{ background: "#e7f5ff" }}
                          >
                            <i
                              className="bi bi-calendar-check text-info"
                              style={{ fontSize: "0.85rem" }}
                            />
                            <span
                              className="text-info fw-medium"
                              style={{ fontSize: "0.7rem" }}
                            >
                              Có lịch trình
                            </span>
                          </div>
                        )}

                        {/* Spacer */}
                        <div className="flex-grow-1" />

                        {/* Action button */}
                        <Link
                          to="/doctor/appointments"
                          state={{ highlightAppointmentId: apt.appointmentId }}
                          className="btn btn-sm btn-primary d-flex align-items-center gap-2 px-3"
                          style={{
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: "500",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span>Chi tiết</span>
                          <i
                            className="bi bi-arrow-right-short"
                            style={{ fontSize: "1.2rem" }}
                          />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i
                      className="bi bi-calendar-x text-muted"
                      style={{ fontSize: "3rem", opacity: 0.3 }}
                    ></i>
                  </div>
                  <p
                    className="text-muted mb-0"
                    style={{ fontSize: "0.95rem" }}
                  >
                    Chưa có lịch hẹn bệnh nhân
                  </p>
                  <p className="text-muted small mb-0 mt-1">
                    Các lịch hẹn mới sẽ hiển thị tại đây
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
