import React, { useState, useEffect } from "react";
import { Search, ArrowRight, Star, Shield, Clock, CheckCircle, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import doctorApi from "../../api/doctorApi";
import reviewApi from "../../api/reviewApi";

// Thêm hằng số base URL (sửa theo backend của bạn nếu khác)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

export default function PatientAppointmentBooking() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]); // Store all doctors for filtering
  const [featuredDoctors, setFeaturedDoctors] = useState([]); // Store featured doctors
  const [loading, setLoading] = useState(true);
  const [showAllDoctors, setShowAllDoctors] = useState(false); // Control whether to show all or featured

  // Function to select featured doctors (top 6-8 doctors)
  const selectFeaturedDoctors = (allDoctorsList) => {
    // Priority specialties for featured doctors
    const prioritySpecialties = [
      'Noi tong hop', 'Tim mach', 'Ho hap', 'Tieu hoa', 
      'Than kinh', 'Ngoai tong hop', 'San phu khoa', 'Nhi khoa'
    ];
    
    // Sort doctors by priority specialty and rating
    const sortedDoctors = allDoctorsList.sort((a, b) => {
      const aPriority = prioritySpecialties.includes(a.specialty) ? 1 : 0;
      const bPriority = prioritySpecialties.includes(b.specialty) ? 1 : 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Priority specialties first
      }
      
      return b.rating - a.rating; // Higher rating first
    });
    
    // Take top 6 doctors as featured
    return sortedDoctors.slice(0, 6);
  };

  useEffect(() => {
    // Load doctors and departments from API
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch doctors from API
        const doctorsResponse = await doctorApi.getAllDoctors();
        if (doctorsResponse.data) {
          const rawDocs = doctorsResponse.data;

          // Fetch avg rating and review count for each doctor (best-effort)
          const ratingPromises = rawDocs.map(async (d) => {
            try {
              const avg = await reviewApi.getAverageRatingByDoctor(d.doctorId || d.id);
              const count = await reviewApi.getReviewCountByDoctor(d.doctorId || d.id);
              return { doctorId: d.doctorId || d.id, avg: Number(avg || 0), count: Number(count || 0) };
            } catch (e) {
              return { doctorId: d.doctorId || d.id, avg: 0, count: 0 };
            }
          });

          const ratings = await Promise.all(ratingPromises);
          const ratingMap = {};
          ratings.forEach(r => { ratingMap[r.doctorId] = r; });

          // Transform API data to match our component structure and include ratings
          const transformedDoctors = rawDocs.map(doctor => {
            const id = doctor.doctorId || doctor.id;
            const r = ratingMap[id] || { avg: 0, count: 0 };

            // Xử lý avatar: nếu backend trả về đường dẫn tương đối thì ghép base URL
            let avatar = doctor.user?.avatarUrl;
            if (avatar) {
              // Nếu đã là absolute (http/https) giữ nguyên
              if (!/^https?:\/\//i.test(avatar)) {
                // Đảm bảo có dấu / ở giữa
                avatar = avatar.startsWith("/") ? `${API_BASE_URL}${avatar}` : `${API_BASE_URL}/${avatar}`;
              }
            } else {
              // Fallback ảnh mặc định (đặt file này vào public/images/default-doctor.png)
              avatar = "/images/default-doctor.png";
            }

            return {
              id,
              name: `${doctor.user?.lastName || ''} ${doctor.user?.firstName || ''}`.trim() || 'Bác sĩ',
              specialty: doctor.specialty || 'Chưa cập nhật',
              rating: r.count > 0 ? r.avg.toFixed(1) : 0,
              reviewCount: r.count || 0,
              avatar,
              experience: `${doctor.experience || 'Nhiều'} năm kinh nghiệm`,
              department: doctor.department?.departmentName || 'Chưa phân khoa'
            };
          });

          setAllDoctors(transformedDoctors); // Store all doctors

          // Select featured doctors
          const featured = selectFeaturedDoctors(transformedDoctors);
          setFeaturedDoctors(featured);

          // Display featured doctors initially
          setDoctors(featured);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const searchResponse = await doctorApi.searchDoctors(searchQuery);
      if (searchResponse.data) {
        const transformedDoctors = searchResponse.data.map(doctor => {
          // Chuẩn hóa avatar
          let avatar = doctor.user?.avatarUrl;
          if (avatar) {
            if (!/^https?:\/\//i.test(avatar)) {
              avatar = avatar.startsWith("/")
                ? `${API_BASE_URL}${avatar}`
                : `${API_BASE_URL}/${avatar}`;
            }
          } else {
            avatar = "/images/default-doctor.png";
          }

          return {
            id: doctor.doctorId || doctor.id,
            name: `${doctor.user?.lastName || ''} ${doctor.user?.firstName || ''}`.trim(),
            specialty: doctor.specialty || 'Chưa cập nhật',
            rating: 4.5,
            avatar,
            experience: `${doctor.experience || 'Nhiều'} năm kinh nghiệm`,
            department: doctor.department?.departmentName || 'Chưa phân khoa'
          };
        });
        setDoctors(transformedDoctors);
      }
    } catch (error) {
      console.error("Error searching doctors:", error);
      // Keep current doctors list on search error
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialtyClick = (specialtyName) => {
    // Filter doctors by specialty
    const filteredDoctors = allDoctors.filter(doctor => 
      doctor.specialty.toLowerCase().includes(specialtyName.toLowerCase())
    );
    setDoctors(filteredDoctors);
  };

  const handleShowAllDoctors = () => {
    if (showAllDoctors) {
      // If currently showing all, go back to featured
      setDoctors(featuredDoctors);
      setShowAllDoctors(false);
    } else {
      // If currently showing featured, show all
      setDoctors(allDoctors);
      setShowAllDoctors(true);
    }
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Left Content - 60% */}
            <div className="lg:col-span-3 space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Đặt khám bác sĩ
                </h1>
                <p className="text-lg md:text-xl text-blue-100 leading-relaxed">
                  Đặt khám với hơn 1000 bác sĩ đã kết nối chính thức với ClinicBooking để có số thứ tự và khung giờ khám trước
                </p>
              </div>  
              
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Triệu chứng, bác sĩ, bệnh viện..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-full text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-lg"
                  />
                </div>
              </form>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>1000+ Bác sĩ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>50+ Chuyên khoa</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>24/7 Hỗ trợ</span>
                </div>
              </div>
            </div>

            {/* Right Content - Family Image - 40% */}
            <div className="lg:col-span-2 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Main Family Image */}
                <div className="relative">
                  <div className="w-80 h-80 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/20 overflow-hidden shadow-2xl group hover:shadow-3xl transition-all duration-300 hover:scale-105">
                    <img 
                      src="/images/family.jpg" 
                      alt="Gia đình khỏe mạnh" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        // Fallback to emoji if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full flex items-center justify-center text-8xl" style={{display: 'none'}}>
                      👨‍👩‍👧‍👦
                    </div>
                    
                    {/* Overlay gradient for better text readability if needed */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  
                  {/* Floating Elements */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-white-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <span className="text-2xl">💊</span>
                  </div>
                  
                </div>

                {/* Background decorative elements */}
                <div className="absolute inset-0 -z-10">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-xl"></div>
                  <div className="absolute bottom-10 right-10 w-24 h-24 bg-green-500/20 rounded-full blur-xl"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-yellow-500/10 rounded-full blur-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Doctors Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {showAllDoctors ? 'Tất cả bác sĩ' : 'Bác sĩ tiêu biểu'}
              </h2>
              {!showAllDoctors && (
                <p className="text-gray-600 text-sm mt-1">
                  Chọn từ {featuredDoctors.length} bác sĩ được đánh giá cao nhất
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {showAllDoctors ? (
                <button 
                  onClick={handleShowAllDoctors}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors duration-200"
                >
                  Thu gọn
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 rotate-180" />
                </button>
              ) : (
                <Link
                  to="/patient/doctors"
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors duration-200"
                >
                  Xem thêm
                  <ArrowRight className="h-4 w-4 transition-transform duration-200" />
                </Link>
              )}
            </div>
          </div>

          {/* Doctors Carousel */}
          <div className="relative">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Đang tải danh sách bác sĩ...</span>
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">Không tìm thấy bác sĩ</div>
                <div className="text-gray-400">Vui lòng thử lại với từ khóa khác</div>
              </div>
            ) : (
              <div className={showAllDoctors ? 
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : 
                "flex space-x-6 overflow-x-auto pb-4 scrollbar-hide"
              }>
                {doctors.map((doctor) => (
                <div key={doctor.id} className={`${showAllDoctors ? 
                  "bg-white rounded-lg shadow-md p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group" :
                  "flex-shrink-0 w-64 bg-white rounded-lg shadow-md p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
                }`}>
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden relative flex items-center justify-center bg-gray-200 group-hover:bg-blue-100 transition-colors duration-300">
                      <img
                        src={doctor.avatar}
                        alt={doctor.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/default-doctor.png"; // Đảm bảo có file này
                        }}
                      />
                      {/* Fallback emoji, initially hidden if doctor.avatar exists */}
                      <span
                        className="text-2xl group-hover:scale-110 transition-transform duration-300 absolute"
                        style={{ display: doctor.avatar && doctor.avatar !== '/api/placeholder/150/150' ? 'none' : 'flex' }}
                      >
                        👨‍⚕️
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-sm group-hover:text-blue-600 transition-colors duration-300">{doctor.name}</h3>
                    <p className="text-gray-600 text-sm mb-3 group-hover:text-gray-800 transition-colors duration-300">{doctor.specialty}</p>
                    <div className="flex items-center justify-center gap-1 mb-4">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{doctor.rating}</span>
                    </div>
                    <Link 
                      to={`/patient/booking/${doctor.id}`}
                      className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-md no-underline hover:no-underline"
                    >
                      Đặt lịch ngay <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trust Section */}
        <section className="mb-12 rounded-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              An tâm tìm và đặt bác sĩ
            </h2>
            <p className="text-lg text-gray-600">
              Hơn {allDoctors.length > 0 ? allDoctors.length : '600'} bác sĩ liên kết chính thức với ClinicBooking
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center mb-8">
            {/* Left: Image Section */}
            <div className="lg:col-span-1 relative">
              <div className="relative w-full h-64 lg:h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <img 
                  src="/images/family2.jpg" 
                  alt="Bác sĩ và bệnh nhân" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.nextElementSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-6xl" style={{display: 'none'}}>
                  👨‍⚕️👩‍⚕️
                </div>
                
                {/* Floating icon */}
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <span className="text-xl">💬</span>
                </div>
              </div>
            </div>

            {/* Right: Features */}
            <div className="lg:col-span-2 space-y-6">
              {/* Feature 1: Đội ngũ bác sĩ */}
              <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border-l-4 border-blue-500">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Đội ngũ bác sĩ
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Tất cả các bác sĩ đều có liên kết chính thức với ClinicBooking để bảo đảm lịch đặt khám của bạn được xác nhận.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2: Đặt khám dễ dàng */}
              <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border-l-4 border-green-500">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Đặt khám dễ dàng, nhanh chóng, chủ động
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Chỉ với 1 phút, bạn có thể đặt khám thành công với bác sĩ. Phiếu khám bao gồm số thứ tự và khung thời gian dự kiến.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Elements */}
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700 font-medium">Bác sĩ được xác minh</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700 font-medium">Xác nhận tức thì</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700 font-medium">Thanh toán an toàn</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}