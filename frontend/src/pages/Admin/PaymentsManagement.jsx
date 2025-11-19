import React, { useEffect, useMemo, useState } from "react";
import paymentApi from "../../api/paymentApi"; // API thanh toán
// import TSX if supported; fallback to JS implementation
import ExportAllPdfButton from "../../components/common/ExportAllPdfButton";

// helper tải blob
const downloadBlob = (data, filename) => {
  const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const PaymentsManagement = () => {
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState("");
  const [patientNameFilter, setPatientNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState("");   // YYYY-MM-DD
  const [sortField, setSortField] = useState("paymentId");
  const [sortOrder, setSortOrder] = useState("desc"); // asc | desc
  const [exportId, setExportId] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50); // Lấy nhiều records mặc định
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchPayments = async () => {
    setLoading(true);
    setError("");
    try {
      let data;
      if (patientId && patientId.trim() !== "") {
        // Nếu có patientId thì filter theo patientId
        const response = await paymentApi.getPaymentsByPatientId(Number(patientId));
        data = response.data || response;
        setPayments(Array.isArray(data) ? data : []);
        setTotalPages(1);
        setTotalElements(Array.isArray(data) ? data.length : 0);
      } else {
        // Nếu không có patientId thì lấy tất cả với pagination
        const response = await paymentApi.getAllPayments(page, size);
        if (response.data) {
          // Handle Page response
          if (response.data.content) {
            setPayments(Array.isArray(response.data.content) ? response.data.content : []);
            setTotalPages(response.data.totalPages || 0);
            setTotalElements(response.data.totalElements || 0);
          } else if (Array.isArray(response.data)) {
            // Fallback nếu response trả về array trực tiếp
            setPayments(response.data);
            setTotalPages(1);
            setTotalElements(response.data.length);
          } else {
            setPayments([]);
            setTotalPages(0);
            setTotalElements(0);
          }
        } else if (Array.isArray(response)) {
          // Nếu response là array trực tiếp
          setPayments(response);
          setTotalPages(1);
          setTotalElements(response.length);
        } else {
          setPayments([]);
          setTotalPages(0);
          setTotalElements(0);
        }
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không thể tải lịch sử thanh toán");
      setPayments([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  // Load payments khi component mount hoặc khi patientId/page thay đổi
  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, page, size]);

  const displayedPayments = useMemo(() => {
    let rows = Array.isArray(payments) ? [...payments] : [];
    if (appointmentFilter) {
      const q = appointmentFilter.toString().trim().toLowerCase();
      rows = rows.filter((p) => {
        const apptId = (p.appointmentId || p.appointment?.appointmentId || "").toString().toLowerCase();
        return apptId.includes(q);
      });
    }
    if (patientNameFilter) {
      const qn = patientNameFilter.toString().trim().toLowerCase();
      rows = rows.filter((p) => (p.patientName || "").toString().toLowerCase().includes(qn));
    }
    if (dateFrom || dateTo) {
      const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
      const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
      rows = rows.filter((p) => {
        const ts = p.createdAt ? new Date(p.createdAt).getTime() : null;
        if (ts == null) return false;
        if (fromTs != null && ts < fromTs) return false;
        if (toTs != null && ts > toTs) return false;
        return true;
      });
    }
    rows.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      const getVal = (r) => {
        if (sortField === "amount") return Number(r.amount || 0);
        if (sortField === "status") return (r.status || "").toString();
        if (sortField === "appointmentId") return Number(r.appointmentId || r.appointment?.appointmentId || 0);
        if (sortField === "id" || sortField === "paymentId") return Number(r.paymentId || r.id || 0);
        if (sortField === "createdAt") return new Date(r.createdAt || 0).getTime();
        if (sortField === "paidAt") return new Date(r.paidAt || 0).getTime();
        if (sortField === "patientName") return (r.patientName || "").toString().toLowerCase();
        if (sortField === "doctorName") return (r.doctorName || "").toString().toLowerCase();
        // Default to paymentId sorting
        return Number(r.paymentId || r.id || 0);
      };
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [payments, appointmentFilter, patientNameFilter, dateFrom, dateTo, sortField, sortOrder]);

  const handleExportInvoice = async (id) => {
    if (!id) return;
    const res = await paymentApi.exportInvoicePdf(id); // <-- dùng paymentApi
    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice-${id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Breadcrumb removed as requested */}

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1 fw-bold text-dark">
                <i className="bi bi-credit-card-2-front text-primary me-2"></i>
                Quản lý thanh toán
              </h2>
            </div>
            <div className="d-flex gap-2">
              <ExportAllPdfButton
                title="Danh sách thanh toán"
                fileName="payments-all"
                columns={["Payment ID","Appointment ID","Bệnh nhân","Bác sĩ","Số tiền","Trạng thái","PayOS Code","Tạo lúc","Thanh toán lúc","Mô tả","Lý do lỗi"]}
                getRows={async () => {
                  // Nếu đang filter theo patientId thì chỉ xuất những gì hiển thị
                  const collect = [];
                  if (patientId) {
                    collect.push(...displayedPayments);
                  } else {
                    // Lấy tất cả các trang
                    let current = 0;
                    const pageSize = 200; // kích thước lớn để giảm số lần gọi
                    while (true) {
                      const res = await paymentApi.getAllPayments(current, pageSize);
                      const content = res.data?.content || (Array.isArray(res.data) ? res.data : []);
                      collect.push(...content);
                      const tp = res.data?.totalPages || 1;
                      current++;
                      if (current >= tp) break;
                    }
                  }
                  // Map thành rows 2D
                  return collect.map(p => [
                    p.paymentId || p.id || '',
                    p.appointmentId || p.appointment?.appointmentId || '',
                    p.patientName || p.patientId || '',
                    p.doctorName || '',
                    `${(p.amount || 0).toLocaleString('vi-VN')} ${p.currency || 'VND'}`,
                    p.status || '',
                    p.payOSCode || '',
                    p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '',
                    p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : '',
                    p.description || '',
                    p.failureReason || ''
                  ]);
                }}
                className="btn btn-sm btn-outline-secondary"
              />
              <ExportAllPdfButton
                title="Danh sách thanh toán (lọc)"
                fileName="payments-filtered"
                columns={["Payment ID","Appointment ID","Bệnh nhân","Bác sĩ","Số tiền","Trạng thái","PayOS Code","Tạo lúc","Thanh toán lúc","Mô tả","Lý do lỗi"]}
                getRows={() =>
                  (displayedPayments || []).map(p => [
                    p.paymentId || p.id || '',
                    p.appointmentId || p.appointment?.appointmentId || '',
                    p.patientName || p.patientId || '',
                    p.doctorName || '',
                    `${(p.amount || 0).toLocaleString('vi-VN')} ${p.currency || 'VND'}`,
                    p.status || '',
                    p.payOSCode || '',
                    p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '',
                    p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : '',
                    p.description || '',
                    p.failureReason || ''
                  ])
                }
                className="btn btn-sm btn-primary"
              >
                <i className="bi bi-funnel me-2" />Xuất theo lọc
              </ExportAllPdfButton>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="card-title mb-1 fw-bold text-dark">
                    <i className="bi bi-receipt-cutoff text-primary me-2"></i>
                    Danh sách thanh toán
                  </h5>
                  
                </div>
              </div>
              
              {/* Toolbar lọc gọn gàng */}
              <div className="row g-2">
                <div className="col-md-2">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="ID Bệnh nhân..."
                    value={patientId}
                    onChange={(e) => {
                      setPatientId(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Mã lịch hẹn..."
                    value={appointmentFilter}
                    onChange={(e) => setAppointmentFilter(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Tên bệnh nhân..."
                    value={patientNameFilter}
                    onChange={(e) => setPatientNameFilter(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    placeholder="Từ ngày"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    placeholder="Đến ngày"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select 
                    className="form-select form-select-sm" 
                    value={sortField} 
                    onChange={(e) => setSortField(e.target.value)}
                  >
                    <option value="paymentId">Payment ID</option>
                    <option value="appointmentId">Appointment ID</option>
                    <option value="amount">Số tiền</option>
                    <option value="status">Trạng thái</option>
                    <option value="createdAt">Thời gian tạo</option>
                    <option value="paidAt">Thời gian thanh toán</option>
                    <option value="patientName">Tên bệnh nhân</option>
                    <option value="doctorName">Tên bác sĩ</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select 
                    className="form-select form-select-sm" 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="desc">Giảm dần</option>
                    <option value="asc">Tăng dần</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <div className="d-flex gap-2 align-items-end">
                    <div className="d-flex gap-1 flex-shrink-0">
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={fetchPayments} 
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <i className="bi bi-search"></i>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => { 
                          setPatientId(""); 
                          setAppointmentFilter("");
                          setPatientNameFilter("");
                          setDateFrom("");
                          setDateTo("");
                          setPage(0);
                        }}
                        disabled={loading}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                    <div className="input-group input-group-sm flex-grow-1">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Payment ID xuất PDF..."
                        value={exportId}
                        onChange={(e) => setExportId(e.target.value)}
                      />
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleExportInvoice(exportId)}
                        disabled={!exportId}
                      >
                        <i className="bi bi-download me-1"></i>
                        Xuất
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError("")}></button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                  <p className="text-muted">Đang tải dữ liệu thanh toán...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="fw-semibold">Payment ID</th>
                        <th className="fw-semibold">Appointment ID</th>
                        <th className="fw-semibold">Bệnh nhân</th>
                        <th className="fw-semibold">Bác sĩ</th>
                        <th className="fw-semibold">Số tiền</th>
                        <th className="fw-semibold">Mô tả</th>
                        <th className="fw-semibold">Trạng thái</th>
                        <th className="fw-semibold">PayOS Code</th>
                        <th className="fw-semibold">Tạo lúc</th>
                        <th className="fw-semibold">Thanh toán lúc</th>
                        <th className="fw-semibold">Lỗi</th>
                        <th className="fw-semibold text-end">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(displayedPayments || []).length === 0 ? (
                        <tr>
                          <td colSpan="12" className="text-center py-5">
                            <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                            <p className="text-muted mt-3 mb-0">Không có dữ liệu</p>
                          </td>
                        </tr>
                      ) : (
                        displayedPayments.map((p) => (
                          <tr key={p.paymentId}>
                            <td>
                              <span className="fw-bold text-primary">#{p.paymentId}</span>
                            </td>
                            <td>{p.appointmentId || p.appointment?.appointmentId || '-'}</td>
                            <td>
                              {p.patientName ? (
                                <span>{p.patientName}</span>
                              ) : p.patientId ? (
                                <span className="text-muted">ID: {p.patientId}</span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              {p.doctorName ? (
                                <span>{p.doctorName}</span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              <span className="fw-semibold text-success">
                                {(p.amount || 0).toLocaleString('vi-VN')} {p.currency || 'VND'}
                              </span>
                            </td>
                            <td>
                              <small className="text-muted" title={p.description}>
                                {p.description || '-'}
                              </small>
                            </td>
                            <td>
                              <span className={`badge ${
                                p.status === 'PAID' || p.status === 'Paid' ? 'bg-success' : 
                                p.status === 'FAILED' || p.status === 'Failed' ? 'bg-danger' : 
                                p.status === 'PENDING' || p.status === 'Pending' ? 'bg-warning text-dark' : 
                                'bg-secondary'
                              }`}>
                                {p.status || '-'}
                              </span>
                            </td>
                            <td>
                              {p.payOSCode ? (
                                <small className="text-primary">{p.payOSCode}</small>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              <small className="text-muted">
                                {p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '-'}
                              </small>
                            </td>
                            <td>
                              {p.paidAt ? (
                                <small className="text-success">
                                  {new Date(p.paidAt).toLocaleString('vi-VN')}
                                </small>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              {p.failureReason ? (
                                <small className="text-danger" title={p.failureReason}>
                                  <i className="bi bi-exclamation-triangle"></i>
                                </small>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleExportInvoice(p.paymentId)}
                              >
                                <i className="bi bi-file-earmark-pdf me-1"></i>
                                PDF
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
              
            {/* Pagination - Chỉ hiển thị khi không filter theo patientId */}
            {!patientId && totalPages > 1 && (
              <div className="card-footer bg-white border-top">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <label className="mb-0 text-muted small">Số bản ghi mỗi trang:</label>
                    <select 
                      className="form-select form-select-sm" 
                      style={{ width: '90px' }}
                      value={size}
                      onChange={(e) => {
                        setSize(Number(e.target.value));
                        setPage(0);
                      }}
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0 || loading}
                    >
                      <i className="bi bi-chevron-left me-1"></i>
                      Trước
                    </button>
                    <span className="text-muted px-3">
                      Trang <strong>{page + 1}</strong> / {totalPages}
                    </span>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1 || loading}
                    >
                      Sau
                      <i className="bi bi-chevron-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsManagement;


