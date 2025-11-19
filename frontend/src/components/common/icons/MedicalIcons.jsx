import React from 'react';

// Medical Icons Component using Bootstrap Icons
const MedicalIcons = {
  // Y học cổ truyền - Yin Yang
  TraditionalMedicine: ({ size = 24, color = "#4A90E2", className = "" }) => (
    <i 
      className={`bi bi-yin-yang ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Truyền nhiễm - Virus
  InfectiousDiseases: ({ size = 24, color = "#E53E3E", className = "" }) => (
    <i 
      className={`bi bi-virus ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Tim mạch - Trái tim
  Cardiology: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-heart-pulse ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Lão khoa - Người già
  Geriatrics: ({ size = 24, color = "#FFC107", className = "" }) => (
    <i 
      className={`bi bi-person-walking ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Chấn thương chỉnh hình - Xương
  OrthopedicTrauma: ({ size = 24, color = "#8D6E63", className = "" }) => (
    <i 
      className={`bi bi-bandaid ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Hồi sức cấp cứu - Cấp cứu
  EmergencyResuscitation: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-ambulance ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Ngoại tổng quát - Kéo phẫu thuật
  GeneralSurgery: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-scissors ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Gây mê hồi sức - Mặt nạ oxy
  Anesthesia: ({ size = 24, color = "#4CAF50", className = "" }) => (
    <i 
      className={`bi bi-mask ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Y học dự phòng - Shield
  PreventiveMedicine: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-shield-check ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Nội thận - Thận
  Nephrology: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-droplet ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Tai Mũi Họng - Đầu người
  ENT: ({ size = 24, color = "#FF9800", className = "" }) => (
    <i 
      className={`bi bi-person ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Nội tiết - Máy đo đường huyết
  Endocrinology: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-activity ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Tâm thần - Não
  Psychiatry: ({ size = 24, color = "#9C27B0", className = "" }) => (
    <i 
      className={`bi bi-brain ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Hô hấp - Phổi
  Respiratory: ({ size = 24, color = "#E53E3E", className = "" }) => (
    <i 
      className={`bi bi-lungs ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Xét nghiệm - Kính hiển vi
  Laboratory: ({ size = 24, color = "#FFC107", className = "" }) => (
    <i 
      className={`bi bi-microscope ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Huyết học - Tế bào máu
  Hematology: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-circle ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Tâm lý - Não với sao
  Psychology: ({ size = 24, color = "#9C27B0", className = "" }) => (
    <i 
      className={`bi bi-emoji-smile ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Phẫu thuật tạo hình - Khuôn mặt
  PlasticSurgery: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-emoji-heart-eyes ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Đa khoa - Túi y tế
  GeneralPractice: ({ size = 24, color = "#E53E3E", className = "" }) => (
    <i 
      className={`bi bi-bag-medical ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Ung bướu - Mục tiêu
  Oncology: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-bullseye ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Nội thần kinh - Não với dấu chấm than
  Neurology: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-cpu ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Lao bệnh phổi - Phổi
  Tuberculosis: ({ size = 24, color = "#E53E3E", className = "" }) => (
    <i 
      className={`bi bi-lungs-fill ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Ngoại thần kinh - Tế bào thần kinh
  Neurosurgery: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-diagram-3 ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Y học thể thao - Người chạy
  SportsMedicine: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-person-running ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Cơ xương khớp - Khớp gối
  Musculoskeletal: ({ size = 24, color = "#8D6E63", className = "" }) => (
    <i 
      className={`bi bi-body-text ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Sản phụ khoa - Thai nhi
  ObstetricsGynecology: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-person-heart ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Nhãn khoa - Mắt
  Ophthalmology: ({ size = 24, color = "#8D6E63", className = "" }) => (
    <i 
      className={`bi bi-eye ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Nam khoa - Hệ sinh dục nam
  Andrology: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-gender-male ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Vô sinh hiếm muộn - Bình thí nghiệm
  Infertility: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-flask ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Ngoại tiết niệu - Thận và bàng quang
  UrologicalSurgery: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-droplet-fill ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Răng Hàm Mặt - Răng
  Dentistry: ({ size = 24, color = "#8D6E63", className = "" }) => (
    <i 
      className={`bi bi-tooth ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Ngoại niệu - Thận
  Urology: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-droplet-half ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Dinh dưỡng - Bát salad
  Nutrition: ({ size = 24, color = "#4CAF50", className = "" }) => (
    <i 
      className={`bi bi-apple ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Tiêu hóa - Dạ dày
  Gastroenterology: ({ size = 24, color = "#E91E63", className = "" }) => (
    <i 
      className={`bi bi-stomach ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  ),

  // Nhi khoa - Em bé
  Pediatrics: ({ size = 24, color = "#2196F3", className = "" }) => (
    <i 
      className={`bi bi-person-hearts ${className}`} 
      style={{ fontSize: `${size}px`, color: color }}
    />
  )
};

export default MedicalIcons;