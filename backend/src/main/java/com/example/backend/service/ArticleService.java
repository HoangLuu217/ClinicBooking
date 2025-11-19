package com.example.backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.ArticleDTO;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.ArticleMapper;
import com.example.backend.model.Article;
import com.example.backend.model.User;
import com.example.backend.repository.ArticleRepository;
import com.example.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final ArticleMapper articleMapper;

    @Transactional(readOnly = true)
    public Page<ArticleDTO.ResponseDTO> getAllArticles(Pageable pageable) {
        return articleRepository.findAll(pageable)
                .map(articleMapper::entityToResponseDTO);
    }

    @Transactional(readOnly = true)
    public ArticleDTO.ResponseDTO getArticleById(Long id) {
        Article article = findArticleById(id);
        return articleMapper.entityToResponseDTO(article);
    }

    @Transactional(readOnly = true)
    public Page<ArticleDTO.ResponseDTO> searchArticles(String title, String status, Long authorId, Pageable pageable) {
        System.out.println("=== SEARCH DEBUG ===");
        System.out.println("Search parameters - title: '" + title + "', status: '" + status + "', authorId: " + authorId);
        System.out.println("Pageable: page=" + pageable.getPageNumber() + ", size=" + pageable.getPageSize());
        
        // Test với method đơn giản trước
        if (title != null && !title.trim().isEmpty() && status != null && !status.trim().isEmpty()) {
            System.out.println("Testing with findByTitleContaining...");
            Page<Article> testResult = articleRepository.findByTitleContaining(title.trim(), pageable);
            System.out.println("Test result count: " + testResult.getTotalElements());
        }
        
        Page<ArticleDTO.ResponseDTO> result = articleRepository.findArticlesWithFilters(title, status, authorId, pageable)
                .map(articleMapper::entityToResponseDTO);
        
        System.out.println("Final result count: " + result.getTotalElements());
        System.out.println("=== END SEARCH DEBUG ===");
        
        return result;
    }

    public ArticleDTO.ResponseDTO createArticle(ArticleDTO.Create createDTO) {
        User author = userRepository.findById(createDTO.getAuthorId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng với ID: " + createDTO.getAuthorId()));

        Article article = articleMapper.createDTOToEntity(createDTO, author);
        Article saved = articleRepository.save(article);
        return articleMapper.entityToResponseDTO(saved);
    }

    public ArticleDTO.ResponseDTO updateArticle(Long id, ArticleDTO.Update updateDTO) {
        Article article = findArticleById(id);

        if (updateDTO.getTitle() != null) {
            article.setTitle(updateDTO.getTitle());
        }
        if (updateDTO.getContent() != null) {
            article.setContent(updateDTO.getContent());
        }
        if (updateDTO.getImageUrl() != null) {
            article.setImageUrl(updateDTO.getImageUrl());
        }
        if (updateDTO.getStatus() != null) {
            article.setStatus(updateDTO.getStatus());
        }

        Article updated = articleRepository.save(article);
        return articleMapper.entityToResponseDTO(updated);
    }

    public void deleteArticle(Long id) {
        Article article = findArticleById(id);
        article.setStatus("INACTIVE");
        articleRepository.save(article);
    }

    public ArticleDTO.ResponseDTO restoreArticle(Long id) {
        Article article = findArticleById(id);
        article.setStatus("ACTIVE");
        Article restored = articleRepository.save(article);
        return articleMapper.entityToResponseDTO(restored);
    }

    public void hardDeleteArticle(Long id) {
        if (!articleRepository.existsById(id)) {
            throw new NotFoundException("Không tìm thấy bài viết với ID: " + id);
        }
        articleRepository.deleteById(id);
    }

    public ArticleDTO.ResponseDTO likeArticle(Long id) {
        Article article = findArticleById(id);
        article.setLikeCount(article.getLikeCount() + 1);
        Article updated = articleRepository.save(article);
        return articleMapper.entityToResponseDTO(updated);
    }

    public ArticleDTO.ResponseDTO unlikeArticle(Long id) {
        Article article = findArticleById(id);
        if (article.getLikeCount() > 0) {
            article.setLikeCount(article.getLikeCount() - 1);
        }
        Article updated = articleRepository.save(article);
        return articleMapper.entityToResponseDTO(updated);
    }

    private Article findArticleById(Long id) {
        return articleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy bài viết với ID: " + id));
    }
}


