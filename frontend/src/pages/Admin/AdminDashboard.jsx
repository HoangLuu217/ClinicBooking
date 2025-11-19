import React, { useEffect, useState } from "react";
import articleApi from "../../api/articleApi";
import doctorApi from "../../api/doctorApi";
import patientApi from "../../api/patientApi";
import departmentApi from "../../api/departmentApi";
import paymentApi from "../../api/paymentApi";
import reviewApi from "../../api/reviewApi";
import userApi from "../../api/userApi";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalDepartments: 0,
    totalArticles: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
  });
  const [recentArticles, setRecentArticles] = useState([]);
  const [lowRatedDoctors, setLowRatedDoctors] = useState([]);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const doctorsRes = await doctorApi.getAllDoctors();
      const patientsRes = await patientApi.getAllPatients();
      const departmentsRes = await departmentApi.getAllDepartments(0, 1);
      const articlesRes = await articleApi.getAllArticles(0, 5);
      const usersRes = await userApi.getAllUsersWithRoleInfo();
      
      // Fetch payments để tính doanh thu
      let paymentsRes;
      try {
        paymentsRes = await paymentApi.getAllPayments(0, 1000); // Lấy tối đa 1000 payments
      } catch (paymentError) {
        console.warn('⚠️ Could not fetch payments for revenue calculation:', paymentError);
        paymentsRes = { data: { content: [] } }; // Fallback to empty array
      }

      const totalDoctors = Array.isArray(doctorsRes.data) ? doctorsRes.data.length : (doctorsRes.data?.content?.length ? doctorsRes.data.totalElements : 0);
      const totalPatients = Array.isArray(patientsRes.data) ? patientsRes.data.length : (patientsRes.data?.content?.length ? patientsRes.data.totalElements : 0);
      const totalDepartments = typeof departmentsRes.data?.totalElements === 'number' ? departmentsRes.data.totalElements : (Array.isArray(departmentsRes.data) ? departmentsRes.data.length : 0);
      const totalArticles = typeof articlesRes.data?.totalElements === 'number' ? articlesRes.data.totalElements : (Array.isArray(articlesRes.data) ? articlesRes.data.length : 0);
      const totalUsers = usersRes.data?.length || 0;

      const recent = articlesRes.data?.content ?? (Array.isArray(articlesRes.data) ? articlesRes.data.slice(0, 5) : []);

      // Calculate revenue from payments
      const payments = paymentsRes.data?.content ?? (Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      
      // Filter only paid/successful payments
      const paidPayments = payments.filter(p => 
        p.status === 'PAID' || p.status === 'SUCCESS' || p.status === 'COMPLETED'
      );
      
      const today = new Date().toISOString().split("T")[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Today's revenue
      const todayPaid = paidPayments.filter(p => {
        if (!p.paidAt && !p.createdAt) return false;
        const paymentDate = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
        return paymentDate.toISOString().split("T")[0] === today;
      });
      const todayRevenue = todayPaid.reduce((sum, p) => {
        return sum + (p.amount ? Number(p.amount) : 0);
      }, 0);
      
      // Monthly revenue
      const monthlyPaid = paidPayments.filter(p => {
        if (!p.paidAt && !p.createdAt) return false;
        const paymentDate = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      });
      const monthlyRevenue = monthlyPaid.reduce((sum, p) => {
        return sum + (p.amount ? Number(p.amount) : 0);
      }, 0);
      
      // Total revenue
      const totalRevenue = paidPayments.reduce((sum, p) => {
        return sum + (p.amount ? Number(p.amount) : 0);
      }, 0);

      setStats({
        totalUsers,
        totalDoctors,
        totalPatients,
        totalDepartments,
        totalArticles,
        totalRevenue,
        todayRevenue,
        monthlyRevenue,
      });
      setRecentArticles(recent);

      // Build low rated doctors list (avg rating < 3, at least 3 reviews)
      const doctorList = Array.isArray(doctorsRes.data) ? doctorsRes.data : (doctorsRes.data?.content ?? []);
      const ratingPromises = doctorList.map(async (d) => {
        const doctorId = d.doctorId || d.id || d?.userId; // attempt to find id
        if (!doctorId) return null;
        try {
          const [avg, count] = await Promise.all([
            reviewApi.getAverageRatingByDoctor(doctorId),
            reviewApi.getReviewCountByDoctor(doctorId),
          ]);
          return { doctorId, doctorName: d.user?.firstName ? `${d.user.firstName} ${d.user.lastName || ''}` : (d.fullName || d.name || `Bác sĩ #${doctorId}`), avgRating: Number(avg || 0), reviewCount: Number(count || 0) };
        } catch {
          return null;
        }
      });
      const ratings = (await Promise.all(ratingPromises))
        .filter(Boolean)
        .map((r) => ({
          ...r,
          avgRating: Number.isFinite(r.avgRating) ? r.avgRating : 0,
          reviewCount: Number.isFinite(r.reviewCount) ? r.reviewCount : 0,
        }));
      const sortedDoctors = ratings.sort((a, b) => {
        if (a.avgRating === b.avgRating) {
          return a.reviewCount - b.reviewCount;
        }
        return a.avgRating - b.avgRating;
      });
      setLowRatedDoctors(sortedDoctors);
    } catch (e) {
      console.error('❌ Admin Dashboard API Error:', e);
      console.error('Error details:', {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        statusText: e.response?.statusText,
        config: {
          url: e.config?.url,
          method: e.config?.method,
          baseURL: e.config?.baseURL
        }
      });
      setError(`Lỗi API: ${e?.response?.data?.message || e?.message || "Đã xảy ra lỗi khi tải thống kê"} (Status: ${e.response?.status})`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Breadcrumb removed as requested */}

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">Bảng điều khiển</h2>
              <p className="text-muted mb-0">Tổng quan hệ thống</p>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={fetchStats} disabled={loading}>
                <i className="bi bi-arrow-clockwise me-2"></i>Làm mới
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">{error}</div>
          )}


          {/* Stat cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted">Bác sĩ</div>
                      <div className="h4 mb-0">{stats.totalDoctors}</div>
                    </div>
                    <i className="bi bi-person-badge fs-2 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted">Bệnh nhân</div>
                      <div className="h4 mb-0">{stats.totalPatients}</div>
                    </div>
                    <i className="bi bi-people fs-2 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted">Chuyên khoa</div>
                      <div className="h4 mb-0">{stats.totalDepartments}</div>
                    </div>
                    <i className="bi bi-diagram-3 fs-2 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted">Bài viết</div>
                      <div className="h4 mb-0">{stats.totalArticles}</div>
                    </div>
                    <i className="bi bi-file-text fs-2 text-info"></i>
                  </div>
                </div>
              </div>
            </div>          
          </div>

          {/* Revenue Section */}
          <div className="row g-3 mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
                <div className="card-header bg-white border-0 py-2 px-3">
                  <h5 className="mb-0 fw-bold" style={{ fontSize: "1rem" }}>
                    <i className="bi bi-cash-coin text-success me-2"></i>
                    Chi tiết doanh thu
                  </h5>
                </div>
                <div className="card-body p-3">
                  <div className="row g-3">
                    {/* Today's Revenue */}
                    <div className="col-md-4">
                      <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                        <div>
                          <div className="text-muted small mb-1" style={{ fontSize: "0.75rem" }}>Doanh thu hôm nay</div>
                          <div className="h5 mb-0 fw-bold text-success" style={{ fontSize: "1.25rem" }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.todayRevenue)}
                          </div>
                          <div className="text-muted small mt-1" style={{ fontSize: "0.7rem" }}>
                            <i className="bi bi-calendar-day me-1"></i>
                            Hôm nay
                          </div>
                        </div>
                        <div className="bg-success bg-opacity-10 rounded-circle p-3">
                          <i className="bi bi-cash-stack text-success" style={{ fontSize: "1.5rem" }}></i>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Revenue */}
                    <div className="col-md-4">
                      <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                        <div>
                          <div className="text-muted small mb-1" style={{ fontSize: "0.75rem" }}>Doanh thu tháng này</div>
                          <div className="h5 mb-0 fw-bold text-primary" style={{ fontSize: "1.25rem" }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.monthlyRevenue)}
                          </div>
                          <div className="text-muted small mt-1" style={{ fontSize: "0.7rem" }}>
                            <i className="bi bi-calendar-month me-1"></i>
                            Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
                          </div>
                        </div>
                        <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                          <i className="bi bi-calendar-range text-primary" style={{ fontSize: "1.5rem" }}></i>
                        </div>
                      </div>
                    </div>

                    {/* Total Revenue */}
                    <div className="col-md-4">
                      <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                        <div>
                          <div className="text-muted small mb-1" style={{ fontSize: "0.75rem" }}>Tổng doanh thu</div>
                          <div className="h5 mb-0 fw-bold text-info" style={{ fontSize: "1.25rem" }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue)}
                          </div>
                          <div className="text-muted small mt-1" style={{ fontSize: "0.7rem" }}>
                            <i className="bi bi-graph-up me-1"></i>
                            Tất cả thời gian
                          </div>
                        </div>
                        <div className="bg-info bg-opacity-10 rounded-circle p-3">
                          <i className="bi bi-wallet2 text-info" style={{ fontSize: "1.5rem" }}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent articles */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0"><i className="bi bi-newspaper me-2"></i>Bài viết gần đây</h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status"/>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th>Tiêu đề</th>
                        <th>Trạng thái</th>
                        <th>Tạo lúc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recentArticles || []).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center text-muted py-4">Không có bài viết</td>
                        </tr>
                      ) : (
                        recentArticles.map((a) => (
                          <tr key={a.articleId || a.id}>
                            <td>{a.title}</td>
                            <td>
                              <span className={`badge ${a.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>{a.status}</span>
                            </td>
                            <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Low-rated doctors */}
          <div className="card mt-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0"><i className="bi bi-bar-chart-steps me-2"></i>Bác sĩ theo điểm đánh giá (thấp → cao)</h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status"/>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th>Bác sĩ</th>
                        <th>Điểm trung bình</th>
                        <th>Số đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(lowRatedDoctors || []).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center text-muted py-4">Không có dữ liệu</td>
                        </tr>
                      ) : (
                        lowRatedDoctors.map((d) => (
                          <tr key={d.doctorId}>
                            <td>{d.doctorName}</td>
                            <td>
                              {d.avgRating.toFixed(2)}
                            </td>
                            <td>{d.reviewCount > 0 ? d.reviewCount : "Chưa có"}</td>
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

    </div>
  );
};

export default AdminDashboard;


