import React, { useState, useEffect, useMemo, useCallback } from "react";
import patientApi from "../../api/patientApi";
import appointmentApi from "../../api/appointmentApi";
import doctorApi from "../../api/doctorApi";
import Cookies from "js-cookie";
import {
  Search,
  Filter,
  User,
  Mail,
  Phone,
  Calendar,
  MessageCircle,
  FileText,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

// UI components
const Button = (props) => (
  <button
    {...props}
    className={`btn ${props.variant === "outline" ? "btn-outline-primary" : "btn-primary"
      } ${props.className || ""}`}
  >
    {props.children}
  </button>
);

const Input = (props) => (
  <input {...props} className={`form-control ${props.className || ""}`} />
);

const Badge = ({ children, className, variant = "light" }) => (
  <span className={`badge bg-${variant} text-dark ${className || ""}`}>
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

function DoctorPatientManagement() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetail, setShowPatientDetail] = useState(false);

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
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }, []);

  // Fetch patients with appointments
  const fetchPatients = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      // Lấy tất cả appointments của bác sĩ với timeout
      const appointmentsRes = await withTimeout(
        appointmentApi.getAppointmentsByDoctor(doctorId),
        10000
      );
      
      const appointmentsData = appointmentsRes?.data || [];
      
      // Lấy danh sách patient IDs từ appointments
      const patientIds = [...new Set(
        appointmentsData
          .filter(appointment => appointment.patientId !== null)
          .map(appointment => appointment.patientId)
      )];

      // Lấy thông tin chi tiết của từng patient với timeout
      const patientsWithDetails = await Promise.allSettled(
        patientIds.map(async (patientId) => {
          try {
            const patientRes = await withTimeout(
              patientApi.getPatientById(patientId),
              5000
            );
            const patient = patientRes?.data || patientRes;
            
            // Lấy appointments của patient này với bác sĩ
            const patientAppointments = appointmentsData.filter(
              appointment => appointment.patientId === patientId
            );

            // Tính toán thống kê
            const totalAppointments = patientAppointments.length;
            const completedAppointments = patientAppointments.filter(
              appointment => appointment.status === "Completed"
            ).length;
            const upcomingAppointments = patientAppointments.filter(
              appointment => ["Scheduled", "Confirmed"].includes(appointment.status)
            ).length;
            const lastAppointment = patientAppointments
              .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];

            return {
              ...patient,
              patientId,
              totalAppointments,
              completedAppointments,
              upcomingAppointments,
              lastAppointment,
              patientName: patient.user?.lastName + " " + patient.user?.firstName ||
                          patient.lastName + " " + patient.firstName ||
                          "Không rõ",
              patientEmail: patient.user?.email || "",
              patientPhone: patient.user?.phone || "",
              patientAvatar: patient.user?.avatarUrl || "",
            };
          } catch (error) {
            console.error(`Error fetching patient ${patientId}:`, error);
            return null;
          }
        })
      );

      // Filter out null results
      const validPatients = patientsWithDetails.filter(patient => patient !== null);
      setPatients(validPatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, withTimeout]);

  useEffect(() => {
    if (doctorId) {
      fetchPatients();
    }
  }, [doctorId, fetchPatients]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          patient.patientName?.toLowerCase().includes(query) ||
          patient.patientEmail?.toLowerCase().includes(query) ||
          patient.patientPhone?.includes(query) ||
          patient.healthInsuranceNumber?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus === "active") {
        return patient.upcomingAppointments > 0;
      }
      if (filterStatus === "completed") {
        return patient.completedAppointments > 0 && patient.upcomingAppointments === 0;
      }
      if (filterStatus === "new") {
        return patient.totalAppointments === 1;
      }

      return true;
    });
  }, [patients, searchQuery, filterStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: patients.length,
      active: patients.filter(p => p.upcomingAppointments > 0).length,
      completed: patients.filter(p => p.completedAppointments > 0 && p.upcomingAppointments === 0).length,
      new: patients.filter(p => p.totalAppointments === 1).length,
    };
  }, [patients]);

  // Handle view patient detail
  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    setShowPatientDetail(true);
  };

  // Handle send message
  const handleSendMessage = (patient) => {
    // Navigate to messages with patient
    window.location.href = `/doctor/messages?patientId=${patient.patientId}`;
  };

  // Render
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status"></div>
        <p className="mt-2">Đang tải danh sách bệnh nhân...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-4 shadow-sm p-4 border">
      <div className="mx-auto" style={{ maxWidth: 1500 }}>
        {/* Header */}
        <div className="mb-4 d-flex align-items-center justify-content-between">
          <h2 className="fw-bold">Quản lý bệnh nhân</h2>
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
                placeholder="Tìm kiếm bệnh nhân..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 32, width: 300 }}
              />
            </div>
            <select
              className="form-select"
              style={{ width: 150 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang điều trị</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="new">Bệnh nhân mới</option>
            </select>
          </div>
        </div>


        {/* Patients List */}
        <div className="space-y-4">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-5">
              <User className="mx-auto mb-3" size={48} color="#ccc" />
              <h5 className="text-muted">Không tìm thấy bệnh nhân</h5>
              <p className="text-muted">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.patientId}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Patient Avatar & Basic Info */}
                <div className="d-flex align-items-center gap-3" style={{ minWidth: "300px" }}>
                  <Avatar
                    size={60}
                    src={patient.patientAvatar || "/placeholder.svg"}
                    alt={patient.patientName}
                  >
                    {patient.patientName
                      ? patient.patientName.charAt(0).toUpperCase()
                      : "?"}
                  </Avatar>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h6 className="mb-0 fw-bold">{patient.patientName}</h6>
                      {patient.totalAppointments === 1 && (
                        <Badge variant="warning">Mới</Badge>
                      )}
                      {patient.upcomingAppointments > 0 && (
                        <Badge variant="success">Đang điều trị</Badge>
                      )}
                    </div>
                    {patient.healthInsuranceNumber && (
                      <small className="text-muted">
                        BHYT: {patient.healthInsuranceNumber}
                      </small>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="p-2" style={{ minWidth: "250px" }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Mail className="text-muted" size={14} />
                    <span className="small text-truncate">
                      {patient.patientEmail}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Phone className="text-muted" size={14} />
                    <span className="small">{patient.patientPhone}</span>
                  </div>
                </div>

                {/* Appointment Stats */}
                <div className="p-2" style={{ minWidth: "150px" }}>
                  <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted">Tổng lịch hẹn:</small>
                    <Badge variant="primary">{patient.totalAppointments}</Badge>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted">Đã hoàn thành:</small>
                    <Badge variant="success">{patient.completedAppointments}</Badge>
                  </div>
                  <div className="d-flex justify-content-between">
                    <small className="text-muted">Sắp tới:</small>
                    <Badge variant="info">{patient.upcomingAppointments}</Badge>
                  </div>
                </div>

                {/* Last Appointment */}
                <div className="p-2" style={{ minWidth: "200px" }}>
                  {patient.lastAppointment ? (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <Calendar className="text-muted" size={14} />
                        <small className="text-muted">Lần cuối:</small>
                      </div>
                      <div className="small">
                        {new Date(patient.lastAppointment.startTime).toLocaleDateString("vi-VN")}
                      </div>
                      <div className="small text-muted">
                        {new Date(patient.lastAppointment.startTime).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </>
                  ) : (
                    <small className="text-muted">Chưa có lịch hẹn</small>
                  )}
                </div>

                {/* Actions */}
                <div className="d-flex align-items-center gap-2" style={{ minWidth: "200px" }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewPatient(patient)}
                    className="d-flex align-items-center gap-1"
                  >
                    <Eye size={14} />
                    Chi tiết
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendMessage(patient)}
                    className="d-flex align-items-center gap-1"
                  >
                    <MessageCircle size={14} />
                    Nhắn tin
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Patient Detail Modal */}
        {showPatientDetail && selectedPatient && (
          <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Chi tiết bệnh nhân</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowPatientDetail(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-4 text-center">
                      <Avatar
                        size={100}
                        src={selectedPatient.patientAvatar || "/placeholder.svg"}
                        alt={selectedPatient.patientName}
                      >
                        {selectedPatient.patientName
                          ? selectedPatient.patientName.charAt(0).toUpperCase()
                          : "?"}
                      </Avatar>
                      <h5 className="mt-3">{selectedPatient.patientName}</h5>
                      {selectedPatient.healthInsuranceNumber && (
                        <p className="text-muted">
                          BHYT: {selectedPatient.healthInsuranceNumber}
                        </p>
                      )}
                    </div>
                    <div className="col-md-8">
                      <div className="row">
                        <div className="col-6">
                          <h6>Thông tin liên hệ</h6>
                          <p><Mail size={16} className="me-2" />{selectedPatient.patientEmail}</p>
                          <p><Phone size={16} className="me-2" />{selectedPatient.patientPhone}</p>
                        </div>
                        <div className="col-6">
                          <h6>Thống kê lịch hẹn</h6>
                          <p>Tổng: <Badge variant="primary">{selectedPatient.totalAppointments}</Badge></p>
                          <p>Hoàn thành: <Badge variant="success">{selectedPatient.completedAppointments}</Badge></p>
                          <p>Sắp tới: <Badge variant="info">{selectedPatient.upcomingAppointments}</Badge></p>
                        </div>
                      </div>
                      {selectedPatient.medicalHistory && (
                        <div className="mt-3">
                          <h6>Tiền sử bệnh</h6>
                          <p className="text-muted">{selectedPatient.medicalHistory}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <Button
                    variant="outline"
                    onClick={() => setShowPatientDetail(false)}
                  >
                    Đóng
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPatientDetail(false);
                      handleSendMessage(selectedPatient);
                    }}
                  >
                    <MessageCircle size={16} className="me-2" />
                    Nhắn tin
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorPatientManagement;
