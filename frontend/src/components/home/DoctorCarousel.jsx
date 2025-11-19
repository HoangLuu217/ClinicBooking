import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const DoctorCarousel = ({ 
  doctors = [], 
  title = "Đặt khám bác sĩ", 
  showViewAll = true,
  onViewAll,
  className = ""
}) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  const handleDoctorClick = (doctorId) => {
    navigate(`/patient/doctordetail/${doctorId}`);
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/doctors');
    }
  };

  return (
    <div className={`doctor-carousel-container ${className}`}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">{title}</h2>
        {showViewAll && (
          <button 
            className="btn btn-outline-primary"
            onClick={handleViewAll}
          >
            Xem tất cả <i className="bi bi-chevron-right"></i>
          </button>
        )}
      </div>

      {/* Carousel */}
      <div className="doctors-horizontal-scroll">
        <div className="doctors-scroll-container" ref={scrollContainerRef}>
          {doctors.map((doctor, index) => (
            <div key={doctor.id || index} className="doctor-card-horizontal">
              <div className="doctor-card-horizontal-content">
                {/* Doctor Avatar */}
                <div className="doctor-avatar-horizontal">
                  {(doctor.avatarUrl || doctor.user?.avatarUrl) && (
                    <img
                      src={doctor.avatarUrl || doctor.user?.avatarUrl}
                      alt={doctor.name || doctor.user?.firstName + ' ' + doctor.user?.lastName}
                      className="rounded-circle"
                    />
                  )}
                </div>

                {/* Doctor Info */}
                <div className="doctor-info-horizontal">
                  <h5 className="fw-bold mb-1" style={{ fontSize: '16px' }}>
                    {doctor.name || doctor.user?.firstName + ' ' + doctor.user?.lastName || 'Bác sĩ'}
                  </h5>
                  <p className="text-muted small mb-1">
                    {doctor.specialty || doctor.department?.departmentName || 'Chuyên khoa'}
                  </p>
                  <p className="text-muted small mb-3">
                    {doctor.hospital || 'Bệnh viện'}
                  </p>

                  {/* Book Button */}
                  <button 
                    className="btn btn-primary btn-sm w-100"
                    onClick={() => handleDoctorClick(doctor.id)}
                  >
                    Đặt lịch khám <i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Scroll Arrows */}
        <div className="scroll-arrow-left">
          <button className="scroll-arrow-btn" onClick={scrollLeft}>
            <i className="bi bi-chevron-left"></i>
          </button>
        </div>
        
        <div className="scroll-arrow-right">
          <button className="scroll-arrow-btn" onClick={scrollRight}>
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {doctors.length === 0 && (
        <div className="text-center py-5">
          <i className="bi bi-person-x" style={{ fontSize: '48px', color: '#ccc' }}></i>
          <p className="text-muted mt-3">Chưa có bác sĩ nào</p>
        </div>
      )}

      <style jsx>{`
        .doctor-carousel-container {
          margin-bottom: 2rem;
        }
        
        .doctors-horizontal-scroll {
          position: relative;
          overflow: hidden;
        }
        
        .doctors-scroll-container {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 10px 0;
          scrollbar-width: thin;
          scrollbar-color: #9e9e9e #f5f5f5;
        }
        
        .doctors-scroll-container::-webkit-scrollbar {
          height: 6px;
        }
        
        .doctors-scroll-container::-webkit-scrollbar-track {
          background: #f5f5f5;
          border-radius: 3px;
        }
        
        .doctors-scroll-container::-webkit-scrollbar-thumb {
          background: #9e9e9e;
          border-radius: 3px;
        }
        
        .doctor-card-horizontal {
          min-width: 280px;
          flex-shrink: 0;
        }
        
        .doctor-card-horizontal-content {
          background: white;
          border-radius: 12px;
          border: 2px solid #e3f2fd;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .doctor-card-horizontal-content:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          border-color: #2196F3;
        }
        
        .doctor-avatar-horizontal img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border: 3px solid #e3f2fd;
        }
        
        .doctor-info-horizontal {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
        }
        
        .scroll-arrow-left {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
        }
        
        .scroll-arrow-right {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
        }
        
        .scroll-arrow-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #2196F3;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
          transition: all 0.3s ease;
        }
        
        .scroll-arrow-btn:hover {
          background: #1976D2;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default DoctorCarousel;
