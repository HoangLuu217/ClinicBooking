import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import appointmentApi from "../../api/appointmentApi";
import patientApi from "../../api/patientApi";
import doctorApi from "../../api/doctorApi";
import Cookies from "js-cookie";
import {
  Search,
  LayoutGrid,
  Calendar,
  Filter,
  MessageCircle,
  Clock,
  Mail,
  Phone,
} from "lucide-react";

// UI components
const Button = (props) => (
  <button
    {...props}
    className={`btn ${
      props.variant === "outline" ? "btn-outline-primary" : "btn-primary"
    } ${props.className || ""}`}
  >
    {props.children}
  </button>
);
const Input = (props) => (
  <input {...props} className={`form-control ${props.className || ""}`} />
);
const Badge = ({ children, className }) => (
  <span className={`badge bg-light text-dark ${className || ""}`}>
    {children}
  </span>
);
const Avatar = ({ src, alt, children, size = 50 }) => (
  <div
    className="avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
    style={{
      width: size,
      height: size,
      overflow: "hidden",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      border: "3px solid #fff",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    }}
  >
    {src ? (
      <img
        src={src}
        alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    ) : (
      <span
        className="fw-bold text-white"
        style={{ fontSize: `${size * 0.4}px` }}
      >
        {children}
      </span>
    )}
  </div>
);

