package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class ConversationDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        private Long patientUserId;
        private Long patientId;
        private Long doctorUserId;
        private Long doctorId;
    }

    @Data
    @NoArgsConstructor
    public static class Update {
        // No updatable fields for conversations currently
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long conversationId;
        private Long patientUserId;
        private Long patientId;
        private String patientName;
        private Long doctorUserId;
        private Long doctorId;
        private String doctorName;
        private LocalDateTime createdAt;
        private List<MessageDTO.Response> messages;
        private Long messageCount;
        private LocalDateTime lastMessageTime;
    }
}
