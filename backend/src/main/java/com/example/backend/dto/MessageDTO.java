package com.example.backend.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class MessageDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotNull(message = "ConversationID không được để trống")
        private Long conversationId;

        @NotNull(message = "SenderID không được để trống")
        private Long senderId;

        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        @Size(max = 2000, message = "Nội dung tin nhắn không được quá 2000 ký tự")
        private String content;

        @Size(max = 500, message = "URL đính kèm không được quá 500 ký tự")
        private String attachmentURL;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        @Size(max = 2000, message = "Nội dung tin nhắn không được quá 2000 ký tự")
        private String content;

        @Size(max = 500, message = "URL đính kèm không được quá 500 ký tự")
        private String attachmentURL;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long messageId;
        private Long conversationId;
        private Long senderId;
        private String senderName;
        private String senderEmail;
        private String senderAvatarUrl;
        private String senderRole;
        private String content;
        private String attachmentURL;
        private LocalDateTime sentAt;
        private String messageType; // TEXT, IMAGE, FILE, etc.
        private Boolean isRead;
    }
}
