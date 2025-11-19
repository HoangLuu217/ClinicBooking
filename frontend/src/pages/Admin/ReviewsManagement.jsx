import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import reviewApi from "../../api/reviewApi";
import userApi from "../../api/userApi";
import doctorApi from "../../api/doctorApi";

const ReviewsManagement = () => {
  const [filters, setFilters] = useState({ doctorId: "", patientId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [patientDetail, setPatientDetail] = useState(null);
  const [doctorDetail, setDoctorDetail] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    setError("");
    try {
      // Priority: if doctorId set -> fetch doctor reviews; else if patientId -> fetch patient reviews; else empty
      let data = [];
      if (filters.doctorId) {
        data = await reviewApi.getByDoctor(Number(filters.doctorId));
      } else if (filters.patientId) {
        data = await reviewApi.getByPatient(Number(filters.patientId));
      } else {
        // No filters -> fetch all
        data = await reviewApi.getAll();
      }
      const reviewsList = Array.isArray(data) ? data : [];
      // Sort reviews by ReviewID
      setReviews(reviewsList.sort((a, b) => (a?.reviewId || 0) - (b?.reviewId || 0)));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Đã xảy ra lỗi");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto fetch when filters change if either doctorId or patientId present
    // Always fetch when filters change; if none provided, fetch all
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.doctorId, filters.patientId]);

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    try {
      setActionLoading(true);
      setError("");
      await reviewApi.delete(selectedReview.reviewId);
      setShowDeleteModal(false);
      setSelectedReview(null);
      // Refresh reviews list
      await fetchReviews();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không thể xóa đánh giá");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!selectedReview) return;
    try {
      setActionLoading(true);
      setError("");
      const newStatus = selectedReview.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await reviewApi.update(selectedReview.reviewId, { status: newStatus });
      setShowStatusModal(false);
      setSelectedReview(null);
      // Refresh reviews list
      await fetchReviews();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không thể thay đổi trạng thái");
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (review) => {
    setSelectedReview(review);
    setShowDeleteModal(true);
  };

  const openStatusModal = (review) => {
    setSelectedReview(review);
    setShowStatusModal(true);
  };

  const openPatientProfile = async (patientId) => {
    if (!patientId) return;
    try {
      setProfileLoading(true);
      const res = await userApi.getUserById(Number(patientId));
      setPatientDetail(res.data || res);
      setShowPatientModal(true);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không thể tải hồ sơ bệnh nhân");
    } finally {
      setProfileLoading(false);
    }
  };

  const openDoctorProfile = async (doctorId) => {
    if (!doctorId) return;
    try {
      setProfileLoading(true);
      const res = await doctorApi.getDoctorById(Number(doctorId));
      setDoctorDetail(res.data || res);
      setShowDoctorModal(true);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không thể tải hồ sơ bác sĩ");
    } finally {
      setProfileLoading(false);
    }
  };

  // No status filtering

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Breadcrumb removed as requested */}

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">Quản lý đánh giá</h2>
              <p className="text-muted mb-0">Tìm kiếm và quản lý đánh giá của bệnh nhân/ bác sĩ</p>
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="card-title mb-0"><i className="bi bi-search me-2"></i>Tìm kiếm đánh giá</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label htmlFor="doctorId" className="form-label">ID Bác sĩ</label>
                  <input
                    id="doctorId"
                    type="number"
                    className="form-control"
                    value={filters.doctorId}
                    onChange={(e) => setFilters((p) => ({ ...p, doctorId: e.target.value }))}
                    placeholder="Nhập ID bác sĩ"
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="patientId" className="form-label">ID Bệnh nhân</label>
                  <input
                    id="patientId"
                    type="number"
                    className="form-control"
                    value={filters.patientId}
                    onChange={(e) => setFilters((p) => ({ ...p, patientId: e.target.value }))}
                    placeholder="Nhập ID bệnh nhân"
                  />
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <div className="btn-group w-100">
                    <button className="btn btn-primary" onClick={fetchReviews} disabled={loading}>
                      <i className="bi bi-search"></i> Tìm
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setFilters({ doctorId: "", patientId: "" })}
                      disabled={loading}
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-text mt-2">Điền 1 trong 2: ID bác sĩ hoặc ID bệnh nhân để tìm.</div>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0"><i className="bi bi-star-half me-2"></i>Danh sách đánh giá</h5>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">{error}</div>
              )}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status"/>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Bệnh nhân</th>
                        <th>Bác sĩ</th>
                        <th>Đánh giá</th>
                        <th>Bình luận</th>
                        <th>Tạo lúc</th>
                        <th>Trạng thái</th>
                        <th className="text-end">Hồ sơ</th>
                        <th className="text-end">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center text-muted py-4">Không có dữ liệu</td>
                        </tr>
                      ) : (
                        reviews.map((r) => (
                          <tr key={r.reviewId}>
                            <td>{r.reviewId}</td>
                            <td>
                              <button type="button" className="btn btn-link p-0 text-decoration-none" onClick={() => openPatientProfile(r.patientId)}>
                                {r.patientName}
                              </button>
                              <small className="text-muted"> (ID {r.patientId})</small>
                            </td>
                            <td>
                              <button type="button" className="btn btn-link p-0 text-decoration-none" onClick={() => openDoctorProfile(r.doctorId)}>
                                {r.doctorName}
                              </button>
                              <small className="text-muted"> (ID {r.doctorId})</small>
                            </td>
                            <td>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <i key={i} className={`bi ${i < (r.rating || 0) ? "bi-star-fill text-warning" : "bi-star"}`}></i>
                              ))}
                            </td>
                            <td style={{ maxWidth: 320 }}>
                              <span title={r.comment}>{r.comment}</span>
                            </td>
                            <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
                            <td>
                              <span className={`badge ${r.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>{r.status}</span>
                            </td>
                            <td className="text-end">
                              <div className="btn-group">
                                <button className="btn btn-sm btn-outline-primary" onClick={() => openPatientProfile(r.patientId)}>
                                  <i className="bi bi-person"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => openDoctorProfile(r.doctorId)}>
                                  <i className="bi bi-person-badge"></i>
                                </button>
                              </div>
                            </td>
                            <td className="text-end">
                              <div className="btn-group">
                                <button
                                  className={`btn btn-sm ${r.status === "ACTIVE" ? "btn-outline-warning" : "btn-outline-success"}`}
                                  onClick={() => openStatusModal(r)}
                                  disabled={actionLoading}
                                  title={r.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}
                                >
                                  <i className={`bi ${r.status === "ACTIVE" ? "bi-toggle-off" : "bi-toggle-on"}`}></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => openDeleteModal(r)}
                                  disabled={actionLoading}
                                  title="Xóa"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Read-only profile modals */}
      <PatientProfileModal
        show={showPatientModal}
        onHide={() => setShowPatientModal(false)}
        user={patientDetail}
        loading={profileLoading}
      />
      <DoctorProfileModal
        show={showDoctorModal}
        onHide={() => setShowDoctorModal(false)}
        doctor={doctorDetail}
        loading={profileLoading}
      />

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => !actionLoading && setShowDeleteModal(false)} centered>
        <Modal.Header closeButton={!actionLoading}>
          <Modal.Title>Xác nhận xóa đánh giá</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReview && (
            <div>
              <p>Bạn có chắc chắn muốn xóa đánh giá này?</p>
              <div className="alert alert-warning mb-0">
                <strong>ID:</strong> {selectedReview.reviewId}<br />
                <strong>Bệnh nhân:</strong> {selectedReview.patientName}<br />
                <strong>Bác sĩ:</strong> {selectedReview.doctorName}<br />
                <strong>Đánh giá:</strong> {selectedReview.rating}/5
              </div>
              <p className="text-danger mt-2 mb-0"><small>Hành động này không thể hoàn tác!</small></p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={actionLoading}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDeleteReview} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang xóa...
              </>
            ) : (
              "Xóa"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Status Change Confirmation Modal */}
      <Modal show={showStatusModal} onHide={() => !actionLoading && setShowStatusModal(false)} centered>
        <Modal.Header closeButton={!actionLoading}>
          <Modal.Title>Thay đổi trạng thái đánh giá</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReview && (
            <div>
              <p>Bạn có chắc chắn muốn thay đổi trạng thái đánh giá này?</p>
              <div className="alert alert-info mb-0">
                <strong>ID:</strong> {selectedReview.reviewId}<br />
                <strong>Bệnh nhân:</strong> {selectedReview.patientName}<br />
                <strong>Bác sĩ:</strong> {selectedReview.doctorName}<br />
                <strong>Trạng thái hiện tại:</strong>{" "}
                <span className={`badge ${selectedReview.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>
                  {selectedReview.status}
                </span>
                <br />
                <strong>Trạng thái mới:</strong>{" "}
                <span className={`badge ${selectedReview.status === "ACTIVE" ? "bg-secondary" : "bg-success"}`}>
                  {selectedReview.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                </span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)} disabled={actionLoading}>
            Hủy
          </Button>
          <Button
            variant={selectedReview?.status === "ACTIVE" ? "warning" : "success"}
            onClick={handleChangeStatus}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang cập nhật...
              </>
            ) : (
              selectedReview?.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ReviewsManagement;

// Read-only profile modals
export const PatientProfileModal = ({ show, onHide, user, loading }) => (
  <Modal show={show} onHide={onHide} size="md" centered>
    <Modal.Header closeButton>
      <Modal.Title>Hồ sơ Bệnh nhân</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {loading ? (
        <div className="text-center py-3"><div className="spinner-border" role="status"></div></div>
      ) : !user ? (
        <div className="text-muted">Không có dữ liệu</div>
      ) : (
        <div className="vstack gap-2">
          <div><strong>Họ tên:</strong> {user.firstName} {user.lastName}</div>
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>Điện thoại:</strong> {user.phone || "-"}</div>
          <div><strong>Địa chỉ:</strong> {user.address || "-"}</div>
          <div><strong>Trạng thái:</strong> <span className={`badge ${user.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>{user.status}</span></div>
        </div>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onHide}>Đóng</Button>
    </Modal.Footer>
  </Modal>
);

export const DoctorProfileModal = ({ show, onHide, doctor, loading }) => (
  <Modal show={show} onHide={onHide} size="md" centered>
    <Modal.Header closeButton>
      <Modal.Title>Hồ sơ Bác sĩ</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {loading ? (
        <div className="text-center py-3"><div className="spinner-border" role="status"></div></div>
      ) : !doctor ? (
        <div className="text-muted">Không có dữ liệu</div>
      ) : (
        <div className="vstack gap-2">
          <div><strong>Họ tên:</strong> {doctor.user?.firstName} {doctor.user?.lastName}</div>
          <div><strong>Email:</strong> {doctor.user?.email}</div>
          <div><strong>Điện thoại:</strong> {doctor.user?.phone || "-"}</div>
          <div><strong>Khoa:</strong> {doctor.department?.departmentName || "-"}</div>
          <div><strong>Chuyên khoa:</strong> {doctor.specialty || "-"}</div>
          <div><strong>Trạng thái:</strong> <span className={`badge ${doctor.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>{doctor.status}</span></div>
        </div>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onHide}>Đóng</Button>
    </Modal.Footer>
  </Modal>
);


