package com.example.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.ConversationDTO;
import com.example.backend.dto.MessageDTO;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.ConversationMapper;
import com.example.backend.model.Conversation;
import com.example.backend.model.Doctor;
import com.example.backend.model.Patient;
import com.example.backend.model.User;
import com.example.backend.repository.ConversationRepository;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.PatientRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final MessageRepository messageRepository;
    private final ConversationMapper conversationMapper;

    public ConversationDTO.Response createConversation(ConversationDTO.Create dto) {
        Patient patient = resolvePatient(dto.getPatientUserId(), dto.getPatientId());
        Doctor doctor = resolveDoctor(dto.getDoctorUserId(), dto.getDoctorId());

        User patientUser = patient.getUser();
        User doctorUser = doctor.getUser();

        validateParticipantRoles(patientUser, doctorUser);

        Optional<Conversation> existingConversation = conversationRepository
                .findByPatientUser_IdAndDoctorUser_Id(patientUser.getId(), doctorUser.getId());

        if (existingConversation.isPresent()) {
            return conversationMapper.entityToResponseDTO(existingConversation.get());
        }

        Conversation conversation = conversationMapper.createDTOToEntity(dto, patientUser, doctorUser);
        Conversation savedConversation = conversationRepository.save(conversation);

        return conversationMapper.entityToResponseDTO(savedConversation);
    }

    @Transactional(readOnly = true)
    public ConversationDTO.Response getConversationById(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException(
                        "Không tìm thấy cuộc trò chuyện với ID: " + conversationId));

        return conversationMapper.entityToResponseDTO(conversation);
    }

    @Transactional(readOnly = true)
    public ConversationDTO.Response getConversationByIdWithMessages(Long conversationId) {
        Conversation conversation = conversationRepository.findByIdWithMessages(conversationId)
                .orElseThrow(() -> new NotFoundException(
                        "Không tìm thấy cuộc trò chuyện với ID: " + conversationId));

        return conversationMapper.entityToResponseDTO(conversation);
    }

    @Transactional(readOnly = true)
    public List<ConversationDTO.Response> getConversationsByPatient(Long patientUserId, Long patientId) {
        Long resolvedUserId = resolvePatientUserId(patientUserId, patientId);
        List<Conversation> conversations = conversationRepository
                .findByPatientUser_IdOrderByCreatedAtDesc(resolvedUserId);
        return conversations.stream()
                .map(conversationMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationDTO.Response> getConversationsByDoctor(Long doctorUserId, Long doctorId) {
        Long resolvedUserId = resolveDoctorUserId(doctorUserId, doctorId);
        List<Conversation> conversations = conversationRepository
                .findByDoctorUser_IdOrderByCreatedAtDesc(resolvedUserId);
        return conversations.stream()
                .map(conversationMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<ConversationDTO.Response> getConversationByParticipants(
            Long patientUserId, Long patientId, Long doctorUserId, Long doctorId) {
        Long resolvedPatientUserId = resolvePatientUserId(patientUserId, patientId);
        Long resolvedDoctorUserId = resolveDoctorUserId(doctorUserId, doctorId);

        Optional<Conversation> conversation = conversationRepository
                .findByPatientUser_IdAndDoctorUser_Id(resolvedPatientUserId, resolvedDoctorUserId);

        return conversation.map(conversationMapper::entityToResponseDTO);
    }

    @Transactional(readOnly = true)
    public Long getConversationCountByPatient(Long patientUserId, Long patientId) {
        Long resolvedUserId = resolvePatientUserId(patientUserId, patientId);
        return conversationRepository.countByPatientUser_Id(resolvedUserId);
    }

    @Transactional(readOnly = true)
    public Long getConversationCountByDoctor(Long doctorUserId, Long doctorId) {
        Long resolvedUserId = resolveDoctorUserId(doctorUserId, doctorId);
        return conversationRepository.countByDoctorUser_Id(resolvedUserId);
    }

    public void deleteConversation(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException(
                        "Không tìm thấy cuộc trò chuyện với ID: " + conversationId));

        List<MessageDTO.Response> messages = messageRepository.findByConversationIdOrderBySentAtAsc(conversationId)
                .stream()
                .map(msg -> {
                    MessageDTO.Response response = new MessageDTO.Response();
                    response.setMessageId(msg.getMessageId());
                    return response;
                })
                .toList();

        messageRepository.deleteAllById(messages.stream().map(MessageDTO.Response::getMessageId).toList());
        conversationRepository.delete(conversation);
    }

    @Transactional(readOnly = true)
    public ConversationDTO.Response getConversationWithLatestMessages(Long conversationId, int limit) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException(
                        "Không tìm thấy cuộc trò chuyện với ID: " + conversationId));

        List<MessageDTO.Response> latestMessages = messageRepository
                .findByConversationIdOrderBySentAtDesc(conversationId)
                .stream()
                .limit(limit)
                .map(msg -> {
                    MessageDTO.Response response = new MessageDTO.Response();
                    response.setMessageId(msg.getMessageId());
                    response.setConversationId(msg.getConversation().getConversationId());
                    response.setSenderId(msg.getSender().getId());
                    response.setSenderName(msg.getSender().getFirstName() + " " + msg.getSender().getLastName());
                    response.setContent(msg.getContent());
                    response.setSentAt(msg.getSentAt());
                    return response;
                })
                .toList();

        return conversationMapper.entityToResponseDTOWithMessages(conversation, latestMessages);
    }

    private Patient resolvePatient(Long patientUserId, Long patientId) {
        if (patientUserId != null) {
            return patientRepository.findByUserIdWithUserAndRole(patientUserId)
                    .orElseThrow(() -> new NotFoundException(
                            "Không tìm thấy bệnh nhân với user ID: " + patientUserId));
        }

        if (patientId != null) {
            Patient patient = patientRepository.findById(patientId)
                    .orElseThrow(() -> new NotFoundException(
                            "Không tìm thấy bệnh nhân với ID: " + patientId));
            if (patient.getUser() == null) {
                throw new ConflictException("Bệnh nhân không có thông tin người dùng hợp lệ.");
            }
            return patientRepository.findByUserIdWithUserAndRole(patient.getUser().getId())
                    .orElse(patient);
        }

        throw new ConflictException("Thiếu thông tin định danh bệnh nhân.");
    }

    private Doctor resolveDoctor(Long doctorUserId, Long doctorId) {
        if (doctorUserId != null) {
            return doctorRepository.findByUserId(doctorUserId)
                    .orElseThrow(() -> new NotFoundException(
                            "Không tìm thấy bác sĩ với user ID: " + doctorUserId));
        }

        if (doctorId != null) {
            Doctor doctor = doctorRepository.findByDoctorId(doctorId)
                    .orElseThrow(() -> new NotFoundException(
                            "Không tìm thấy bác sĩ với ID: " + doctorId));
            if (doctor.getUser() == null) {
                throw new ConflictException("Bác sĩ không có thông tin người dùng hợp lệ.");
            }
            return doctor;
        }

        throw new ConflictException("Thiếu thông tin định danh bác sĩ.");
    }

    private Long resolvePatientUserId(Long patientUserId, Long patientId) {
        return resolvePatient(patientUserId, patientId).getUser().getId();
    }

    private Long resolveDoctorUserId(Long doctorUserId, Long doctorId) {
        return resolveDoctor(doctorUserId, doctorId).getUser().getId();
    }

    private void validateParticipantRoles(User patientUser, User doctorUser) {
        if (patientUser == null || patientUser.getRole() == null
                || !"PATIENT".equalsIgnoreCase(patientUser.getRole().getName())) {
            throw new ConflictException("Người dùng " + (patientUser != null ? patientUser.getId() : null)
                    + " không có vai trò 'PATIENT'.");
        }

        if (doctorUser == null || doctorUser.getRole() == null
                || !"DOCTOR".equalsIgnoreCase(doctorUser.getRole().getName())) {
            throw new ConflictException("Người dùng " + (doctorUser != null ? doctorUser.getId() : null)
                    + " không có vai trò 'DOCTOR'.");
        }
    }
}
