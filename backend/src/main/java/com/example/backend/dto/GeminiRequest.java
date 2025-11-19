package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for Google Gemini API requests and responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeminiRequest {
    
    private List<Content> contents;
    private GenerationConfig generationConfig;
    private List<SafetySetting> safetySettings;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Content {
        private String role; // "user" or "model"
        private List<Part> parts;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Part {
        private String text;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerationConfig {
        private Double temperature;
        private Integer maxOutputTokens;
        private Double topP;
        private Integer topK;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SafetySetting {
        private String category;
        private String threshold;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeminiResponse {
        private List<Candidate> candidates;
        private PromptFeedback promptFeedback;
        
        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Candidate {
            private Content content;
            private String finishReason;
            private Integer index;
            private List<SafetyRating> safetyRatings;
        }
        
        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class SafetyRating {
            private String category;
            private String probability;
        }
        
        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class PromptFeedback {
            private List<SafetyRating> safetyRatings;
        }
    }
}
