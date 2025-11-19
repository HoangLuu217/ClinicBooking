package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long messageId;

    @ManyToOne
    @JoinColumn(name = "ConversationID", nullable = false)
    private Conversation conversation;

    @ManyToOne
    @JoinColumn(name = "SenderID", nullable = false)
    private User sender;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String content;

    private String attachmentURL;
    private LocalDateTime sentAt;
    private Boolean isRead = false;
}