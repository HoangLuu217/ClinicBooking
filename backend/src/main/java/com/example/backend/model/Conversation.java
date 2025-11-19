package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

import com.example.backend.model.User;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Conversations")
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long conversationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserIdOfPatient", referencedColumnName = "UserID", nullable = false)
    private User patientUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserIdOfDoctor", referencedColumnName = "UserID", nullable = false)
    private User doctorUser;

    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "conversation")
    private List<Message> messages;
}
