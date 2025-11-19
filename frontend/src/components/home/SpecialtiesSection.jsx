import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import departmentApi from '../../api/departmentApi';


export default function SpecialtiesSection() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      // Try to get departments with metadata first
      let response;
      try {
        response = await departmentApi.getDepartmentsWithMetadata();
      } catch (metadataError) {
        // Fallback to regular API if metadata endpoint doesn't exist
        console.log('Metadata endpoint not available, using regular API');
        response = await departmentApi.getAllDepartmentsList();
      }
      setDepartments(response.data?.content || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };


  const handleSpecialtyClick = (department) => {
    // Check if department is under maintenance
    if (department.status === 'INACTIVE' || department.status === 'MAINTENANCE') {
      // Show maintenance message
      alert('Khoa này đang trong quá trình bảo trì. Vui lòng quay lại sau!');
      return;
    }
    
    navigate(`/specialty/${department.id}`, { 
      state: { departmentName: department.departmentName } 
    });
  };

  const handleViewMore = () => {
    setShowAll(!showAll);
  };

  // Filter out closed departments
  const activeDepartments = departments.filter(dept => dept.status !== 'CLOSED');
  const displayedDepartments = showAll ? activeDepartments : activeDepartments.slice(0, 12);

  if (loading) {
    return (
      <section id="specialties" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách chuyên khoa...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="specialties" className="py-8 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt lịch theo chuyên khoa</h2>
            <p className="text-gray-600">Đặt lịch với bác sĩ chuyên khoa hàng đầu</p>
          </div>
          {activeDepartments.length > 12 && (
            <button 
              onClick={handleViewMore}
              className="text-blue-600 font-medium hover:underline hidden md:block"
            >
              {showAll ? 'Thu gọn' : 'Xem thêm'} →
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {displayedDepartments.map((department) => {
            // Use imageUrl from database
            const imageUrl = department.imageUrl 
              ? `http://localhost:8080${department.imageUrl}` 
              : null;
            return (
              <div
                key={department.id}
                onClick={() => handleSpecialtyClick(department)}
                className={`group relative overflow-hidden rounded-xl bg-white transition-all hover:shadow-lg cursor-pointer p-2 text-center ${
                  department.status === 'INACTIVE' || department.status === 'MAINTENANCE' 
                    ? 'opacity-60 cursor-not-allowed' 
                    : ''
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={department.departmentName}
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center z-0" style={{display: imageUrl ? 'none' : 'flex'}}>
                      <span className="text-blue-600 font-bold text-xs">
                        {department.departmentName.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                      <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                        {department.departmentName}
                      </h3>
                      {(department.status === 'INACTIVE' || department.status === 'MAINTENANCE') && (
                        <div className="mt-1">
                          <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Đang bảo trì
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeDepartments.length > 12 && (
          <div className="text-center mt-6 md:hidden">
            <button 
              onClick={handleViewMore}
              className="text-blue-600 font-medium hover:underline"
            >
              {showAll ? 'Thu gọn' : 'Xem thêm'} →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
