import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, Filter, Star, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { getDoctors as apiGetDoctors } from "../../api/doctorApi";
import reviewApi from "../../api/reviewApi";
import { normalizeAvatar } from "../../utils/avatarUtils";

export default function DoctorList() {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  // bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // options lấy từ dữ liệu thật
  const [specialties, setSpecialties] = useState([]);
  const [areas, setAreas] = useState([]);

  // phân trang
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(12);
  const [hasMore, setHasMore] = useState(true);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // tải trang đầu
    setDoctors([]);
    setFilteredDoctors([]);
    setPage(0);
    setHasMore(true);
  }, []);

  // load theo page/size
  useEffect(() => {
    loadDoctors(page, size, page === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  // áp dụng lọc/sort khi dữ liệu/tiêu chí đổi
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, searchQuery, selectedSpecialty, selectedArea, sortBy]);

  async function loadDoctors(p, s, replace = false) {
    try {
      setLoading(true);

      const res = await apiGetDoctors({ page: p, size: s, sort: "doctorId,asc" });

      // Unwrap: {data:{content}} | {content} | []
      const root = res?.data ?? {};
      const payload = root?.data ?? root;
      const list = Array.isArray(payload)
        ? payload
        : (payload.content ?? payload.items ?? payload.results ?? []);

      // map dữ liệu thật (không random)
      const mapped = list.map((doctor) => {
        const id = doctor.doctorId ?? doctor.id;
        const user = doctor.user ?? {};
        const first = user.firstName ?? doctor.firstName ?? "";
        const last = user.lastName ?? doctor.lastName ?? "";
        const fullName = (doctor.fullName ?? `${first} ${last}`.trim()) || "Bác sĩ";
        const depName =
          doctor.department?.departmentName ??
          doctor.departmentName ??
          doctor.department?.name ??
          "";
        const specialty = doctor.specialty ?? depName ?? "";

        const rawAvatar = user.avatarUrl || doctor.avatarUrl;
        const avatar = normalizeAvatar(rawAvatar);

        return {
          id,
          name: fullName,
          specialty,
          rating: Number(doctor.avgRating ?? doctor.averageRating ?? 0),
            reviewCount: Number(doctor.reviewCount ?? 0),
          avatar,
          experience: Number(doctor.experience ?? doctor.yearsOfExperience ?? 0),
          degree: doctor.degree ?? doctor.title ?? "",
          address: user.address ?? doctor.address ?? "",
          availableSlots: Number(doctor.availableSlots ?? 0),
          nextAvailable: doctor.nextAvailable ?? doctor.nextAvailableDate ?? "",
          workingHours:
            doctor.workingHours ??
            doctor.workingHour ??
            doctor.workHours ??
            doctor.officeHours ??
            doctor.workSchedule ??
            "",
        };
      });

      // append hoặc replace
      const next = replace ? mapped : [...doctors, ...mapped];
      if (!mounted.current) return;
      setDoctors(next);

      // tính hasMore
      if (Array.isArray(payload)) {
        setHasMore(mapped.length === s);
      } else {
        const last = payload.last;
        const totalPages =
          payload.totalPages ??
          Math.ceil((payload.totalElements ?? next.length) / s);
        setHasMore(last === undefined ? p + 1 < totalPages : !last);
      }

      // cập nhật options filter
      const specSet = new Set(
        next.flatMap((d) =>
          (d.specialty || "").split(",").map((x) => x.trim()).filter(Boolean)
        )
      );
      setSpecialties(Array.from(specSet));
      setAreas(Array.from(new Set(next.map((d) => d.address).filter(Boolean))));

      // nạp rating thật từ review nếu chưa có
      const needIds = next.filter((d) => !d.reviewCount && !d.rating).map((d) => d.id).slice(0, 20);
      if (needIds.length) {
        const pairs = await Promise.all(
          needIds.map(async (id) => {
            try {
              const [avgRes, countRes] = await Promise.all([
                reviewApi.getAverageRatingByDoctor(id),
                reviewApi.getReviewCountByDoctor(id),
              ]);
              const avg = Number((avgRes?.data ?? avgRes) || 0);
              const count = Number((countRes?.data ?? countRes) || 0);
              return [id, { avg, count }];
            } catch {
              return [id, { avg: 0, count: 0 }];
            }
          })
        );
        const map = new Map(pairs);
        if (!mounted.current) return;
        setDoctors((prev) =>
          prev.map((d) => (map.has(d.id) ? { ...d, rating: map.get(d.id).avg, reviewCount: map.get(d.id).count } : d))
        );
      }
    } catch (e) {
      console.error("Error loading doctors:", e);
      if (replace && mounted.current) {
        setDoctors([]);
      }
      setHasMore(false);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  function applyFilters() {
    let list = [...doctors];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) =>
        [d.name, d.specialty, d.address].some((x) => (x || "").toLowerCase().includes(q))
      );
    }
    if (selectedSpecialty) {
      const s = selectedSpecialty.toLowerCase();
      list = list.filter((d) => (d.specialty || "").toLowerCase().includes(s));
    }
    if (selectedArea) {
      const a = selectedArea.toLowerCase();
      list = list.filter((d) => (d.address || "").toLowerCase().includes(a));
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "experience":
          return (b.experience || 0) - (a.experience || 0);
        case "available":
          return (b.availableSlots || 0) - (a.availableSlots || 0);
        default:
          return 0;
      }
    });

    setFilteredDoctors(list);
  }

  const pages = useMemo(
    () => Math.max(1, Math.ceil((doctors.length || 1) / size)),
    [doctors.length, size]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSpecialty("");
    setSelectedArea("");
    setSortBy("name");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm">
                ← Quay về
              </Link>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Danh sách bác sĩ</h1>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Tìm thấy {filteredDoctors.length} kết quả</div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Search + Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <form onSubmit={(e) => e.preventDefault()} className="mb-3 sm:mb-4">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <input
                type="text"
                placeholder="Tìm theo triệu chứng, bác sĩ, bệnh viện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
          </form>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
              <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Chuyên khoa:</span>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-initial"
              >
                <option value="">Tất cả chuyên khoa</option>
                {specialties.map((spec, idx) => (
                  <option key={idx} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-initial"
              >
                <option value="">Tất cả khu vực</option>
                {areas.map((a, idx) => (
                  <option key={idx} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-initial"
              >
                <option value="name">Sắp xếp theo tên</option>
                <option value="rating">Sắp xếp theo đánh giá</option>
                <option value="experience">Sắp xếp theo kinh nghiệm</option>
                <option value="available">Sắp xếp theo lịch trống</option>
              </select>
            </div>

            <button
              onClick={clearFilters}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* Doctors List */}
        <div className="space-y-4">
          {loading && doctors.length === 0 ? (
            <div className="flex flex-col sm:flex-row justify-center items-center py-8 sm:py-12 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
              <span className="text-sm sm:text-base text-gray-600">Đang tải danh sách bác sĩ...</span>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-500 text-base sm:text-lg mb-2">Không tìm thấy bác sĩ</div>
              <div className="text-xs sm:text-sm text-gray-400">Vui lòng thử lại với từ khóa khác</div>
            </div>
          ) : (
            filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      <img
                        src={doctor.avatar}
                        alt={doctor.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = "/images/default-doctor.png"; }}
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                          {doctor.degree ? `${doctor.degree} ${doctor.name}` : doctor.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400 fill-current flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium text-gray-700">
                              {Number(doctor.rating || 0).toFixed(1)}
                            </span>
                          </div>
                          {doctor.experience ? (
                            <>
                              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">•</span>
                              <span className="text-xs sm:text-sm text-gray-600">{doctor.experience} năm kinh nghiệm</span>
                            </>
                          ) : null}
                        </div>

                        <div className="mb-2 sm:mb-3">
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {(doctor.specialty || "")
                              .split(",")
                              .filter(Boolean)
                              .map((spec, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {spec.trim()}
                                </span>
                              ))}
                          </div>
                        </div>

                        {doctor.address && (
                          <div className="flex items-start text-xs sm:text-sm text-gray-600 mb-2">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{doctor.address}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-600">
                          {doctor.nextAvailable && (
                            <div className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                              <span className="line-clamp-1">Có lịch {doctor.nextAvailable}</span>
                            </div>
                          )}
                          {doctor.availableSlots > 0 && (
                            <div className="flex items-center">
                              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                              <span>{doctor.availableSlots} khung giờ trống</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Book Button */}
                      <div className="flex-shrink-0 w-full sm:w-auto">
                        <Link
                          to={`/patient/booking/${doctor.id}`}
                          className="inline-flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          Đặt khám
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load more */}
        <div className="text-center mt-6 sm:mt-8">
          <button
            className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 rounded-md text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
            disabled={!hasMore || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {loading ? "Đang tải..." : hasMore ? "Xem thêm bác sĩ" : "Đã tải hết"}
          </button>
        </div>

        {/* footer nhỏ */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4 sm:mt-6">
          <div className="text-xs sm:text-sm text-gray-600">Trang {page + 1}/{pages}</div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-xs sm:text-sm"
              value={size}
              onChange={(e) => {
                setPage(0);
                setSize(Number(e.target.value));
              }}
            >
              {[6, 12, 24].map((n) => (
                <option key={n} value={n}>{n}/trang</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
