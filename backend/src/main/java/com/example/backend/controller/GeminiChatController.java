package com.example.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.ChatbotResponseDto;
import com.example.backend.dto.GeminiRequest;
import com.example.backend.service.GeminiService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST Controller for AI Chatbot functionality using Google Gemini
 * Provides endpoints for interacting with Gemini API for clinic assistance
 */
@RestController
@RequestMapping("/api/gemini-chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class GeminiChatController {
    
    private final GeminiService geminiService;
    
    /**
     * Simple chat endpoint - send a message and get a response
     * 
     * @param request Map containing "message" key with user's message
     * @return AI response
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, Object> request) {
        System.out.println("=== GEMINI CHAT CONTROLLER: Request received ===");
        System.out.println("Request body: " + request);
        log.info("Received Gemini chat request");
        
        try {
            String userMessage = request.get("message") != null ? request.get("message").toString() : null;
            System.out.println("User message: " + userMessage);
            
            if (userMessage == null || userMessage.trim().isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Message cannot be empty");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            String context = request.get("context") != null ? request.get("context").toString() : null;
            @SuppressWarnings("unchecked")
            List<String> keywords = request.get("keywords") instanceof List ? (List<String>) request.get("keywords") : null;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> history = request.get("history") instanceof List ? (List<Map<String, Object>>) request.get("history") : null;

            String contextualSummary = mergeContexts(context, summarizeHistory(history));
            String composedMessage = geminiService.buildMessageWithContext(userMessage, contextualSummary, keywords);

            ChatbotResponseDto aiResponse = geminiService.getChatResponse(composedMessage);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("provider", "gemini");
            response.put("model", geminiService.getModelName());
            response.put("response", aiResponse.getResponse());
            response.put("needsMoreInfo", aiResponse.isNeedsMoreInfo());
            response.put("followUpQuestion", aiResponse.getFollowUpQuestion());
            response.put("department", aiResponse.getDepartment());
            response.put("doctors", aiResponse.getDoctors());
            response.put("symptomKeywords", aiResponse.getSymptomKeywords());
            response.put("schemaPayload", aiResponse.getSchemaPayload());

            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            log.error("Configuration error: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Gemini chatbot service is not configured properly");
            errorResponse.put("details", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorResponse);
            
        } catch (Exception e) {
            log.error("Error processing Gemini chat request: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to process chat request");
            errorResponse.put("details", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    private String summarizeHistory(List<Map<String, Object>> history) {
        if (history == null || history.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder("Lich su hoi thoai gan nhat:\n");
        history.stream()
            .filter(entry -> entry != null && entry.get("content") != null)
            .limit(6)
            .forEach(entry -> {
                String role = entry.getOrDefault("role", "user").toString();
                String content = entry.get("content").toString();
                sb.append("- ").append(role).append(": ").append(content).append("\n");
            });
        return sb.toString().trim();
    }
    
    private String mergeContexts(String... contexts) {
        StringBuilder sb = new StringBuilder();
        for (String ctx : contexts) {
            if (ctx != null && !ctx.isBlank()) {
                if (sb.length() > 0) {
                    sb.append("\n\n");
                }
                sb.append(ctx.trim());
            }
        }
        return sb.toString();
    }
    
    /**
     * Advanced chat endpoint with conversation history
     * Allows for multi-turn conversations with context
     * 
     * @param request Object containing list of contents
     * @return AI response
     */
    @PostMapping("/conversation")
    public ResponseEntity<Map<String, String>> chatWithHistory(@RequestBody Map<String, List<GeminiRequest.Content>> request) {
        log.info("Received Gemini conversation request");
        
        try {
            List<GeminiRequest.Content> contents = request.get("contents");
            
            if (contents == null || contents.isEmpty()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Contents list cannot be empty");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            String aiResponse = geminiService.getChatResponseWithHistory(contents);

            Map<String, String> response = new HashMap<>();
            response.put("message", aiResponse);
            response.put("status", "success");
            response.put("provider", "gemini");

            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            log.error("Configuration error: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Gemini chatbot service is not configured properly");
            errorResponse.put("details", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorResponse);
            
        } catch (Exception e) {
            log.error("Error processing Gemini conversation request: {}", e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to process conversation request");
            errorResponse.put("details", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * Health check endpoint for Gemini chatbot service
     * 
     * @return Service status
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("service", "AI Chatbot");
        response.put("provider", "Google Gemini");
        response.put("model", geminiService.getModelName());
        return ResponseEntity.ok(response);
    }
}
