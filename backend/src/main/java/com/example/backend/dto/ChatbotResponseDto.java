package com.example.backend.dto;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Structured response returned by the chatbot endpoint so the frontend
 * can render both textual advice and related doctors/departments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotResponseDto {

    private String response;
    private boolean needsMoreInfo;
    private String followUpQuestion;
    private DepartmentInfo department;

    @Builder.Default
    private List<DoctorInfo> doctors = new ArrayList<>();

    @Builder.Default
    private List<String> symptomKeywords = new ArrayList<>();

    @Builder.Default
    private Map<String, Object> schemaPayload = Collections.emptyMap();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentInfo {
        private Long id;
        private String name;
        private String description;
        private String reason;
        private String suspectedCondition;
        private String aiProvidedName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DoctorInfo {
        private Long id;
        private String fullName;
        private String specialty;
        private String avatarUrl;
        private Long departmentId;
        private String departmentName;
    }
}
