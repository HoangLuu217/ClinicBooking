import React, { useState, useEffect, useMemo, useCallback } from "react";
import Cookies from "js-cookie";
import doctorApi from "../../api/doctorApi";
import reviewApi from "../../api/reviewApi";
import appointmentApi from "../../api/appointmentApi";

const DoctorReviews = () => {
  const [doctorId, setDoctorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [appointments, setAppointments] = useState({});
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    avgRating: 0,
    reviewCount: 0,
  });

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const fetchDoctorId = useCallback(async () => {
    const userId = Cookies.get("userId") || currentUser?.id;
    if (!userId) {
      setError(
        "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
      );
      setLoading(false);
      return;
    }

    try {
      const res = await doctorApi.getDoctorByUserId(userId);
      const data = res?.data || res;
      setDoctorId(data.doctorId);
    } catch (err) {
      console.error("Failed to load doctor data:", err);
      setError("Không lấy được thông tin bác sĩ. Vui lòng thử lại.");
      setLoading(false);
    }
  }, [currentUser]);

  const loadReviews = useCallback(async () => {
    if (!doctorId) return;

    try {
      setLoading(true);
      const [list, avg, count] = await Promise.all([
        reviewApi.getActiveByDoctor(doctorId),
        reviewApi.getAverageRatingByDoctor(doctorId),
        reviewApi.getReviewCountByDoctor(doctorId),
      ]);

      const normalized = Array.isArray(list) ? list : [];
      setReviews(normalized);
      setStats({
        avgRating: Number(avg) || 0,
        reviewCount: Number(count) || 0,
      });

      const uniqueAppointmentIds = Array.from(
        new Set(
          normalized
            .map((review) => review?.appointmentId)
            .filter((id) => id != null)
        )
      );

      if (uniqueAppointmentIds.length === 0) {
        setAppointments({});
      } else {
        const appointmentEntries = await Promise.all(
          uniqueAppointmentIds.map(async (id) => {
            try {
              const response = await appointmentApi.getAppointmentById(id);
              const data = response?.data || response;
              return [id, data];
            } catch (appointmentError) {
              console.error("Failed to load appointment", id, appointmentError);
              return [id, null];
            }
          })
        );

        const map = appointmentEntries.reduce((acc, [id, data]) => {
          if (data) {
            acc[id] = data;
          }
          return acc;
        }, {});

        setAppointments(map);
      }

      setError("");
    } catch (err) {
      console.error("Failed to load reviews:", err);
      setError("Không thể tải đánh giá. Vui lòng thử lại sau.");
      setAppointments({});
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchDoctorId();
  }, [fetchDoctorId]);

  useEffect(() => {
    if (doctorId) {
      loadReviews();
    }
  }, [doctorId, loadReviews]);

  const renderStars = (value) => {
    const ratingValue = Math.round(value || 0);
    return Array.from({ length: 5 }, (_, index) => (
      <i
        key={index}
        className={`bi ${
          index < ratingValue ? "bi-star-fill text-warning" : "bi-star text-muted"
        }`}
      ></i>
    ));
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
      return "Chưa cập nhật";
    }
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
      return "Chưa cập nhật";
    }
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAppointmentRange = (start, end) => {
    const startDate = new Date(start);
    if (!start || Number.isNaN(startDate.getTime())) {
      return "Chưa cập nhật";
    }

    if (!end) {
      return formatDateTime(startDate);
    }

    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) {
      return formatDateTime(startDate);
    }

    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();

    if (sameDay) {
      const startTime = startDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = endDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return `${startDate.toLocaleDateString(
        "vi-VN"
      )} - ${startTime} ~ ${endTime}`;
    }

    return `${formatDateTime(startDate)} → ${formatDateTime(endDate)}`;
  };

  const sortedReviews = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    return [...reviews].sort((a, b) => {
      const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [reviews]);

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button
          className="btn btn-outline-primary btn-sm "
          disabled={loading}
          onClick={loadReviews}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Tải lại
        </button>
      </div>

      <div className="row mb-3 g-3">
        <div className="col-md-4">
          <div className="card shadow-sm border-left-warning h-100">
            <div className="card-body p-3">
              <h6 className="text-uppercase text-muted mb-2 small">
                Điểm đánh giá trung bình
              </h6>
              <div className="d-flex align-items-center mb-1">
                <div className="h4 fw-bold me-2 mb-0">
                  {stats.avgRating ? stats.avgRating.toFixed(1) : "0.0"}
                </div>
                <div>{renderStars(stats.avgRating)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-left-success h-100">
            <div className="card-body p-3">
              <h6 className="text-uppercase text-muted mb-2 small">
                Tổng số đánh giá
              </h6>
              <div className="h4 fw-bold mb-1">{stats.reviewCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-left-info h-100">
            <div className="card-body p-3">
              <h6 className="text-uppercase text-muted mb-2 small">
                Trạng thái tải dữ liệu
              </h6>
              <div className="d-flex align-items-center">
                {loading ? (
                  <>
                    <div
                      className="spinner-border spinner-border-sm text-info me-2"
                      role="status"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span className="small">Đang tải đánh giá...</span>
                  </>
                ) : error ? (
                  <>
                    <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                    <span className="text-danger small">
                      Có lỗi khi tải đánh giá
                    </span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle text-success me-2"></i>
                    <span className="small">Đã cập nhật đánh giá</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow">
        <div className="card-header py-2">
          <h6 className="m-0 fw-bold text-primary">Danh sách đánh giá</h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger m-3 mb-0">{error}</div>
          ) : sortedReviews.length === 0 ? (
            <p className="text-muted mb-0 text-center py-4">
              Chưa có đánh giá nào từ bệnh nhân.
            </p>
          ) : (
            <div className="list-group list-group-flush">
              {sortedReviews.map((review) => {
                const appointmentInfo =
                  review.appointmentId != null
                    ? appointments[review.appointmentId]
                    : null;

                return (
                  <div key={review.reviewId} className="list-group-item py-3 px-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="mb-0 fw-semibold">
                        {review.patientName || "Bệnh nhân ẩn danh"}
                      </h6>
                      <small className="text-muted">
                        {formatDate(review.createdAt)}
                      </small>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      {renderStars(review.rating)}
                      <span className="ms-2 text-muted small">
                        {review.rating ? `${review.rating}/5` : "0/5"}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mb-2 text-secondary small">{review.comment}</p>
                    )}
                    <div className="d-flex justify-content-between align-items-center">
                      {review.status && (
                        <span className="badge bg-light text-uppercase text-secondary small">
                          {review.status}
                        </span>
                      )}
                      <div>
                        {review.appointmentId && appointmentInfo ? (
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => {
                              setSelectedAppointment(appointmentInfo);
                              setShowModal(true);
                            }}
                          >
                            <i className="bi bi-eye me-1"></i>
                            Xem chi tiết
                          </button>
                        ) : review.appointmentId ? (
                          <span className="text-muted small">
                            Không thể tải thông tin
                          </span>
                        ) : (
                          <span className="text-muted small">
                            Không có lịch hẹn
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal hiển thị chi tiết lịch hẹn */}
      {showModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block", zIndex: 1050 }}
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">LỊCH HẸN LIÊN QUAN</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedAppointment(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {selectedAppointment ? (
                    <div>
                      <div className="mb-3">
                        <strong>Mã lịch:</strong>{" "}
                        <span className="text-primary">
                          #{selectedAppointment.appointmentId}
                        </span>
                      </div>
                      <div className="mb-3">
                        <strong>Thời gian:</strong>{" "}
                        {formatAppointmentRange(
                          selectedAppointment.startTime,
                          selectedAppointment.endTime
                        )}
                      </div>
                      <div className="mb-3">
                        <strong>Trạng thái:</strong>{" "}
                        <span className="badge bg-success">
                          {selectedAppointment.status || "Chưa cập nhật"}
                        </span>
                      </div>
                      {selectedAppointment.notes && (
                        <div className="mb-3">
                          <strong>Ghi chú:</strong>{" "}
                          <span className="fst-italic">
                            {selectedAppointment.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">Không có thông tin lịch hẹn.</p>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedAppointment(null);
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040, backgroundColor: "rgba(0, 0, 0, 0.3)" }}
            onClick={() => {
              setShowModal(false);
              setSelectedAppointment(null);
            }}
          ></div>
        </>
      )}
    </div>
  );
};

export default DoctorReviews;
