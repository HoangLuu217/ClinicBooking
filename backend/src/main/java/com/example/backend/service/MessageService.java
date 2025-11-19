package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.MessageDTO;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.MessageMapper;
import com.example.backend.model.Conversation;
import com.example.backend.model.Message;
import com.example.backend.model.User;
import com.example.backend.repository.ConversationRepository;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final MessageMapper messageMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageDTO.Response createMessage(MessageDTO.Create dto) {
        // Validate conversation exists
        Conversation conversation = conversationRepository.findById(dto.getConversationId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cuộc trò chuyện với ID: " + dto.getConversationId()));
        
        // Validate sender exists
        User sender = userRepository.findById(dto.getSenderId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người gửi với ID: " + dto.getSenderId()));

        // Create message
        Message message = messageMapper.createDTOToEntity(dto, sender);
        message.setConversation(conversation);
        Message savedMessage = messageRepository.save(message);
        MessageDTO.Response response = messageMapper.entityToResponseDTO(savedMessage);
        broadcastMessage(response);
        return response;
    }

    @Transactional(readOnly = true)
    public MessageDTO.Response getMessageById(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tin nhắn với ID: " + messageId));
        
        return messageMapper.entityToResponseDTO(message);
    }

    @Transactional(readOnly = true)
    public List<MessageDTO.Response> getMessagesByConversation(Long conversationId) {
        List<Message> messages = messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
        return messages.stream()
                .map(messageMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<MessageDTO.Response> getMessagesByConversationPaginated(Long conversationId, Pageable pageable) {
        Page<Message> messages = messageRepository.findByConversationIdOrderBySentAtAsc(conversationId, pageable);
        return messages.map(messageMapper::entityToResponseDTO);
    }

    @Transactional(readOnly = true)
    public List<MessageDTO.Response> getMessagesBySender(Long senderId) {
        List<Message> messages = messageRepository.findBySenderIdOrderBySentAtDesc(senderId);
        return messages.stream()
                .map(messageMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDTO.Response> getNewMessages(Long conversationId, LocalDateTime since) {
        List<Message> messages = messageRepository.findByConversationIdAndSentAtAfter(conversationId, since);
        return messages.stream()
                .map(messageMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDTO.Response> searchMessagesInConversation(Long conversationId, String keyword) {
        List<Message> messages = messageRepository.findByConversationIdAndContentContaining(conversationId, keyword);
        return messages.stream()
                .map(messageMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDTO.Response> getMessagesInTimeRange(Long conversationId, LocalDateTime start, LocalDateTime end) {
        List<Message> messages = messageRepository.findByConversationIdAndSentAtBetween(conversationId, start, end);
        return messages.stream()
                .map(messageMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDTO.Response> getMessagesWithAttachments(Long conversationId) {
        List<Message> messages = messageRepository.findMessagesWithAttachmentsByConversationId(conversationId);
        return messages.stream()
                .map(messageMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Long getMessageCountByConversation(Long conversationId) {
        return messageRepository.countByConversationId(conversationId);
    }

    @Transactional(readOnly = true)
    public Long getMessageCountBySender(Long senderId) {
        return messageRepository.countBySenderId(senderId);
    }

    @Transactional(readOnly = true)
    public MessageDTO.Response getLatestMessageByConversation(Long conversationId) {
        List<Message> messages = messageRepository.findLatestMessageByConversationId(conversationId);
        if (messages.isEmpty()) {
            throw new NotFoundException("Không tìm thấy tin nhắn nào trong cuộc trò chuyện với ID: " + conversationId);
        }
        return messageMapper.entityToResponseDTO(messages.get(0));
    }

    public MessageDTO.Response updateMessage(Long messageId, MessageDTO.Update dto) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tin nhắn với ID: " + messageId));
        
        messageMapper.applyUpdateToEntity(message, dto);
        Message savedMessage = messageRepository.save(message);
        MessageDTO.Response response = messageMapper.entityToResponseDTO(savedMessage);
        broadcastMessage(response);
        return response;
    }

    public void deleteMessage(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tin nhắn với ID: " + messageId));
        
        messageRepository.delete(message);
    }

    public void deleteMessagesByConversation(Long conversationId) {
        List<Message> messages = messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
        messageRepository.deleteAll(messages);
    }

    @Transactional(readOnly = true)
    public List<MessageDTO.Response> getRecentMessages(Long conversationId, int limit) {
        List<Message> messages = messageRepository.findByConversationIdOrderBySentAtDesc(conversationId);
        return messages.stream()
                .limit(limit)
                .map(messageMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Long getUnreadMessageCount(Long conversationId, Long userId) {
        return messageRepository.countUnreadMessagesByConversationAndUser(conversationId, userId);
    }

    @Transactional(readOnly = true)
    public List<MessageDTO.Response> getUnreadMessages(Long conversationId, Long userId) {
        List<Message> messages = messageRepository.findUnreadMessagesByConversationAndUser(conversationId, userId);
        return messages.stream()
                .map(messageMapper::entityToResponseDTO)
                .toList();
    }

    @Transactional
    public void markMessagesAsRead(Long conversationId, Long userId) {
        messageRepository.markMessagesAsReadByConversationAndUser(conversationId, userId);
    }

    @Transactional
    public void markMessageAsRead(Long messageId) {
        messageRepository.markMessageAsRead(messageId);
    }

    private void broadcastMessage(MessageDTO.Response message) {
        if (message == null || message.getConversationId() == null) {
            return;
        }
        try {
            messagingTemplate.convertAndSend(
                    "/topic/conversations/" + message.getConversationId(),
                    message
            );
        } catch (Exception ex) {
            log.warn("Failed to publish message {} to WebSocket: {}", message.getMessageId(), ex.getMessage());
        }
    }
}
