package com.example.backend.mapper;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.example.backend.dto.ConversationDTO;
import com.example.backend.dto.MessageDTO;
import com.example.backend.model.Conversation;
import com.example.backend.model.User;
import com.example.backend.repository.DoctorRepository;
import com.example.backend.repository.PatientRepository;

@Component
public class ConversationMapper {

    @Autowired
    private MessageMapper messageMapper;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    public Conversation createDTOToEntity(ConversationDTO.Create dto, User patientUser, User doctorUser) {
        Conversation entity = new Conversation();
        entity.setPatientUser(patientUser);
        entity.setDoctorUser(doctorUser);
        entity.setCreatedAt(java.time.LocalDateTime.now());
        return entity;
    }

    public ConversationDTO.Response entityToResponseDTO(Conversation entity) {
        ConversationDTO.Response dto = new ConversationDTO.Response();
        dto.setConversationId(entity.getConversationId());

        if (entity.getPatientUser() != null) {
            dto.setPatientUserId(entity.getPatientUser().getId());
            dto.setPatientName(buildFullName(entity.getPatientUser()));
            patientRepository.findByUserIdWithUserAndRole(entity.getPatientUser().getId())
                    .ifPresent(patient -> dto.setPatientId(patient.getPatientId()));
        }

        if (entity.getDoctorUser() != null) {
            dto.setDoctorUserId(entity.getDoctorUser().getId());
            dto.setDoctorName(buildFullName(entity.getDoctorUser()));
            doctorRepository.findByUserId(entity.getDoctorUser().getId())
                    .ifPresent(doctor -> dto.setDoctorId(doctor.getDoctorId()));
        }

        dto.setCreatedAt(entity.getCreatedAt());

        if (entity.getMessages() != null && !entity.getMessages().isEmpty()) {
            dto.setMessages(entity.getMessages().stream()
                .map(messageMapper::entityToResponseDTO)
                .collect(Collectors.toList()));
            dto.setMessageCount((long) entity.getMessages().size());

            entity.getMessages().stream()
                .max((m1, m2) -> m1.getSentAt().compareTo(m2.getSentAt()))
                .ifPresent(lastMessage -> dto.setLastMessageTime(lastMessage.getSentAt()));
        } else {
            dto.setMessageCount(0L);
        }

        return dto;
    }

    public ConversationDTO.Response entityToResponseDTOWithMessages(Conversation entity, List<MessageDTO.Response> messages) {
        ConversationDTO.Response dto = entityToResponseDTO(entity);
        dto.setMessages(messages);
        dto.setMessageCount((long) messages.size());

        if (!messages.isEmpty()) {
            messages.stream()
                .max((m1, m2) -> m1.getSentAt().compareTo(m2.getSentAt()))
                .ifPresent(lastMessage -> dto.setLastMessageTime(lastMessage.getSentAt()));
        }

        return dto;
    }

    private String buildFullName(User user) {
        if (user == null) {
            return null;
        }
        String firstName = user.getFirstName() != null ? user.getFirstName() : "";
        String lastName = user.getLastName() != null ? user.getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isEmpty() ? user.getEmail() : fullName;
    }
}
