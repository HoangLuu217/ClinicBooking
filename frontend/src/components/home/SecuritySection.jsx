import React from 'react';

const SecuritySection = () => {
  const securityFeatures = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="white" viewBox="0 0 16 16">
          <path d="M9.669.864 8 0 6.331.864l-1.858.282-.842 1.68-1.337 1.32L2.6 6l-.306 1.854 1.337 1.32.842 1.68 1.858.282L8 12l1.669-.864 1.858-.282.842-1.68 1.337-1.32L13.4 6l.306-1.854-1.337-1.32-.842-1.68L9.669.864zm1.196 1.193.684 1.365 1.086 1.072L12.387 6l.248 1.506-1.086 1.072-.684 1.365-1.51.229L8 10.874l-1.355-.702-1.51-.229-.684-1.365-1.086-1.072L3.614 6l-.25-1.506 1.087-1.072.684-1.365 1.51-.229L8 1.126l1.356.702 1.509.229z"/>
          <path d="M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1 4 11.794z"/>
        </svg>
      ),
      title: 'Hạ tầng đạt tiêu chuẩn ISO 27001:2013',
      description: 'Đảm bảo an toàn thông tin theo tiêu chuẩn quốc tế'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="white" viewBox="0 0 16 16">
          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        </svg>
      ),
      title: 'Thông tin sức khỏe được bảo mật theo quy chuẩn HIPAA',
      description: 'Tuân thủ nghiêm ngặt các quy định về bảo mật dữ liệu y tế'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="white" viewBox="0 0 16 16">
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/>
        </svg>
      ),
      title: 'Thành viên VNISA',
      description: 'Là thành viên của Hiệp hội An ninh mạng Việt Nam'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="white" viewBox="0 0 16 16">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
        </svg>
      ),
      title: 'Pentest định kỳ hàng năm',
      description: 'Kiểm tra bảo mật thường xuyên để đảm bảo an toàn tối đa'
    }
  ];

  return (
    <section className="security-section py-5" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold mb-3" style={{ color: '#2d3436', fontSize: '2.2rem' }}>
            Bảo mật dữ liệu
          </h2>
          <p className="text-muted" style={{ fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto' }}>
            An toàn dữ liệu của bạn là ưu tiên hàng đầu của chúng tôi
          </p>
        </div>

        <div className="row g-4 mb-5">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="col-md-6 col-lg-3">
              <div 
                className="text-center h-100 p-4 rounded-4 bg-white"
                style={{ 
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(25, 118, 210, 0.15)';
                  e.currentTarget.style.borderColor = '#1976d2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                <div 
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
                  style={{
                    width: '90px',
                    height: '90px',
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 8px 16px rgba(25, 118, 210, 0.3)',
                    transition: 'all 0.4s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(25, 118, 210, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(25, 118, 210, 0.3)';
                  }}
                >
                  {feature.icon}
                </div>
                <h5 className="fw-bold mb-3" style={{ 
                  color: '#2d3436', 
                  fontSize: '1.05rem',
                  lineHeight: '1.5'
                }}>
                  {feature.title}
                </h5>
                <p className="text-muted mb-0" style={{ 
                  fontSize: '0.9rem',
                  lineHeight: '1.6'
                }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5">
          <div 
            className="p-4 rounded-4 mx-auto"
            style={{
              maxWidth: '900px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid #e9ecef',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <p className="text-muted mb-0" style={{ 
              fontSize: '1rem', 
              lineHeight: '1.8',
              color: '#636e72'
            }}>
              Với nhiều năm kinh nghiệm trong lĩnh vực Y tế, chúng tôi hiểu rằng,
              dữ liệu sức khỏe của bạn chỉ thuộc về bạn. <strong style={{ color: '#1976d2' }}>ClinicBooking</strong> tuân thủ các
              chính sách bảo mật dữ liệu cao nhất trên thế giới.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
