
import React, { useEffect, useState } from 'react';
import HeroSection from '../../components/home/HeroSection';
import SpecialtiesSection from '../../components/home/SpecialtiesSection';
import ArticlesSection from '../../components/home/ArticlesSection';
import doctorApi from '../../api/doctorApi';
import reviewApi from '../../api/reviewApi';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';


const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const Home = () => {
  const [doctors, setDoctors] = useState([]);
  const navigate = useNavigate();
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllDoctors, setShowAllDoctors] = useState(false);

  // Function to select featured doctors (top 6-8 doctors)
  const selectFeaturedDoctors = (allDoctorsList) => {
    const prioritySpecialties = [
      'Noi tong hop', 'Tim mach', 'Ho hap', 'Tieu hoa',
      'Than kinh', 'Ngoai tong hop', 'San phu khoa', 'Nhi khoa'
    ];
    const sortedDoctors = allDoctorsList.sort((a, b) => {
      const aPriority = prioritySpecialties.includes(a.specialty) ? 1 : 0;
      const bPriority = prioritySpecialties.includes(b.specialty) ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.rating - a.rating;
    });
    return sortedDoctors.slice(0, 6);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadData = async () => {
      try {
        setLoading(true);
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
          const transformedDoctors = rawDocs.map(doctor => {
            const id = doctor.doctorId || doctor.id;
            const r = ratingMap[id] || { avg: 0, count: 0 };
            let avatar = doctor.user?.avatarUrl;
            if (avatar) {
              if (!/^https?:\/\//i.test(avatar)) {
                avatar = avatar.startsWith("/") ? `${API_BASE_URL}${avatar}` : `${API_BASE_URL}/${avatar}`;
              }
            } else {
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
          setDoctors(transformedDoctors);
          setFeaturedDoctors(selectFeaturedDoctors(transformedDoctors));
        }
      } catch (error) {
        setDoctors([]);
        setFeaturedDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleShowAllDoctors = () => {
    setShowAllDoctors((prev) => !prev);
  };

  return (
    <div>
      <HeroSection />

      {/* Bác sĩ tiêu biểu section */}
      <section className="mb-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 flex flex-col items-center">
              <h2 className="text-2xl font-bold text-gray-900 text-center">
                {showAllDoctors ? 'Tất cả bác sĩ' : 'Bác sĩ tiêu biểu'}
              </h2>
              {!showAllDoctors && (
                <p className="text-gray-600 text-sm mt-1 text-center">
                  Chọn từ {featuredDoctors.length} bác sĩ được đánh giá cao nhất
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleShowAllDoctors}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors duration-200"
              >
                {showAllDoctors ? 'Thu gọn' : 'Xem thêm'}
                <ArrowRight className={`h-4 w-4 transition-transform duration-200${showAllDoctors ? ' rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          <div className="relative">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Đang tải danh sách bác sĩ...</span>
              </div>
            ) : (showAllDoctors ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 justify-center">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="bg-white rounded-2xl shadow-lg p-7 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group border border-blue-50 relative">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 mb-3 shadow cursor-pointer"
                        onClick={() => navigate(`/patient/doctordetail/${doctor.id}`)}
                        title="Xem thông tin bác sĩ"
                      >
                        <img
                          src={doctor.avatar}
                          alt={doctor.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/default-doctor.png";
                          }}
                        />
                      </div>
                      <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors duration-300 mb-1">{doctor.name}</h3>
                      <div className="flex flex-wrap justify-center gap-1 mb-2">
                        <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-100">{doctor.specialty}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{doctor.rating}</span>
                      </div>
                      <Link
                        to={`/patient/booking/${doctor.id}`}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-md no-underline hover:no-underline mt-2"
                      >
                        Đặt lịch ngay <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
                {featuredDoctors.map((doctor) => (
                  <div key={doctor.id} className="flex-shrink-0 w-72 bg-white rounded-2xl shadow-lg p-7 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group border border-blue-50 relative">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 mb-3 shadow cursor-pointer"
                        onClick={() => navigate(`/patient/doctordetail/${doctor.id}`)}
                        title="Xem thông tin bác sĩ"
                      >
                        <img
                          src={doctor.avatar}
                          alt={doctor.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/default-doctor.png";
                          }}
                        />
                      </div>
                      <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors duration-300 mb-1">{doctor.name}</h3>
                      <div className="flex flex-wrap justify-center gap-1 mb-2">
                        <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-100">{doctor.specialty}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{doctor.rating}</span>
                      </div>
                      <Link
                        to={`/patient/booking/${doctor.id}`}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-md no-underline hover:no-underline mt-2"
                      >
                        Đặt lịch ngay <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SpecialtiesSection />
      <ArticlesSection />
    </div>
  );
};

export default Home;
