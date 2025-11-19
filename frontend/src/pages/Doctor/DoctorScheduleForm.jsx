import React, { useState, useEffect } from "react";

const DoctorScheduleForm = ({ schedule, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    workDate: "",
    startTime: "",
    endTime: "",
    status: "Available",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isEditing = !!schedule;

  useEffect(() => {
    if (schedule) {
      setFormData({
        workDate: schedule.workDate || "",
        startTime: schedule.startTime || "",
        endTime: schedule.endTime || "",
        status: schedule.status || "Available",
        notes: schedule.notes || "",
      });
    } else {
      // Set default date to today
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => ({
        ...prev,
        workDate: today,
      }));
    }
  }, [schedule]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.workDate) {
      newErrors.workDate = "Ngày làm việc không được để trống";
    } else {
      const selectedDate = new Date(formData.workDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.workDate = "Ngày làm việc phải từ hôm nay trở đi";
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = "Thời gian bắt đầu không được để trống";
    }

    if (!formData.endTime) {
      newErrors.endTime = "Thời gian kết thúc không được để trống";
    }

    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        newErrors.endTime = "Thời gian kết thúc phải sau thời gian bắt đầu";
      }
    }

    if (formData.notes && formData.notes.length > 255) {
      newErrors.notes = "Ghi chú không được quá 255 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      // Handle API errors
      if (err.response?.data?.message) {
        setErrors({ submit: err.response.data.message });
      } else {
        setErrors({ submit: "Có lỗi xảy ra, vui lòng thử lại" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isEditing ? "Chỉnh sửa lịch trình" : "Thêm lịch trình mới"}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.submit && (
                <div className="alert alert-danger" role="alert">
                  {errors.submit}
                </div>
              )}

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="workDate" className="form-label">
                    Ngày làm việc <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className={`form-control ${
                      errors.workDate ? "is-invalid" : ""
                    }`}
                    id="workDate"
                    name="workDate"
                    value={formData.workDate}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.workDate && (
                    <div className="invalid-feedback">{errors.workDate}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="status" className="form-label">
                    Trạng thái
                  </label>
                  <select
                    className="form-select"
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="Available">Có sẵn</option>
                    <option value="Busy">Bận</option>
                    <option value="Unavailable">Không có sẵn</option>
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="startTime" className="form-label">
                    Thời gian bắt đầu <span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    className={`form-control ${
                      errors.startTime ? "is-invalid" : ""
                    }`}
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.startTime && (
                    <div className="invalid-feedback">{errors.startTime}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="endTime" className="form-label">
                    Thời gian kết thúc <span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    className={`form-control ${
                      errors.endTime ? "is-invalid" : ""
                    }`}
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.endTime && (
                    <div className="invalid-feedback">{errors.endTime}</div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="notes" className="form-label">
                  Ghi chú
                </label>
                <textarea
                  className={`form-control ${errors.notes ? "is-invalid" : ""}`}
                  id="notes"
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Nhập ghi chú (tùy chọn)"
                />
                {errors.notes && (
                  <div className="invalid-feedback">{errors.notes}</div>
                )}
                <div className="form-text">
                  {formData.notes.length}/255 ký tự
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Đang xử lý...
                  </>
                ) : isEditing ? (
                  "Cập nhật"
                ) : (
                  "Tạo mới"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorScheduleForm;
