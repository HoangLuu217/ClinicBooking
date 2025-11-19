import React, { useState, useEffect, useCallback, useMemo } from "react";
import doctorScheduleApi from "../../api/doctorScheduleApi";
import DoctorScheduleForm from "./DoctorScheduleForm";
import Cookies from "js-cookie";
import doctorApi from "../../api/doctorApi";

const DoctorScheduleManagement = () => {
  // Debug: Component mounted
  console.log("🔵 DoctorScheduleManagement: Component mounted/re-rendered");
  
  // Get currentUser from localStorage (memoized) - same pattern as other pages
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);
  
  // Helper functions
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const weekdays = [
      "Chủ nhật",
      "Th 2",
      "Th 3",
      "Th 4",
      "Th 5",
      "Th 6",
      "Th 7",
    ];
    const weekday = weekdays[date.getDay()];
    return `${weekday}, ${date.toLocaleDateString("vi-VN")}`;
  };
  const formatTime = (timeString) =>
    new Date(`2000-01-01T${timeString}`).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const getStatusBadge = (status) => {
    const statusConfig = {
      Available: {
        class: "badge bg-success text-white rounded-pill px-3 py-2",
        text: "Có sẵn",
        icon: "bi bi-check-circle-fill",
      },
      Completed: {
        class: "badge bg-primary text-white rounded-pill px-3 py-2",
        text: "Hoàn thành",
        icon: "bi bi-check2-all",
      },
    };

    const config = statusConfig[status] || {
      class: "badge bg-secondary text-white rounded-pill px-3 py-2",
      text: status || "Không xác định",
      icon: "bi bi-question-circle-fill",
    };

    return config;
  };

  // CRUD schedule
  const handleDeleteSchedule = async (scheduleId) => {
    // Tìm schedule để kiểm tra có appointments không
    const schedule = schedules.find((s) => s.scheduleId === scheduleId);
    const hasAppointments =
      schedule?.status === "Available" && schedule?.appointmentCount > 0;

    // Không cho phép xóa nếu có appointments
    if (hasAppointments) {
      setErrorDetails({
        title: "Không thể xóa lịch trình!",
        message: "Vui lòng hủy tất cả appointments trước khi xóa lịch trình.",
        appointmentCount: schedule.appointmentCount,
        scheduleInfo: schedule, // Thêm thông tin schedule để hiển thị
      });
      setShowErrorModal(true);
      return;
    }

    const confirmMessage = "Bạn có chắc chắn muốn xóa lịch trình này?";

    if (window.confirm(confirmMessage)) {
      try {
        await doctorScheduleApi.deleteSchedule(scheduleId);
        window.toast && window.toast.success("Đã xóa lịch trình thành công");
        loadSchedules();
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;

        // Kiểm tra nếu là lỗi constraint reference
        if (
          errorMessage.includes("REFERENCE constraint") ||
          errorMessage.includes("FKkr1qrelwp1w32wm4qhonpqd8y") ||
          errorMessage.includes("appointments")
        ) {
          setErrorDetails({
            title: "Không thể xóa lịch trình!",
            message:
              "Lịch trình này đã có cuộc hẹn. Vui lòng hủy tất cả appointments trước khi xóa lịch trình.",
            appointmentCount: 0,
            scheduleInfo: schedule,
          });
        } else {
          setErrorDetails({
            title: "Có lỗi xảy ra!",
            message: errorMessage,
            appointmentCount: 0,
          });
        }
        setShowErrorModal(true);
      }
    }
  };

  const handleUpdateSchedule = async (scheduleId, scheduleData) => {
    try {
      await doctorScheduleApi.updateSchedule(scheduleId, scheduleData);
      setEditingSchedule(null);
      loadSchedules();
    } catch (err) {
      throw err;
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();

      // Validate date
      if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
        console.error("Invalid date for getDaysInMonth:", date);
        return [];
      }

      // Get first day of the month
      const firstDayOfMonth = new Date(year, month, 1);

      // Calculate the starting date (Sunday of the week containing the first day)
      const dayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const startDate = new Date(year, month, 1 - dayOfWeek);

      const days = [];

      // Generate 42 days (6 weeks × 7 days) - Create new Date objects each time
      for (let i = 0; i < 42; i++) {
        const dayDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate() + i
        );
        days.push(dayDate);
      }

      return days;
    } catch (error) {
      console.error("Error in getDaysInMonth:", error);
      return [];
    }
  };

  const getSchedulesForDate = (date) => {
    // Use local timezone to avoid UTC day-shift issues (which hid Mondays)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return schedules.filter((schedule) => schedule.workDate === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      try {
        // Navigate to the first day of the target month
        const targetMonth = prev.getMonth() + direction;
        const targetYear = prev.getFullYear();

        // Create new date for the target month
        const newMonthDate = new Date(targetYear, targetMonth, 1);

        // Validate the new date
        if (isNaN(newMonthDate.getTime())) {
          console.error("Invalid date created during navigation:", {
            targetYear,
            targetMonth,
          });
          return prev; // Return previous date if invalid
        }

        return newMonthDate;
      } catch (error) {
        console.error("Error in navigateMonth:", error);
        return prev; // Return previous date if error
      }
    });
  };

  // Bulk create schedules for a week
  const handleBulkCreateSchedules = async (bulkData) => {
    if (!doctorId) return;

    try {
      let schedules = [];

      // Check if data comes from new InteractiveCalendarScheduler (has schedules array)
      if (bulkData.schedules && Array.isArray(bulkData.schedules)) {
        // New format: array of schedules already prepared
        schedules = bulkData.schedules.map((schedule) => ({
          ...schedule,
          doctorId,
          status: "Available",
        }));
      } else {
        // Old format: generate schedules from date range + daysOfWeek + shifts
        const {
          startDate,
          endDate,
          startTime,
          endTime,
          notes,
          daysOfWeek,
          shifts,
        } = bulkData;

        // Generate schedules for each selected day of the week (use local time parsing)
        const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
        const [eYear, eMonth, eDay] = endDate.split("-").map(Number);
        const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

        // Normalize selected days to numbers (defensive against string values)
        const selectedDays = (daysOfWeek || []).map(Number);

        // Create a new date object for each iteration to avoid mutation
        let currentDate = new Date(start);

        while (currentDate <= end) {
          const dayOfWeek = currentDate.getDay();
          // Use local timezone to avoid UTC shifting a day backward
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, "0");
          const day = String(currentDate.getDate()).padStart(2, "0");
          const dateStr = `${year}-${month}-${day}`;

          // Check if this day is selected
          if (selectedDays.includes(dayOfWeek)) {
            // If shifts are selected, create schedule for each shift
            if (shifts && shifts.length > 0) {
              shifts.forEach((shiftValue) => {
                const shift = shiftOptions.find((s) => s.value === shiftValue);
                if (shift) {
                  // Use custom time if available, otherwise use default
                  const customStartTime =
                    bulkData[`${shiftValue}StartTime`] || shift.startTime;
                  const customEndTime =
                    bulkData[`${shiftValue}EndTime`] || shift.endTime;

                  const scheduleData = {
                    doctorId,
                    workDate: dateStr,
                    startTime: customStartTime,
                    endTime: customEndTime,
                    notes: `${notes} (${shift.label})`,
                    status: "Available",
                  };

                  schedules.push(scheduleData);
                }
              });
            } else {
              // Fallback to original time if no shifts selected
              const scheduleData = {
                doctorId,
                workDate: dateStr,
                startTime,
                endTime,
                notes,
                status: "Available",
              };

              schedules.push(scheduleData);
            }
          }

          // Move to next day by creating a new Date object
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      // Create all schedules using Promise.allSettled to handle partial failures
      const results = await Promise.allSettled(
        schedules.map((schedule) => doctorScheduleApi.createSchedule(schedule))
      );

      // Count successes and failures
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      // Close modal immediately
      setShowBulkForm(false);

      // Use requestAnimationFrame to ensure modal is fully unmounted before reload
      requestAnimationFrame(() => {
        setTimeout(() => {
          loadSchedules();

          // Show appropriate message based on results
          if (window.toast) {
            if (failed === 0) {
              // All succeeded
              window.toast.success(
                `Đã tạo ${successful} lịch trình thành công!`
              );
            } else if (successful === 0) {
              // All failed
              const firstError = results.find((r) => r.status === "rejected");
              const errorMsg =
                firstError?.reason?.response?.data?.message ||
                firstError?.reason?.message ||
                "Validation failed";
              setErrorDetails({
                title: "Không thể tạo lịch trình",
                message: errorMsg,
                appointmentCount: 0,
              });
              setShowErrorModal(true);
              window.toast.error(`Không thể tạo lịch trình: ${errorMsg}`);
            } else {
              // Partial success
              window.toast.warning(
                `Đã tạo ${successful} lịch trình thành công, ${failed} lịch trình thất bại. ` +
                  `Một số lịch trình có thể không hợp lệ (ví dụ: ngày trong quá khứ).`
              );
            }
          }
        }, 0);
      });
    } catch (err) {
      // This catch block should rarely be hit now since we use allSettled
      console.error("Unexpected error in bulk create:", err);
      setErrorDetails({
        title: "Không thể tạo lịch trình hàng loạt",
        message: err.response?.data?.message || err.message,
        appointmentCount: 0,
      });
      setShowErrorModal(true);
      if (window.toast) {
        window.toast.error(
          "Không thể tạo lịch trình hàng loạt: " +
            (err.response?.data?.message || err.message)
        );
      }
    }
  };

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState({
    title: "",
    message: "",
    appointmentCount: 0,
    scheduleInfo: null,
  });
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Shift options for bulk creation (only morning and afternoon)
  const shiftOptions = [
    {
      value: "morning",
      label: "Ca sáng",
      startTime: "08:00",
      endTime: "12:00",
      icon: "bi bi-sunrise",
    },
    {
      value: "afternoon",
      label: "Ca chiều",
      startTime: "13:00",
      endTime: "17:00",
      icon: "bi bi-sunset",
    },
  ];

  // Load schedules (appointment counts are now included from backend)
  const loadSchedules = useCallback(async () => {
    console.log("🔵 DoctorScheduleManagement: loadSchedules called, doctorId:", doctorId);
    if (!doctorId) {
      console.warn("⚠️ DoctorScheduleManagement: doctorId is not set, cannot load schedules");
      return;
    }
    try {
      setLoading(true);
      console.log("🔵 DoctorScheduleManagement: Loading schedules for doctorId:", doctorId);
      const response = await doctorScheduleApi.getSchedulesByDoctor(doctorId);
      console.log("DoctorScheduleManagement: Schedules loaded successfully:", response.data);
      // Backend now includes appointmentCount in response
      setSchedules(response.data || []);
    } catch (err) {
      console.error("DoctorScheduleManagement: Error loading schedules:", err);
      const errorMessage = err.response?.data?.message || err.message || "Không thể kết nối đến server";
      setErrorDetails({
        title: "Không thể tải lịch trình",
        message: errorMessage,
        appointmentCount: 0,
      });
      setShowErrorModal(true);
      if (window.toast) {
        window.toast.error(`Lỗi tải lịch trình: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  // Lấy doctorId từ cookie và API (với fallback sang localStorage)
  useEffect(() => {
    console.log("🔵 DoctorScheduleManagement: useEffect for doctorId started");
    const userId = Cookies.get("userId") || currentUser?.id;
    console.log("🔵 DoctorScheduleManagement: Getting doctorId for userId:", userId);
    console.log("🔵 DoctorScheduleManagement: currentUser from localStorage:", currentUser);
    if (userId) {
      doctorApi
        .getDoctorByUserId(userId)
        .then((res) => {
          const data = res.data || res;
          console.log("DoctorScheduleManagement: Doctor data received:", data);
          if (data && data.doctorId) {
            setDoctorId(data.doctorId);
            console.log("DoctorScheduleManagement: doctorId set to:", data.doctorId);
          } else {
            console.error("DoctorScheduleManagement: doctorId not found in response:", data);
            setErrorDetails({
              title: "Không tìm thấy thông tin bác sĩ",
              message: "Không thể lấy thông tin bác sĩ. Vui lòng đăng nhập lại.",
              appointmentCount: 0,
            });
            setShowErrorModal(true);
          }
        })
        .catch((err) => {
          console.error("DoctorScheduleManagement: Error getting doctor by userId:", err);
          const errorMessage = err.response?.data?.message || err.message || "Không thể kết nối đến server";
          setErrorDetails({
            title: "Lỗi tải thông tin bác sĩ",
            message: errorMessage,
            appointmentCount: 0,
          });
          setShowErrorModal(true);
          if (window.toast) {
            window.toast.error(`Lỗi: ${errorMessage}`);
          }
        });
    } else {
      console.error("DoctorScheduleManagement: userId not found in cookies");
      setErrorDetails({
        title: "Chưa đăng nhập",
        message: "Vui lòng đăng nhập để sử dụng tính năng này.",
        appointmentCount: 0,
      });
      setShowErrorModal(true);
    }
  }, [currentUser]);

  useEffect(() => {
    console.log("🔵 DoctorScheduleManagement: useEffect for loadSchedules, doctorId:", doctorId);
    if (doctorId) {
      console.log("🔵 DoctorScheduleManagement: doctorId exists, calling loadSchedules");
      loadSchedules();
    } else {
      console.warn("⚠️ DoctorScheduleManagement: doctorId is null, skipping loadSchedules");
    }
  }, [doctorId, loadSchedules]);

  // Reset selectedDate when currentDate changes
  useEffect(() => {
    setSelectedDate(null);
  }, [currentDate]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-100" style={{ minHeight: "100vh" }}>
      <div className="row justify-content-center" style={{ margin: 0 }}>
        <div className="col-lg-12">
          <div
            className="card shadow rounded-4 border w-100"
            style={{ marginBottom: "1rem" }}
          >
            <div className="card-header bg-white rounded-top-4 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3 py-3 px-3">
              <div className="d-flex align-items-center gap-3">
                <span
                  className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44 }}
                >
                  <i
                    className="bi bi-calendar3"
                    style={{ fontSize: "1.6rem" }}
                  ></i>
                </span>
                <div>
                  <h2 className="mb-1 fw-bold" style={{ fontSize: "1.5rem" }}>
                    Lịch làm việc
                  </h2>
                  <p className="mb-0 text-muted" style={{ fontSize: "0.9rem" }}>
                    Quản lý lịch trình cá nhân của bạn
                  </p>
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {/* Quick Create Button */}
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => setShowBulkForm(true)}
                >
                  <i className="bi bi-lightning-charge-fill me-1"></i>
                  Tạo lịch làm việc
                </button>

                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => {
                    loadSchedules();
                    setCurrentDate(new Date());
                  }}
                  title="Làm mới dữ liệu"
                >
                  <i className="bi bi-arrow-clockwise"></i> Làm mới
                </button>
              </div>
            </div>

            <div className="card-body px-2 py-2">
              {/* Calendar View Only */}
              <CalendarView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                schedules={schedules}
                navigateMonth={navigateMonth}
                getDaysInMonth={getDaysInMonth}
                getSchedulesForDate={getSchedulesForDate}
                isToday={isToday}
                isSelected={isSelected}
                formatDate={formatDate}
                formatTime={formatTime}
                getStatusBadge={getStatusBadge}
                handleDeleteSchedule={handleDeleteSchedule}
                setEditingSchedule={setEditingSchedule}
                setShowScheduleModal={setShowScheduleModal}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Schedule Details Modal */}
      {showScheduleModal && selectedDate && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-calendar3 me-2"></i>
                  {formatDate(selectedDate.toISOString())}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedDate(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                {getSchedulesForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-4">
                    <i
                      className="bi bi-calendar-x text-muted"
                      style={{ fontSize: "3rem" }}
                    ></i>
                    <h5 className="mt-3 text-muted">Không có lịch trình nào</h5>
                    <p className="text-muted">
                      Ngày này chưa có lịch trình được đặt
                    </p>
                    {/* <button
                      className="btn btn-primary"
                      onClick={() => {
                        setShowScheduleModal(false);
                        setShowBulkForm(true);
                      }}
                    >
                      <i className="bi bi-calendar-week me-1"></i>
                      Tạo cho cả tuần
                    </button> */}
                  </div>
                ) : (
                  <div className="row g-3">
                    {getSchedulesForDate(selectedDate).map((schedule) => {
                      const statusConfig = getStatusBadge(schedule.status);
                      return (
                        <div key={schedule.scheduleId} className="col-12">
                          <div className="card border-0 shadow-sm">
                            <div className="card-body">
                              <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="d-flex align-items-center gap-3">
                                  <i className="bi bi-clock text-primary"></i>
                                  <span className="fw-bold">
                                    {formatTime(schedule.startTime)} -{" "}
                                    {formatTime(schedule.endTime)}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  <span
                                    className={statusConfig.class}
                                    style={{ fontSize: "12px" }}
                                  >
                                    <i
                                      className={`${statusConfig.icon} me-1`}
                                    ></i>
                                    {statusConfig.text}
                                  </span>
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={() => {
                                        setShowScheduleModal(false);
                                        setEditingSchedule(schedule);
                                      }}
                                      title="Chỉnh sửa"
                                    >
                                      <i className="bi bi-pencil"></i>
                                    </button>
                                    <button
                                      className="btn btn-outline-danger"
                                      onClick={() => {
                                        handleDeleteSchedule(
                                          schedule.scheduleId
                                        );
                                        setShowScheduleModal(false);
                                      }}
                                      title="Xóa"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="row g-3 text-sm">
                                <div className="col-md-6">
                                  <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-calendar-check text-primary"></i>
                                    <span className="text-muted">
                                      Appointments:
                                    </span>
                                    <span className="fw-bold text-primary">
                                      {schedule.appointmentCount || 0}
                                    </span>
                                  </div>
                                </div>
                                {schedule.notes && (
                                  <div className="col-12">
                                    <div className="d-flex align-items-start gap-2">
                                      <i className="bi bi-sticky text-muted"></i>
                                      <div>
                                        <small className="text-muted">
                                          Ghi chú:
                                        </small>
                                        <p className="mb-0 small">
                                          {schedule.notes}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedDate(null);
                  }}
                >
                  Đóng
                </button>
                {/* <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setShowBulkForm(true);
                  }}
                >
                  <i className="bi bi-calendar-week me-1"></i>
                  Tạo cho cả tuần
                </button> */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Calendar Scheduler Modal */}
      {showBulkForm && (
        <InteractiveCalendarScheduler
          onSubmit={handleBulkCreateSchedules}
          onClose={() => setShowBulkForm(false)}
          shiftOptions={shiftOptions}
          existingSchedules={schedules}
        />
      )}

      {/* Modal cho form sửa lịch trình */}
      {editingSchedule && (
        <DoctorScheduleForm
          schedule={editingSchedule}
          onSubmit={(data) =>
            handleUpdateSchedule(editingSchedule.scheduleId, data)
          }
          onClose={() => setEditingSchedule(null)}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowErrorModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-danger text-white border-0">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  {errorDetails.title}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowErrorModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {errorDetails.appointmentCount > 0 &&
                errorDetails.scheduleInfo ? (
                  <div>
                    {/* Thông tin lịch trình */}
                    <div className="card bg-light border-warning mb-3">
                      <div className="card-header bg-warning bg-opacity-10 border-bottom border-warning">
                        <h6 className="mb-0 d-flex align-items-center gap-2">
                          <i className="bi bi-calendar3 text-warning"></i>
                          <strong>Thông tin lịch trình</strong>
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="d-flex align-items-start gap-2">
                              <i className="bi bi-calendar-event text-primary mt-1"></i>
                              <div>
                                <small className="text-muted d-block">
                                  Ngày làm việc
                                </small>
                                <strong>
                                  {formatDate(
                                    errorDetails.scheduleInfo.workDate
                                  )}
                                </strong>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="d-flex align-items-start gap-2">
                              <i className="bi bi-clock text-primary mt-1"></i>
                              <div>
                                <small className="text-muted d-block">
                                  Giờ làm việc
                                </small>
                                <strong>
                                  {formatTime(
                                    errorDetails.scheduleInfo.startTime
                                  )}{" "}
                                  -{" "}
                                  {formatTime(
                                    errorDetails.scheduleInfo.endTime
                                  )}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cảnh báo có appointments */}
                    <div className="alert alert-danger d-flex align-items-start gap-3 mb-3">
                      <i className="bi bi-exclamation-triangle-fill fs-3 mt-1"></i>
                      <div className="flex-grow-1">
                        <h6 className="alert-heading fw-bold mb-2">
                          Lịch trình này có {errorDetails.appointmentCount} lịch
                          hẹn đã đặt!
                        </h6>
                        <p className="mb-2">
                          Không thể xóa lịch trình khi còn các cuộc hẹn với bệnh
                          nhân.
                        </p>
                        <hr className="my-2" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex align-items-start gap-3">
                    <i className="bi bi-exclamation-circle fs-3 text-danger"></i>
                    <p className="mb-0">{errorDetails.message}</p>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowErrorModal(false)}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Calendar View Component
const CalendarView = ({
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  schedules,
  navigateMonth,
  getDaysInMonth,
  getSchedulesForDate,
  isToday,
  isSelected,
  formatDate,
  formatTime,
  getStatusBadge,
  handleDeleteSchedule,
  setEditingSchedule,
  setShowScheduleModal,
}) => {
  // Add error handling for currentDate
  if (!currentDate || isNaN(currentDate.getTime())) {
    console.error("Invalid currentDate in CalendarView:", currentDate);
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        Lỗi hiển thị lịch. Vui lòng làm mới trang.
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);
  const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <div className="calendar-container">
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-primary btn-sm rounded-circle"
              onClick={() => navigateMonth(-1)}
              style={{ width: "30px", height: "30px", padding: 0 }}
            >
              <i
                className="bi bi-chevron-left"
                style={{ fontSize: "0.8rem" }}
              ></i>
            </button>
            <h5
              className="mb-0 fw-bold text-dark"
              style={{ fontSize: "0.95rem" }}
            >
              {currentDate.toLocaleDateString("vi-VN", {
                month: "long",
                year: "numeric",
              })}
            </h5>
            <button
              className="btn btn-outline-primary btn-sm rounded-circle"
              onClick={() => navigateMonth(1)}
              style={{ width: "30px", height: "30px", padding: 0 }}
            >
              <i
                className="bi bi-chevron-right"
                style={{ fontSize: "0.8rem" }}
              ></i>
            </button>
          </div>

          <button
            className="btn btn-primary btn-sm px-2 py-1"
            onClick={() => setCurrentDate(new Date())}
            style={{ fontSize: "0.75rem" }}
          >
            <i className="bi bi-calendar-day me-1"></i>
            Hôm nay
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Week day headers */}
        <div className="calendar-weekdays">
          {weekDays.map((day) => (
            <div key={day} className="calendar-weekday">
              <span className="fw-semibold text-muted">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="calendar-days">
          {days && days.length > 0 ? (
            days.map((day, index) => {
              if (!day || isNaN(day.getTime())) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="calendar-day-empty"
                  ></div>
                );
              }

              const daySchedules = getSchedulesForDate(day);
              const isCurrentDay = isToday(day);
              const isSelectedDay = isSelected(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}-${index}`}
                  className={`calendar-day ${
                    isCurrentDay ? "calendar-day-today" : ""
                  } ${isSelectedDay ? "calendar-day-selected" : ""} ${
                    !isCurrentMonth ? "calendar-day-other-month" : ""
                  }`}
                  onClick={() => {
                    setSelectedDate(day);
                    setShowScheduleModal(true);
                  }}
                >
                  <div className="calendar-day-content">
                    {/* Day number */}
                    <div className="calendar-day-header">
                      <span
                        className={`calendar-day-number ${
                          isCurrentDay
                            ? "text-white"
                            : isSelectedDay
                            ? "text-primary"
                            : !isCurrentMonth
                            ? "text-muted"
                            : "text-dark"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Schedule indicators */}
                    <div className="calendar-day-schedules">
                      {daySchedules.slice(0, 2).map((schedule) => {
                        // Determine if it's morning or afternoon shift based on start time
                        const startHour = parseInt(
                          schedule.startTime.split(":")[0]
                        );
                        const shiftLabel = startHour < 12 ? "Sáng" : "Chiều";

                        return (
                          <div
                            key={schedule.scheduleId}
                            className={`calendar-schedule-item ${
                              schedule.status === "Available"
                                ? "schedule-available"
                                : "schedule-completed"
                            }`}
                            title={`${shiftLabel}: ${formatTime(
                              schedule.startTime
                            )} - ${formatTime(schedule.endTime)}`}
                          >
                            {shiftLabel}: {formatTime(schedule.startTime)} -{" "}
                            {formatTime(schedule.endTime)}
                          </div>
                        );
                      })}
                      {daySchedules.length > 2 && (
                        <div className="calendar-schedule-more">
                          +{daySchedules.length - 2} khác
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="alert alert-warning text-center py-4">
              <i className="bi bi-calendar-x me-2"></i>
              Không thể tải dữ liệu lịch. Vui lòng thử lại.
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .calendar-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #e9ecef;
          max-width: 100%;
          margin: 0 auto;
        }

        .calendar-header {
          padding: 10px 14px 0 14px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .calendar-grid {
          padding: 0;
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .calendar-weekday {
          padding: 8px 4px;
          text-align: center;
          font-weight: 600;
          color: #6c757d;
          font-size: 0.75rem;
          border-right: 1px solid #e9ecef;
        }

        .calendar-weekday:last-child {
          border-right: none;
        }

        .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: minmax(60px, auto);
          min-height: 360px;
        }

        .calendar-day {
          border-right: 1px solid #dee2e6;
          border-bottom: 1px solid #dee2e6;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          min-height: 50px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .calendar-day:hover {
          background: #f8f9fa;
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
          z-index: 1;
        }

        .calendar-day-today {
          background: linear-gradient(135deg, #4d94ff 0%, #3d84f5 100%);
          color: white;
        }

        .calendar-day-today:hover {
          background: linear-gradient(135deg, #3d84f5 0%, #2d74e5 100%);
        }

        .calendar-day-selected {
          background: linear-gradient(135deg, #0dcaf0 0%, #0aa2c0 100%);
          color: white;
        }

        .calendar-day-other-month {
          background: #f8f9fa;
          opacity: 0.6;
        }

        .calendar-day-empty {
          border-right: 1px solid #e9ecef;
          border-bottom: 1px solid #e9ecef;
          min-height: 60px;
          background: #fafbfc;
        }

        .calendar-day-content {
          padding: 4px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .calendar-day-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .calendar-day-number {
          font-weight: 600;
          font-size: 0.8rem;
        }

        .calendar-day-badge {
          background: rgba(255, 255, 255, 0.95);
          color: #0d6efd;
          border-radius: 4px;
          padding: 2px 5px;
          font-size: 0.7rem;
          font-weight: 600;
          min-width: 18px;
          text-align: center;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .calendar-day-today .calendar-day-badge {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .calendar-day-schedules {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .calendar-schedule-item {
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 500;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          border: 1px solid transparent;
        }

        .schedule-available {
          background: #d1edff;
          color: #0d6efd;
          border: 1px solid #90c9f5;
        }

        .schedule-completed {
          background: #d4edda;
          color: #155724;
          border: 1px solid #a3d9b1;
        }

        .calendar-day-today .schedule-available {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .calendar-day-today .schedule-completed {
          background: rgba(255, 255, 255, 0.3);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .calendar-schedule-more {
          font-size: 0.65rem;
          color: #6c757d;
          text-align: center;
          font-style: italic;
          margin-top: 2px;
        }

        .calendar-day-today .calendar-schedule-more {
          color: rgba(255, 255, 255, 0.9);
        }

        @media (max-width: 768px) {
          .calendar-days {
            min-height: 300px;
          }

          .calendar-day {
            min-height: 50px;
          }

          .calendar-day-content {
            padding: 4px;
          }

          .calendar-day-number {
            font-size: 0.75rem;
          }

          .calendar-schedule-item {
            font-size: 0.7rem;
            padding: 2px 4px;
          }
        }
      `}</style>
    </div>
  );
};

// Interactive Calendar Scheduler Component
const InteractiveCalendarScheduler = ({
  onSubmit,
  onClose,
  shiftOptions,
  existingSchedules = [],
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState({}); // { '2025-11-15': { morning: true, afternoon: true } }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Custom time for shifts
  const [morningStartTime, setMorningStartTime] = useState("08:00");
  const [morningEndTime, setMorningEndTime] = useState("12:00");
  const [afternoonStartTime, setAfternoonStartTime] = useState("13:00");
  const [afternoonEndTime, setAfternoonEndTime] = useState("17:00");

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  // Toggle day selection
  const toggleDay = (date) => {
    if (!date) return;

    // Use local timezone to avoid UTC day-shift issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    setSelectedDays((prev) => {
      if (prev[dateStr]) {
        // Already selected, remove it
        const newSelected = { ...prev };
        delete newSelected[dateStr];
        return newSelected;
      } else {
        // Not selected, add with default morning & afternoon only
        return {
          ...prev,
          [dateStr]: {
            morning: true,
            afternoon: true,
          },
        };
      }
    });
  };

  // Toggle shift for a specific day
  const toggleShift = (dateStr, shiftType, e) => {
    e.stopPropagation(); // Prevent day toggle

    setSelectedDays((prev) => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        [shiftType]: !prev[dateStr][shiftType],
      },
    }));
  };

  // Check if date is in the past
  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Check if date is today
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Get existing schedules for a specific date
  const getSchedulesForDate = (date) => {
    if (!date) return [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return existingSchedules.filter(
      (schedule) => schedule.workDate === dateStr
    );
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate time inputs
    if (
      !morningStartTime ||
      !morningEndTime ||
      !afternoonStartTime ||
      !afternoonEndTime
    ) {
      alert("Vui lòng nhập đầy đủ giờ làm việc cho các ca");
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (
      !timeRegex.test(morningStartTime) ||
      !timeRegex.test(morningEndTime) ||
      !timeRegex.test(afternoonStartTime) ||
      !timeRegex.test(afternoonEndTime)
    ) {
      alert("Giờ không hợp lệ. Vui lòng kiểm tra lại");
      return;
    }

    // Validate morning shift times
    if (morningStartTime >= morningEndTime) {
      alert("Giờ kết thúc ca sáng phải sau giờ bắt đầu");
      return;
    }

    // Validate afternoon shift times
    if (afternoonStartTime >= afternoonEndTime) {
      alert("Giờ kết thúc ca chiều phải sau giờ bắt đầu");
      return;
    }

    if (Object.keys(selectedDays).length === 0) {
      alert("Vui lòng chọn ít nhất một ngày và một ca làm việc");
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  // Handle confirmed submission
  const handleConfirmedSubmit = async () => {
    // Convert selectedDays to API format
    const schedulesToCreate = [];

    Object.entries(selectedDays).forEach(([dateStr, shifts]) => {
      // morning
      if (shifts.morning) {
        schedulesToCreate.push({
          workDate: dateStr,
          startTime: morningStartTime,
          endTime: morningEndTime,
          notes: "",
        });
      }

      // afternoon
      if (shifts.afternoon) {
        schedulesToCreate.push({
          workDate: dateStr,
          startTime: afternoonStartTime,
          endTime: afternoonEndTime,
          notes: "",
        });
      }
    });

    // Debug log
    console.log("Schedules to create:", schedulesToCreate);

    setIsSubmitting(true);
    try {
      await onSubmit({ schedules: schedulesToCreate });
      onClose();
    } catch (error) {
      console.error("Error creating schedules:", error);
      alert("Có lỗi xảy ra khi tạo lịch trình");
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  // Format month/year display
  const monthNames = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  const days = getDaysInMonth(currentDate);
  const selectedCount = Object.keys(selectedDays).length;
  const totalShifts = Object.values(selectedDays).reduce((sum, shifts) => {
    return sum + Object.values(shifts).filter((v) => v === true).length;
  }, 0);

  return (
    <div
      className="modal fade show"
      style={{
        display: "block",
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 1050,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal-dialog modal-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          {/* Modal Header */}
          <div
            className="modal-header bg-gradient text-white py-2"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            }}
          >
            <div>
              <h5 className="modal-title mb-0">
                <i className="bi bi-calendar-week me-2"></i>
                Tạo lịch làm việc
              </h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit}>
            <div
              className="modal-body p-3"
              style={{ maxHeight: "calc(100vh - 150px)", overflowY: "auto" }}
            >
              {/* Month Navigation */}
              <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={goToPreviousMonth}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                <div className="text-center">
                  <h5 className="mb-0 fw-bold text-primary">
                    {monthNames[currentDate.getMonth()]}{" "}
                    {currentDate.getFullYear()}
                  </h5>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={goToNextMonth}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="calendar-grid-container mb-3">
                {/* Weekday Headers */}
                <div
                  className="calendar-weekdays d-grid mb-2"
                  style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}
                >
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                    <div
                      key={day}
                      className="text-center fw-bold text-muted py-1"
                      style={{ fontSize: "0.85rem" }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div
                  className="calendar-days d-grid"
                  style={{
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "6px",
                    minHeight: "380px",
                  }}
                >
                  {days.map((date, index) => {
                    if (!date) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="calendar-day-empty"
                        ></div>
                      );
                    }

                    // Use local timezone to avoid UTC day-shift issues
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    const dateStr = `${year}-${month}-${day}`;

                    const isSelected = !!selectedDays[dateStr];
                    const isPast = isPastDate(date);
                    const isTodayDate = isToday(date);
                    const daySchedules = getSchedulesForDate(date);
                    const hasSchedules = daySchedules.length > 0;

                    return (
                      <div
                        key={dateStr}
                        className={`calendar-day-cell border rounded ${
                          isSelected
                            ? "border-success border-3"
                            : hasSchedules
                            ? "border-warning border-2"
                            : "border-secondary"
                        } ${isPast ? "bg-light text-muted" : "bg-white"} ${
                          isTodayDate ? "border-primary border-2" : ""
                        }`}
                        style={{
                          cursor: isPast ? "not-allowed" : "pointer",
                          minHeight: "80px",
                          padding: "4px 6px",
                          transition:
                            "background-color 0.05s ease, border-color 0.05s ease",
                          backgroundColor: isSelected
                            ? "#f0fdf4"
                            : hasSchedules
                            ? "#fffbeb"
                            : "white",
                        }}
                        onClick={() => !isPast && toggleDay(date)}
                      >
                        {/* Day Number */}
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="d-flex align-items-center gap-1">
                            <span
                              className={`fw-bold ${
                                isTodayDate ? "text-primary" : ""
                              }`}
                              style={{ fontSize: "0.85rem" }}
                            >
                              {date.getDate()}
                            </span>
                          </div>
                          {isSelected && (
                            <i
                              className="bi bi-check-circle-fill text-success"
                              style={{ fontSize: "0.9rem" }}
                            ></i>
                          )}
                        </div>

                        {/* Existing Schedules Info (if any and not selected) */}
                        {!isSelected && hasSchedules && (
                          <div className="mb-1" style={{ fontSize: "0.85rem" }}>
                            {daySchedules.slice(0, 2).map((schedule, idx) => (
                              <div
                                key={idx}
                                className="text-muted d-flex align-items-center mb-1"
                                style={{ lineHeight: "1.4" }}
                              >
                                <i
                                  className="bi bi-clock me-1"
                                  style={{ fontSize: "0.8rem" }}
                                ></i>
                                <span className="fw-semibold">
                                  {schedule.startTime?.substring(0, 5)}-
                                  {schedule.endTime?.substring(0, 5)}
                                </span>
                              </div>
                            ))}
                            {daySchedules.length > 2 && (
                              <div
                                className="text-muted fst-italic"
                                style={{ fontSize: "0.7rem" }}
                              >
                                +{daySchedules.length - 2}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Shift Tags (only if day is selected) */}
                        {isSelected && selectedDays[dateStr] && (
                          <div className="shift-tags d-flex flex-column gap-1">
                            {selectedDays[dateStr].morning && (
                              <div
                                className="shift-tag d-flex align-items-center justify-content-between py-1 px-2 rounded"
                                onClick={(e) =>
                                  toggleShift(dateStr, "morning", e)
                                }
                                style={{
                                  cursor: "pointer",
                                  backgroundColor: "#dcfce7",
                                  border: "1px solid #86efac",
                                  fontSize: "0.65rem",
                                }}
                              >
                                <span className="text-success fw-semibold">
                                  <i className="bi bi-brightness-high me-1"></i>
                                  Sáng
                                </span>
                                <i className="bi bi-x-circle text-success"></i>
                              </div>
                            )}

                            {selectedDays[dateStr].afternoon && (
                              <div
                                className="shift-tag d-flex align-items-center justify-content-between py-1 px-2 rounded"
                                onClick={(e) =>
                                  toggleShift(dateStr, "afternoon", e)
                                }
                                style={{
                                  cursor: "pointer",
                                  backgroundColor: "#dbeafe",
                                  border: "1px solid #93c5fd",
                                  fontSize: "0.65rem",
                                }}
                              >
                                <span className="text-primary fw-semibold">
                                  <i className="bi bi-moon-stars me-1"></i>Chiều
                                </span>
                                <i className="bi bi-x-circle text-primary"></i>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shift Time Configuration */}
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body p-3">
                  <h6 className="fw-bold mb-3">
                    <i className="bi bi-clock text-primary me-2"></i>
                    Cấu hình giờ làm việc
                  </h6>

                  <div className="row g-3">
                    {/* Morning Shift */}
                    <div className="col-md-6">
                      <div className="border rounded p-3 bg-light">
                        <label className="form-label fw-bold mb-2">
                          <i className="bi bi-sunrise text-warning me-1"></i>
                          Ca sáng
                        </label>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label small text-muted mb-1">
                              Bắt đầu
                            </label>
                            <input
                              type="time"
                              className="form-control form-control-sm"
                              value={morningStartTime}
                              onChange={(e) =>
                                setMorningStartTime(e.target.value)
                              }
                              step="300"
                              required
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small text-muted mb-1">
                              Kết thúc
                            </label>
                            <input
                              type="time"
                              className="form-control form-control-sm"
                              value={morningEndTime}
                              onChange={(e) =>
                                setMorningEndTime(e.target.value)
                              }
                              step="300"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Afternoon Shift */}
                    <div className="col-md-6">
                      <div className="border rounded p-3 bg-light">
                        <label className="form-label fw-bold mb-2">
                          <i className="bi bi-sun text-info me-1"></i>
                          Ca chiều
                        </label>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label small text-muted mb-1">
                              Bắt đầu
                            </label>
                            <input
                              type="time"
                              className="form-control form-control-sm"
                              value={afternoonStartTime}
                              onChange={(e) =>
                                setAfternoonStartTime(e.target.value)
                              }
                              step="300"
                              required
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small text-muted mb-1">
                              Kết thúc
                            </label>
                            <input
                              type="time"
                              className="form-control form-control-sm"
                              value={afternoonEndTime}
                              onChange={(e) =>
                                setAfternoonEndTime(e.target.value)
                              }
                              step="300"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer bg-light border-top-0 py-2">
              <button
                type="button"
                className="btn btn-secondary px-3"
                onClick={onClose}
              >
                <i className="bi bi-x-circle me-1"></i>
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-success px-3 shadow"
                disabled={isSubmitting || selectedCount === 0}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    ></span>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle-fill me-1"></i>
                    Tạo {totalShifts} lịch
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            backgroundColor: "rgba(0,0,0,0.75)",
            zIndex: 1060,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirmation(false);
            }
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-white border-bottom py-3">
                <h5
                  className="modal-title fw-bold mb-0 text-dark"
                  style={{ fontSize: "1.1rem" }}
                >
                  <i className="bi bi-clipboard-check me-2 text-primary"></i>
                  Xác nhận tạo lịch
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Summary Card */}
                <div className="border rounded p-3 mb-3 bg-light">
                  <div className="d-flex align-items-center justify-content-center gap-5">
                    <div className="text-center">
                      <div className="text-muted small mb-1">Số ngày</div>
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-calendar3 text-primary"></i>
                        <span className="fw-bold fs-4 text-dark">
                          {selectedCount}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        width: "1px",
                        height: "40px",
                        background: "#dee2e6",
                      }}
                    ></div>
                    <div className="text-center">
                      <div className="text-muted small mb-1">Số ca</div>
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-clock text-primary"></i>
                        <span className="fw-bold fs-4 text-dark">
                          {totalShifts}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning Alert */}
                <div
                  className="alert alert-info border-0 d-flex align-items-start mb-3 py-2"
                  style={{ fontSize: "0.9rem" }}
                >
                  <i
                    className="bi bi-info-circle-fill me-2"
                    style={{ fontSize: "1.1rem" }}
                  ></i>
                  <div>
                    Lịch trình sẽ được lưu vào hệ thống và bệnh nhân có thể đặt
                    hẹn.
                  </div>
                </div>

                <h6
                  className="fw-bold mb-2 text-dark"
                  style={{ fontSize: "0.95rem" }}
                >
                  Chi tiết lịch trình:
                </h6>

                {/* Schedule Details Table */}
                <div
                  className="table-responsive"
                  style={{
                    maxHeight: "320px",
                    overflowY: "auto",
                    borderRadius: "6px",
                    border: "1px solid #dee2e6",
                  }}
                >
                  <table className="table table-sm table-hover mb-0">
                    <thead
                      className="bg-light"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                      }}
                    >
                      <tr>
                        <th
                          className="text-center text-muted"
                          style={{
                            fontSize: "0.85rem",
                            padding: "10px 6px",
                            fontWeight: "600",
                          }}
                        >
                          Ngày
                        </th>
                        <th
                          className="text-center text-muted"
                          style={{
                            fontSize: "0.85rem",
                            padding: "10px 6px",
                            fontWeight: "600",
                          }}
                        >
                          Ca
                        </th>
                        <th
                          className="text-center text-muted"
                          style={{
                            fontSize: "0.85rem",
                            padding: "10px 6px",
                            fontWeight: "600",
                          }}
                        >
                          Giờ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedDays)
                        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                        .map(([dateStr, shifts]) => {
                          const shiftsArray = [];
                          if (shifts.morning) {
                            shiftsArray.push({
                              type: "Ca sáng",
                              time: `${morningStartTime} - ${morningEndTime}`,
                            });
                          }
                          if (shifts.afternoon) {
                            shiftsArray.push({
                              type: "Ca chiều",
                              time: `${afternoonStartTime} - ${afternoonEndTime}`,
                            });
                          }

                          const date = new Date(dateStr);
                          const weekdays = [
                            "CN",
                            "T2",
                            "T3",
                            "T4",
                            "T5",
                            "T6",
                            "T7",
                          ];
                          const weekday = weekdays[date.getDay()];

                          return shiftsArray.map((shift, idx) => (
                            <tr
                              key={`${dateStr}-${idx}`}
                              className="border-bottom"
                              style={{
                                borderTop:
                                  idx === 0 ? "2px solid #dee2e6" : "none",
                              }}
                            >
                              {idx === 0 && (
                                <td
                                  rowSpan={shiftsArray.length}
                                  className="align-middle text-center bg-light"
                                  style={{
                                    padding: "10px 6px",
                                    fontWeight: "500",
                                    fontSize: "0.85rem",
                                    borderRight: "2px solid #dee2e6",
                                  }}
                                >
                                  <div className="text-muted small mb-1">
                                    {weekday}
                                  </div>
                                  <div className="fw-bold text-dark">
                                    {date.getDate()}/{date.getMonth() + 1}
                                  </div>
                                </td>
                              )}
                              <td
                                className="align-middle text-center"
                                style={{ padding: "10px 6px" }}
                              >
                                <span
                                  className="text-dark"
                                  style={{ fontSize: "0.85rem" }}
                                >
                                  {shift.type}
                                </span>
                              </td>
                              <td
                                className="align-middle text-center"
                                style={{
                                  padding: "10px 6px",
                                  fontSize: "0.85rem",
                                }}
                              >
                                <span className="text-dark">{shift.time}</span>
                              </td>
                            </tr>
                          ));
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer bg-light border-0 p-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmedSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Xác nhận tạo {totalShifts} ca
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorScheduleManagement;
