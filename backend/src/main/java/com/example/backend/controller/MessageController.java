package com.example.backend.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.MessageDTO;
import com.example.backend.service.MessageService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<MessageDTO.Response> createMessage(@Valid @RequestBody MessageDTO.Create dto) {
        MessageDTO.Response created = messageService.createMessage(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MessageDTO.Response> getMessageById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(messageService.getMessageById(id));
    }

    @GetMapping("/by-conversation")
    public ResponseEntity<List<MessageDTO.Response>> getMessagesByConversation(@RequestParam("conversationId") Long conversationId) {
        return ResponseEntity.ok(messageService.getMessagesByConversation(conversationId));
    }

    @GetMapping("/by-conversation/paginated")
    public ResponseEntity<Page<MessageDTO.Response>> getMessagesByConversationPaginated(
            @RequestParam("conversationId") Long conversationId,
            Pageable pageable) {
        return ResponseEntity.ok(messageService.getMessagesByConversationPaginated(conversationId, pageable));
    }

    @GetMapping("/by-sender")
    public ResponseEntity<List<MessageDTO.Response>> getMessagesBySender(@RequestParam("senderId") Long senderId) {
        return ResponseEntity.ok(messageService.getMessagesBySender(senderId));
    }

    @GetMapping("/new")
    public ResponseEntity<List<MessageDTO.Response>> getNewMessages(
            @RequestParam("conversationId") Long conversationId,
            @RequestParam("since") String since) {
        LocalDateTime sinceTime = LocalDateTime.parse(since);
        return ResponseEntity.ok(messageService.getNewMessages(conversationId, sinceTime));
    }

    @GetMapping("/search")
    public ResponseEntity<List<MessageDTO.Response>> searchMessagesInConversation(
            @RequestParam("conversationId") Long conversationId,
            @RequestParam("keyword") String keyword) {
        return ResponseEntity.ok(messageService.searchMessagesInConversation(conversationId, keyword));
    }

    @GetMapping("/time-range")
    public ResponseEntity<List<MessageDTO.Response>> getMessagesInTimeRange(
            @RequestParam("conversationId") Long conversationId,
            @RequestParam("start") String start,
            @RequestParam("end") String end) {
        LocalDateTime startTime = LocalDateTime.parse(start);
        LocalDateTime endTime = LocalDateTime.parse(end);
        return ResponseEntity.ok(messageService.getMessagesInTimeRange(conversationId, startTime, endTime));
    }

    @GetMapping("/with-attachments")
    public ResponseEntity<List<MessageDTO.Response>> getMessagesWithAttachments(@RequestParam("conversationId") Long conversationId) {
        return ResponseEntity.ok(messageService.getMessagesWithAttachments(conversationId));
    }

    @GetMapping("/count/by-conversation")
    public ResponseEntity<Long> getMessageCountByConversation(@RequestParam("conversationId") Long conversationId) {
        return ResponseEntity.ok(messageService.getMessageCountByConversation(conversationId));
    }

    @GetMapping("/count/by-sender")
    public ResponseEntity<Long> getMessageCountBySender(@RequestParam("senderId") Long senderId) {
        return ResponseEntity.ok(messageService.getMessageCountBySender(senderId));
    }

    @GetMapping("/latest/by-conversation")
    public ResponseEntity<MessageDTO.Response> getLatestMessageByConversation(@RequestParam("conversationId") Long conversationId) {
        return ResponseEntity.ok(messageService.getLatestMessageByConversation(conversationId));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<MessageDTO.Response>> getRecentMessages(
            @RequestParam("conversationId") Long conversationId,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {
        return ResponseEntity.ok(messageService.getRecentMessages(conversationId, limit));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MessageDTO.Response> updateMessage(@PathVariable("id") Long id,
                                                           @Valid @RequestBody MessageDTO.Update dto) {
        return ResponseEntity.ok(messageService.updateMessage(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable("id") Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/by-conversation")
    public ResponseEntity<Void> deleteMessagesByConversation(@RequestParam("conversationId") Long conversationId) {
        messageService.deleteMessagesByConversation(conversationId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadMessageCount(
            @RequestParam("conversationId") Long conversationId,
            @RequestParam("userId") Long userId) {
        return ResponseEntity.ok(messageService.getUnreadMessageCount(conversationId, userId));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<MessageDTO.Response>> getUnreadMessages(
            @RequestParam("conversationId") Long conversationId,
            @RequestParam("userId") Long userId) {
        return ResponseEntity.ok(messageService.getUnreadMessages(conversationId, userId));
    }

    @PutMapping("/mark-as-read")
    public ResponseEntity<Void> markMessagesAsRead(
            @RequestParam("conversationId") Long conversationId,
            @RequestParam("userId") Long userId) {
        messageService.markMessagesAsRead(conversationId, userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/mark-as-read")
    public ResponseEntity<Void> markMessageAsRead(@PathVariable("id") Long messageId) {
        messageService.markMessageAsRead(messageId);
        return ResponseEntity.ok().build();
    }
}
