import React, { useState, useEffect } from 'react';
import reviewApi from '../api/reviewApi';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Clock, Phone, Mail, Calendar, MessageCircle, Award, GraduationCap, Stethoscope } from 'lucide-react';
import doctorApi from '../api/doctorApi';

const DoctorDetail = () => {
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    fetchDoctorDetails();
  }, [id]);

  // Fetch reviews for doctor
  useEffect(() => {
    const fetchReviews = async () => {
      if (!doctor) return;
      setLoadingReviews(true);
      try {
        const data = await reviewApi.getByDoctor(doctor.doctorId || doctor.id || id);
        setReviews(data || []);
      } catch {
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };
    if (doctor) fetchReviews();
  }, [doctor, id]);

  // Fetch rating and review count after doctor is loaded
  useEffect(() => {
    const fetchRating = async () => {
      if (!doctor) return;
      try {
        const avg = await reviewApi.getAverageRatingByDoctor(doctor.doctorId || doctor.id || id);
        const count = await reviewApi.getReviewCountByDoctor(doctor.doctorId || doctor.id || id);
        setDoctor((prev) => ({ ...prev, rating: Number(avg) || 0, reviewCount: Number(count) || 0 }));
      } catch {}
    };
    if (doctor && (doctor.rating === undefined || doctor.reviewCount === undefined)) {
      fetchRating();
    }
  }, [doctor, id]);

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      const response = await doctorApi.getDoctorById(id);
      setDoctor(response.data);
    } catch (error) {
      console.error('Error fetching doctor details:', error);
      setError('Không thể tải thông tin bác sĩ');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = () => {
    navigate(`/patient/booking/${id}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin bác sĩ...</p>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy bác sĩ</h2>
          <p className="text-gray-600 mb-4">{error || 'Bác sĩ không tồn tại'}</p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const doctorName = doctor.name || 
    (doctor.user?.firstName && doctor.user?.lastName ? 
      `${doctor.user.lastName} ${doctor.user.firstName}` : 'Bác sĩ');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Quay lại</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-semibold text-gray-900">Chi tiết bác sĩ</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Doctor Info */}
          <div className="lg:col-span-2">
            {/* Doctor Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {doctor.user?.avatarUrl ? (
                    <img
                      src={doctor.user.avatarUrl.startsWith('http') ? doctor.user.avatarUrl : `http://localhost:8080${doctor.user.avatarUrl}`}
                      alt={doctorName}
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow"
                      onError={e => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(doctorName); }}
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {doctorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{doctorName}</h2>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="text-base font-semibold text-gray-700">
                        {Number(doctor.rating || 0).toFixed(1)}
                      </span>
                      {doctor.reviewCount > 0 && (
                        <span className="text-sm text-gray-500">({doctor.reviewCount})</span>
                      )}
                    </div>
                  </div>
                  <p className="text-blue-600 text-lg font-medium mb-1">{doctor.specialty || 'Chuyên khoa'}</p>
                  {doctor.department?.departmentName && (
                    <p className="text-gray-500 text-base mb-2">Khoa: {doctor.department.departmentName}</p>
                  )}
                  {doctor.workingHours && (
                    <p className="text-gray-500 text-base mb-2">Giờ làm việc: {doctor.workingHours}</p>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2">
                    {/* Đã chuyển số điện thoại và email sang mục Liên hệ */}
                  </div>
                </div>
              </div>
            </div>

            {/* About Doctor */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                Giới thiệu
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {doctor.bio || doctor.description || 'Bác sĩ chuyên khoa có nhiều năm kinh nghiệm trong việc chẩn đoán và điều trị các bệnh lý chuyên khoa. Với kiến thức chuyên sâu và tận tâm trong công việc, bác sĩ luôn đặt sức khỏe và sự hài lòng của bệnh nhân lên hàng đầu.'}
              </p>
            </div>

            {/* Education & Experience */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Học vấn & Kinh nghiệm
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-1 h-16 rounded bg-blue-500 mt-1"></div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">Bằng cấp</h4>
                    <p className="text-gray-700">{doctor.degree || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-1 h-16 rounded bg-green-500 mt-1"></div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">Kinh nghiệm</h4>
                    <p className="text-gray-700">{doctor.workExperience || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-1 h-16 rounded bg-purple-500 mt-1"></div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">Liên hệ</h4>
                    <p className="text-gray-700 mb-1">Số điện thoại: {doctor.user?.phone || 'Chưa cập nhật'}</p>
                    <p className="text-gray-700">Email: {doctor.user?.email || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Book Appointment Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Đặt lịch khám</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Thời gian khám: 30 phút</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Khám tại phòng khám</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Award className="h-4 w-4" />
                  <span>Phí khám: Liên hệ</span>
                </div>
              </div>
              
              <button
                onClick={handleBookAppointment}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Calendar className="h-5 w-5" />
                Đặt lịch khám
              </button>
            </div>

            {/* Contact Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review rating</h3>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="text-base font-semibold text-gray-700">
                    {Number(doctor.rating || 0).toFixed(1)}
                  </span>
                  {doctor.reviewCount > 0 && (
                    <span className="text-sm text-gray-500">({doctor.reviewCount})</span>
                  )}
                </div>
              </div>
              <h4 className="text-md font-semibold text-gray-800 mb-2">Đánh giá của người dùng</h4>
              {loadingReviews ? (
                <div className="text-center text-gray-500">Đang tải đánh giá...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center text-gray-500">Chưa có đánh giá nào.</div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        {[1,2,3,4,5].map((star) => (
                          <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                        <span className="text-sm text-gray-500 ml-2">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                      <div className="text-base font-medium text-gray-900">{review.patientName || 'Ẩn danh'}</div>
                      <div className="text-gray-700 mt-1">{review.comment || 'Không có nội dung.'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews Summary */}
            {/* Removed duplicate rating display. Only compact rating under doctor name remains. */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDetail;
