import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import doctorApi from "../../api/doctorApi";
import appointmentApi from "../../api/appointmentApi";

const AppointmentsManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointments, setSelectedAppointments] = useState([]);

  const getStatusBadge = (status) => {
    const statusMap = {
      'Scheduled': { class: 'bg-info text-white', text: 'Đã đặt', color: '#0dcaf0' },
      'Confirmed': { class: 'bg-primary text-white', text: 'Đã xác nhận', color: '#0d6efd' },
      'Completed': { class: 'bg-success text-white', text: 'Hoàn thành', color: '#198754' },
      'Cancelled': { class: 'bg-danger text-white', text: 'Đã hủy', color: '#dc3545' },
      'Rejected': { class: 'bg-danger text-white', text: 'Từ chối', color: '#dc3545' },
      'Schedule': { class: 'bg-secondary text-white', text: 'Lịch trình', color: '#6c757d' },
      'Available': { class: 'bg-secondary text-white', text: 'Trống', color: '#6c757d' },
    };
    const config = statusMap[status] || { class: 'bg-secondary text-white', text: status || 'Không xác định', color: '#6c757d' };
    return config;
  };

  useEffect(() => {
    doctorApi.getAllDoctors().then(res => setDoctors(Array.isArray(res.data) ? res.data : (res.data?.content ?? []))).catch(() => {});
  }, []);

  const fetchAppointments = async () => {
    if (!doctorId) { setAppointments([]); return; }
    setLoading(true);
    setError("");
    try {
      const data = await appointmentApi.getAppointmentsByDoctor(Number(doctorId)).then(r => r.data ?? r);
      const appointmentsList = Array.isArray(data) ? data : [];
      setAppointments(appointmentsList.sort((a, b) => a.id - b.id));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không thể tải lịch hẹn");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, currentMonth]);

  const daysInMonth = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const days = [];
    const startWeekday = (start.getDay() + 6) % 7;
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= end.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    appointments.forEach(a => {
      const dateStr = a.startTime ? new Date(a.startTime).toDateString() : null;
      if (!dateStr) return;
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr).push(a);
    });
    return map;
  }, [appointments]);

  const changeMonth = (delta) => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + delta);
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const title = `${currentMonth.toLocaleString('vi-VN', { month: 'long' })} ${currentMonth.getFullYear()}`;
  const today = new Date();
  const isToday = (date) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="container-fluid py-4">
      <style>{`
        .calendar-day {
          min-height: 120px;
          padding: 10px 8px !important;
          border: 1px solid #e9ecef !important;
          vertical-align: top;
          background: white;
          transition: all 0.15s ease;
        }
        .calendar-day:hover:not(.calendar-today):not(.calendar-other-month) {
          background-color: #f8f9fa !important;
        }
        .calendar-today {
          background: #e7f1ff !important;
          border: 2px solid #0d6efd !important;
        }
        .calendar-other-month {
          background: #f8f9fa;
          opacity: 0.6;
        }
        .calendar-header th {
          background: #f8f9fa;
          color: #495057;
          font-weight: 600;
          padding: 10px 8px;
          border: 1px solid #dee2e6 !important;
        }
        .day-number {
          font-weight: 600;
          font-size: 0.9rem;
          color: #212529;
        }
      `}</style>

      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h2 className="mb-0 fw-bold">
                <i className="bi bi-calendar-check-fill text-primary me-2"></i>
                Lịch hẹn của  bác sĩ
              </h2>
            </div>
            <div className="d-flex align-items-center gap-4">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label fw-semibold mb-0" htmlFor="doctor" style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                  Chọn bác sĩ:
                </label>
                <select 
                  id="doctor" 
                  className="form-select" 
                  value={doctorId} 
                  onChange={(e) => setDoctorId(e.target.value)}
                  style={{ 
                    width: '200px',
                    fontSize: '0.875rem',
                    height: '38px'
                  }}
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {doctors.map(d => (
                    <option key={d.doctorId || d.id} value={d.doctorId || d.id}>
                      {d.user?.firstName ? `${d.user.firstName} ${d.user.lastName || ''}` : (d.fullName || d.name || `Bác sĩ #${d.doctorId || d.id}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => changeMonth(-1)}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <div 
                  className="border rounded d-flex align-items-center justify-content-center" 
                  style={{ 
                    width: '200px',
                    height: '38px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderColor: '#dee2e6',
                    backgroundColor: 'white'
                  }}
                >
                  {title}
                </div>
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => changeMonth(1)}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
                <button 
                  className="btn btn-sm btn-primary" 
                  onClick={fetchAppointments} 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <i className="bi bi-arrow-clockwise"></i>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError("")}></button>
            </div>
          )}

          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                  <p className="text-muted mb-0">Đang tải lịch hẹn...</p>
                </div>
              ) : !doctorId ? (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x text-muted" style={{ fontSize: '4rem' }}></i>
                  <p className="text-muted mt-3 mb-0">Vui lòng chọn bác sĩ để xem lịch hẹn</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr className="calendar-header">
                        <th>Thứ 2</th>
                        <th>Thứ 3</th>
                        <th>Thứ 4</th>
                        <th>Thứ 5</th>
                        <th>Thứ 6</th>
                        <th>Thứ 7</th>
                        <th>Chủ nhật</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: daysInMonth.length / 7 }).map((_, weekIdx) => (
                        <tr key={weekIdx}>
                          {daysInMonth.slice(weekIdx * 7, weekIdx * 7 + 7).map((date, idx) => {
                            const key = date ? date.toDateString() : `empty-${weekIdx}-${idx}`;
                            const events = date ? (eventsByDay.get(date.toDateString()) || []) : [];
                            const isTodayDate = isToday(date);
                            const isPastMonth = date && date.getMonth() !== currentMonth.getMonth();
                            
                            // Tính số slot đã đặt và trống
                            const bookedCount = events.filter(ev => ev.patientId != null && ev.status !== 'Schedule').length;
                            const emptyCount = events.filter(ev => ev.patientId == null || ev.status === 'Schedule').length;
                            
                            return (
                              <td 
                                key={key} 
                                className={`calendar-day ${isTodayDate ? 'calendar-today' : ''} ${isPastMonth ? 'calendar-other-month' : ''}`}
                                style={{ cursor: events.length > 0 ? 'pointer' : 'default' }}
                                onClick={() => {
                                  if (events.length > 0 && date) {
                                    setSelectedDate(date);
                                    setSelectedAppointments(events);
                                  }
                                }}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className={`day-number ${isTodayDate ? 'text-white' : ''}`}>
                                    {date ? date.getDate() : ""}
                                  </span>
                                </div>
                                {events.length > 0 ? (
                                  <div className="d-flex flex-column gap-1 mt-2">
                                    {bookedCount > 0 && (
                                      <div 
                                        className="d-flex align-items-center justify-content-center px-2 py-1 rounded"
                                        style={{ 
                                          background: '#28a745',
                                          color: 'white',
                                          border: '1px solid #1e7e34',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        <i className="bi bi-check-circle-fill me-1" style={{ fontSize: '0.7rem' }}></i>
                                        <span className="fw-semibold">
                                          Đã đặt: {bookedCount}
                                        </span>
                                      </div>
                                    )}
                                    {emptyCount > 0 && (
                                      <div 
                                        className="d-flex align-items-center justify-content-center px-2 py-1 rounded"
                                        style={{ 
                                          background: '#17a2b8',
                                          color: 'white',
                                          border: '1px solid #138496',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.7rem' }}></i>
                                        <span className="fw-semibold">
                                          Trống: {emptyCount}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className={`text-center mt-3 ${isTodayDate ? 'text-white opacity-75' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                                    Không có
                                </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Detail modal - Danh sách appointments của ngày */}
          {selectedDate && selectedAppointments.length > 0 && createPortal(
            <div 
              className="modal d-block" 
              tabIndex="-1" 
              role="dialog" 
              onClick={() => {
                setSelectedDate(null);
                setSelectedAppointments([]);
              }}
              style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
                padding: 0
              }}
            >
              <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content border-0 shadow-lg">
                  <div className="modal-header bg-primary text-white border-0">
                    <h5 className="modal-title mb-0 fw-bold">
                      <i className="bi bi-calendar-event-fill me-2"></i>
                      Lịch hẹn ngày {selectedDate.toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => {
                      setSelectedDate(null);
                      setSelectedAppointments([]);
                    }}></button>
                  </div>
                  <div className="modal-body pt-3">
                    <div className="d-flex gap-2 mb-3">
                      <span className="badge bg-success">
                        Đã đặt: {selectedAppointments.filter(ev => ev.patientId != null && ev.status !== 'Schedule').length}
                      </span>
                      <span className="badge bg-secondary">
                        Trống: {selectedAppointments.filter(ev => ev.patientId == null || ev.status === 'Schedule').length}
                      </span>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="fw-semibold" style={{ width: '60px' }}>ID</th>
                            <th className="fw-semibold" style={{ width: '120px' }}>Thời gian</th>
                            <th className="fw-semibold">Bệnh nhân</th>
                            <th className="fw-semibold" style={{ width: '100px' }}>Trạng thái</th>
                            <th className="fw-semibold" style={{ width: '100px' }}>Phí</th>
                            <th className="fw-semibold">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAppointments.sort((a, b) => {
                            const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
                            const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
                            return timeA - timeB;
                          }).map((appointment, index) => {
                            const statusConfig = getStatusBadge(appointment.status);
                            const isBooked = appointment.patientId != null && appointment.status !== 'Schedule';
                            return (
                              <tr 
                                key={appointment.appointmentId} 
                                className={isBooked ? '' : ''}
                                style={{ 
                                  cursor: 'default',
                                  transition: 'background-color 0.15s ease',
                                  backgroundColor: isBooked ? 'rgba(40, 167, 69, 0.05)' : 'transparent'
                                }}
                              >
                                <td>
                                  <span className="fw-semibold">#{appointment.appointmentId}</span>
                                </td>
                                <td>
                                  <div>
                                    {appointment.startTime ? new Date(appointment.startTime).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : ''}
                                    {appointment.endTime && ` - ${new Date(appointment.endTime).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}`}
                                  </div>
                                </td>
                                <td>
                                  {appointment.patientName ? (
                                    <div>
                                      <div className="fw-semibold">{appointment.patientName}</div>
                                      {appointment.patientId && (
                                        <small className="text-muted">ID: {appointment.patientId}</small>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${statusConfig.class}`}>
                                    {statusConfig.text}
                                  </span>
                                </td>
                                <td>
                                  {appointment.fee ? (
                                    <span className="fw-semibold">
                                      {Number(appointment.fee).toLocaleString('vi-VN')} đ
                                    </span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  {appointment.notes ? (
                                    <small className="text-muted" title={appointment.notes}>
                                      {appointment.notes.length > 30 
                                        ? appointment.notes.substring(0, 30) + '...' 
                                        : appointment.notes}
                                    </small>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      setSelectedDate(null);
                      setSelectedAppointments([]);
                    }}>
                      <i className="bi bi-x-circle me-1"></i>
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentsManagement;