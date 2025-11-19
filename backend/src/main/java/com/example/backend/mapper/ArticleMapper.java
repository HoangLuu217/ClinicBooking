package com.example.backend.mapper;

import java.time.LocalDateTime;

import org.springframework.stereotype.Component;

import com.example.backend.dto.ArticleDTO;
import com.example.backend.dto.UserDTO;
import com.example.backend.model.Article;
import com.example.backend.model.User;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ArticleMapper {

    private final UserMapper userMapper;

    public Article createDTOToEntity(ArticleDTO.Create createDTO, User author) {
        Article article = new Article();
        article.setTitle(createDTO.getTitle());
        article.setContent(createDTO.getContent());
        article.setImageUrl(createDTO.getImageUrl());
        article.setAuthor(author);
        article.setCreatedAt(LocalDateTime.now());
        article.setStatus("ACTIVE");
        return article;
    }

    public ArticleDTO.ResponseDTO entityToResponseDTO(Article article) {
        ArticleDTO.ResponseDTO dto = new ArticleDTO.ResponseDTO();
        dto.setArticleId(article.getArticleId());
        dto.setTitle(article.getTitle());
        dto.setContent(article.getContent());
        dto.setImageUrl(article.getImageUrl());
        dto.setCreatedAt(article.getCreatedAt());
        dto.setStatus(article.getStatus());
        dto.setLikeCount(article.getLikeCount());

        if (article.getAuthor() != null) {
            UserDTO.Response authorDTO = userMapper.entityToResponseDTO(article.getAuthor());
            dto.setAuthor(authorDTO);
        }

        return dto;
    }
}


