import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  MessageCircle,
  RefreshCw
} from "lucide-react";
import reviewApi from "../../api/reviewApi";
import appointmentApi from "../../api/appointmentApi";
import patientApi from "../../api/patientApi";
import doctorApi from "../../api/doctorApi";
import paymentApi from "../../api/paymentApi";
import toast from "../../utils/toast";
import { getFullAvatarUrl } from "../../utils/avatarUtils";

// Rating Stars Component
const RatingStars = ({ value, onChange, readonly }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= value 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function PatientAppointmentHistory() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [doctors, setDoctors] = useState({});
  
  // Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [appointmentToReview, setAppointmentToReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState({}); // Store reviews keyed by appointmentId
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [doctorRatings, setDoctorRatings] = useState({});
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const [payOSProcessing, setPayOSProcessing] = useState(false);
  const location = useLocation();
  const lastProcessedPayOSId = useRef(null);
  const lastHandledPaymentFlag = useRef(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Expand notes
  const [expandedNotes, setExpandedNotes] = useState({});

  // Load user info
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch (_) {
        setCurrentUser(null);
      }
    }

    const onUserChanged = () => {
      const v = localStorage.getItem('user');
      if (v) {
        try {
          setCurrentUser(JSON.parse(v));
        } catch (_) {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };

    window.addEventListener('userChanged', onUserChanged);
    window.addEventListener('storage', onUserChanged);

    return () => {
      window.removeEventListener('userChanged', onUserChanged);
      window.removeEventListener('storage', onUserChanged);
    };
  }, []);

  // Load patient ID
  useEffect(() => {
    const loadPatientByUserId = async () => {
      try {
        const userId = getUserIdFromCookie();
        if (userId) {
          const response = await patientApi.getPatientByUserId(userId);
          if (response.data && response.data.patientId) {
            setPatientId(response.data.patientId);
            return;
          }
        }

        const patientIdFromUser = getPatientIdFromUser(currentUser);
        if (patientIdFromUser) {
          setPatientId(patientIdFromUser);
          return;
        }
      } catch (error) {
        console.error('❌ Error loading patient by userId:', error);
      }
    };

    loadPatientByUserId();
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payOSId = params.get('id');
    const payOSStatus = params.get('status');
    const orderCode = params.get('orderCode');
    const paymentStatusFlag = params.get('paymentStatus');
    const appointmentIdParam = params.get('appointmentId');

    const clearPayOSParams = () => {
      ['id', 'status', 'orderCode', 'code', 'paymentStatus', 'appointmentId'].forEach((key) =>
        params.delete(key)
      );
      const remaining = params.toString();
      navigate(remaining ? `${location.pathname}?${remaining}` : location.pathname, { replace: true });
    };

    if (paymentStatusFlag === 'success' && !payOSId) {
      const signature = `success-${appointmentIdParam || ''}`;
      if (lastHandledPaymentFlag.current === signature) return;
      lastHandledPaymentFlag.current = signature;
      toast.success('Thanh toán thành công! Lịch hẹn của bạn đã được cập nhật.');
      clearPayOSParams();
      return;
    }

    if (!payOSId || lastProcessedPayOSId.current === payOSId) {
      return;
    }

    lastProcessedPayOSId.current = payOSId;

    const syncPayOSStatus = async () => {
      setPayOSProcessing(true);
      try {
        if (payOSStatus === 'CANCELLED') {
          toast.info('Thanh toán đã được hủy.');
          return;
        }

        try {
          await paymentApi.updatePaymentStatusFromPayOS(payOSId, 'PAID', orderCode);
        } catch (updateError) {
          console.error('Không thể cập nhật trạng thái thanh toán từ PayOS:', updateError);
        }

        try {
          await paymentApi.getPaymentByPayOSPaymentId(payOSId);
        } catch (fetchError) {
          console.error('Không thể lấy thông tin thanh toán từ PayOS:', fetchError);
        }

        toast.success('Thanh toán thành công! Lịch hẹn của bạn đã được cập nhật.');
        setAppointmentsRefreshKey((prev) => prev + 1);

        try {
          localStorage.setItem('payosStatus', 'PAID');
          localStorage.setItem('payosLastUpdate', String(Date.now()));
          window.dispatchEvent(new Event('payosStatusChanged'));
        } catch (_) {}
      } catch (error) {
        console.error('Lỗi đồng bộ thanh toán PayOS:', error);
        toast.error('Không thể cập nhật trạng thái thanh toán. Vui lòng thử lại.');
      } finally {
        setPayOSProcessing(false);
        clearPayOSParams();
      }
    };

    syncPayOSStatus();
  }, [location, navigate]);

  const getUserIdFromCookie = () => {
    const cookies = document.cookie.split(';'); 
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'userId' || name === 'user_id') {
        return parseInt(value);
      }
    }
    return null;
  };

  const getPatientIdFromUser = (user) => {
    if (!user) return null;
    if (user.patient && user.patient.patientId) return user.patient.patientId;
    if (user.patientId) return user.patientId;
    if (user.id && typeof user.id === 'number') return user.id;
    if (user.userId && typeof user.userId === 'number') return user.userId;
    return null;
  };

  // Load thông tin bác sĩ và đánh giá
  const loadDoctorInfo = async (doctorId) => {
    if (!doctorId) return;

    try {
      // Load doctor info if not already loaded
      if (!doctors[doctorId]) {
        const response = await doctorApi.getDoctorById(doctorId);
        if (response.data) {
          setDoctors(prev => ({
            ...prev,
            [doctorId]: response.data
          }));
        }
      }

      // Load average rating
      if (!doctorRatings[doctorId]) {
        const avgRating = await reviewApi.getAverageRatingByDoctor(doctorId);
        const reviewCount = await reviewApi.getReviewCountByDoctor(doctorId);
        
        setDoctorRatings(prev => ({
          ...prev,
          [doctorId]: {
            average: avgRating || 0,
            count: reviewCount || 0
          }
        }));
      }
    } catch (error) {
      console.error('Error loading doctor info:', error);
    }
  };

  // Load reviews by patient and map by doctorId
  useEffect(() => {
    const loadPatientReviews = async () => {
      if (!patientId) return;
      try {
        const list = await reviewApi.getByPatient(patientId);
        if (Array.isArray(list)) {
          const mapByAppointment = {};
            list.forEach(r => {
              if (r && r.appointmentId != null) {
                mapByAppointment[r.appointmentId] = r;
              }
            });
            setReviews(mapByAppointment);
        } else {
          setReviews({});
        }
      } catch (error) {
        console.error('Error loading patient reviews:', error);
      }
    };

    loadPatientReviews();
  }, [patientId]);

  // Open edit review modal (prefill with existing review)
  const openEditReview = (appointment, review) => {
    console.log('Opening edit review:', review);
    const reviewId = review?.reviewId || review?.id;
    if (!reviewId) {
      console.error('No review ID found:', review);
      toast.error('Không thể chỉnh sửa đánh giá này');
      return;
    }
    setAppointmentToReview(appointment);
    setIsEditingReview(true);
    setEditingReviewId(reviewId);
    setRating(review?.rating || 0);
    setReviewComment(review?.comment || '');
    setShowReviewModal(true);
    console.log('Edit review state set:', {
      appointmentId: appointment.appointmentId,
      reviewId: reviewId,
      rating: review?.rating,
      comment: review?.comment
    });
  };

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!appointmentToReview || rating === 0) {
      console.log('Invalid review data:', { appointmentToReview, rating });
      toast.warning('Vui lòng chọn số sao đánh giá');
      return;
    }

    try {
      setSubmittingReview(true);

      if (isEditingReview && editingReviewId) {
        console.log('Current review state:', {
          isEditingReview,
          editingReviewId,
          rating,
          comment: reviewComment
        });

        // Prepare update data according to ReviewDTO.Update format
        const updateData = {
          rating: rating,
          comment: reviewComment
        };
        
        console.log('Sending update request:', { 
          url: `/reviews/${editingReviewId}`,
          data: updateData 
        });
        
        const resp = await reviewApi.update(editingReviewId, updateData);
        console.log('Review update response:', resp);
        
        if (!resp) {
          throw new Error('Không nhận được phản hồi từ server');
        }

        // Update reviews state (map by appointmentId)
        setReviews(prev => ({
          ...prev,
          [appointmentToReview.appointmentId]: {
            ...(prev[appointmentToReview.appointmentId] || {}),
            ...resp,
            reviewId: resp.reviewId || resp.id || editingReviewId,
            rating: resp.rating ?? rating,
            comment: resp.comment ?? reviewComment,
            appointmentId: resp.appointmentId ?? appointmentToReview.appointmentId,
            doctorId: resp.doctorId ?? appointmentToReview.doctorId,
            patientId: resp.patientId ?? patientId,
            createdAt: resp.createdAt || prev[appointmentToReview.appointmentId]?.createdAt || new Date().toISOString()
          }
        }));

        // Reset states after successful update
        setShowReviewModal(false);
        setAppointmentToReview(null);
        setIsEditingReview(false);
        setEditingReviewId(null);
        setRating(0);
        setReviewComment('');
        toast.success('Cập nhật đánh giá thành công!');
      } else {
        console.log('Creating review:', {
          appointmentId: appointmentToReview.appointmentId,
          doctorId: appointmentToReview.doctorId,
          patientId: patientId,
          rating,
          comment: reviewComment
        });

        const response = await reviewApi.createReview({
          appointmentId: appointmentToReview.appointmentId,
          doctorId: appointmentToReview.doctorId,
          patientId: patientId,
          rating,
          comment: reviewComment
        });

        console.log('Review submission response:', response);

          // Update reviews state (map by appointmentId)
          setReviews(prev => {
            const newReviews = {
              ...prev,
              [appointmentToReview.appointmentId]: {
                reviewId: response.reviewId || response.id,
                rating,
                comment: reviewComment,
                createdAt: response.createdAt || new Date().toISOString(),
                doctorId: appointmentToReview.doctorId,
                patientId: patientId,
                appointmentId: appointmentToReview.appointmentId
              }
            };
            return newReviews;
          });

          setShowReviewModal(false);
          setAppointmentToReview(null);
          setRating(0);
          setReviewComment('');
          setIsEditingReview(false);
          setEditingReviewId(null);
        toast.success('Đánh giá của bạn đã được ghi nhận!');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(`Không thể gửi đánh giá: ${error.response.data.message || 'Vui lòng thử lại sau'}`);
      } else {
        toast.error('Không thể gửi đánh giá. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  // Load appointments
  useEffect(() => {
    const loadAppointments = async () => {
      if (!patientId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await appointmentApi.getAppointmentsByPatient(patientId);
        if (response.data) {
          setAppointments(response.data);
          setTotalPages(Math.ceil(response.data.length / itemsPerPage));
          
          // Load thông tin bác sĩ cho mỗi appointment
          response.data.forEach(appointment => {
            if (appointment.doctorId) {
              loadDoctorInfo(appointment.doctorId);
            }
          });
        } else {
          setAppointments([]);
        }
      } catch (err) {
        console.error('Error loading appointments:', err);
        setError('Không thể tải lịch sử đặt lịch');
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [patientId, appointmentsRefreshKey]);

  // (Removed old by-appointment review loader)

  // Filter appointments
  const filteredAppointments = appointments.filter(appointment => {
    // Status filter
    if (statusFilter !== "All" && appointment.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== "All") {
      const appointmentDate = new Date(appointment.startTime);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setDate(lastMonth.getDate() - 30);

      switch (dateFilter) {
        case "Today":
          return appointmentDate.toDateString() === today.toDateString();
        case "Yesterday":
          return appointmentDate.toDateString() === yesterday.toDateString();
        case "LastWeek":
          return appointmentDate >= lastWeek;
        case "LastMonth":
          return appointmentDate >= lastMonth;
        default:
          return true;
      }
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const doctorName = appointment.doctor?.name?.toLowerCase() || '';
      const specialty = appointment.doctor?.specialty?.toLowerCase() || '';
      const notes = appointment.notes?.toLowerCase() || '';

      return doctorName.includes(searchLower) ||
        specialty.includes(searchLower) ||
        notes.includes(searchLower);
    }

    return true;
  });

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  const getStatusBadge = (status) => {
    const statusConfig = {
      "Scheduled": {
        class: "bg-blue-50 text-blue-600 border border-blue-600",
        text: "Đã đặt lịch",
        icon: CheckCircle,
        color: '#0d6efd'
      },
      "Confirmed": {
        class: "bg-blue-600 text-white",
        text: "Đã xác nhận",
        icon: CheckCircle,
        color: '#0d6efd'
      },
      "Completed": {
        class: "bg-green-50 text-green-600 border border-green-600",
        text: "Hoàn thành",
        icon: CheckCircle,
        color: '#198754'
      },
      "Cancelled": {
        class: "bg-red-600 text-white",
        text: "Đã hủy",
        icon: XCircle,
        color: '#dc3545'
      },
      "Rejected": {
        class: "bg-red-600 text-white",
        text: "Từ chối",
        icon: XCircle,
        color: '#dc3545'
      },
      "NoShow": {
        class: "bg-yellow-400 text-gray-900",
        text: "Không đến",
        icon: AlertCircle,
        color: '#ffc107'
      }
    };

    const config = statusConfig[status] || {
      class: "bg-gray-500 text-white",
      text: status || "Không xác định",
      icon: AlertCircle,
      color: '#6c757d'
    };

    return config;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Toggle expand notes
  const toggleNotes = (appointmentId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [appointmentId]: !prev[appointmentId]
    }));
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Lỗi tải dữ liệu</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            className="text-blue-600 hover:text-blue-700"
            onClick={() => navigate(-1)}
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser || !patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cần đăng nhập</h2>
          <p className="text-gray-600 mb-4">Bạn cần đăng nhập để xem lịch sử đặt lịch</p>
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            onClick={() => navigate('/login')}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
    }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-4 sm:py-8"> 
        <div className="max-w-[1600px] mx-auto px-2 sm:px-4">
          {payOSProcessing && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <RefreshCw className="mr-2 inline h-4 w-4 animate-spin text-blue-500" />
              Đang đồng bộ trạng thái thanh toán của bạn...
            </div>
          )}
          {/* Appointments List */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 px-3 sm:px-6 py-3 sm:py-4 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-0 drop-shadow-sm">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 inline mr-2" />
                  Lịch hẹn của tôi
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/25 hover:bg-white/35 text-white rounded-lg transition-all text-sm sm:text-base font-semibold backdrop-blur-sm shadow-md hover:shadow-lg"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">Bộ lọc và Tìm kiếm</span>
                    <span className="xs:hidden">Bộ lọc</span>
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <span className="bg-white/25 text-white px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-md backdrop-blur-sm text-center">
                    {filteredAppointments.length} lịch hẹn
                  </span>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
              <div className="border-b border-gray-200 bg-white">
                <div className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {/* Search */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Search className="h-4 w-4 inline mr-1" />
                        Tìm kiếm
                      </label>
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          placeholder="Tìm theo tên bác sĩ, chuyên khoa..."
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Trạng thái
                      </label>
                      <select
                        value={statusFilter}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="All">Tất cả trạng thái</option>
                        <option value="Scheduled">Đã đặt lịch</option>
                        <option value="Confirmed">Đã xác nhận</option>
                        <option value="Completed">Hoàn thành</option>
                        <option value="Cancelled">Đã hủy</option>
                        <option value="Rejected">Từ chối</option>
                        <option value="NoShow">Không đến</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Thời gian
                      </label>
                      <select
                        value={dateFilter}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        onChange={(e) => setDateFilter(e.target.value)}
                      >
                        <option value="All">Tất cả thời gian</option>
                        <option value="Today">Hôm nay</option>
                        <option value="Yesterday">Hôm qua</option>
                        <option value="LastWeek">Tuần qua</option>
                        <option value="LastMonth">Tháng qua</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paginatedAppointments.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                  <Calendar className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Không có lịch hẹn nào</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {filteredAppointments.length === 0 && appointments.length > 0
                    ? "Không tìm thấy lịch hẹn phù hợp với bộ lọc bạn đã chọn. Vui lòng thử lại với bộ lọc khác."
                    : "Bạn chưa có lịch hẹn nào. Hãy đặt lịch khám với bác sĩ ngay hôm nay!"}
                </p>
                {appointments.length === 0 && (
                  <button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all"
                    onClick={() => navigate('/patient/book-appointment')}
                  >
                    <Calendar className="h-5 w-5 inline mr-2" />
                    Đặt lịch ngay
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {paginatedAppointments.map((appointment, index) => {
                  const statusConfig = getStatusBadge(appointment.status);
                  const StatusIcon = statusConfig.icon;
                  const doctor = doctors[appointment.doctorId] || {};
                  const isEven = index % 2 === 0;
                  return (
                    <React.Fragment key={appointment.appointmentId}>
                      <div className={`p-3 sm:p-6 transition-all duration-200 border-l-4 border-gray-300 ${
                        isEven ? 'bg-white' : 'bg-gray-50/50'
                      }`}>
                        {/* Header: doctor + quick info */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-white shadow-md">
                                {(doctor.user?.avatarUrl || doctor.avatarUrl || appointment.doctor?.avatarUrl) ? (
                                  <img
                                    alt={doctor.name || appointment.doctorName || 'Bác sĩ'}
                                    className="w-full h-full object-cover"
                                    src={getFullAvatarUrl(doctor.user?.avatarUrl || doctor.avatarUrl || appointment.doctor?.avatarUrl)}
                                    onError={(e) => { 
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) {
                                        e.target.nextSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className="w-full h-full bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-lg"
                                  style={{ display: (doctor.user?.avatarUrl || doctor.avatarUrl || appointment.doctor?.avatarUrl) ? 'none' : 'flex' }}
                                >
                                  {doctor.user?.firstName?.charAt(0) || doctor.name?.charAt(0) || appointment.doctorName?.charAt(0) || 'B'}
                                  {doctor.user?.lastName?.charAt(0) || 'S'}
                                </div>
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link 
                                to={`/patient/booking/${appointment.doctorId}`}
                                className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate block hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                {doctor.user ? `${doctor.user.lastName} ${doctor.user.firstName} ` : doctor.name || appointment.doctorName || 'Bác sĩ'}
                              </Link>
                              <div className="flex flex-col gap-1 sm:gap-1.5">
                                {doctorRatings[appointment.doctorId] && (
                                  <div className="flex items-center gap-3 text-sm flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded">
                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        <span className="font-semibold text-gray-700">
                                          {doctorRatings[appointment.doctorId].average.toFixed(1)}
                                        </span>
                                      </div>
                                      <span className="text-gray-500 text-xs">
                                        ({doctorRatings[appointment.doctorId].count} đánh giá)
                                      </span>
                                    </div>
                                    
                                    {appointment.status === 'Completed' && (
                                      <>
                                        {reviews[appointment.appointmentId] ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Đánh giá của bạn:</span>
                                            <div className="flex items-center gap-1">
                                              <RatingStars value={reviews[appointment.appointmentId].rating} readonly={true} />
                                            </div>
                                            <button onClick={() => openEditReview(appointment, reviews[appointment.appointmentId])} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 ml-2">
                                              <MessageCircle className="h-3 w-3" /> Chỉnh sửa
                                            </button>
                                          </div>
                                        ) : (
                                          <button onClick={() => { setAppointmentToReview(appointment); setShowReviewModal(true); }} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                            <Star className="h-3 w-3" /> Thêm đánh giá của bạn
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}

                                {!doctorRatings[appointment.doctorId] && appointment.status === 'Completed' && (
                                  <div className="flex items-center gap-2">
                                    {reviews[appointment.appointmentId] ? (
                                      <div className="flex items-center justify-between w-full bg-blue-50 px-3 py-1.5 rounded-lg">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-gray-700">Đánh giá của bạn:</span>
                                          <div className="flex items-center gap-1">
                                            <RatingStars value={reviews[appointment.appointmentId].rating} readonly={true} />
                                          </div>
                                        </div>
                                        <button onClick={() => openEditReview(appointment, reviews[appointment.appointmentId])} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                                          <MessageCircle className="h-3 w-3" /> Chỉnh sửa
                                        </button>
                                      </div>
                                    ) : (
                                      <button onClick={() => { setAppointmentToReview(appointment); setShowReviewModal(true); }} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                        <Star className="h-3 w-3" /> Thêm đánh giá của bạn
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <span className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold shadow-sm ${statusConfig.class}`}>
                              <StatusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="whitespace-nowrap">{statusConfig.text}</span>
                            </span>
                            {appointment.status === 'Completed' && (
                              <button className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-white bg-blue-300 hover:bg-blue-400 rounded-lg transition-all text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md" onClick={() => { if (reviews[appointment.appointmentId]) openEditReview(appointment, reviews[appointment.appointmentId]); else { setAppointmentToReview(appointment); setShowReviewModal(true); } }}>
                                <span className="whitespace-nowrap">{reviews[appointment.appointmentId] ? 'Chỉnh sửa' : 'Đánh giá'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Appointment Details */}
                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {/* Ngày khám */}
                            <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                                <Calendar className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Ngày khám</div>
                                <div className="text-sm font-bold text-gray-900 leading-tight">{formatDate(appointment.startTime)}</div>
                              </div>
                            </div>

                            {/* Giờ khám */}
                            <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all">
                              <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                                <Clock className="h-5 w-5 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Giờ khám</div>
                                <div className="text-sm font-bold text-gray-900 leading-tight">{formatTime(appointment.startTime)}{appointment.endTime ? ` - ${formatTime(appointment.endTime)}` : ''}</div>
                              </div>
                            </div>

                            {/* Phí khám */}
                            {appointment.fee && (
                              <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all">
                                <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                                  <span className="text-green-600 font-bold text-lg">₫</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Phí khám</div>
                                  <div className="text-sm font-bold text-green-600 leading-tight">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(appointment.fee)}</div>
                                </div>
                              </div>
                            )}

                            {/* Ghi chú */}
                            {appointment.notes && (
                              <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all md:col-span-2 lg:col-span-1">
                                <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">
                                  <FileText className="h-5 w-5 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Ghi chú</div>
                                  <div className="text-sm text-gray-700 leading-tight">
                                    {expandedNotes[appointment.appointmentId] ? appointment.notes : (appointment.notes.length > 30 ? `${appointment.notes.substring(0,30)}...` : appointment.notes)}
                                  </div>
                                  {appointment.notes.length > 30 && (
                                    <button onClick={() => toggleNotes(appointment.appointmentId)} className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                                      {expandedNotes[appointment.appointmentId] ? 'Thu gọn' : 'Xem thêm'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-3 sm:px-6 py-3 sm:py-5 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left">
                    Hiển thị <span className="font-bold text-gray-900">{startIndex + 1}</span> đến <span className="font-bold text-gray-900">{Math.min(endIndex, filteredAppointments.length)}</span> trong <span className="font-bold text-gray-900">{filteredAppointments.length}</span> lịch hẹn
                  </p>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold border-2 border-gray-300 rounded-lg hover:bg-white hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:border-gray-300 disabled:hover:text-gray-500 transition-all"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    >
                      <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                      <span className="hidden xs:inline">Trước</span>
                    </button>
                    <span className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-lg whitespace-nowrap">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <button
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold border-2 border-gray-300 rounded-lg hover:bg-white hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:border-gray-300 disabled:hover:text-gray-500 transition-all"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    >
                      <span className="hidden xs:inline">Sau</span>
                      <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 inline ml-1 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-300 to-indigo-300 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                  <Star className="h-6 w-6 text-white fill-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-0">
                  {isEditingReview ? 'Chỉnh sửa đánh giá' : 'Đánh giá bác sĩ'}
                </h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Đánh giá của bạn <span className="text-red-500">*</span>
                  </label>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <RatingStars value={rating} onChange={setRating} />
                    {rating === 0 && (
                      <p className="text-xs text-yellow-700 mt-2">Vui lòng chọn số sao đánh giá</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nhận xét
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all resize-none"
                    rows="4"
                    placeholder="Chia sẻ trải nghiệm của bạn về buổi khám..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Nhận xét của bạn giúp bác sĩ cải thiện chất lượng dịch vụ</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all"
                  onClick={() => {
                    setShowReviewModal(false);
                    setAppointmentToReview(null);
                    setRating(0);
                    setReviewComment('');
                    setIsEditingReview(false);
                    setEditingReviewId(null);
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-300 to-indigo-300 text-white rounded-lg hover:from-blue-400 hover:to-indigo-400 font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  disabled={rating === 0 || submittingReview}
                  onClick={handleSubmitReview}
                >
                  {submittingReview ? (
                    <>
                      <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                      {isEditingReview ? 'Đang cập nhật...' : 'Đang gửi...'}
                    </>
                  ) : (
                    <>
                      {isEditingReview ? 'Chỉnh sửa' : 'Đánh giá'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* (Removed duplicate Review Modal) */}
    </div>
  );
}