function DoctorAppointmentList() {
  const navigate = useNavigate();
  const location = useLocation();
  const appointmentRefs = useRef({});

  // State
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [rangeType, setRangeType] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  // Get current user from localStorage (memoized)
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
  const withTimeout = useCallback((promise, timeoutMs = 8000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
      ),
    ]);
  }, []);

  // Fetch appointments with useCallback
  const fetchAppointments = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      // Lấy lịch hẹn của bác sĩ với timeout
      const appointmentsRes = await withTimeout(
        appointmentApi.getAppointmentsByDoctor(doctorId),
        10000
      );

      const appointmentsData = appointmentsRes?.data || [];

      // Filter out empty slots (only show appointments with patients)
      const appointmentsWithPatients = appointmentsData
        .filter((appointment) => appointment.patientId !== null) // Chỉ lấy appointments có patient
        .map(async (appointment) => {
          try {
            const patientRes = await withTimeout(
              patientApi.getPatientById(appointment.patientId),
              5000
            );
            const patient = patientRes?.data || patientRes;
            return {
              ...appointment,
              patientName:
                patient.user?.lastName + " " + patient.user?.firstName ||
                patient.lastName + " " + patient.firstName ||
                "Không rõ",
              patientEmail: patient.user?.email || "",
              patientPhone: patient.user?.phone || "",
              patientAddress: patient.user?.address || "",
              patientAvatar: patient.user?.avatarUrl || "",
              healthInsuranceNumber: patient.healthInsuranceNumber || "",
              medicalHistory: patient.medicalHistory || "",
            };
          } catch {
            return {
              ...appointment,
              patientName: "Không tìm thấy thông tin",
              patientEmail: "",
              patientPhone: "",
              patientAddress: "",
              patientAvatar: "",
              healthInsuranceNumber: "",
              medicalHistory: "",
            };
          }
        });

      // Wait for all patient data to be fetched with timeout protection
      const resolvedAppointments = await Promise.allSettled(
        appointmentsWithPatients
      );
      const validAppointments = resolvedAppointments
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      console.log("Appointments loaded:", resolvedAppointments);
      console.log(
        "Rejected count:",
        resolvedAppointments.filter((a) => a.status === "Rejected").length
      );
      console.log(
        "Canceled count:",
        validAppointments.filter((a) => a.status === "Canceled").length
      );
      setAppointments(validAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, withTimeout]);

  useEffect(() => {
    if (doctorId) {
      fetchAppointments();
    }
  }, [doctorId, fetchAppointments]);

  // Handle highlight from Dashboard navigation
  useEffect(() => {
    const highlightAppointmentId = location.state?.highlightAppointmentId;
    if (highlightAppointmentId && appointments.length > 0) {
      setHighlightedId(highlightAppointmentId);

      // Scroll to the appointment after a short delay
      setTimeout(() => {
        const element = appointmentRefs.current[highlightAppointmentId];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedId(null);
      }, 3000);
    }
  }, [location.state, appointments]);

  // Calculate counts - Updated for proper doctor status management
  const counts = useMemo(() => {
    return {
      upcoming: appointments.filter(
        (a) => a.status === "Scheduled" || a.status === "Confirmed"
      ).length,
      rejected: appointments.filter(
        (a) =>
          a.status === "Rejected" ||
          a.status === "Từ chối lịch hẹn" ||
          a.status === "Canceled"
      ).length,
      completed: appointments.filter((a) => a.status === "Completed").length,
    };
  }, [appointments]);

  // Handle start appointment (go to prescription form)
  const handleStartAppointment = (appointment) => {
    console.log("🚀 Bắt đầu khám bệnh cho cuộc hẹn:", appointment);

    // Navigate to prescription form with appointment data
    const appointmentId = appointment.appointmentId || appointment.id;
    navigate(`/doctor/prescriptions/new/${appointmentId}`, {
      state: {
        appointment: {
          id: appointment.id,
          appointmentId: appointmentId,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          appointmentDate: appointment.appointmentDate,
        },
        patientInfo: {
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          phone: appointment.phone,
          gender: appointment.gender,
          age: appointment.age,
        },
      },
    });
  };

  const filtered = appointments
    .filter((a) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          a.patientName?.toLowerCase().includes(query) ||
          a.patientEmail?.toLowerCase().includes(query) ||
          a.patientPhone?.includes(query) ||
          a.healthInsuranceNumber?.toLowerCase().includes(query)
        );
      }

      // Updated filter logic for doctor status management
      if (activeTab === "upcoming") {
        return a.status === "Scheduled" || a.status === "Confirmed";
      }
      if (activeTab === "completed") {
        return a.status === "Completed";
      }
      if (activeTab === "cancelled") {
        return (
          a.status === "Rejected" ||
          a.status === "Từ chối lịch hẹn" ||
          a.status === "Canceled"
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Sắp xếp theo thời gian gần nhất lên trên cùng
      const aTime = new Date(a.startTime).getTime();
      const bTime = new Date(b.startTime).getTime();
      return aTime - bTime; // Giảm dần (mới nhất lên đầu)
    });

  // Render
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-4 shadow-sm p-4 border ">
      <div className="mx-auto" style={{ maxWidth: 1500 }}>
        {/* Header */}
        <div className="mb-4 d-flex align-items-center justify-content-between">
          <h2 className="fw-bold">Appointments</h2>
          <div className="d-flex align-items-center gap-2">
            <div className="position-relative">
              <Search
                className="position-absolute"
                style={{
                  left: 12,
                  top: 12,
                  width: 16,
                  height: 16,
                  color: "#888",
                }}
              />
              <Input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 32, width: 200 }}
              />
            </div>
            <Button size="icon" variant="default" className="bg-primary">
              <LayoutGrid style={{ width: 16, height: 16 }} />
            </Button>

            <Button size="icon" variant="outline">
              <Calendar style={{ width: 16, height: 16 }} />
            </Button>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="mb-4 d-flex align-items-center justify-content-between">
          <div className="d-flex gap-2">
            <Button
              variant={activeTab === "upcoming" ? "default" : "outline"}
              onClick={() => setActiveTab("upcoming")}
              className="gap-2"
            >
              Sắp tới <Badge className="ml-1">{counts.upcoming}</Badge>
            </Button>
            <Button
              variant={activeTab === "cancelled" ? "default" : "outline"}
              onClick={() => setActiveTab("cancelled")}
              className="gap-2"
            >
              Hủy/Từ chối <Badge className="ml-1">{counts.rejected}</Badge>
            </Button>
            <Button
              variant={activeTab === "completed" ? "default" : "outline"}
              onClick={() => setActiveTab("completed")}
              className="gap-2"
            >
              Hoàn thành <Badge className="ml-1">{counts.completed}</Badge>
            </Button>
          </div>
          <div className="d-flex align-items-center gap-2">
            {/* Date range quick select dropdown */}
            <select
              className="form-select"
              style={{ width: 180 }}
              value={rangeType}
              onChange={(e) => setRangeType(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
            {/* Custom range date pickers */}
            {rangeType === "custom" && (
              <>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 140 }}
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <span className="mx-1">-</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 140 }}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </>
            )}
            <Button variant="outline" className="gap-2 bg-transparent">
              <Filter style={{ width: 0, height: 0 }} /> Filter By
            </Button>
          </div>
        </div>

        {/* Appointments List - Modern Layout */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-5">
              <h5 className="text-muted">Không có lịch hẹn</h5>
            </div>
          ) : (
            filtered.map((appointment) => {
              const startDateObj = appointment.startTime
                ? new Date(appointment.startTime)
                : null;
              const endDateObj = appointment.endTime
                ? new Date(appointment.endTime)
                : null;
              const dateStr = startDateObj
                ? startDateObj.toLocaleDateString("vi-VN")
                : "";
              const startTimeStr = startDateObj
                ? startDateObj.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              const endTimeStr = endDateObj
                ? endDateObj.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={appointment.id}
                  ref={(el) =>
                    (appointmentRefs.current[appointment.appointmentId] = el)
                  }
                  className={`flex items-center gap-6 rounded-lg border bg-card p-1 shadow-sm transition-all ${
                    highlightedId === appointment.appointmentId
                      ? "border-primary shadow-lg"
                      : "border-border hover:shadow-md"
                  }`}
                  style={{
                    transition: "all 0.3s ease",
                    backgroundColor:
                      highlightedId === appointment.appointmentId
                        ? "#e3f2fd"
                        : undefined,
                  }}
                >
                  {/* Patient Info */}
                  <div
                    className="d-flex align-items-center gap-3 p-3"
                    style={{ minWidth: "280px", maxWidth: "280px" }}
                  >
                    <Avatar
                      size={50}
                      src={appointment.patientAvatar || "/placeholder.svg"}
                      alt={appointment.patientName}
                    >
                      {appointment.patientName
                        ? appointment.patientName.charAt(0).toUpperCase()
                        : "?"}
                    </Avatar>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <div className="fw-bold" style={{ fontSize: "14px" }}>
                          {appointment.patientName}
                        </div>
                        {/* Status Badge */}
                        <span
                          className={`badge ${
                            appointment.status === "Scheduled"
                              ? "bg-warning"
                              : appointment.status === "Confirmed"
                              ? "bg-success"
                              : appointment.status === "Rejected"
                              ? "bg-danger"
                              : appointment.status === "Completed"
                              ? "bg-primary"
                              : appointment.status === "Từ chối lịch hẹn"
                              ? "bg-secondary"
                              : appointment.status === "Canceled"
                              ? "bg-dark"
                              : "bg-light"
                          }`}
                          style={{ fontSize: "10px" }}
                        >
                          {appointment.status === "Scheduled"
                            ? "Đã đặt"
                            : appointment.status === "Confirmed"
                            ? "Đã xác nhận"
                            : appointment.status === "Rejected"
                            ? "Từ chối"
                            : appointment.status === "Completed"
                            ? "Hoàn thành"
                            : appointment.status === "Từ chối lịch hẹn"
                            ? "Patient hủy"
                            : appointment.status === "Canceled"
                            ? "Bị hủy"
                            : appointment.status}
                        </span>
                      </div>
                      {appointment.healthInsuranceNumber && (
                        <div className="text-muted small">
                          BHYT: {appointment.healthInsuranceNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div
                    className="p-2"
                    style={{ minWidth: "220px", maxWidth: "220px" }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Mail
                        className="text-muted"
                        style={{ width: "14px", height: "14px" }}
                      />
                      <span className="small text-truncate">
                        {appointment.patientEmail}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Phone
                        className="text-muted"
                        style={{ width: "14px", height: "14px" }}
                      />
                      <span className="small">{appointment.patientPhone}</span>
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div
                    className="p-2"
                    style={{ minWidth: "170px", maxWidth: "170px" }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Clock
                        className="text-muted"
                        style={{ width: "14px", height: "14px" }}
                      />
                      <span className="small">{dateStr}</span>
                    </div>
                    <div className="small text-muted">
                      {startTimeStr} - {endTimeStr}
                    </div>
                  </div>

                  {/* Notes & Medical History */}
                  <div
                    className="p-2"
                    style={{ minWidth: "240px", maxWidth: "240px" }}
                  >
                    {appointment.notes && (
                      <div className="mb-2">
                        <div className="fw-semibold small text-info">
                          Ghi chú:
                        </div>
                        <div className="small">
                          {appointment.notes.length > 30
                            ? appointment.notes.substring(0, 30) + "..."
                            : appointment.notes}
                        </div>
                      </div>
                    )}
                    {appointment.medicalHistory && (
                      <div>
                        <div className="fw-semibold small text-info">
                          Tiền sử bệnh:
                        </div>
                        <div className="small">
                          {appointment.medicalHistory.length > 40
                            ? appointment.medicalHistory.substring(0, 40) +
                              "..."
                            : appointment.medicalHistory}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status & Update - Professional UI */}
                  <div
                    className="d-flex align-items-center gap-2 p-2"
                    style={{ minWidth: "250px", maxWidth: "250px" }}
                  >
                    {/* Custom dropdown - styled */}
                    <div
                      style={{
                        background: "#f8f9fa",
                        borderRadius: 8,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                        padding: "2px",
                      }}
                    >
                      <select
                        className="form-select form-select-sm"
                        value={appointment.newStatus || appointment.status}
                        onChange={(e) => {
                          appointment.newStatus = e.target.value;
                          setAppointments([...appointments]);
                        }}
                        style={{
                          width: "140px",
                          fontSize: "12px",
                          borderRadius: 6,
                          borderColor:
                            (appointment.newStatus || appointment.status) ===
                              "Rejected" ||
                            (appointment.newStatus || appointment.status) ===
                              "Canceled" ||
                            (appointment.newStatus || appointment.status) ===
                              "Từ chối lịch hẹn"
                              ? "#dc3545"
                              : (appointment.newStatus ||
                                  appointment.status) === "Confirmed"
                              ? "#198754"
                              : (appointment.newStatus ||
                                  appointment.status) === "Completed"
                              ? "#0d6efd"
                              : "#6c757d",
                          fontWeight: "600",
                          color:
                            (appointment.newStatus || appointment.status) ===
                              "Rejected" ||
                            (appointment.newStatus || appointment.status) ===
                              "Canceled" ||
                            (appointment.newStatus || appointment.status) ===
                              "Từ chối lịch hẹn"
                              ? "#dc3545"
                              : (appointment.newStatus ||
                                  appointment.status) === "Confirmed"
                              ? "#198754"
                              : (appointment.newStatus ||
                                  appointment.status) === "Completed"
                              ? "#0d6efd"
                              : "#6c757d",
                        }}
                      >
                        <option value="Scheduled">Đã đặt</option>
                        <option value="Confirmed">Xác nhận lịch</option>

                        <option value="Rejected">Từ chối</option>
                        <option value="Completed">Hoàn thành</option>
                      </select>
                    </div>
                    {/* Update button with loading */}
                    <Button
                      size="sm"
                      className="btn-sm"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                      disabled={
                        appointment.status ===
                          (appointment.newStatus || appointment.status) ||
                        appointment._updating
                      }
                      onClick={async () => {
                        const newStatus =
                          appointment.newStatus || appointment.status;
                        appointment._updating = true;
                        setAppointments([...appointments]);
                        try {
                          await appointmentApi.updateAppointment(
                            appointment.appointmentId,
                            { status: newStatus }
                          );
                          appointment.status = newStatus;
                          delete appointment.newStatus;
                          window.toast &&
                            window.toast.success(
                              "Cập nhật trạng thái thành công!"
                            );
                        } catch {
                          window.toast &&
                            window.toast.error("Cập nhật trạng thái thất bại!");
                        } finally {
                          delete appointment._updating;
                          setAppointments([...appointments]);
                        }
                      }}
                    >
                      {appointment._updating ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        "Cập nhật"
                      )}
                    </Button>
                  </div>

                  {/* Actions */}
                  <div
                    className="d-flex align-items-center gap-2 p-2"
                    style={{ minWidth: "140px" }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="btn-sm d-flex align-items-center justify-content-center"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                      }}
                      onClick={() => {
                        window.location.href = `/doctor/messages?patientId=${appointment.patientId}`;
                      }}
                    >
                      <MessageCircle
                        style={{ width: "16px", height: "16px" }}
                      />
                    </Button>
                    <Button
                      className="btn-sm"
                      style={{
                        fontSize: "11px",
                        padding: "6px 12px",
                        opacity: appointment.status === "Confirmed" ? 1 : 0.5,
                        cursor:
                          appointment.status === "Confirmed"
                            ? "pointer"
                            : "not-allowed",
                      }}
                      disabled={appointment.status !== "Confirmed"}
                      onClick={() => {
                        console.log(
                          "🖱️ Nút Start Now được nhấn cho appointment:",
                          appointment
                        );
                        if (appointment.status === "Confirmed") {
                          console.log(
                            "✅ Status confirmed, gọi handleStartAppointment"
                          );
                          handleStartAppointment(appointment);
                        } else {
                          console.log(
                            "❌ Status không phải Confirmed:",
                            appointment.status
                          );
                        }
                      }}
                    >
                      Start Now
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
export default DoctorAppointmentList;
