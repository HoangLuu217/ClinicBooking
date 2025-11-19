import React, { useState, useEffect, useRef } from 'react';
import { Calendar, FileText, User, Edit, Save, X, Camera, Eye, EyeOff } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import patientApi from '../../../api/patientApi';
import userApi from '../../../api/userApi';
import addressApi from '../../../api/addressApi';
import PatientAppointmentHistory from '../../../pages/Patient/PatientAppointmentHistory';
import PatientMedicalRecords from '../../../pages/Patient/PatientMedicalRecords';

// Constants
const VALID_TABS = ['appointments', 'profile', 'medical-records'];
const SUCCESS_AUTO_CLOSE_MS = 3000;
const DEFAULT_AVATAR_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23e5f0ff"/><circle cx="200" cy="140" r="80" fill="%239bbcff"/><rect x="60" y="240" width="280" height="120" rx="60" fill="%239bbcff"/></svg>';

// Sidebar styles
const SIDEBAR_STYLES = {
  container: {
    position: 'sticky',
    top: '90px',
    zIndex: 100
  }
};

// Active tab styles
const getTabButtonStyle = (isActive) => ({
  backgroundColor: isActive ? '#e3f2fd' : 'transparent',
  fontWeight: isActive ? 'bold' : 'normal',
  color: isActive ? '#1976d2' : '#333',
  borderLeft: isActive ? '4px solid #1976d2' : '4px solid transparent'
});

const PatientDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('appointments');
  const [patientId, setPatientId] = useState(null);
  const [user, setUser] = useState(null);
  
  // States for editing
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: ''
  });
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(true);
  const successAutoCloseTimer = useRef(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Address states
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const profileContainerStyle = isMobileView
    ? { height: 'auto', overflow: 'visible' }
    : { height: 'calc(100vh - 200px)', overflow: 'hidden' };

  const profilePanelStyle = isMobileView
    ? { height: 'auto', overflow: 'visible' }
    : { height: 'calc(100vh - 250px)', overflow: 'auto' };

  const sidebarStyle = isMobileView
    ? { position: 'static', top: 'auto', zIndex: 'auto' }
    : SIDEBAR_STYLES.container;

  // Đọc tab từ URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Lấy thông tin user và patientId từ localStorage
  useEffect(() => {
    const loadUserData = async () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log('🔍 PatientDashboard - Loading user from localStorage:', parsedUser);
          
          // Check if user data is complete (has avatarUrl or other required fields)
          if (!parsedUser.avatarUrl && !parsedUser.avatar) {
            console.log('⚠️ User data missing avatar info, fetching from backend...');
            try {
              const currentUserResponse = await userApi.getCurrentUser();
              const freshUserData = currentUserResponse.data;
              console.log('✅ Fetched fresh user data:', freshUserData);
              
              // Update localStorage with fresh data
              localStorage.setItem('user', JSON.stringify(freshUserData));
              setUser(freshUserData);
              
              // Set patientId
              if (freshUserData.id) {
                try {
                  const res = await patientApi.getPatientByUserId(freshUserData.id);
                  const data = res.data || res;
                  setPatientId(data.patientId);
                } catch (err) {
                  console.error("Error getting patient info:", err);
                }
              }
              return;
            } catch (error) {
              console.error('❌ Error fetching fresh user data:', error);
            }
          }
          
          setUser(parsedUser);
          const userId = parsedUser.id;
          if (userId) {
            patientApi
              .getPatientByUserId(userId)
              .then((res) => {
                const data = res.data || res;
                setPatientId(data.patientId);
              })
              .catch((err) => {
                console.error("Error getting patient info:", err);
              });
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }
    };
    
    loadUserData();
  }, []);

  // Parse existing address and set dropdowns
  useEffect(() => {
    if (user?.address && provinces.length > 0) {
      const parsedAddress = addressApi.parseAddressFlexible(user.address);
      if (parsedAddress) {
        // Find province
        const province = addressApi.findProvinceByName(provinces, parsedAddress.province);
        if (province) {
          setSelectedProvince(province.code);
        }
      }
    }
  }, [user?.address, provinces]);

  // Load districts when province is set from existing address
  useEffect(() => {
    if (selectedProvince && user?.address && districts.length > 0) {
      const parsedAddress = addressApi.parseAddressFlexible(user.address);
      if (parsedAddress) {
        // Find district
        const district = addressApi.findDistrictByName(districts, parsedAddress.district);
        if (district) {
          setSelectedDistrict(district.code);
        }
      }
    }
  }, [selectedProvince, districts, user?.address]);

  // Load wards when district is set from existing address
  useEffect(() => {
    if (selectedDistrict && user?.address && wards.length > 0) {
      const parsedAddress = addressApi.parseAddressFlexible(user.address);
      if (parsedAddress) {
        // Find ward
        const ward = addressApi.findWardByName(wards, parsedAddress.ward);
        if (ward) {
          setSelectedWard(ward.code);
        }
      }
    }
  }, [selectedDistrict, wards, user?.address]);

  // Load provinces
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await addressApi.getProvinces();
        setProvinces(response.data);
      } catch (error) {
        console.error('Error loading provinces:', error);
      }
    };
    loadProvinces();
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      const loadDistricts = async () => {
        try {
          const response = await addressApi.getDistricts(selectedProvince);
          setDistricts(response.data.districts);
          setSelectedDistrict('');
          setWards([]);
          setSelectedWard('');
        } catch (error) {
          console.error('Error loading districts:', error);
        }
      };
      loadDistricts();
    }
  }, [selectedProvince]);

  // Load wards when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const loadWards = async () => {
        try {
          const response = await addressApi.getWards(selectedDistrict);
          setWards(response.data.wards);
          setSelectedWard('');
        } catch (error) {
          console.error('Error loading wards:', error);
        }
      };
      loadWards();
    }
  }, [selectedDistrict]);

  // Initialize form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: mapGenderFromBackend(user.gender) || '',
        address: user.address || '',
        email: user.email || '',
        healthInsurance: user.healthInsurance || '',
        medicalHistory: user.medicalHistory || ''
      });
    }
  }, [user]);

  // Map gender from backend to frontend display
  const mapGenderFromBackend = (backendGender) => {
    const genderMap = {
      'MALE': 'Nam',
      'FEMALE': 'Nữ',
      'OTHER': 'Khác'
    };
    return genderMap[backendGender] || backendGender;
  };
  const validatePhone = (phone) => {
    if (!phone) return ''; // Cho phép trống
    if (!phone.startsWith('0')) return 'Số điện thoại phải bắt đầu bằng số 0';
    if (phone.length !== 10) return 'Số điện thoại phải có đúng 10 số';
    if (!/^[0-9]+$/.test(phone)) return 'Số điện thoại chỉ được chứa số';
    return '';
  };

  const validateAge = (dateOfBirth) => {
    if (!dateOfBirth) return ''; // Cho phép trống
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 < 10 ? 'Bạn phải trên 10 tuổi' : '';
    }
    
    return age < 10 ? 'Bạn phải trên 10 tuổi' : '';
  };

  const validateEmail = (email) => {
    if (!email) return 'Email không được để trống';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Email không đúng định dạng';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Mật khẩu không được để trống';
    if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    return '';
  };

  const validateHealthInsurance = (insurance) => {
    if (!insurance) return '';
    const cleanInsurance = insurance.replace(/\s/g, '');
    const pattern = /^[A-Z]{2}\d{1}\d{2}\d{2}\d{3}\d{5}$/;
    if (!pattern.test(cleanInsurance)) {
      return 'Mã BHYT phải theo định dạng: XX X XX XX XXX XXXXX ';
    }
    return '';
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Real-time validation
    let error = '';
    if (name === 'phone') {
      error = validatePhone(value);
    } else if (name === 'dateOfBirth') {
      error = validateAge(value);
    } else if (name === 'email') {
      error = validateEmail(value);
    } else if (name === 'healthInsurance') {
      error = validateHealthInsurance(value);
    }
    
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear password errors when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle avatar click - show modal for preview
  const handleAvatarClick = () => {
    try {
      console.log('🖱️ Avatar clicked, showing modal');
      console.log('🔍 Current user data in modal:', user);
      console.log('🔍 User avatarUrl:', user?.avatarUrl);
      console.log('🔍 User firstName:', user?.firstName);
      console.log('🔍 User lastName:', user?.lastName);
      setShowAvatarModal(true);
    } catch (error) {
      console.error('❌ Error in handleAvatarClick:', error);
      alert('Có lỗi khi mở modal avatar');
    }
  };

  // Handle change avatar - open file picker directly
  const handleChangeAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        // clear any previous form-level errors
        setFormError('');
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          alert('Kích thước file không được vượt quá 5MB');
          return;
        }

        try {
          setUploading(true);
          console.log('🚀 Starting avatar upload...');
          
          // Upload avatar using userApi.uploadAvatar
          const uploadResponse = await userApi.uploadAvatar(user.id, file);
          console.log('📤 Upload response:', uploadResponse);
          const avatarUrl = uploadResponse.data; // Backend returns string directly
          console.log('🔗 Avatar URL:', avatarUrl);

          // Update user data in database
          const updateData = {
            ...user,
            avatarUrl: avatarUrl
          };
          console.log('👤 Update data:', updateData);

          await userApi.updateUser(user.id, updateData);
          console.log('✅ User updated in database');

          // Update local user data
          setUser(updateData);
          localStorage.setItem('user', JSON.stringify(updateData));
          console.log('💾 Local storage updated');
          console.log('🔄 Updated user in state:', updateData);
          
          // Dispatch event to update header
          window.dispatchEvent(new Event('userChanged'));
          console.log('📡 Event dispatched');
          
          // Force refresh after a short delay
          setTimeout(() => {
            window.dispatchEvent(new Event('userChanged'));
            console.log('🔄 Second event dispatched');
          }, 500);
          
          setSuccessMessage('Cập nhật ảnh đại diện thành công!');
          setIsSuccess(true);
          setShowSuccessModal(true);
          // Update user avatar in state/localStorage without forcing page reload
          setUser(prev => ({ ...prev, avatarUrl: avatarUrl }));
          localStorage.setItem('user', JSON.stringify({ ...user, avatarUrl }));

          // Start auto-close timer for the success modal
          if (successAutoCloseTimer.current) {
            clearTimeout(successAutoCloseTimer.current);
          }
          successAutoCloseTimer.current = setTimeout(() => {
            setShowSuccessModal(false);
            setSuccessMessage('');
            successAutoCloseTimer.current = null;
          }, SUCCESS_AUTO_CLOSE_MS);
        } catch (error) {
          console.error('Error updating avatar:', error);
          const resp = error.response?.data;
          if (resp?.errors && typeof resp.errors === 'object') {
            setErrors(prev => ({ ...prev, ...resp.errors }));
          } else if (Array.isArray(resp?.fieldErrors)) {
            const fieldErrObj = {};
            resp.fieldErrors.forEach(fe => {
              if (fe.field) fieldErrObj[fe.field] = fe.message || fe.defaultMessage || '';
            });
            setErrors(prev => ({ ...prev, ...fieldErrObj }));
          } else {
            setFormError(resp?.message || error.message || 'Có lỗi xảy ra khi cập nhật ảnh đại diện');
          }
        } finally {
          setUploading(false);
        }
      }
    };
    input.click();
  };

  // Close avatar modal
  const handleCloseAvatar = () => {
    setShowAvatarModal(false);
  };

  // Cleanup success auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (successAutoCloseTimer.current) {
        clearTimeout(successAutoCloseTimer.current);
        successAutoCloseTimer.current = null;
      }
    };
  }, []);

  // Save profile changes
  const handleSaveProfile = async () => {
    console.log('🚀 Starting handleSaveProfile...');
    console.log('📝 Form data:', formData);
    try {
  setUploading(true);
  console.log('⏳ Set uploading to true');
  setErrors({});
  setFormError('');

      // Validate all fields
      const newErrors = {};
      
      // Required fields
      if (!formData.firstName?.trim()) newErrors.firstName = 'Họ tên không được để trống';
      if (!formData.lastName?.trim()) newErrors.lastName = 'Tên không được để trống';
      
      // Phone validation
      const phoneError = validatePhone(formData.phone);
      if (phoneError) newErrors.phone = phoneError;
      
      // Email validation
      const emailError = validateEmail(formData.email);
      if (emailError) newErrors.email = emailError;
      
      // Age validation
      const ageError = validateAge(formData.dateOfBirth);
      if (ageError) newErrors.dateOfBirth = ageError;
      
      // Health insurance validation
      const insuranceError = validateHealthInsurance(formData.healthInsurance);
      if (insuranceError) newErrors.healthInsurance = insuranceError;

      if (Object.keys(newErrors).length > 0) {
        console.log('❌ Validation errors:', newErrors);
        setErrors(newErrors);
        setUploading(false);
        return;
      }
      
      console.log('✅ All validations passed, proceeding with save...');

      // Create address from dropdowns
      let address = '';
      
      if (selectedWard && selectedDistrict && selectedProvince) {
        
        // Check if arrays are loaded
        if (wards.length === 0 || districts.length === 0 || provinces.length === 0) {
          address = user?.address || '';
        } else {
          const wardName = wards.find(w => w.code === selectedWard)?.name;
          const districtName = districts.find(d => d.code === selectedDistrict)?.name;
          const provinceName = provinces.find(p => p.code === selectedProvince)?.name;
          
          if (wardName && districtName && provinceName) {
            address = `${wardName}, ${districtName}, ${provinceName}`;
          } else {
            // Fallback: try to create address from codes if names not found
            const wardFallback = wards.find(w => String(w.code) === String(selectedWard))?.name;
            const districtFallback = districts.find(d => String(d.code) === String(selectedDistrict))?.name;
            const provinceFallback = provinces.find(p => String(p.code) === String(selectedProvince))?.name;
            
            if (wardFallback && districtFallback && provinceFallback) {
              address = `${wardFallback}, ${districtFallback}, ${provinceFallback}`;
            }
          }
        }
      } else {
        // Fallback to existing address if no new selections
        address = user?.address || '';
      }

      // Update user data (without avatar)
      const updateData = {
        ...formData,
        address: address
      };
      
      
      // Map gender values to backend format, remove if empty
      if (updateData.gender) {
        const genderMap = {
          'Nam': 'MALE',
          'Nữ': 'FEMALE', 
          'Khác': 'OTHER'
        };
        updateData.gender = genderMap[updateData.gender] || updateData.gender;
      } else {
        // Remove gender field if empty to avoid Jackson parse error
        delete updateData.gender;
      }

      await userApi.updateUser(user.id, updateData);
      
      // Update patient record if healthInsurance or medicalHistory is provided
      if ((updateData.healthInsurance || updateData.medicalHistory) && patientId) {
        try {
          const patientUpdateData = {};
          if (updateData.healthInsurance) {
            patientUpdateData.healthInsuranceNumber = updateData.healthInsurance;
          }
          if (updateData.medicalHistory) {
            patientUpdateData.medicalHistory = updateData.medicalHistory;
          }
          
          await patientApi.updatePatient(patientId, patientUpdateData);
          console.log('✅ Patient information updated successfully');
        } catch (error) {
          console.error('❌ Error updating patient information:', error);
          // Don't throw error, just log it as these fields are optional
        }
      }
      
      // Update local user data
      const updatedUser = { ...user, ...updateData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch event to update header
      window.dispatchEvent(new Event('userChanged'));
      
      setIsEditing(false);
      setSuccessMessage('Cập nhật thông tin thành công!');
      setIsSuccess(true);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating profile:', error);
      const resp = error.response?.data;
      // If backend returns validation errors in an object, map them to fields
      if (resp?.errors && typeof resp.errors === 'object') {
        setErrors(prev => ({ ...prev, ...resp.errors }));
      } else if (Array.isArray(resp?.fieldErrors)) {
        // Convert [{field,message}] to { field: message }
        const fieldErrObj = {};
        resp.fieldErrors.forEach(fe => {
          if (fe.field) fieldErrObj[fe.field] = fe.message || fe.defaultMessage || '';
        });
        setErrors(prev => ({ ...prev, ...fieldErrObj }));
      } else {
        // Generic error shown inline (not modal)
        setFormError(resp?.message || error.message || 'Có lỗi xảy ra khi cập nhật thông tin');
      }
    } finally {
      console.log('🏁 Finally block - setting uploading to false');
      setUploading(false);
    }
  };

  // Save password changes
  const handleSavePassword = async () => {
    try {
      setPasswordErrors({});
      
      // Validate password fields
      const newPasswordErrors = {};
      
      if (!passwordData.currentPassword?.trim()) {
        newPasswordErrors.currentPassword = 'Mật khẩu hiện tại không được để trống';
      }
      
      if (!passwordData.newPassword?.trim()) {
        newPasswordErrors.newPassword = 'Mật khẩu mới không được để trống';
      } else {
        const passwordError = validatePassword(passwordData.newPassword);
        if (passwordError) newPasswordErrors.newPassword = passwordError;
      }
      
      if (passwordData.currentPassword === passwordData.newPassword) {
        newPasswordErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
      }

      if (Object.keys(newPasswordErrors).length > 0) {
        setPasswordErrors(newPasswordErrors);
        return;
      }

      setUploading(true);
      await userApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordData({ currentPassword: '', newPassword: '' });
      setIsEditingPassword(false);
      setSuccessMessage('Đổi mật khẩu thành công!');
      setIsSuccess(true);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordErrors({ 
        currentPassword: 'Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra' 
      });
    } finally {
      setUploading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth || '',
      gender: user.gender || '',
      address: user.address || '',
      email: user.email || '',
      healthInsurance: user.healthInsurance || ''
    });
    setErrors({});
  };

  // Cancel password editing
  const handleCancelPassword = () => {
    setIsEditingPassword(false);
    setPasswordData({ currentPassword: '', newPassword: '' });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return <PatientAppointmentHistory />;
      
      case 'medical-records':
        return <PatientMedicalRecords />;
      
      case 'profile':
        return (
          <div className={`p-0 ${isMobileView ? 'pb-4' : ''}`} style={profileContainerStyle}>
            <div className={`row ${isMobileView ? 'gy-4' : 'g-0 h-100'}`}>
              {/* Left Panel - Profile Card */}
              <div
                className={`col-12 col-md-4 ${isMobileView ? 'border-bottom mb-4 pb-4' : 'border-end'}`}
                style={profilePanelStyle}
              >
                <div className="p-4">
                  {/* Profile Card */}
                  <div className="card border-0 shadow-lg" style={{ borderRadius: '25px', background: isMobileView ? '#f5f5f5' : 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)', overflow: 'hidden' }}>
                    <div className={`card-body ${isMobileView ? 'px-3 py-2' : 'text-center p-4'}`}>
                      {/* Desktop Layout - Centered */}
                      <div className="d-none d-md-block">
                        <div className="position-relative d-inline-block mb-3">
                          <div 
                            className="position-relative"
                            style={{ cursor: 'pointer' }}
                            onClick={handleAvatarClick}
                            title="Click để xem ảnh đại diện"
                          >
                            {(() => {
                              console.log('🔍 PatientDashboard - User data:', user);
                              
                              // Check if user has avatar
                              if (user?.avatarUrl) {
                                let avatarUrl = user.avatarUrl.startsWith('/uploads/') ? 
                                  `http://localhost:8080${user.avatarUrl}` : 
                                  user.avatarUrl;
                                
                                // Add cache busting timestamp
                                const separator = avatarUrl.includes('?') ? '&' : '?';
                                avatarUrl += `${separator}t=${Date.now()}`;
                                
                                console.log('✅ PatientDashboard - Using avatar:', avatarUrl);
                                console.log('🔍 PatientDashboard - Avatar URL details:', {
                                  original: user.avatarUrl,
                                  constructed: avatarUrl,
                                  hasTimestamp: avatarUrl.includes('?t=')
                                });
                                return (
                                  <img 
                                    src={avatarUrl} 
                                    alt="Avatar" 
                                    className="rounded-circle shadow-lg border border-primary border-3"
                                    style={{ 
                                      width: '90px', 
                                      height: '90px', 
                                      objectFit: 'cover'
                                    }}
                                    onError={(e) => {
                                      console.log('❌ PatientDashboard - Avatar failed to load, showing default');
                                      e.target.src = DEFAULT_AVATAR_SVG;
                                    }}
                                  />
                                );
                              }
                              // Fallback default avatar
                              return (
                                <img
                                  src={DEFAULT_AVATAR_SVG}
                                  alt="Avatar"
                                  className="rounded-circle shadow-lg border border-primary border-3"
                                  style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                                />
                              );
                            })()}
                          </div>
                        </div>
                        
                        {/* User Info */}
                        <h5 className="fw-bold mb-2 text-white" style={{ fontSize: '20px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                          {(() => {
                            if (!user) return 'Chưa đăng nhập';
                            
                            // Kiểm tra nếu có fullName từ Google
                            if (user.fullName) {
                              return user.fullName;
                            }
                            
                            // Kiểm tra firstName và lastName
                            if (user.firstName && user.lastName) {
                              return `${user.firstName} ${user.lastName}`;
                            }
                            
                            // Kiểm tra name từ Google
                            if (user.name) {
                              return user.name;
                            }
                            
                            // Fallback to email
                            if (user.email) {
                              return user.email.split('@')[0];
                            }
                            
                            return 'Chưa cập nhật';
                          })()}
                        </h5>
                        <small className="text-white-50 mb-4 d-block" style={{ fontSize: '13px' }}>
                          {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                        </small>

                        {/* Change Avatar Button */}
                        <button 
                          className="btn btn-primary btn-sm shadow-sm w-100" 
                          style={{ 
                            fontSize: '14px',
                            borderRadius: '20px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #1a73e8 0%, #3a8ef6 100%)',
                            border: 'none',
                            color: 'white',
                            transition: 'all 0.3s ease',
                            padding: '8px 16px',
                            boxShadow: '0 4px 12px rgba(58,142,246,0.35)'
                          }}
                          onClick={handleChangeAvatar}
                          disabled={uploading}
                          onMouseEnter={(e) => {
                            if (!uploading) {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 6px 18px rgba(26,115,232,0.45)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(58,142,246,0.35)';
                          }}
                        >
                          {uploading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Đang tải...
                            </>
                          ) : (
                            <>
                              <Camera size={16} className="me-2" />
                              Thay đổi ảnh đại diện
                            </>
                          )}
                        </button>
                      </div>

                      {/* Mobile Layout - Horizontal */}
                      <div className="d-md-none">
                        <div className="d-flex align-items-center gap-2">
                          {/* Avatar Section - Left */}
                          <div className="position-relative flex-shrink-0">
                            <div 
                              className="position-relative"
                              style={{ cursor: 'pointer' }}
                              onClick={handleAvatarClick}
                              title="Click để xem ảnh đại diện"
                            >
                              {(() => {
                                console.log('🔍 PatientDashboard - User data:', user);
                                
                                // Check if user has avatar
                                if (user?.avatarUrl) {
                                  let avatarUrl = user.avatarUrl.startsWith('/uploads/') ? 
                                    `http://localhost:8080${user.avatarUrl}` : 
                                    user.avatarUrl;
                                  
                                  // Add cache busting timestamp
                                  const separator = avatarUrl.includes('?') ? '&' : '?';
                                  avatarUrl += `${separator}t=${Date.now()}`;
                                  
                                  console.log('✅ PatientDashboard - Using avatar:', avatarUrl);
                                  console.log('🔍 PatientDashboard - Avatar URL details:', {
                                    original: user.avatarUrl,
                                    constructed: avatarUrl,
                                    hasTimestamp: avatarUrl.includes('?t=')
                                  });
                                  return (
                                    <img 
                                      src={avatarUrl} 
                                      alt="Avatar" 
                                      className="rounded-circle shadow-sm border border-secondary border-2"
                                      style={{ 
                                        width: '90px', 
                                        height: '90px', 
                                        objectFit: 'cover'
                                      }}
                                      onError={(e) => {
                                        console.log('❌ PatientDashboard - Avatar failed to load, showing default');
                                        e.target.src = DEFAULT_AVATAR_SVG;
                                      }}
                                    />
                                  );
                                }
                                // Fallback default avatar
                                return (
                                  <img
                                    src={DEFAULT_AVATAR_SVG}
                                    alt="Avatar"
                                    className="rounded-circle shadow-sm border border-secondary border-2"
                                    style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                                  />
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* User Info - Right */}
                          <div className="flex-grow-1 text-center text-md-start">
                            <h5 className="fw-bold mb-1 text-dark" style={{ fontSize: '18px' }}>
                              {(() => {
                                if (!user) return 'Chưa đăng nhập';
                                
                                // Kiểm tra nếu có fullName từ Google
                                if (user.fullName) {
                                  return user.fullName;
                                }
                                
                                // Kiểm tra firstName và lastName
                                if (user.firstName && user.lastName) {
                                  return `${user.firstName} ${user.lastName}`;
                                }
                                
                                // Kiểm tra name từ Google
                                if (user.name) {
                                  return user.name;
                                }
                                
                                // Fallback to email
                                if (user.email) {
                                  return user.email.split('@')[0];
                                }
                                
                                return 'Chưa cập nhật';
                              })()}
                            </h5>
                            <small className="text-muted d-block mb-2" style={{ fontSize: '12px' }}>
                              {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                            </small>

                            {/* Change Avatar Button - Compact */}
                            <button 
                              className="btn btn-outline-secondary btn-sm shadow-sm" 
                              style={{ 
                                fontSize: '11px',
                                borderRadius: '12px',
                                fontWeight: '500',
                                border: '1px solid #dee2e6',
                                color: '#6c757d',
                                transition: 'all 0.2s ease',
                                padding: '4px 10px',
                                lineHeight: '1.2'
                              }}
                              onClick={handleChangeAvatar}
                              disabled={uploading}
                              onMouseEnter={(e) => {
                                if (!uploading) {
                                  e.target.style.backgroundColor = '#e9ecef';
                                  e.target.style.borderColor = '#adb5bd';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!uploading) {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.borderColor = '#dee2e6';
                                }
                              }}
                            >
                              {uploading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" style={{ width: '10px', height: '10px' }}></span>
                                  Đang tải...
                                </>
                              ) : (
                                <>
                                  <Camera size={12} className="me-1" />
                                  Đổi ảnh
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    </div>
                  </div>
              
              {/* Right Panel - Profile Details */}
              <div className="col-12 col-md-8" style={profilePanelStyle}>
                <div className="p-3">
                  {/* Inline form-level error (non-modal) */}
                  {formError && (
                    <div className="alert alert-danger" role="alert">
                      {formError}
                    </div>
                  )}
                  
                  {/* Alert */}
                  <div className="alert alert-warning d-flex align-items-center mb-4" style={{ 
                    backgroundColor: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)', 
                    border: 'none', 
                    borderRadius: '15px',
                    padding: '12px 16px',
                    boxShadow: '0 2px 8px rgba(255,193,7,0.3)'
                  }}>
                    <div className="me-3" style={{ 
                      width: '8px', 
                      height: '8px', 
                      backgroundColor: '#fdcb6e', 
                      borderRadius: '50%',
                      boxShadow: '0 0 6px rgba(253,203,110,0.6)'
                    }}></div>
                    <small className="mb-0 fw-medium" style={{ fontSize: '12px', color: '#2d3436' }}>
                      Hoàn thiện thông tin để đặt khám và quản lý hồ sơ y tế được tốt hơn.
                    </small>
                  </div>
                  
                  {/* Basic Information */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold mb-0" style={{ fontSize: '16px', color: '#2d3436' }}>Thông tin cơ bản</h6>
                      {!isEditing && (
                        <button 
                          className="btn btn-light btn-sm shadow-sm border" 
                          style={{ 
                            fontSize: '12px', 
                            padding: '6px 16px',
                            borderRadius: '20px',
                            backgroundColor: 'white',
                            color: '#333',
                            border: '1px solid #dee2e6',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => setIsEditing(true)}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(102,126,234,0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                        >
                          <Edit size={14} className="me-1" />
                          Chỉnh sửa
                        </button>
                      )}
                    </div>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Họ</label>
                        {isEditing ? (
                          <div>
                            <input 
                              type="text" 
                              name="firstName" 
                              value={formData.firstName || ''} 
                              onChange={handleInputChange}
                              className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                              style={{ 
                                fontSize: '13px',
                                borderRadius: '10px',
                                border: '2px solid #e9ecef',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease',
                                padding: '8px 12px'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.boxShadow = '0 0 0 0.2rem rgba(102,126,234,0.25)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e9ecef';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                            {errors.firstName && <div className="invalid-feedback" style={{ fontSize: '10px' }}>{errors.firstName}</div>}
                          </div>
                        ) : (
                          <p className="mb-0 fw-medium" style={{ fontSize: '13px', color: '#2d3436' }}>
                            {(() => {
                              if (user?.firstName) return user.firstName;
                              if (user?.fullName) {
                                const names = user.fullName.split(' ');
                                return names[0] || 'Chưa cập nhật';
                              }
                              if (user?.name) {
                                const names = user.name.split(' ');
                                return names[0] || 'Chưa cập nhật';
                              }
                              return 'Chưa cập nhật';
                            })()}
                          </p>
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Tên</label>
                        {isEditing ? (
                          <div>
                            <input 
                              type="text" 
                              name="lastName" 
                              value={formData.lastName || ''} 
                              onChange={handleInputChange}
                              className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                              style={{ 
                                fontSize: '13px',
                                borderRadius: '10px',
                                border: '2px solid #e9ecef',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease',
                                padding: '8px 12px'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.boxShadow = '0 0 0 0.2rem rgba(102,126,234,0.25)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e9ecef';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                            {errors.lastName && <div className="invalid-feedback" style={{ fontSize: '10px' }}>{errors.lastName}</div>}
                          </div>
                        ) : (
                          <p className="mb-0 fw-medium" style={{ fontSize: '13px', color: '#2d3436' }}>
                            {(() => {
                              if (user?.lastName) return user.lastName;
                              if (user?.fullName) {
                                const names = user.fullName.split(' ');
                                return names[names.length - 1] || 'Chưa cập nhật';
                              }
                              if (user?.name) {
                                const names = user.name.split(' ');
                                return names[names.length - 1] || 'Chưa cập nhật';
                              }
                              return 'Chưa cập nhật';
                            })()}
                          </p>
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Điện thoại</label>
                        {isEditing ? (
                          <div>
                            <input 
                              type="text" 
                              name="phone" 
                              value={formData.phone || ''} 
                              onChange={handleInputChange}
                              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                              style={{ 
                                fontSize: '13px',
                                borderRadius: '10px',
                                border: '2px solid #e9ecef',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease',
                                padding: '8px 12px'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.boxShadow = '0 0 0 0.2rem rgba(102,126,234,0.25)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e9ecef';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                            {errors.phone && <div className="invalid-feedback" style={{ fontSize: '10px' }}>{errors.phone}</div>}
                          </div>
                        ) : (
                          <p className="mb-0 fw-medium" style={{ fontSize: '13px', color: '#2d3436' }}>{user?.phone || 'Chưa cập nhật'}</p>
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Ngày sinh</label>
                        {isEditing ? (
                          <input 
                            type="date" 
                            name="dateOfBirth" 
                            value={formData.dateOfBirth || ''} 
                            onChange={handleInputChange}
                            className="form-control"
                            style={{ 
                              fontSize: '13px',
                              borderRadius: '10px',
                              border: '2px solid #e9ecef',
                              backgroundColor: '#f8f9fa',
                              transition: 'all 0.3s ease',
                              padding: '8px 12px'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#667eea';
                              e.target.style.boxShadow = '0 0 0 0.2rem rgba(102,126,234,0.25)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e9ecef';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        ) : (
                          <p className="mb-0 fw-medium" style={{ fontSize: '13px', color: '#2d3436' }}>{user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</p>
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Giới tính</label>
                        {isEditing ? (
                          <select 
                            name="gender" 
                            value={formData.gender || ''} 
                            onChange={handleInputChange}
                            className="form-control"
                            style={{ 
                              fontSize: '13px',
                              borderRadius: '10px',
                              border: '2px solid #e9ecef',
                              backgroundColor: '#f8f9fa',
                              transition: 'all 0.3s ease',
                              padding: '8px 12px'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#667eea';
                              e.target.style.boxShadow = '0 0 0 0.2rem rgba(102,126,234,0.25)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e9ecef';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            <option value="">Chọn giới tính</option>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                            <option value="Khác">Khác</option>
                          </select>
                        ) : (
                          <p className="mb-0 fw-medium" style={{ fontSize: '13px', color: '#2d3436' }}>{mapGenderFromBackend(user?.gender) || 'Chưa cập nhật'}</p>
                        )}
                      </div>
                      {/* Address Section - All on one row */}
                      <div className="col-12">
                    <div className="row">
                          <div className="col-12 col-md-4">
                            <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Tỉnh/TP</label>
                            {isEditing ? (
                              <select 
                                name="selectedProvince" 
                                value={selectedProvince} 
                                onChange={(e) => setSelectedProvince(e.target.value)}
                                className="form-control"
                                style={{ 
                                  fontSize: '13px',
                                  borderRadius: '10px',
                                  border: '2px solid #e9ecef',
                                  backgroundColor: '#f8f9fa',
                                  transition: 'all 0.3s ease',
                                  padding: '8px 12px'
                                }}
                              >
                                <option value="">Chọn tỉnh/thành phố</option>
                                {provinces.map(province => (
                                  <option key={province.code} value={province.code}>
                                    {province.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="mb-0 fw-medium" style={{ fontSize: '13px', color: '#2d3436' }}>
                                {(() => {
                                  if (user?.address && provinces.length > 0) {
                                    const parsedAddress = addressApi.parseAddressFlexible(user.address);
                                    if (parsedAddress) {
                                      const province = addressApi.findProvinceByName(provinces, parsedAddress.province);
                                      return province?.name || 'Chưa cập nhật';
                                    }
                                  }
                                  return 'Chưa cập nhật';
                                })()}
                              </p>
                            )}
                      </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Quận/Huyện</label>
                            {isEditing ? (
                              <select 
                                name="selectedDistrict" 
                                value={selectedDistrict} 
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                className="form-control"
                                style={{ 
                                  fontSize: '13px',
                                  borderRadius: '10px',
                                  border: '2px solid #e9ecef',
                                  backgroundColor: '#f8f9fa',
                                  transition: 'all 0.3s ease',
                                  padding: '8px 12px'
                                }}
                                disabled={!selectedProvince}
                              >
                                <option value="">Chọn quận/huyện</option>
                                {districts.map(district => (
                                  <option key={district.code} value={district.code}>
                                    {district.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="mb-0 fw-medium" style={{ fontSize: '13px', color: '#2d3436' }}>
                                {(() => {
                                  if (user?.address && districts.length > 0) {
                                    const parsedAddress = addressApi.parseAddressFlexible(user.address);
                                    if (parsedAddress) {
                                      const district = addressApi.findDistrictByName(districts, parsedAddress.district);
                                      return district?.name || 'Chưa cập nhật';
                                    }
                                  }
                                  return 'Chưa cập nhật';
                                })()}
                              </p>
                            )}
                      </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Phường/Xã</label>
                            {isEditing ? (
                              <select 
                                name="selectedWard" 
                                value={selectedWard} 
                                onChange={(e) => setSelectedWard(e.target.value)}
                                className="form-control"
                                style={{ 
                                  fontSize: '13px',
                                  borderRadius: '10px',
                                  border: '2px solid #e9ecef',
                                  backgroundColor: '#f8f9fa',
                                  transition: 'all 0.3s ease',
                                  padding: '8px 12px'
                                }}
                                disabled={!selectedDistrict}
                              >
                                <option value="">Chọn phường/xã</option>
                                {wards.map(ward => (
                                  <option key={ward.code} value={ward.code}>
                                    {ward.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="mb-0 fw-medium" style={{ fontSize: '13px', color: '#2d3436' }}>
                                {(() => {
                                  if (user?.address && wards.length > 0) {
                                    const parsedAddress = addressApi.parseAddressFlexible(user.address);
                                    if (parsedAddress) {
                                      const ward = addressApi.findWardByName(wards, parsedAddress.ward);
                                      return ward?.name || 'Chưa cập nhật';
                                    }
                                  }
                                  return 'Chưa cập nhật';
                                })()}
                              </p>
                            )}
                      </div>
                      </div>
                      </div>
                      
                      <div className="col-12">
                        <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Lịch sử bệnh án</label>
                        {isEditing ? (
                          <div>
                            <textarea 
                              name="medicalHistory" 
                              value={formData.medicalHistory || ''} 
                              onChange={handleInputChange}
                              className={`form-control ${errors.medicalHistory ? 'is-invalid' : ''}`}
                              placeholder="Nhập lịch sử bệnh án (nếu có)"
                              rows={3}
                              style={{ 
                                fontSize: '13px',
                                borderRadius: '10px',
                                border: '2px solid #e9ecef',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease',
                                padding: '8px 12px',
                                resize: 'vertical'
                              }}
                            />
                            {errors.medicalHistory && <div className="invalid-feedback" style={{ fontSize: '10px' }}>{errors.medicalHistory}</div>}
                          </div>
                        ) : (
                          <p className="mb-0 fw-medium text-muted" style={{ fontSize: '13px' }}>{user?.medicalHistory || 'Chưa cập nhật'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Information */}
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3" style={{ fontSize: '16px', color: '#2d3436' }}>Thông tin bổ sung</h6>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Mã BHYT</label>
                        {isEditing ? (
                          <div>
                            <input 
                              type="text" 
                              name="healthInsurance" 
                              value={formData.healthInsurance || ''} 
                              onChange={handleInputChange}
                              className={`form-control ${errors.healthInsurance ? 'is-invalid' : ''}`}
                              placeholder="Nhập mã BHYT"
                              style={{ 
                                fontSize: '13px',
                                borderRadius: '10px',
                                border: '2px solid #e9ecef',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease',
                                padding: '8px 12px'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.boxShadow = '0 0 0 0.2rem rgba(102,126,234,0.25)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e9ecef';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                            {errors.healthInsurance && <div className="invalid-feedback" style={{ fontSize: '10px' }}>{errors.healthInsurance}</div>}
                      </div>
                        ) : (
                          <p className="mb-0 fw-medium text-muted" style={{ fontSize: '13px' }}>{user?.healthInsurance || 'Chưa cập nhật'}</p>
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Email</label>
                        {isEditing ? (
                          <div>
                            <input 
                              type="email" 
                              name="email" 
                              value={formData.email || ''} 
                              onChange={handleInputChange}
                              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                              style={{ 
                                fontSize: '13px',
                                borderRadius: '10px',
                                border: '2px solid #e9ecef',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.3s ease',
                                padding: '8px 12px'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.boxShadow = '0 0 0 0.2rem rgba(102,126,234,0.25)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#e9ecef';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                            {errors.email && <div className="invalid-feedback" style={{ fontSize: '10px' }}>{errors.email}</div>}
                      </div>
                        ) : (
                          <p className="mb-0 fw-medium text-muted" style={{ fontSize: '13px' }}>{user?.email || 'Chưa cập nhật'}</p>
                        )}
                      </div>
                      </div>
                    </div>
                  
                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="d-flex gap-3 mb-4">
                      <button 
                        className="btn btn-secondary btn-sm shadow-sm" 
                        onClick={handleSaveProfile}
                        disabled={uploading}
                        style={{ 
                          fontSize: '13px', 
                          padding: '8px 20px',
                          borderRadius: '25px',
                          background: '#6c757d',
                          border: 'none',
                          color: 'white',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(108,117,125,0.3)'
                        }}
                        onMouseEnter={(e) => {
                          if (!uploading) {
                            e.target.style.backgroundColor = '#5a6268';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(108,117,125,0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#6c757d';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(108,117,125,0.3)';
                        }}
                      >
                        {uploading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Save size={14} className="me-2" />
                            Lưu thay đổi
                          </>
                        )}
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm shadow-sm" 
                        onClick={handleCancelEdit}
                        style={{ 
                          fontSize: '13px', 
                          padding: '8px 20px',
                          borderRadius: '25px',
                          border: '1px solid #6c757d',
                          color: '#6c757d',
                          backgroundColor: 'transparent',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#6c757d';
                          e.target.style.color = 'white';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = '#6c757d';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        <X size={14} className="me-2" />
                        Hủy
                      </button>
                  </div>
                  )}
                  
                  {/* Change Password Section */}
                  <div className="card shadow-sm" style={{ borderRadius: '15px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="card-title mb-0 fw-bold" style={{ fontSize: '16px', color: '#2d3436' }}>Thay đổi mật khẩu</h6>
                        {!isEditingPassword && (
                          <button 
                            className="btn btn-light btn-sm shadow-sm border" 
                            onClick={() => setIsEditingPassword(true)}
                            style={{ 
                              fontSize: '12px', 
                              padding: '6px 16px',
                              borderRadius: '20px',
                              backgroundColor: 'white',
                              color: '#333',
                              border: '1px solid #dee2e6',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(102,126,234,0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                          >
                            <Edit size={14} className="me-1" />
                            Chỉnh sửa
                    </button>
                        )}
                  </div>
                      {isEditingPassword ? (
                        <div>
                          <div className="mb-3">
                            <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Mật khẩu hiện tại *</label>
                            <div className="position-relative">
                              <input 
                                type={showCurrentPassword ? "text" : "password"} 
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                className={`form-control ${passwordErrors.currentPassword ? 'is-invalid' : ''}`}
                                placeholder="Mật khẩu hiện tại của bạn"
                                style={{ 
                                  fontSize: '13px',
                                  borderRadius: '10px',
                                  border: '2px solid #e9ecef',
                                  backgroundColor: '#f8f9fa',
                                  transition: 'all 0.3s ease',
                                  padding: '8px 40px 8px 12px'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = '#667eea';
                                  e.target.style.boxShadow = '0 0 0 0.2rem rgba(102,126,234,0.25)';
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = '#e9ecef';
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                                style={{ border: 'none', background: 'none', padding: '0', color: '#0d6efd !important' }}
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff size={16} style={{ color: '#0d6efd !important' }} /> : <Eye size={16} style={{ color: '#0d6efd !important' }} />}
                              </button>
                </div>
                            {passwordErrors.currentPassword && (
                              <div className="invalid-feedback" style={{ fontSize: '10px' }}>
                                {passwordErrors.currentPassword}
              </div>
                            )}
                          </div>
                          <div className="mb-3">
                            <label className="form-label fw-medium" style={{ fontSize: '12px', color: '#636e72' }}>Mật khẩu mới *</label>
                            <div className="position-relative">
                              <input 
                                type={showNewPassword ? "text" : "password"} 
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                className={`form-control ${passwordErrors.newPassword ? 'is-invalid' : ''}`}
                                placeholder="Nhập mật khẩu mới"
                                style={{ 
                                  fontSize: '13px',
                                  borderRadius: '10px',
                                  border: '2px solid #e9ecef',
                                  backgroundColor: '#f8f9fa',
                                  transition: 'all 0.3s ease',
                                  padding: '8px 40px 8px 12px'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = '#667eea';
                                  e.target.style.boxShadow = '0 0 0 0.2rem rgba(27, 184, 241, 0.25)';
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = '#e9ecef';
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                                style={{ border: 'none', background: 'none', padding: '0', color: '#0d6efd !important' }}
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? <EyeOff size={16} style={{ color: '#0d6efd !important' }} /> : <Eye size={16} style={{ color: '#0d6efd !important' }} />}
                              </button>
                            </div>
                            {passwordErrors.newPassword && (
                              <div className="invalid-feedback" style={{ fontSize: '10px' }}>
                                {passwordErrors.newPassword}
                              </div>
                            )}
                          </div>
                          <div className="d-flex gap-3">
                            <button 
                              className="btn btn-secondary btn-sm shadow-sm" 
                              onClick={handleSavePassword}
                              disabled={uploading}
                              style={{ 
                                fontSize: '13px', 
                                padding: '8px 20px',
                                borderRadius: '25px',
                                background: '#6c757d',
                                border: 'none',
                                color: 'white',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(108,117,125,0.3)'
                              }}
                              onMouseEnter={(e) => {
                                if (!uploading) {
                                  e.target.style.backgroundColor = '#5a6268';
                                  e.target.style.transform = 'translateY(-1px)';
                                  e.target.style.boxShadow = '0 4px 12px rgba(108,117,125,0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#6c757d';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 2px 8px rgba(108,117,125,0.3)';
                              }}
                            >
                              {uploading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Đang lưu...
                                </>
                              ) : (
                                <>
                                  <Save size={14} className="me-2" />
                                  Lưu thay đổi
                                </>
                              )}
                            </button>
                            <button 
                              className="btn btn-outline-secondary btn-sm shadow-sm" 
                              onClick={handleCancelPassword}
                              style={{ 
                                fontSize: '13px', 
                                padding: '8px 20px',
                                borderRadius: '25px',
                                border: '1px solid #6c757d',
                                color: '#6c757d',
                                backgroundColor: 'transparent',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#6c757d';
                                e.target.style.color = 'white';
                                e.target.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#6c757d';
                                e.target.style.transform = 'translateY(0)';
                              }}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted d-flex align-items-center" style={{ fontSize: '12px' }}>
                          <i className="bi bi-info-circle me-2"></i>
                          Nhấn "Chỉnh sửa" để thay đổi mật khẩu
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="container-fluid" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', paddingTop: '20px' }}>
      <div className="row gx-0 gy-4 gy-md-0">
        {/* Left Sidebar Navigation - Sticky */}
        <div className="col-12 col-md-3 col-lg-2 mb-4 mb-md-0 d-none d-md-block">
          <div className="bg-white rounded shadow-sm" style={sidebarStyle}>
            <div className="list-group list-group-flush">
              <button 
                className={`list-group-item list-group-item-action border-0 py-3 d-flex align-items-center ${
                  activeTab === 'appointments' ? 'active' : ''
                }`}
                onClick={() => setActiveTab('appointments')}
                style={getTabButtonStyle(activeTab === 'appointments')}
              >
                <Calendar className="me-2" size={18} />
                Lịch khám
              </button>
              
              <button 
                className={`list-group-item list-group-item-action border-0 py-3 d-flex align-items-center ${
                  activeTab === 'medical-records' ? 'active' : ''
                }`}
                onClick={() => {
                  setActiveTab('medical-records');
                  navigate('/patient/profile?tab=medical-records');
                }}
                style={getTabButtonStyle(activeTab === 'medical-records')}
                onMouseEnter={(e) => {
                  if (activeTab !== 'medical-records') {
                    e.target.style.backgroundColor = '#f5f5f5';
                    e.target.style.color = '#1976d2';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'medical-records') {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#333';
                  }
                }}
              >
                <FileText className="me-2" size={18} />
                Hồ sơ bệnh án
              </button>
              
              <button 
                className={`list-group-item list-group-item-action border-0 py-3 d-flex align-items-center ${
                  activeTab === 'profile' ? 'active' : ''
                }`}
                onClick={() => setActiveTab('profile')}
                style={getTabButtonStyle(activeTab === 'profile')}
              >
                <User className="me-2" size={18} />
                Tài khoản
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-12 col-md-9 col-lg-10">
          <div className={`bg-white shadow-sm ${activeTab === 'profile' ? '' : 'rounded'}`} style={{ minHeight: '500px' }}>
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Avatar Modal - Simple Preview */}
      {showAvatarModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden', maxWidth: '600px' }}>
              <div className="modal-body p-0 text-center">
                {/* Large Avatar Display */}
                <div className="p-4" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                  {user?.avatarUrl ? (
                    <img 
                      src={(() => {
                        let avatarUrl = user.avatarUrl.startsWith('/uploads/') ? 
                          `http://localhost:8080${user.avatarUrl}` : 
                          user.avatarUrl;
                        // Add cache busting timestamp
                        const separator = avatarUrl.includes('?') ? '&' : '?';
                        avatarUrl += `${separator}t=${Date.now()}`;
                        console.log('🖼️ Modal avatar URL:', avatarUrl);
                        return avatarUrl;
                      })()} 
                      alt="Avatar" 
                      className="img-fluid rounded-circle shadow-lg"
                      style={{ 
                        width: '400px', 
                        height: '400px', 
                        objectFit: 'cover',
                        border: '4px solid white',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                      }}
                      onError={(e) => {
                        console.error('❌ Error loading avatar image:', e);
                        e.target.src = DEFAULT_AVATAR_SVG;
                      }}
                    />
                  ) : (
                    <img
                      src={DEFAULT_AVATAR_SVG}
                      alt="Avatar"
                      className="img-fluid rounded-circle shadow-lg"
                      style={{ 
                        width: '400px', 
                        height: '400px', 
                        objectFit: 'cover',
                        border: '4px solid white',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                      }}
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-3 bg-white">
                  <div className="d-flex gap-2 justify-content-center">
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-sm px-3" 
                      onClick={handleCloseAvatar}
                      style={{ 
                        borderRadius: '15px',
                        fontSize: '13px',
                        fontWeight: '500',
                        padding: '6px 16px'
                      }}
                    >
                      <i className="bi bi-x-lg me-1"></i>
                      Đóng
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm px-3" 
                      onClick={handleChangeAvatar}
                      disabled={uploading}
                      style={{ 
                        borderRadius: '15px',
                        background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                        padding: '6px 16px',
                        boxShadow: '0 2px 8px rgba(102,126,234,0.3)'
                      }}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-pencil me-1"></i>
                          Chỉnh sửa
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
      {showSuccessModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className={`modal-title ${isSuccess ? 'text-success' : 'text-danger'}`}>
                  <i className={`bi ${isSuccess ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                  {isSuccess ? 'Thành công' : 'Lỗi'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    // manual close should cancel auto-close timer if any
                    setShowSuccessModal(false);
                    setSuccessMessage('');
                    if (successAutoCloseTimer.current) {
                      clearTimeout(successAutoCloseTimer.current);
                      successAutoCloseTimer.current = null;
                    }
                  }}
                ></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="mb-3">
                  <i className={`bi ${isSuccess ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger'}`} style={{ fontSize: '48px' }}></i>
                </div>
                <p className="mb-0">{successMessage}</p>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button 
                  type="button" 
                  className={`btn ${isSuccess ? 'btn-success' : 'btn-danger'}`}
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage('');
                    if (successAutoCloseTimer.current) {
                      clearTimeout(successAutoCloseTimer.current);
                      successAutoCloseTimer.current = null;
                    }
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
