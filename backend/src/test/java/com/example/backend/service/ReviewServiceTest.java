package com.example.backend.service;


import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;


import java.util.List;
import java.util.Optional;
import java.util.Set;


import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;


import com.example.backend.dto.ReviewDTO;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.ReviewMapper;
import com.example.backend.model.Appointment;
import com.example.backend.model.Doctor;
import com.example.backend.model.Patient;
import com.example.backend.model.Review;
import com.example.backend.repository.AppointmentRepository;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.PatientRepository;
import com.example.backend.repository.ReviewRepository;


import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;


@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {


    @Mock
    private ReviewRepository reviewRepository;


    @Mock
    private PatientRepository patientRepository;


    @Mock
    private DoctorRepository doctorRepository;


    @Mock
    private AppointmentRepository appointmentRepository;


    @Mock
    private ReviewMapper reviewMapper;


    @InjectMocks
    private ReviewService reviewService;


    private Patient patient;
    private Doctor doctor;
    private Appointment appointment;


    @BeforeEach
    void setUp() {
        patient = new Patient();
        patient.setPatientId(1L);


        doctor = new Doctor();
        doctor.setDoctorId(2L);


        appointment = new Appointment();
        appointment.setAppointmentId(3L);
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
    }


    // TC-REV-001: Bệnh nhân tạo review – thành công
    @Test
    void createReview_success() {
        ReviewDTO.Create dto = new ReviewDTO.Create(1L, 2L, 3L, 4, "Great visit");
        Review entity = new Review();
        ReviewDTO.Response expectedResponse = new ReviewDTO.Response();


        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(doctorRepository.findById(2L)).thenReturn(Optional.of(doctor));
        when(appointmentRepository.findById(3L)).thenReturn(Optional.of(appointment));
        when(reviewRepository.findByAppointment_AppointmentId(3L)).thenReturn(Optional.empty());
        when(reviewMapper.createDTOToEntity(dto, patient, doctor, appointment)).thenReturn(entity);
        when(reviewRepository.save(entity)).thenReturn(entity);
        when(reviewMapper.entityToResponseDTO(entity)).thenReturn(expectedResponse);


        ReviewDTO.Response actual = reviewService.create(dto);


        assertSame(expectedResponse, actual);
        verify(reviewRepository).save(entity);
    }


    // TC-REV-002: Bệnh nhân tạo review – bệnh nhân không tồn tại
    @Test
    void createReview_patientNotFound() {
        ReviewDTO.Create dto = new ReviewDTO.Create(99L, 2L, 3L, 5, "Comment");
        when(patientRepository.findById(99L)).thenReturn(Optional.empty());


        assertThrows(NotFoundException.class, () -> reviewService.create(dto));
        verifyNoInteractions(reviewRepository, reviewMapper, doctorRepository, appointmentRepository);
    }


    // TC-REV-003: Bệnh nhân tạo review – appointment không thuộc bệnh nhân
    @Test
    void createReview_appointmentNotBelongToPatient() {
        Patient otherPatient = new Patient();
        otherPatient.setPatientId(999L);
        Appointment mismatched = new Appointment();
        mismatched.setAppointmentId(3L);
        mismatched.setPatient(otherPatient);
        mismatched.setDoctor(doctor);


        ReviewDTO.Create dto = new ReviewDTO.Create(1L, 2L, 3L, 4, "Comment");


        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(doctorRepository.findById(2L)).thenReturn(Optional.of(doctor));
        when(appointmentRepository.findById(3L)).thenReturn(Optional.of(mismatched));


        assertThrows(ConflictException.class, () -> reviewService.create(dto));
        verify(reviewRepository, never()).save(any());
    }


    // TC-REV-004: Bệnh nhân tạo review – appointment đã có review
    @Test
    void createReview_appointmentAlreadyReviewed() {
        ReviewDTO.Create dto = new ReviewDTO.Create(1L, 2L, 3L, 4, "Comment");
        Review existing = new Review();


        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(doctorRepository.findById(2L)).thenReturn(Optional.of(doctor));
        when(appointmentRepository.findById(3L)).thenReturn(Optional.of(appointment));
        when(reviewRepository.findByAppointment_AppointmentId(3L)).thenReturn(Optional.of(existing));


        assertThrows(ConflictException.class, () -> reviewService.create(dto));
        verify(reviewRepository, never()).save(any());
    }


    // TC-REV-005: Bệnh nhân tạo review – rating > 5 (validation)
    @Test
    void createReview_ratingOutOfRange_validationFailsBeforeService() {
        ReviewDTO.Create invalidDto = new ReviewDTO.Create(1L, 2L, 3L, 6, "Too high");
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        Set<ConstraintViolation<ReviewDTO.Create>> violations = validator.validate(invalidDto);


        assertFalse(violations.isEmpty());
    }


    // TC-REV-006: Xem chi tiết review – thành công
    @Test
    void getById_success() {
        Review entity = new Review();
        ReviewDTO.Response expectedResponse = new ReviewDTO.Response();


        when(reviewRepository.findById(10L)).thenReturn(Optional.of(entity));
        when(reviewMapper.entityToResponseDTO(entity)).thenReturn(expectedResponse);


        ReviewDTO.Response actual = reviewService.getById(10L);


        assertSame(expectedResponse, actual);
    }


    // TC-REV-007: Xem chi tiết review – không tìm thấy
    @Test
    void getById_notFound() {
        when(reviewRepository.findById(10L)).thenReturn(Optional.empty());


        assertThrows(NotFoundException.class, () -> reviewService.getById(10L));
    }


    // TC-REV-008: Lấy review theo lịch – thành công
    @Test
    void getByAppointment_success() {
        Review entity = new Review();
        ReviewDTO.Response expectedResponse = new ReviewDTO.Response();


        when(reviewRepository.findByAppointment_AppointmentId(3L)).thenReturn(Optional.of(entity));
        when(reviewMapper.entityToResponseDTO(entity)).thenReturn(expectedResponse);


        ReviewDTO.Response actual = reviewService.getByAppointment(3L);


        assertSame(expectedResponse, actual);
    }


    // TC-REV-009: Lấy review theo lịch – không có review
    @Test
    void getByAppointment_notFound() {
        when(reviewRepository.findByAppointment_AppointmentId(3L)).thenReturn(Optional.empty());


        assertThrows(NotFoundException.class, () -> reviewService.getByAppointment(3L));
    }


    // TC-REV-010: Bệnh nhân xem tất cả review – có dữ liệu
    @Test
    void getByPatient_returnsReviews() {
        Review review1 = new Review();
        Review review2 = new Review();
        review1.setReviewId(101L);
        review2.setReviewId(102L);
        ReviewDTO.Response dto1 = new ReviewDTO.Response();
        ReviewDTO.Response dto2 = new ReviewDTO.Response();


        when(reviewRepository.findByPatient_PatientId(1L)).thenReturn(List.of(review1, review2));
        when(reviewMapper.entityToResponseDTO(review1)).thenReturn(dto1);
        when(reviewMapper.entityToResponseDTO(review2)).thenReturn(dto2);


        List<ReviewDTO.Response> actual = reviewService.getByPatient(1L);


        assertEquals(List.of(dto1, dto2), actual);
        verify(reviewMapper).entityToResponseDTO(review1);
        verify(reviewMapper).entityToResponseDTO(review2);
    }


    // TC-REV-011: Bệnh nhân xem tất cả review – không dữ liệu
    @Test
    void getByPatient_returnsEmptyList() {
        when(reviewRepository.findByPatient_PatientId(1L)).thenReturn(List.of());


        List<ReviewDTO.Response> actual = reviewService.getByPatient(1L);


        assertTrue(actual.isEmpty());
        verify(reviewMapper, never()).entityToResponseDTO(any());
    }


    // TC-REV-012: Hồ sơ bác sĩ hiển thị feedback – có dữ liệu
    @Test
    void getByDoctor_returnsReviews() {
        Review review1 = new Review();
        Review review2 = new Review();
        ReviewDTO.Response dto1 = new ReviewDTO.Response();
        ReviewDTO.Response dto2 = new ReviewDTO.Response();


        when(reviewRepository.findByDoctor_DoctorId(2L)).thenReturn(List.of(review1, review2));
        when(reviewMapper.entityToResponseDTO(review1)).thenReturn(dto1);
        when(reviewMapper.entityToResponseDTO(review2)).thenReturn(dto2);


        List<ReviewDTO.Response> actual = reviewService.getByDoctor(2L);


        assertEquals(List.of(dto1, dto2), actual);
    }


    // TC-REV-013: Hồ sơ bác sĩ hiển thị feedback – không dữ liệu
    @Test
    void getByDoctor_returnsEmptyList() {
        when(reviewRepository.findByDoctor_DoctorId(2L)).thenReturn(List.of());


        List<ReviewDTO.Response> actual = reviewService.getByDoctor(2L);


        assertTrue(actual.isEmpty());
        verify(reviewMapper, never()).entityToResponseDTO(any());
    }


    // TC-REV-014: Điểm trung bình bác sĩ – có dữ liệu
    @Test
    void getAverageRatingByDoctor_success() {
        when(reviewRepository.getAverageRatingByDoctor(2L)).thenReturn(4.25);


        Double actual = reviewService.getAverageRatingByDoctor(2L);


        assertEquals(4.25, actual);
    }


    // TC-REV-015: Điểm trung bình bác sĩ – không dữ liệu
    @Test
    void getAverageRatingByDoctor_nullWhenNoData() {
        when(reviewRepository.getAverageRatingByDoctor(2L)).thenReturn(null);


        Double actual = reviewService.getAverageRatingByDoctor(2L);


        assertNull(actual);
    }


    // TC-REV-016: Cập nhật review – thành công
    @Test
    void updateReview_success() {
        ReviewDTO.Update updateDto = new ReviewDTO.Update(5, "Excellent", "ACTIVE");
        Review existing = new Review();
        existing.setReviewId(9L);
        existing.setRating(3);
        existing.setComment("Old comment");
        existing.setStatus("ACTIVE");
        ReviewDTO.Response expectedResponse = new ReviewDTO.Response();
        expectedResponse.setReviewId(9L);
        expectedResponse.setRating(5);
        expectedResponse.setComment("Excellent");


        when(reviewRepository.findById(9L)).thenReturn(Optional.of(existing));
        doAnswer(invocation -> {
            Review entity = invocation.getArgument(0, Review.class);
            ReviewDTO.Update dto = invocation.getArgument(1, ReviewDTO.Update.class);
            if (dto.getRating() != null) {
                entity.setRating(dto.getRating());
            }
            if (dto.getComment() != null) {
                entity.setComment(dto.getComment());
            }
            if (dto.getStatus() != null) {
                entity.setStatus(dto.getStatus());
            }
            return null;
        }).when(reviewMapper).applyUpdateToEntity(existing, updateDto);
        when(reviewRepository.save(existing)).thenReturn(existing);
        when(reviewMapper.entityToResponseDTO(existing)).thenReturn(expectedResponse);


        ReviewDTO.Response actual = reviewService.update(9L, updateDto);


        assertSame(expectedResponse, actual);
        assertEquals(5, existing.getRating());
        assertEquals("Excellent", existing.getComment());
        assertEquals("ACTIVE", existing.getStatus());
    }


    // TC-REV-017: Cập nhật review – không tìm thấy
    @Test
    void updateReview_notFound() {
        ReviewDTO.Update updateDto = new ReviewDTO.Update(5, "Comment", "ACTIVE");
        when(reviewRepository.findById(9L)).thenReturn(Optional.empty());


        assertThrows(NotFoundException.class, () -> reviewService.update(9L, updateDto));
        verify(reviewRepository, never()).save(any());
    }


    // TC-REV-018: Cập nhật review – mapper lỗi
    @Test
    void updateReview_mapperThrowsException() {
        ReviewDTO.Update updateDto = new ReviewDTO.Update(5, "Comment", "ACTIVE");
        Review existing = new Review();


        when(reviewRepository.findById(9L)).thenReturn(Optional.of(existing));
        doThrow(new RuntimeException("mapping error")).when(reviewMapper).applyUpdateToEntity(existing, updateDto);


        RuntimeException ex = assertThrows(RuntimeException.class, () -> reviewService.update(9L, updateDto));
        assertEquals("mapping error", ex.getMessage());
        verify(reviewRepository, never()).save(any());
    }
}


