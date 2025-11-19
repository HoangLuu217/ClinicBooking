package com.example.backend.mapper;

import org.springframework.stereotype.Component;

import com.example.backend.dto.MessageDTO;
import com.example.backend.model.Message;
import com.example.backend.model.User;

@Component
public class MessageMapper {

    public Message createDTOToEntity(MessageDTO.Create dto, User sender) {
        Message entity = new Message();
        entity.setSender(sender);
        entity.setContent(dto.getContent());
        entity.setAttachmentURL(dto.getAttachmentURL());
        entity.setSentAt(java.time.LocalDateTime.now());
        return entity;
    }

    public void applyUpdateToEntity(Message entity, MessageDTO.Update dto) {
        if (dto.getContent() != null) {
            entity.setContent(dto.getContent());
        }
        if (dto.getAttachmentURL() != null) {
            entity.setAttachmentURL(dto.getAttachmentURL());
        }
    }

    public MessageDTO.Response entityToResponseDTO(Message entity) {
        MessageDTO.Response dto = new MessageDTO.Response();
        dto.setMessageId(entity.getMessageId());
        
        if (entity.getConversation() != null) {
            dto.setConversationId(entity.getConversation().getConversationId());
        }
        
        if (entity.getSender() != null) {
            dto.setSenderId(entity.getSender().getId());
            dto.setSenderName(entity.getSender().getFirstName() + " " + entity.getSender().getLastName());
            dto.setSenderEmail(entity.getSender().getEmail());
            dto.setSenderAvatarUrl(entity.getSender().getAvatarUrl());
            if (entity.getSender().getRole() != null) {
                dto.setSenderRole(entity.getSender().getRole().getName());
            }
        }
        
        dto.setContent(entity.getContent());
        dto.setAttachmentURL(entity.getAttachmentURL());
        dto.setSentAt(entity.getSentAt());
        dto.setIsRead(entity.getIsRead());
        
        // Determine message type based on content and attachment
        if (entity.getAttachmentURL() != null && !entity.getAttachmentURL().isEmpty()) {
            String url = entity.getAttachmentURL().toLowerCase();
            if (url.contains(".jpg") || url.contains(".jpeg") || url.contains(".png") || url.contains(".gif")) {
                dto.setMessageType("IMAGE");
            } else if (url.contains(".pdf") || url.contains(".doc") || url.contains(".docx")) {
                dto.setMessageType("FILE");
            } else {
                dto.setMessageType("ATTACHMENT");
            }
        } else {
            dto.setMessageType("TEXT");
        }
        
        return dto;
    }
}
