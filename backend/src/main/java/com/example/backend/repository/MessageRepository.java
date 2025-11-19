package com.example.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.backend.model.Message;

public interface MessageRepository extends JpaRepository<Message, Long> {
    
    @Query("SELECT m FROM Message m WHERE m.conversation.conversationId = :conversationId ORDER BY m.sentAt ASC")
    List<Message> findByConversationIdOrderBySentAtAsc(@Param("conversationId") Long conversationId);
    
    @Query("SELECT m FROM Message m WHERE m.conversation.conversationId = :conversationId ORDER BY m.sentAt DESC")
    List<Message> findByConversationIdOrderBySentAtDesc(@Param("conversationId") Long conversationId);
    
    @Query("SELECT m FROM Message m WHERE m.conversation.conversationId = :conversationId ORDER BY m.sentAt ASC")
    Page<Message> findByConversationIdOrderBySentAtAsc(@Param("conversationId") Long conversationId, Pageable pageable);
    
    @Query("SELECT m FROM Message m WHERE m.sender.id = :senderId ORDER BY m.sentAt DESC")
    List<Message> findBySenderIdOrderBySentAtDesc(@Param("senderId") Long senderId);
    
    @Query("SELECT m FROM Message m WHERE m.conversation.conversationId = :conversationId AND m.sentAt > :since ORDER BY m.sentAt ASC")
    List<Message> findByConversationIdAndSentAtAfter(@Param("conversationId") Long conversationId, @Param("since") LocalDateTime since);
    
    @Query("SELECT m FROM Message m WHERE m.conversation.conversationId = :conversationId AND m.content LIKE %:keyword% ORDER BY m.sentAt DESC")
    List<Message> findByConversationIdAndContentContaining(@Param("conversationId") Long conversationId, @Param("keyword") String keyword);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.conversationId = :conversationId AND m.isRead = false AND m.sender.id != :userId")
    Long countUnreadMessagesByConversationAndUser(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
    
    @Query("SELECT m FROM Message m WHERE m.conversation.conversationId = :conversationId AND m.isRead = false AND m.sender.id != :userId")
    List<Message> findUnreadMessagesByConversationAndUser(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
    
    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE m.conversation.conversationId = :conversationId AND m.sender.id != :userId")
    int markMessagesAsReadByConversationAndUser(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
    
    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE m.messageId = :messageId")
    int markMessageAsRead(@Param("messageId") Long messageId);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.conversationId = :conversationId")
    Long countByConversationId(@Param("conversationId") Long conversationId);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender.id = :senderId")
    Long countBySenderId(@Param("senderId") Long senderId);
    
    @Query("SELECT m FROM Message m WHERE m.conversation.conversationId = :conversationId ORDER BY m.sentAt DESC")
    List<Message> findLatestMessageByConversationId(@Param("conversationId") Long conversationId);
    
    @Query("SELECT m FROM Message m WHERE m.conversation.conversationId = :conversationId AND m.sentAt BETWEEN :start AND :end ORDER BY m.sentAt ASC")
    List<Message> findByConversationIdAndSentAtBetween(@Param("conversationId") Long conversationId, 
                                                      @Param("start") LocalDateTime start, 
                                                      @Param("end") LocalDateTime end);
    
    @Query("SELECT m FROM Message m WHERE m.attachmentURL IS NOT NULL AND m.conversation.conversationId = :conversationId ORDER BY m.sentAt DESC")
    List<Message> findMessagesWithAttachmentsByConversationId(@Param("conversationId") Long conversationId);
}
