import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Button, Form, Alert, Modal } from "react-bootstrap";
import { Pill, Plus, User, Search, ArrowLeft, Save, Clipboard } from "lucide-react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import prescriptionApi from "../../api/prescriptionApi";
import medicineApi from "../../api/medicineApi";
import patientApi from "../../api/patientApi";
import appointmentApi from "../../api/appointmentApi";
import referralApi from "../../api/referralApi";
import departmentApi from "../../api/departmentApi";
import ReferralResults from "../../components/ReferralResults";
import Cookies from 'js-cookie';

const PrescriptionForm = () => {
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const location = useLocation();
  
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState(null);

  // Get appointment info from navigation state
  const appointmentInfo = location.state?.appointment;
  const patientInfo = location.state?.patientInfo;

  // Form state for new prescription
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    diagnosis: '',
    advice: '', // Lời khuyên của bác sĩ
    medicines: [],
    selectedAppointmentId: appointmentId || '' // Store selected appointment
  });

  // Current medicine being added
  const [currentMedicine, setCurrentMedicine] = useState({
    medicineId: '',
    quantity: 1,
    dosage: '',
    duration: '',
    instructions: ''
  });

  // Clinical Referral Modal State
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [referralData, setReferralData] = useState({
    toDepartmentId: '',
    notes: ''
  });

  // Clinical Referral Results State
  const [referralResults, setReferralResults] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // Success/Error Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: 'success', // 'success' or 'error'
    title: '',
    message: '',
    onClose: null
  });

  // Helper function to show modal
  const showNotification = (type, title, message, onClose = null) => {
    setModalConfig({ type, title, message, onClose });
    setShowModal(true);
  };

  useEffect(() => {
    loadMedicines();
    loadPatients();
    loadAppointments();
    loadDepartments();
  }, []);

  // Debug: Log why save button is disabled
  useEffect(() => {
    const isDisabled = 
      formData.medicines.length === 0 || 
      !formData.patientId || 
      !formData.diagnosis.trim() ||
      formData.medicines.some(med => !med.medicineId || !med.dosage || med.quantity === undefined || med.quantity === null || med.quantity <= 0);
    
    if (isDisabled) {
      console.log('🔍 Save button disabled because:');
      if (formData.medicines.length === 0) console.log('  - No medicines');
      if (!formData.patientId) console.log('  - No patientId');
      if (!formData.diagnosis.trim()) console.log('  - No diagnosis');
      const invalidMeds = formData.medicines.filter(med => !med.medicineId || !med.dosage || med.quantity === undefined || med.quantity === null || med.quantity <= 0);
      if (invalidMeds.length > 0) {
        console.log('  - Invalid medicines:', invalidMeds);
      }
    }
  }, [formData]);

  // Auto-fill patient info if coming from appointment
  useEffect(() => {
    if (appointmentInfo && patientInfo) {
      setFormData(prev => ({
        ...prev,
        // Normalize patient id/name coming from navigation state
        patientId: patientInfo.patientId || patientInfo.id || '',
        patientName: patientInfo.patientName || patientInfo.name || '',
        diagnosis: '' // Doctor will fill this
      }));
    }
  }, [appointmentInfo, patientInfo]);

  // If route has appointmentId but navigation state didn't include patientInfo,
  // try to fetch appointment and patient details so patientId is populated.
  useEffect(() => {
    const fetchAppointmentAndPatient = async () => {
      if (!appointmentId) return;
      if (patientInfo && patientInfo.patientId) return; // already have

      try {
        console.log('🔍 Fetching appointment because navigation state lacked patientInfo', appointmentId);
        const apptRes = await appointmentApi.getAppointmentById(appointmentId);
        const appt = apptRes.data || apptRes;
        const pid = appt.patientId || appt.patient?.id;
        if (pid) {
          // Try to fetch patient details
          try {
            const pRes = await patientApi.getPatientById(pid);
            const p = pRes.data || pRes;
            const resolvedPatientId = (p.patientId || p.id || pid)?.toString();
            const resolvedPatientName = (p.user?.lastName && p.user?.firstName) ? (p.user.lastName + ' ' + p.user.firstName) : (p.lastName && p.firstName ? (p.lastName + ' ' + p.firstName) : (p.name || ''));
            setFormData(prev => ({
              ...prev,
              patientId: resolvedPatientId,
              patientName: resolvedPatientName
            }));
          } catch (pErr) {
            console.warn('⚠️ Could not fetch patient by id from appointment:', pErr);
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch appointment by id:', err);
      }
    };

    fetchAppointmentAndPatient();
  }, [appointmentId, patientInfo]);

  const loadMedicines = async () => {
    setLoading(true);
    try {
  console.log('🔍 ========================================');
  console.log('🔍 Đang tải danh sách thuốc...');
  // use canonical medicineApi.getAll() from frontend/src/api/medicineApi.js
  const medicinesRes = await medicineApi.getAll();
      
      console.log('✅ Response từ API:', medicinesRes);
      console.log('✅ Response.data:', medicinesRes.data);
      console.log('✅ Response.data type:', typeof medicinesRes.data);
      console.log('✅ Response.data is array?', Array.isArray(medicinesRes.data));
      console.log('✅ Response.data length:', medicinesRes.data?.length);
      
      if (!medicinesRes.data || !Array.isArray(medicinesRes.data)) {
        console.error('❌ API không trả về mảng medicines!');
        setMedicines([]);
        setLoading(false);
        return;
      }
      
      if (medicinesRes.data.length === 0) {
        console.warn('⚠️ Danh sách thuốc rỗng!');
        setMedicines([]);
        setLoading(false);
        return;
      }
      
      const medicinesData = medicinesRes.data.map(medicine => ({
        id: medicine.medicineId || medicine.id || Math.random(),
        medicineId: medicine.medicineId || medicine.id || 'N/A',
        name: medicine.name || 'Không rõ tên',
        strength: medicine.strength || '',
        category: medicine.note || medicine.category || 'Không phân loại',
        price: medicine.unit_price || medicine.unitPrice || medicine.price || 0,
        unit: medicine.unit || 'đơn vị',
        description: medicine.description || ''
      }));

      console.log('✅ Đã tải danh sách thuốc:', medicinesData.length, 'thuốc');
      console.log('🔍 Sample medicine:', medicinesData[0]);
      console.log('🔍 ========================================');
      setMedicines(medicinesData);
    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ Lỗi khi tải danh sách thuốc từ backend:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      console.error('❌ ========================================');
      
      if (error.response?.status === 401) {
        console.error('🔒 Không có quyền truy cập danh sách thuốc');
        showNotification('error', 'Lỗi Quyền Truy Cập', 'Không có quyền truy cập danh sách thuốc. Vui lòng đăng nhập lại.');
      } else {
        console.error('🔌 Không thể kết nối đến server backend');
        showNotification('error', 'Lỗi Tải Dữ Liệu', 'Không thể tải danh sách thuốc. Vui lòng kiểm tra kết nối hoặc liên hệ quản trị viên.');
      }
      
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      console.log('🔍 Đang tải danh sách bệnh nhân...');
      const patientsRes = await patientApi.getAllPatients();
      
      const patientsData = patientsRes.data.map(patient => ({
        id: patient.id || Math.random(),
        // Normalize patientId to string to avoid strict equality issues
        patientId: (patient.patientId || patient.id || '').toString(),
        name: (patient.user?.lastName && patient.user?.firstName) ? 
              (patient.user.lastName + " " + patient.user.firstName) :
              (patient.lastName && patient.firstName) ?
              (patient.lastName + " " + patient.firstName) :
              "Không rõ tên",
        phone: patient.user?.phone || patient.phone || "",
        email: patient.user?.email || patient.email || "",
        address: patient.user?.address || patient.address || "",
        healthInsuranceNumber: patient.healthInsuranceNumber || ""
      }));

      console.log('✅ Đã tải danh sách bệnh nhân:', patientsData);
      setPatients(patientsData);
    } catch (error) {
      console.error('❌ Lỗi khi tải danh sách bệnh nhân từ backend:', error);
      
      if (error.response?.status === 401) {
        console.error('🔒 Không có quyền truy cập danh sách bệnh nhân');
      } else {
        console.error('🔌 Không thể kết nối đến server backend');
      }
      
      setPatients([]);
    }
  };

  const loadAppointments = async () => {
    try {
      console.log('🔍 Đang tải danh sách lịch hẹn...');
      
      // Lấy userId từ cookie để lấy appointments của doctor hiện tại
      const doctorId = Cookies.get('userId');
      console.log('👨‍⚕️ Doctor ID từ cookie:', doctorId);
      
      let appointmentsRes;
      if (doctorId) {
        // Lấy appointments theo doctor
        appointmentsRes = await appointmentApi.getAppointmentsByDoctor(doctorId);
        console.log('📡 API Response (by doctor):', appointmentsRes);
      } else {
        // Fallback: try to call getAllAppointments if it exists, otherwise fall back to a safe API
        if (typeof appointmentApi.getAllAppointments === 'function') {
          appointmentsRes = await appointmentApi.getAllAppointments();
          console.log('📡 API Response (all):', appointmentsRes);
        } else if (typeof appointmentApi.getAppointmentsByDate === 'function') {
          // As a safe fallback, request today's appointments (backend expects a date query param)
          const today = new Date().toISOString().split('T')[0];
          appointmentsRes = await appointmentApi.getAppointmentsByDate(today);
          console.log('📡 API Response (by date fallback):', appointmentsRes);
        } else {
          // If no suitable method exists, avoid throwing — return empty list
          console.warn('⚠️ appointmentApi missing getAllAppointments and getAppointmentsByDate; falling back to empty list');
          appointmentsRes = { data: [] };
        }
      }
      
      console.log('📊 Raw data:', appointmentsRes.data);
      
      const appointmentsData = appointmentsRes.data.map(appointment => ({
        id: appointment.appointmentId || appointment.id,
        appointmentId: (appointment.appointmentId || appointment.id)?.toString(),
        patientId: appointment.patientId || appointment.patient?.id,
        patientName: appointment.patientName || (appointment.patient?.user?.lastName && appointment.patient?.user?.firstName ? 
                    (appointment.patient.user.lastName + ' ' + appointment.patient.user.firstName) :
                    (appointment.patient?.lastName && appointment.patient?.firstName ?
                     (appointment.patient.lastName + ' ' + appointment.patient.firstName) : 'Không rõ tên')),
        startTime: appointment.startTime,
        status: appointment.status || 'Scheduled',
        notes: appointment.notes || ''
      }));

      console.log('✅ Đã tải danh sách lịch hẹn:', appointmentsData);
      console.log('📊 Status của các lịch hẹn:', appointmentsData.map(appt => ({ id: appt.id, status: appt.status, patientName: appt.patientName })));
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('❌ Lỗi khi tải danh sách lịch hẹn từ backend:', error);
      
      if (error.response?.status === 401) {
        console.error('🔒 Không có quyền truy cập danh sách lịch hẹn');
      } else {
        console.error('🔌 Không thể kết nối đến server backend');
      }
      
      setAppointments([]);
    }
  };

  // Load departments for clinical referral
  const loadDepartments = async () => {
    try {
      const response = await departmentApi.getAllDepartmentsList();
      console.log('✅ Loaded departments:', response.data);
      
      // Extract departments from paginated response
      const depts = response.data?.content || response.data || [];
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
      // Fallback departments if API fails
      setDepartments([
        { id: 1, departmentId: 1, departmentName: 'Khoa Xét nghiệm' },
        { id: 2, departmentId: 2, departmentName: 'Khoa Chẩn đoán hình ảnh' },
        { id: 3, departmentId: 3, departmentName: 'Khoa X-quang' },
        { id: 4, departmentId: 4, departmentName: 'Khoa Siêu âm' },
      ]);
    }
  };

  // Load clinical referral results for this appointment
  const loadReferralResults = async (apptId) => {
    if (!apptId) {
      return;
    }
    
    try {
      setLoadingReferrals(true);
      const response = await referralApi.getReferralsByAppointment(apptId);
      
      // Ensure it's an array
      const referrals = Array.isArray(response.data) ? response.data : [];
      setReferralResults(referrals);
    } catch (error) {
      console.error('❌ Error loading referral results:', error);
      console.error('❌ Error response:', error.response);
      setReferralResults([]);
    } finally {
      setLoadingReferrals(false);
    }
  };

  // Load referral results when appointmentId changes
  useEffect(() => {
    const apptId = appointmentId || formData.selectedAppointmentId;
    
    if (apptId) {
      loadReferralResults(apptId);
    } else if (formData.patientId) {
      // If no appointmentId but have patientId, try loading by patient
      loadReferralsByPatient(formData.patientId);
    }
  }, [appointmentId, formData.selectedAppointmentId, formData.patientId]);

  // Load referrals by patient ID
  const loadReferralsByPatient = async (patientId) => {
    if (!patientId) {
      return;
    }
    
    try {
      setLoadingReferrals(true);
      const response = await referralApi.getReferralsByPatient(patientId);
      
      const referrals = Array.isArray(response.data) ? response.data : [];
      // Filter only DONE referrals
      const doneReferrals = referrals.filter(r => r.status === 'DONE');
      setReferralResults(doneReferrals);
    } catch (error) {
      console.error('❌ Error loading patient referrals:', error);
      setReferralResults([]);
    } finally {
      setLoadingReferrals(false);
    }
  };

  // Handle creating clinical referral
  const handleCreateReferral = async () => {
    if (!referralData.toDepartmentId) {
      showNotification('error', 'Thiếu Thông Tin', 'Vui lòng chọn khoa thực hiện');
      return;
    }

    if (!referralData.notes.trim()) {
      showNotification('error', 'Thiếu Thông Tin', 'Vui lòng nhập yêu cầu cận lâm sàng');
      return;
    }

    // Try to resolve appointmentId from multiple sources
    const resolvedAppointmentId = formData.selectedAppointmentId || 
                                   appointmentId || 
                                   appointmentInfo?.appointmentId || 
                                   appointmentInfo?.id;
    
    console.log('🔍 Resolved appointment ID:', resolvedAppointmentId);

    if (!resolvedAppointmentId) {
      showNotification('error', 'Không Tìm Thấy Lịch Hẹn', 'Vui lòng:\n• Chọn lịch hẹn từ dropdown\n• Hoặc mở form này từ trang "Lịch hẹn bệnh nhân"');
      return;
    }

    // Validate appointmentId is a valid number
    const parsedAppointmentId = parseInt(resolvedAppointmentId);
    if (isNaN(parsedAppointmentId) || parsedAppointmentId <= 0) {
      console.error('❌ Invalid appointment ID:', resolvedAppointmentId);
      showNotification('error', 'Dữ Liệu Không Hợp Lệ', `ID lịch hẹn không hợp lệ: ${resolvedAppointmentId}`);
      return;
    }

    // Validate departmentId
    const parsedDepartmentId = parseInt(referralData.toDepartmentId);
    if (isNaN(parsedDepartmentId) || parsedDepartmentId <= 0) {
      console.error('❌ Invalid department ID:', referralData.toDepartmentId);
      showNotification('error', 'Dữ Liệu Không Hợp Lệ', `ID khoa không hợp lệ: ${referralData.toDepartmentId}`);
      return;
    }

    try {
      const requestData = {
        appointmentId: parsedAppointmentId,
        toDepartmentId: parsedDepartmentId,
        notes: referralData.notes.trim()
      };

      console.log('📋 Creating referral with data:', requestData);
      console.log('📋 Request payload:', JSON.stringify(requestData, null, 2));

      const response = await referralApi.createReferral(requestData);
      console.log('✅ Referral created successfully:', response);
      
      showNotification('success', 'Thành Công', 'Đã tạo chỉ định cận lâm sàng thành công!', () => {
        setShowReferralModal(false);
        setReferralData({ toDepartmentId: '', notes: '' });
        loadReferralResults();
      });
      setShowReferralModal(false);
      setReferralData({ toDepartmentId: '', notes: '' });
      
      // Update appointment status to REFERRED
      try {
        await appointmentApi.updateAppointment(parsedAppointmentId, { status: 'REFERRED' });
        console.log('✅ Appointment status updated to REFERRED');
      } catch (e) {
        console.warn('⚠️ Không thể cập nhật trạng thái appointment:', e);
        // Don't show error to user as referral was created successfully
      }
    } catch (error) {
      console.error('❌ Error creating referral:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      let errorMessage = '❌ Không thể tạo chỉ định.\n\n';
      
      if (error.response?.data?.message) {
        errorMessage += `Lỗi: ${error.response.data.message}\n\n`;
      }
      
      if (error.response?.status === 400) {
        errorMessage += 'Có thể do:\n';
        errorMessage += '• Lịch hẹn không tồn tại hoặc đã bị xóa\n';
        errorMessage += '• Khoa được chỉ định không tồn tại\n';
        errorMessage += '• Bác sĩ chưa được xác thực\n\n';
        errorMessage += `AppointmentId: ${parsedAppointmentId}\n`;
        errorMessage += `DepartmentId: ${parsedDepartmentId}`;
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage += 'Bạn không có quyền tạo chỉ định.\nVui lòng đăng nhập lại.';
      } else {
        errorMessage += 'Vui lòng thử lại hoặc liên hệ IT hỗ trợ.';
      }
      
      showNotification('error', 'Lỗi Tạo Chỉ Định', errorMessage);
    }
  };

  // Enhanced search filter with error handling
  const filteredMedicines = React.useMemo(() => {
    try {
      if (!medicines || medicines.length === 0) {
        console.log('🔍 No medicines to filter');
        return [];
      }

      if (!searchTerm || !searchTerm.trim()) {
        console.log('🔍 No search term, returning all medicines:', medicines.length);
        return medicines;
      }
      
      const searchLower = searchTerm.toLowerCase().trim();
      console.log('🔍 Filtering with search term:', searchLower);
      
      const filtered = medicines.filter(medicine => {
        try {
          if (!medicine) return false;
          
          const name = (medicine.name || '').toLowerCase();
          const medicineId = (medicine.medicineId || '').toLowerCase();
          const category = (medicine.category || '').toLowerCase();
          const strength = (medicine.strength || '').toLowerCase();
          
          return name.includes(searchLower) ||
                 medicineId.includes(searchLower) ||
                 category.includes(searchLower) ||
                 strength.includes(searchLower);
        } catch (error) {
          console.error('❌ Error filtering medicine:', medicine, error);
          return false;
        }
      });
      
      console.log('🔍 Filtered medicines:', filtered.length);
      return filtered;
    } catch (error) {
      console.error('❌ Error in filteredMedicines:', error);
      return [];
    }
  }, [medicines, searchTerm]);

  // Safe search handler with error handling
  const handleSearchChange = (e) => {
    try {
      const value = e.target.value;
      console.log('🔍 Search input changed:', value);
      setSearchTerm(value);
      setSearchError(null);
    } catch (error) {
      console.error('❌ Error in search input:', error);
      setSearchError('Lỗi khi tìm kiếm. Vui lòng thử lại.');
    }
  };

  const handleSelectPatient = (patientId) => {
    if (!patientId) {
      setFormData(prev => ({ ...prev, patientId: '', patientName: '' }));
      return;
    }

    const patient = patients.find(p => (p.patientId?.toString() === patientId?.toString()) || (p.id?.toString() === patientId?.toString()));
    if (patient) {
      setFormData(prev => ({
        ...prev,
        // store patientId as string
        patientId: patient.patientId?.toString() || patient.id?.toString() || '',
        patientName: patient.name
      }));
    }
  };

  const handleAddMedicine = () => {
    console.log('🔍 Current medicine data:', currentMedicine);
    console.log('📋 Available medicines:', medicines.map(m => ({ id: m.id, name: m.name })));

    if (!currentMedicine.medicineId || !currentMedicine.quantity || !currentMedicine.dosage) {
      showNotification('error', 'Thiếu Thông Tin', 'Vui lòng điền đầy đủ thông tin thuốc (tên thuốc, liều dùng, số lượng)');
      return;
    }

    console.log('🔍 Looking for medicine with ID:', currentMedicine.medicineId);
    console.log('🔍 Parsed ID:', parseInt(currentMedicine.medicineId));

    // Try multiple ways to find the medicine
    let selectedMedicine = medicines.find(m => m.id == currentMedicine.medicineId) || // Use loose equality
                          medicines.find(m => m.id === parseInt(currentMedicine.medicineId)) ||
                          medicines.find(m => m.id.toString() === currentMedicine.medicineId.toString());

    console.log('✅ Found medicine:', selectedMedicine);

    if (!selectedMedicine) {
      console.error('❌ Không tìm thấy thuốc với ID:', currentMedicine.medicineId);
      console.error('Available IDs:', medicines.map(m => `${m.id} (${typeof m.id})`));
      showNotification('error', 'Thuốc Không Hợp Lệ', `ID: ${currentMedicine.medicineId} không tìm thấy trong danh sách thuốc.`);
      return;
    }

    // Ensure quantity is a valid number
    const quantity = parseInt(currentMedicine.quantity) || 1;
    
    const newMedicine = {
      ...currentMedicine,
      id: Date.now(),
      medicineId: selectedMedicine.medicineId || selectedMedicine.id,
      medicineName: selectedMedicine.name,
      quantity: quantity,
      price: (selectedMedicine.price || 0) * quantity,
      unitPrice: selectedMedicine.price || 0,
      unit: selectedMedicine.unit || 'đơn vị'
    };
    
    // Ensure medicineId is set
    if (!newMedicine.medicineId) {
      console.error('❌ medicineId is missing after adding medicine:', newMedicine);
      showNotification('error', 'Lỗi Dữ Liệu', 'Không thể xác định ID thuốc. Vui lòng thử lại.');
      return;
    }
    
    // Ensure dosage is set
    if (!newMedicine.dosage || !newMedicine.dosage.trim()) {
      console.error('❌ dosage is missing after adding medicine:', newMedicine);
      showNotification('error', 'Thiếu Thông Tin', 'Liều dùng không được để trống. Vui lòng nhập liều dùng.');
      return;
    }

    setFormData(prev => {
      const updatedMedicines = [...prev.medicines, newMedicine];
      console.log('✅ Added medicine:', newMedicine);
      console.log('📋 Updated medicines list:', updatedMedicines);
      return {
        ...prev,
        medicines: updatedMedicines
      };
    });

    // Reset current medicine
    setCurrentMedicine({
      medicineId: '',
      quantity: 1,
      dosage: '',
      duration: '',
      instructions: ''
    });
  };

  const handleRemoveMedicine = (medicineIndex) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, index) => index !== medicineIndex)
    }));
  };

  const handleSavePrescription = async () => {
    console.log('🔍 Checking form data before save:', formData);
    console.log('🔍 Current medicines:', formData.medicines);

    if (!formData.patientId || !formData.diagnosis || formData.medicines.length === 0) {
      showNotification('error', 'Thiếu Thông Tin', 'Vui lòng điền đầy đủ thông tin:\n• Chọn bệnh nhân\n• Nhập chẩn đoán\n• Thêm ít nhất 1 loại thuốc');
      return;
    }

    try {
      // Validate medicine data
      const invalidMedicines = formData.medicines.filter(med => 
        !med.medicineId || isNaN(parseInt(med.medicineId)) || !med.dosage
      );

      if (invalidMedicines.length > 0) {
        console.error('❌ Có thuốc thiếu thông tin hoặc medicineId không hợp lệ:', invalidMedicines);
        showNotification('error', 'Dữ Liệu Không Hợp Lệ', 'Có thuốc trong đơn chưa đầy đủ thông tin hoặc ID thuốc không hợp lệ. Vui lòng kiểm tra lại.');
        return;
      }

      // Prepare prescription data for backend
      const initialRecordId = location.state?.recordId || appointmentInfo?.recordId || '';
      const parsedRecordId = initialRecordId ? parseInt(initialRecordId) : null;

      // Resolve appointmentId from various sources
      const resolvedAppointmentId = formData.selectedAppointmentId || appointmentId || appointmentInfo?.appointmentId || location.state?.appointment?.appointmentId || null;
      
      // Build prescription payload
      const prescriptionData = {
        // Include recordId if available (backend will use it if present)
        ...(parsedRecordId && { recordId: parsedRecordId }),
        // Include appointmentId so backend can create MedicalRecord if recordId is missing
        ...(resolvedAppointmentId && { appointmentId: parseInt(resolvedAppointmentId) }),
        notes: formData.diagnosis,
        advice: formData.advice || '', // Lời khuyên của bác sĩ
        items: formData.medicines.map(med => {
          // Ensure medicineId is a number
          const medicineId = parseInt(med.medicineId);
          if (isNaN(medicineId)) {
            throw new Error(`Medicine ID không hợp lệ: ${med.medicineId}`);
          }
          return {
            medicineId: medicineId,
            quantity: med.quantity || 1,
            dosage: med.dosage || '',
            duration: med.duration || '',
            note: med.instructions || ''
          };
        })
      };

      // Validate: Must have either recordId or appointmentId
      if (!prescriptionData.recordId && !prescriptionData.appointmentId) {
        showNotification('error', 'Thiếu Thông Tin', 'Vui lòng chọn hoặc mở từ một lịch hẹn để hệ thống tự động tạo hồ sơ bệnh án.');
        return;
      }

      // Validate appointmentId if provided
      if (prescriptionData.appointmentId && isNaN(prescriptionData.appointmentId)) {
        showNotification('error', 'Dữ Liệu Không Hợp Lệ', `Appointment ID không hợp lệ: ${resolvedAppointmentId}`);
        return;
      }

      console.log('💾 prescriptionData to send:', JSON.stringify(prescriptionData, null, 2));
      console.log('🔍 Backend will:', 
        prescriptionData.recordId 
          ? 'use existing MedicalRecord' 
          : 'create MedicalRecord from appointmentId');

      try {
        const result = await prescriptionApi.createPrescription(prescriptionData);
        console.log('✅ API response:', result);

        // Calculate total amount for display
        const totalAmount = formData.medicines.reduce((sum, med) => sum + (Number(med.price) || 0), 0);
        const formattedTotal = totalAmount.toLocaleString('vi-VN');

        // Show success message in modal
        showNotification(
          'success', 
          'Lưu Đơn Thuốc Thành Công!', 
          `📋 Bệnh nhân: ${formData.patientName}\n💊 Số loại thuốc: ${formData.medicines.length}\n💰 Tổng tiền: ${formattedTotal} ₫`,
          () => {
            // Navigate after closing modal
            if (prescriptionData.appointmentId) {
              navigate('/doctor/appointments');
            } else {
              navigate('/doctor/prescriptions');
            }
          }
        );

        // Update appointment status to Completed (if appointmentId available)
        if (prescriptionData.appointmentId) {
          try {
            await appointmentApi.updateAppointment(prescriptionData.appointmentId, { status: 'Completed' });
            console.log('✅ Appointment status updated to Completed for', prescriptionData.appointmentId);
          } catch (e) {
            console.warn('⚠️ Không thể cập nhật trạng thái appointment sau khi kê đơn:', e);
          }
        }
      } catch (apiError) {
        console.error('❌ Lỗi khi lưu đơn thuốc vào database:', apiError);
        console.error('❌ Error response:', apiError.response);
        console.error('❌ Error response data:', apiError.response?.data);
        console.error('❌ Prescription data sent:', JSON.stringify(prescriptionData, null, 2));

        // Build error message
        let errorMessage = 'Không thể lưu đơn thuốc vào hệ thống.\n\n';
        const resp = apiError.response;
        if (resp) {
          errorMessage += `Server trả về: ${resp.status} ${resp.statusText}\n`;
          if (resp.data) {
            try {
              const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2);
              errorMessage += `Chi tiết: ${body}`;
            } catch (e) {
              errorMessage += 'Chi tiết lỗi không thể hiển thị.';
            }
          }
        } else if (apiError.request) {
          errorMessage += 'Không nhận được phản hồi từ server. Vui lòng kiểm tra kết nối.';
        } else {
          errorMessage += `Lỗi: ${apiError.message}`;
        }

        showNotification('error', 'Lỗi Lưu Đơn Thuốc', errorMessage);
        return; // Don't navigate on error
      }

    } catch (error) {
      console.error('❌ Lỗi không mong đợi:', error);
      
      // More detailed error message
      let errorMessage = 'Không thể lưu đơn thuốc.\n\n';
      
      if (error.response) {
        errorMessage += `Lỗi server: ${error.response.status} - ${error.response.data?.message || 'Không rõ lý do'}`;
      } else if (error.request) {
        errorMessage += 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else {
        errorMessage += `Lỗi: ${error.message}`;
      }
      
      errorMessage += '\n\nVui lòng thử lại hoặc liên hệ quản trị viên.';
      
      showNotification('error', 'Lỗi Không Mong Đợi', errorMessage);
    }
  };

  return (
    <Container fluid className="py-4" style={{backgroundColor: '#f8f9fa', minHeight: '100vh'}}>
      {/* Modern Header */}
      <Row className="mb-4">
        <Col>
          <Card style={{border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }}>
                    <Pill size={28} color="white" />
                  </div>
                  <div>
                    <h4 className="mb-1" style={{fontWeight: 600, color: '#1a202c'}}>
                      {appointmentInfo ? 'Kê Đơn Thuốc - Khám Bệnh' : 'Kê Đơn Thuốc Mới'}
                    </h4>
                    <p className="mb-0" style={{color: '#718096', fontSize: '14px'}}>
                      {(appointmentInfo || formData.patientId) ? (
                        <>
                          {appointmentInfo ? `Lịch hẹn: ${appointmentInfo?.appointmentTime || appointmentInfo?.startTime || 'N/A'} - ${appointmentInfo?.appointmentDate || 'N/A'}` : 'Tạo đơn thuốc cho bệnh nhân'}
                        </>
                      ) : (
                        'Tạo đơn thuốc cho bệnh nhân'
                      )}
                    </p>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <Link to="/doctor/prescriptions" style={{textDecoration: 'none'}}>
                    <Button 
                      variant="outline-secondary"
                      style={{
                        height: '48px',
                        borderRadius: '12px',
                        padding: '0 24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '2px solid #e2e8f0'
                      }}
                    >
                      <ArrowLeft size={18} />
                      Quay lại
                    </Button>
                  </Link>
                  <Button 
                    onClick={handleSavePrescription}
                    disabled={
                      formData.medicines.length === 0 || 
                      !formData.patientId || 
                      !formData.diagnosis.trim() ||
                      formData.medicines.some(med => !med.medicineId || !med.dosage || med.quantity === undefined || med.quantity === null || med.quantity <= 0)
                    }
                    style={{
                      height: '48px',
                      borderRadius: '12px',
                      padding: '0 24px',
                      background: formData.medicines.length === 0 || !formData.patientId || !formData.diagnosis.trim() ? '#cbd5e0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 500
                    }}
                  >
                    <Save size={18} />
                    Lưu Đơn Thuốc
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={7}>
          {/* Patient Information Card */}
          <Card className="mb-3" style={{border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3">
                <User size={20} className="me-2" style={{color: '#667eea'}} />
                <h6 className="mb-0" style={{fontWeight: 600, color: '#1a202c'}}>Thông tin bệnh nhân</h6>
              </div>
              {(appointmentInfo || formData.patientId || patientInfo) ? (
                <div style={{
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <div className="d-flex align-items-start">
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      <User size={24} color="white" />
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 600, fontSize: '16px', color: '#1a202c', marginBottom: '4px'}}>
                        {formData.patientName || patientInfo?.name || 'Không rõ tên'}
                      </div>
                      <div style={{color: '#718096', fontSize: '14px'}}>
                        <strong>ID:</strong> {formData.patientId || patientInfo?.patientId || patientInfo?.id || 'N/A'}
                      </div>
                      {patientInfo?.phone && (
                        <div style={{color: '#718096', fontSize: '14px'}}>
                          <strong>SĐT:</strong> {patientInfo.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <Form.Select 
                  value={formData.patientId}
                  onChange={(e) => handleSelectPatient(e.target.value)}
                  style={{
                    height: '48px',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Chọn bệnh nhân...</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.patientId}>
                      {patient.name} - {patient.patientId}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Card.Body>
          </Card>

          {/* Appointment Selection - only show if no appointment from URL/state */}
          {!appointmentInfo && !appointmentId && (
            <Card className="mb-3" style={{border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
              <Card.Body className="p-4">
                <h6 className="mb-3" style={{fontWeight: 600, color: '#1a202c'}}>Chọn lịch hẹn (tùy chọn)</h6>
                <Form.Select 
                  value={formData.selectedAppointmentId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setFormData(prev => ({ ...prev, selectedAppointmentId: selectedId }));
                    
                    // Auto-fill patient info if appointment selected
                    if (selectedId) {
                      const selectedAppointment = appointments.find(appt => appt.appointmentId === selectedId);
                      if (selectedAppointment && selectedAppointment.patientId) {
                        console.log('👤 Selected appointment:', selectedAppointment);
                        console.log('👤 Patient ID:', selectedAppointment.patientId);
                        console.log('👤 Patient Name:', selectedAppointment.patientName);
                        setFormData(prev => ({
                          ...prev,
                          patientId: selectedAppointment.patientId.toString(),
                          patientName: selectedAppointment.patientName || 'Không rõ tên'
                        }));
                      }
                    } else {
                      // Clear patient info if no appointment selected
                      setFormData(prev => ({
                        ...prev,
                        patientId: '',
                        patientName: ''
                      }));
                    }
                  }}
                  style={{
                    height: '48px',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Không chọn lịch hẹn cụ thể...</option>
                  {appointments
                    .filter(appt => {
                      // Tạm thời hiển thị tất cả appointments để debug
                      console.log('🔍 All appointments:', appointments.length);
                      console.log('🔍 Current appointment:', { id: appt.id, status: appt.status, hasPatient: !!appt.patientId, patientName: appt.patientName });
                      return true; // Hiển thị tất cả để debug
                    })
                    .map(appointment => (
                      <option key={appointment.id} value={appointment.appointmentId}>
                        {appointment.patientName || 'No name'} - {appointment.startTime ? new Date(appointment.startTime).toLocaleString('vi-VN') : 'No time'} ({appointment.status || 'No status'})
                      </option>
                    ))}
                </Form.Select>
                <small className="text-muted mt-2 d-block">
                  Chọn lịch hẹn để tự động điền thông tin bệnh nhân và tạo hồ sơ bệnh án
                </small>
              </Card.Body>
            </Card>
          )}

          {/* Diagnosis Card */}
          <Card className="mb-3" style={{border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <Clipboard size={20} className="me-2" style={{color: '#667eea'}} />
                  <h6 className="mb-0" style={{fontWeight: 600, color: '#1a202c'}}>Chẩn đoán sơ bộ</h6>
                </div>
                <Button 
                  variant="outline-info" 
                  size="sm"
                  onClick={() => setShowReferralModal(true)}
                  disabled={!formData.patientId && !patientInfo}
                  style={{
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                >
                  <Clipboard size={14} className="me-1" />
                  Tạo Chỉ định CLS
                </Button>
              </div>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Nhập chẩn đoán sơ bộ (triệu chứng, dấu hiệu lâm sàng...)&#10;Sau khi nhập chẩn đoán, bạn có thể tạo chỉ định cận lâm sàng nếu cần."
                value={formData.diagnosis}
                onChange={(e) => setFormData(prev => ({...prev, diagnosis: e.target.value}))}
                style={{
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  fontSize: '14px',
                  resize: 'none'
                }}
              />
              <small className="text-muted mt-2 d-block" style={{fontSize: '13px'}}>
                💡 <strong>Gợi ý:</strong> Nhập triệu chứng ban đầu. Nếu cần xét nghiệm/chẩn đoán hình ảnh, nhấn "Tạo Chỉ định CLS"
              </small>
              
              {/* Advice Section */}
              <hr className="my-3" />
              <Form.Group className="mt-3">
                <Form.Label style={{fontSize: '14px', fontWeight: 600, color: '#1a202c'}}>
                  Lời khuyên của bác sĩ
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Nhập lời khuyên cho bệnh nhân (cách chăm sóc, lưu ý khi dùng thuốc...)&#10;Ví dụ: Nghỉ ngơi đầy đủ, uống đủ nước, tránh thức khuya..."
                  value={formData.advice}
                  onChange={(e) => setFormData(prev => ({...prev, advice: e.target.value}))}
                  style={{
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    resize: 'none'
                  }}
                />
                <small className="text-muted mt-1 d-block" style={{fontSize: '13px'}}>
                  💡 <strong>Tùy chọn:</strong> Lời khuyên sẽ được lưu vào hồ sơ bệnh án
                </small>
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Clinical Referral Results */}
          {(appointmentId || formData.selectedAppointmentId) && (
            <ReferralResults 
              referrals={referralResults} 
              loading={loadingReferrals} 
            />
          )}

          {/* Add Medicine Card */}
          <Card className="mb-3" style={{border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3">
                <Plus size={20} className="me-2" style={{color: '#667eea'}} />
                <h6 className="mb-0" style={{fontWeight: 600, color: '#1a202c'}}>Thêm thuốc vào đơn</h6>
              </div>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{fontSize: '14px', fontWeight: 500, color: '#4a5568'}}>Chọn thuốc</Form.Label>
                    <Form.Select
                      value={currentMedicine.medicineId}
                      onChange={(e) => {
                        console.log('📝 Selected medicine ID from select:', e.target.value, typeof e.target.value);
                        setCurrentMedicine(prev => ({...prev, medicineId: e.target.value}));
                      }}
                      style={{
                        height: '48px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Chọn thuốc...</option>
                      {filteredMedicines.map(medicine => (
                        <option key={medicine.id} value={medicine.medicineId}>
                          {(medicine.name || 'Không rõ tên')} - {(medicine.category || 'Không rõ loại')}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{fontSize: '14px', fontWeight: 500, color: '#4a5568'}}>Số lượng</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={currentMedicine.quantity}
                      onChange={(e) => setCurrentMedicine(prev => ({...prev, quantity: parseInt(e.target.value) || 1}))}
                      style={{
                        height: '48px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        fontSize: '14px'
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{fontSize: '14px', fontWeight: 500, color: '#4a5568'}}>Liều dùng</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="VD: 1 viên x 3 lần/ngày"
                      value={currentMedicine.dosage}
                      onChange={(e) => setCurrentMedicine(prev => ({...prev, dosage: e.target.value}))}
                      style={{
                        height: '48px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        fontSize: '14px'
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{fontSize: '14px', fontWeight: 500, color: '#4a5568'}}>Thời gian sử dụng</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="VD: 7 ngày"
                      value={currentMedicine.duration}
                      onChange={(e) => setCurrentMedicine(prev => ({...prev, duration: e.target.value}))}
                      style={{
                        height: '48px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        fontSize: '14px'
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label style={{fontSize: '14px', fontWeight: 500, color: '#4a5568'}}>Hướng dẫn sử dụng</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="VD: Uống sau ăn"
                  value={currentMedicine.instructions}
                  onChange={(e) => setCurrentMedicine(prev => ({...prev, instructions: e.target.value}))}
                  style={{
                    height: '48px',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px'
                  }}
                />
              </Form.Group>

              <Button 
                onClick={handleAddMedicine}
                style={{
                  height: '48px',
                  borderRadius: '12px',
                  padding: '0 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                <Plus size={18} />
                Thêm thuốc vào đơn
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          {/* Medicine Search */}
          <Card className="mb-3" style={{border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3">
                <Search size={20} className="me-2" style={{color: '#667eea'}} />
                <h6 className="mb-0" style={{fontWeight: 600, color: '#1a202c'}}>
                  Tìm kiếm thuốc
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '13px',
                    color: '#718096',
                    fontWeight: 400
                  }}>
                    ({filteredMedicines.length} thuốc)
                  </span>
                </h6>
              </div>
              <div className="position-relative mb-3">
                <Search 
                  className="position-absolute" 
                  size={18} 
                  style={{left: "16px", top: "15px", color: "#a0aec0"}} 
                />
                <Form.Control
                  type="text"
                  placeholder="Tìm kiếm theo tên thuốc, loại..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  style={{
                    height: '48px',
                    paddingLeft: "48px",
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px'
                  }}
                />
                {searchError && (
                  <small className="text-danger mt-1 d-block">{searchError}</small>
                )}
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" style={{width: '40px', height: '40px'}}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <div className="mt-3" style={{color: '#718096', fontSize: '14px'}}>Đang tải danh sách thuốc...</div>
                </div>
              ) : (
                <div style={{maxHeight: "400px", overflowY: "auto"}}>
                  {filteredMedicines.length === 0 ? (
                    <div className="text-center py-5">
                      <Search size={56} style={{color: '#cbd5e0', marginBottom: '12px'}} />
                      <div style={{color: '#718096', fontSize: '15px', fontWeight: 500}}>Không tìm thấy thuốc nào</div>
                      <small style={{color: '#a0aec0', fontSize: '13px'}}>Thử từ khóa khác</small>
                    </div>
                  ) : (
                    <>
                      {filteredMedicines.map(medicine => {
                        try {
                          return (
                            <div 
                              key={medicine.id || `medicine-${Math.random()}`} 
                              className="cursor-pointer" 
                              onClick={() => {
                                try {
                                  console.log('🖱️ Clicked medicine from search:', medicine.medicineId, typeof medicine.medicineId, medicine.name);
                                  setCurrentMedicine(prev => ({...prev, medicineId: medicine.medicineId}));
                                } catch (error) {
                                  console.error('❌ Error clicking medicine:', error);
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                padding: '16px',
                                marginBottom: '8px',
                                borderRadius: '12px',
                                border: currentMedicine.medicineId == medicine.medicineId ? '2px solid #667eea' : '2px solid #e2e8f0',
                                transition: 'all 0.2s',
                                background: currentMedicine.medicineId == medicine.medicineId ? '#f7fafc' : 'white'
                              }}
                              onMouseEnter={(e) => {
                                if (currentMedicine.medicineId != medicine.medicineId) {
                                  e.currentTarget.style.backgroundColor = '#f7fafc';
                                  e.currentTarget.style.borderColor = '#cbd5e0';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (currentMedicine.medicineId != medicine.medicineId) {
                                  e.currentTarget.style.backgroundColor = 'white';
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }
                              }}
                            >
                              <div className="d-flex justify-content-between">
                                <div style={{flex: 1}}>
                                  <div style={{fontWeight: 600, color: '#1a202c', fontSize: '15px', marginBottom: '4px'}}>
                                    {medicine.name || 'Không rõ tên'}
                                  </div>
                                  <div style={{marginBottom: '6px'}}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: '#e0e7ff',
                                      color: '#5a67d8',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      marginRight: '6px'
                                    }}>
                                      {medicine.medicineId || 'N/A'}
                                    </span>
                                    <span style={{fontSize: '13px', color: '#718096'}}>
                                      {medicine.category || 'Không rõ loại'} • {medicine.strength || 'N/A'}
                                    </span>
                                  </div>
                                  {medicine.description && (
                                    <small style={{color: '#a0aec0', fontSize: '12px', display: 'block', marginTop: '2px'}}>
                                      {medicine.description}
                                    </small>
                                  )}
                                </div>
                                <div className="text-end ms-3">
                                  <div style={{fontWeight: 600, color: '#48bb78', fontSize: '15px'}}>
                                    {(medicine.price || 0).toLocaleString('vi-VN')} ₫
                                  </div>
                                  <small style={{color: '#a0aec0', fontSize: '12px'}}>/{medicine.unit || 'đơn vị'}</small>
                                </div>
                              </div>
                            </div>
                          );
                        } catch (error) {
                          console.error('❌ Error rendering medicine:', medicine, error);
                          return null;
                        }
                      })}
                    </>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Current Prescription */}
          <Card style={{border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center">
                  <Pill size={20} className="me-2" style={{color: '#667eea'}} />
                  <h6 className="mb-0" style={{fontWeight: 600, color: '#1a202c'}}>Danh sách thuốc</h6>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  {formData.medicines.length} thuốc
                </div>
              </div>

              {formData.medicines.length === 0 ? (
                <div className="text-center py-5">
                  <Pill size={56} style={{color: '#cbd5e0', marginBottom: '12px'}} />
                  <div style={{color: '#718096', fontSize: '15px', fontWeight: 500}}>Chưa có thuốc nào trong đơn</div>
                  <small style={{color: '#a0aec0', fontSize: '13px'}}>Thêm thuốc từ danh sách bên trái</small>
                </div>
              ) : (
                <div style={{maxHeight: "450px", overflowY: "auto"}}>
                  {formData.medicines.map((medicine, index) => (
                    <div 
                      key={index} 
                      style={{
                        padding: '16px',
                        marginBottom: '12px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div style={{flex: 1}}>
                          <div style={{fontWeight: 600, color: '#1a202c', fontSize: '15px', marginBottom: '8px'}}>
                            {medicine.medicineName}
                          </div>
                          <div style={{fontSize: '13px', color: '#718096', marginBottom: '4px'}}>
                            <strong>Số lượng:</strong> {medicine.quantity} {medicine.unit}
                          </div>
                          <div style={{fontSize: '13px', color: '#5a67d8', marginBottom: '4px'}}>
                            <strong>Liều dùng:</strong> {medicine.dosage}
                          </div>
                          {medicine.duration && (
                            <div style={{fontSize: '13px', color: '#ed8936', marginBottom: '4px'}}>
                              <strong>Thời gian:</strong> {medicine.duration}
                            </div>
                          )}
                          {medicine.instructions && (
                            <div style={{fontSize: '13px', color: '#48bb78', marginBottom: '4px'}}>
                              <strong>Hướng dẫn:</strong> {medicine.instructions}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveMedicine(index)}
                          style={{
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            border: '2px solid #fc8181'
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '2px solid #e2e8f0'
                  }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{fontWeight: 600, color: '#1a202c', fontSize: '15px'}}>Tổng tiền:</span>
                      <span style={{fontWeight: 700, color: '#48bb78', fontSize: '18px'}}>
                        {formData.medicines.reduce((sum, med) => sum + (med.price || 0), 0).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Clinical Referral Modal */}
      <Modal show={showReferralModal} onHide={() => setShowReferralModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{border: 'none', paddingBottom: 0}}>
          <Modal.Title>
            <div className="d-flex align-items-center">
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <Clipboard size={24} color="white" />
              </div>
              <div>
                <h5 className="mb-0" style={{fontWeight: 600, color: '#1a202c'}}>Tạo Chỉ định Cận Lâm Sàng</h5>
                <small style={{color: '#718096'}}>Yêu cầu xét nghiệm hoặc chẩn đoán hình ảnh</small>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{padding: '24px'}}>
          <div style={{
            background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{fontSize: '14px', color: '#1a202c'}}>
              <strong>📋 Thông tin bệnh nhân:</strong> {formData.patientName || patientInfo?.name || 'N/A'}
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label style={{fontSize: '14px', fontWeight: 600, color: '#4a5568'}}>
              Chọn khoa thực hiện <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select
              value={referralData.toDepartmentId}
              onChange={(e) => setReferralData(prev => ({...prev, toDepartmentId: e.target.value}))}
              style={{
                height: '48px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '14px'
              }}
            >
              <option value="">-- Chọn khoa --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.departmentId || dept.id}>
                  {dept.departmentName}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label style={{fontSize: '14px', fontWeight: 600, color: '#4a5568'}}>
              Yêu cầu cận lâm sàng <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              placeholder="Nhập chi tiết yêu cầu xét nghiệm hoặc chẩn đoán hình ảnh...&#10;Ví dụ:&#10;- Xét nghiệm công thức máu&#10;- Chụp X-quang phổi&#10;- Siêu âm bụng tổng quát"
              value={referralData.notes}
              onChange={(e) => setReferralData(prev => ({...prev, notes: e.target.value}))}
              style={{
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '14px',
                resize: 'none'
              }}
            />
          </Form.Group>

          <div style={{
            background: '#fffaf0',
            border: '2px solid #fbd38d',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{fontSize: '14px', color: '#744210'}}>
              <strong>⚠️ Lưu ý:</strong> Sau khi tạo chỉ định, trạng thái lịch hẹn sẽ chuyển sang "REFERRED". 
              Bệnh nhân sẽ đến khoa được chỉ định để thực hiện xét nghiệm/chẩn đoán.
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{border: 'none', padding: '0 24px 24px'}}>
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowReferralModal(false)}
            style={{
              height: '48px',
              borderRadius: '12px',
              padding: '0 24px',
              border: '2px solid #e2e8f0',
              fontWeight: 500
            }}
          >
            Hủy
          </Button>
          <Button 
            onClick={handleCreateReferral}
            style={{
              height: '48px',
              borderRadius: '12px',
              padding: '0 24px',
              background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500
            }}
          >
            <Clipboard size={18} />
            Tạo Chỉ Định
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Notification Modal */}
      <Modal 
        show={showModal} 
        onHide={() => {
          setShowModal(false);
          if (modalConfig.onClose) {
            modalConfig.onClose();
          }
        }}
        centered
      >
        <Modal.Header 
          closeButton 
          style={{
            backgroundColor: modalConfig.type === 'success' ? '#d4edda' : '#f8d7da',
            borderBottom: `3px solid ${modalConfig.type === 'success' ? '#28a745' : '#dc3545'}`
          }}
        >
          <Modal.Title>
            {modalConfig.type === 'success' ? '✅' : '❌'} {modalConfig.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ whiteSpace: 'pre-line', fontSize: '15px' }}>
          {modalConfig.message}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant={modalConfig.type === 'success' ? 'success' : 'danger'}
            onClick={() => {
              setShowModal(false);
              if (modalConfig.onClose) {
                modalConfig.onClose();
              }
            }}
            style={{ minWidth: '100px' }}
          >
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PrescriptionForm;