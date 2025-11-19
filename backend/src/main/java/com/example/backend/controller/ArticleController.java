package com.example.backend.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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

import com.example.backend.constant.AppConstants;
import com.example.backend.dto.ArticleDTO;
import com.example.backend.service.ArticleService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/articles")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ArticleController {

    private final ArticleService articleService;

    @GetMapping
    public ResponseEntity<Page<ArticleDTO.ResponseDTO>> getAllArticles(
            @PageableDefault(size = AppConstants.DEFAULT_PAGE_SIZE, sort = AppConstants.DEFAULT_SORT_FIELD) Pageable pageable) {
        Page<ArticleDTO.ResponseDTO> articles = articleService.getAllArticles(pageable);
        return ResponseEntity.ok(articles);
    }

    @GetMapping("/test-search")
    public ResponseEntity<Page<ArticleDTO.ResponseDTO>> testSearch(
            @RequestParam String title,
            @PageableDefault(size = AppConstants.DEFAULT_PAGE_SIZE, sort = AppConstants.DEFAULT_SORT_FIELD) Pageable pageable) {
        System.out.println("=== TEST SEARCH ENDPOINT ===");
        System.out.println("Title: '" + title + "'");
        Page<ArticleDTO.ResponseDTO> articles = articleService.searchArticles(title, "ACTIVE", null, pageable);
        System.out.println("Result count: " + articles.getTotalElements());
        System.out.println("=== END TEST SEARCH ===");
        return ResponseEntity.ok(articles);
    }

    @GetMapping("/search")
    public ResponseEntity<Page<ArticleDTO.ResponseDTO>> searchArticles(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long authorId,
            @PageableDefault(size = AppConstants.DEFAULT_PAGE_SIZE, sort = AppConstants.DEFAULT_SORT_FIELD) Pageable pageable) {
        Page<ArticleDTO.ResponseDTO> articles = articleService.searchArticles(title, status, authorId, pageable);
        return ResponseEntity.ok(articles);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArticleDTO.ResponseDTO> getArticleById(@PathVariable Long id) {
        ArticleDTO.ResponseDTO article = articleService.getArticleById(id);
        return ResponseEntity.ok(article);
    }

    @PostMapping
    public ResponseEntity<ArticleDTO.ResponseDTO> createArticle(@Valid @RequestBody ArticleDTO.Create createDTO) {
        ArticleDTO.ResponseDTO created = articleService.createArticle(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ArticleDTO.ResponseDTO> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody ArticleDTO.Update updateDTO) {
        ArticleDTO.ResponseDTO updated = articleService.updateArticle(id, updateDTO);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        articleService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<ArticleDTO.ResponseDTO> restoreArticle(@PathVariable Long id) {
        ArticleDTO.ResponseDTO restored = articleService.restoreArticle(id);
        return ResponseEntity.ok(restored);
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<ArticleDTO.ResponseDTO> likeArticle(@PathVariable Long id) {
        ArticleDTO.ResponseDTO updated = articleService.likeArticle(id);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/unlike")
    public ResponseEntity<ArticleDTO.ResponseDTO> unlikeArticle(@PathVariable Long id) {
        ArticleDTO.ResponseDTO updated = articleService.unlikeArticle(id);
        return ResponseEntity.ok(updated);
    }
}


