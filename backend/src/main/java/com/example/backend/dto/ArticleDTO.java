package com.example.backend.dto;

import java.time.LocalDateTime;

import com.example.backend.dto.UserDTO.Response;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class ArticleDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 255, message = "Tiêu đề không được quá 255 ký tự")
        private String title;

        @NotBlank(message = "Nội dung không được để trống")
        private String content;

        @Size(max = 1024, message = "URL hình ảnh không được quá 1024 ký tự")
        private String imageUrl;

        @NotNull(message = "Tác giả không được để trống")
        private Long authorId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        @Size(max = 255, message = "Tiêu đề không được quá 255 ký tự")
        private String title;

        private String content;

        @Size(max = 1024, message = "URL hình ảnh không được quá 1024 ký tự")
        private String imageUrl;

        private String status; // ACTIVE/INACTIVE
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResponseDTO {
        private Long articleId;
        private String title;
        private String content;
        private String imageUrl;
        private Response author;
        private LocalDateTime createdAt;
        private String status;
        private Integer likeCount;
    }
}


