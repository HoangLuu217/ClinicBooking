package com.example.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Articles")
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long articleId;

        @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String content;

    private String imageUrl;

    @ManyToOne
    @JoinColumn(name = "AuthorID", nullable = false)
    private User author;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(columnDefinition = "NVARCHAR(20) DEFAULT 'ACTIVE'")
    private String status = "ACTIVE";

    @Column(nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer likeCount = 0;
}