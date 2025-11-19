package com.example.backend.service;

import com.example.backend.dto.ChatbotResponseDto;
import com.example.backend.dto.GeminiRequest;
import com.example.backend.model.Department;
import com.example.backend.model.Doctor;
import com.example.backend.repository.DepartmentRepository;
import com.example.backend.repository.DoctorRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for integrating with Google Gemini API
 * Handles chatbot interactions for the Clinic Booking system
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    
    @Value("${gemini.api.key:}")
    private String apiKey;
    
    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String apiUrl;
    
    @Value("${gemini.model:gemini-2.0-flash}")
    private String model;
    
    private static final Double DEFAULT_TEMPERATURE = 0.7;
    private static final Integer DEFAULT_MAX_TOKENS = 1024;
    private static final String DEFAULT_SAFETY_NOTICE = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y khoa trực tiếp.";
    private static final List<String> ALLOWED_LIKELIHOODS = Arrays.asList("common", "possible", "rare", "rule_out");
    
    /**
     * Send a chat message to Google Gemini and get a structured response
     *
     * @param userMessage The user's message
     * @return Structured response containing advice, department and doctors
     */
    public ChatbotResponseDto getChatResponse(String userMessage) {
        log.info("Sending message to Gemini (model={}): {}", model, userMessage);

        if (apiKey == null || apiKey.isEmpty()) {
            log.error("Gemini API key is not configured");
            throw new IllegalStateException("Gemini API key is not configured. Please set GEMINI_API_KEY in application.yml");
        }

        List<Department> departments = loadDepartmentsForPrompt();

        try {
            ObjectNode payload = buildChatPayload(userMessage, departments);
            String rawApiResponse = callGeminiApi(payload);
            String aiResponse = extractPrimaryText(rawApiResponse);

            if (aiResponse != null && !aiResponse.isBlank()) {
                log.info("Received response from Gemini");
                return buildStructuredResponse(aiResponse, userMessage, departments);
            }

            log.warn("Empty response from Gemini API");
            return buildFallbackDto(userMessage);

        } catch (HttpClientErrorException e) {
            handleClientError(e);
            return buildFallbackDto(userMessage);
        } catch (HttpServerErrorException e) {
            log.error("HTTP Server Error calling Gemini API ({}): {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            return buildFallbackDto(userMessage);
        } catch (RestClientException e) {
            log.error("Network error calling Gemini API: {}", e.getMessage(), e);
            return buildFallbackDto(userMessage);
        } catch (Exception e) {
            log.error("Unexpected error calling Gemini API: {}", e.getMessage(), e);
            return buildFallbackDto(userMessage);
        }
    }
    
    /**
     * Send a chat message with conversation history
     * 
     * @param contents List of previous messages in the conversation
     * @return The AI's response
     */
        public String getChatResponseWithHistory(List<GeminiRequest.Content> contents) {
        log.info("Sending conversation with {} messages to Gemini", contents.size());

        String userMessage = extractLastUserMessage(contents);

        if (apiKey == null || apiKey.isEmpty()) {
            log.error("Gemini API key is not configured");
            throw new IllegalStateException("Gemini API key is not configured. Please set GEMINI_API_KEY in application.yml");
        }

        List<Department> departments = loadDepartmentsForPrompt();

        try {
            ObjectNode payload = buildHistoryPayload(contents, departments);
            String rawApiResponse = callGeminiApi(payload);
            String aiResponse = extractPrimaryText(rawApiResponse);

            if (aiResponse != null && !aiResponse.isBlank()) {
                log.info("Received response from Gemini");
                return aiResponse;
            }

            log.warn("Empty response from Gemini API");
            return generateFallbackResponse(userMessage);

        } catch (HttpClientErrorException e) {
            handleClientError(e);
            return generateFallbackResponse(userMessage);
        } catch (HttpServerErrorException e) {
            log.error("HTTP Server Error calling Gemini API ({}): {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            return generateFallbackResponse(userMessage);
        } catch (RestClientException e) {
            log.error("Network error calling Gemini API: {}", e.getMessage(), e);
            return generateFallbackResponse(userMessage);
        } catch (Exception e) {
            log.error("Unexpected error calling Gemini API: {}", e.getMessage(), e);
            return generateFallbackResponse(userMessage);
        }
    }

    private List<Department> loadDepartmentsForPrompt() {
        try {
            return departmentRepository.findAll();
        } catch (Exception e) {
            log.warn("Failed to load departments for chatbot context: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private ObjectNode buildChatPayload(String userMessage, List<Department> departments) {
        String departmentsInfo = buildDepartmentsInfo(departments);
        if (departmentsInfo.isBlank()) {
            departmentsInfo = "Danh sach khoa tam thoi khong kha dung.";
        }
        String systemPrompt = buildSystemPrompt(departmentsInfo);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("system_instruction", buildSystemInstructionNode(systemPrompt));
        payload.set("contents", buildSingleTurnContent(userMessage));
        payload.set("generationConfig", buildGenerationConfig());
        return payload;
    }

    private ObjectNode buildHistoryPayload(List<GeminiRequest.Content> history, List<Department> departments) {
        String departmentsInfo = buildDepartmentsInfo(departments);
        if (departmentsInfo.isBlank()) {
            departmentsInfo = "Danh sach khoa tam thoi khong kha dung.";
        }
        String systemPrompt = buildSystemPrompt(departmentsInfo);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("system_instruction", buildSystemInstructionNode(systemPrompt));
        payload.set("contents", convertHistoryToContents(history));
        payload.set("generationConfig", buildGenerationConfig());
        return payload;
    }

    private ArrayNode buildSingleTurnContent(String userMessage) {
        ArrayNode contents = objectMapper.createArrayNode();
        ObjectNode user = objectMapper.createObjectNode();
        user.put("role", "user");
        user.set("parts", buildTextParts(userMessage));
        contents.add(user);
        return contents;
    }

    private ArrayNode convertHistoryToContents(List<GeminiRequest.Content> history) {
        ArrayNode contentsNode = objectMapper.createArrayNode();
        if (history == null || history.isEmpty()) {
            return contentsNode;
        }

        for (GeminiRequest.Content content : history) {
            if (content == null || content.getParts() == null) {
                continue;
            }
            ObjectNode contentNode = objectMapper.createObjectNode();
            contentNode.put("role", content.getRole() == null ? "user" : content.getRole());

            ArrayNode partsNode = objectMapper.createArrayNode();
            for (GeminiRequest.Part part : content.getParts()) {
                if (part != null && part.getText() != null) {
                    ObjectNode textNode = objectMapper.createObjectNode();
                    textNode.put("text", part.getText());
                    partsNode.add(textNode);
                }
            }

            if (partsNode.size() > 0) {
                contentNode.set("parts", partsNode);
                contentsNode.add(contentNode);
            }
        }
        return contentsNode;
    }

    private ObjectNode buildSystemInstructionNode(String prompt) {
        ObjectNode instruction = objectMapper.createObjectNode();
        instruction.set("parts", buildTextParts(prompt));
        return instruction;
    }

    private ArrayNode buildTextParts(String text) {
        ArrayNode parts = objectMapper.createArrayNode();
        ObjectNode node = objectMapper.createObjectNode();
        node.put("text", text);
        parts.add(node);
        return parts;
    }

    private ObjectNode buildGenerationConfig() {
        ObjectNode genConfig = objectMapper.createObjectNode();
        genConfig.put("temperature", DEFAULT_TEMPERATURE);
        genConfig.put("maxOutputTokens", DEFAULT_MAX_TOKENS);
        return genConfig;
    }

    private String callGeminiApi(ObjectNode payload) throws JsonProcessingException {
        String url = String.format("%s/%s:generateContent?key=%s", apiUrl, model, apiKey);
        String requestJson = objectMapper.writeValueAsString(payload);
        log.debug("=== Gemini API Payload === {}", requestJson);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

        ResponseEntity<String> response = restTemplate.exchange(
            url,
            HttpMethod.POST,
            entity,
            String.class
        );

        return response.getBody();
    }

    private String extractPrimaryText(String responseJson) {
        if (responseJson == null || responseJson.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray()) {
                for (JsonNode candidate : candidates) {
                    JsonNode content = candidate.path("content");
                    JsonNode parts = content.path("parts");
                    if (parts.isArray()) {
                        for (JsonNode part : parts) {
                            JsonNode textNode = part.path("text");
                            if (!textNode.isMissingNode()) {
                                return textNode.asText();
                            }
                        }
                    }
                }
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse Gemini response JSON: {}", e.getMessage());
        }
        return null;
    }

    private void handleClientError(HttpClientErrorException e) {
        String errorBody = e.getResponseBodyAsString();
        log.error("HTTP Client Error calling Gemini API ({}): {}", e.getStatusCode(), errorBody);

        if (errorBody == null) {
            return;
        }

        String errorLower = errorBody.toLowerCase();
        if (errorLower.contains("api_key_invalid") || errorLower.contains("api key not valid")
            || errorLower.contains("invalid api key") || errorLower.contains("invalid_key")) {
            log.error("API Key validation failed - check application.yml configuration");
        } else if (errorLower.contains("invalid") || errorLower.contains("bad request")) {
            log.error("Invalid request format - check request JSON structure");
        } else if (errorLower.contains("permission_denied")) {
            log.error("Gemini permission denied - ensure model access is enabled");
        } else if (errorLower.contains("quota") || errorLower.contains("exceeded")) {
            log.error("Gemini quota exceeded - please review usage limits");
        }
    }

    private String extractLastUserMessage(List<GeminiRequest.Content> contents) {
        String userMessage = "";
        try {
            if (contents != null && !contents.isEmpty()) {
                for (int i = contents.size() - 1; i >= 0; i--) {
                    GeminiRequest.Content content = contents.get(i);
                    if (content != null && "user".equals(content.getRole()) &&
                        content.getParts() != null && !content.getParts().isEmpty()) {
                        GeminiRequest.Part part = content.getParts().get(0);
                        if (part != null && part.getText() != null) {
                            userMessage = part.getText();
                            break;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract user message from conversation history: {}", e.getMessage());
        }
        return userMessage;
    }

    /**
     * Build department information string for the AI prompt
     */
    private String buildDepartmentsInfo(List<Department> departments) {
        StringBuilder info = new StringBuilder();
        info.append("Danh sach khoa dang hoat dong, luu y su dung dung ten tu danh sach nay:\n");

        if (departments == null || departments.isEmpty()) {
            info.append("- Thong tin khoa tam thoi khong kha dung.\n");
            return info.toString();
        }

        for (Department dept : departments) {
            if (dept != null && dept.getStatus() == Department.DepartmentStatus.ACTIVE) {
                info.append("- [ID: ").append(dept.getId()).append("] ").append(dept.getDepartmentName());
                if (dept.getDescription() != null && !dept.getDescription().isEmpty()) {
                    String desc = dept.getDescription();
                    if (desc.length() > 60) {
                        desc = desc.substring(0, 57) + "...";
                    }
                    info.append(": ").append(desc);
                }
                info.append("\n");
            }
        }

        return info.toString();
    }
    
    /**
     * Build comprehensive system prompt with all chatbot capabilities
     */
    private String buildSystemPrompt(String departmentsInfo) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("Bạn là AI y khoa hỗ trợ ứng dụng Clinic Booking. Luôn tư vấn bằng tiếng Việt, giọng thân thiện nhưng rõ ràng, ưu tiên độ an toàn và chỉ cung cấp thông tin tham khảo.\n\n");

        prompt.append("=== VAI TRÒ & GIỚI HẠN ===\n");
        prompt.append("- Không chẩn đoán xác định hoặc kê đơn.\n");
        prompt.append("- Ghi rõ khi thông tin chưa đủ và hỏi thêm dữ liệu.\n");
        prompt.append("- Nhắc người dùng liên hệ cấp cứu nếu có dấu hiệu nguy hiểm.\n\n");

        prompt.append("=== BỐI CẢNH ===\n");
        prompt.append("- Người dùng muốn biết nên đi khoa nào, cần chuẩn bị gì và bước tiếp theo trong hệ thống đặt lịch.\n");
        prompt.append("- Chỉ sử dụng tên khoa trong danh mục sau, không tự tạo tên mới:\n");
        prompt.append(departmentsInfo).append("\n");

        prompt.append("=== HƯỚNG DẪN TRẢ LỜI ===\n");
        prompt.append("1. Thu thập triệu chứng chính, thời gian, yếu tố đi kèm.\n");
        prompt.append("2. Liệt kê nguyên nhân có thể (không khẳng định chẩn đoán) cùng mức độ tin cậy.\n");
        prompt.append("3. Nêu red flags và hướng xử trí an toàn.\n");
        prompt.append("4. Đề xuất khoa phù hợp nhất và các khoa thay thế nếu cần, khớp với danh mục.\n");
        prompt.append("5. Nếu cần thêm thông tin, đưa ra câu hỏi tiếp theo cụ thể.\n\n");

        prompt.append("=== SCHEMA JSON BẮT BUỘC ===\n");
        prompt.append("Luôn trả lời bằng duy nhất một JSON, đầy đủ khóa sau (nếu thiếu dữ liệu dùng [] hoặc \"\").\n");
        prompt.append("{\n");
        prompt.append("  \"input\": \"string\",\n");
        prompt.append("  \"intents\": [\"string\"],\n");
        prompt.append("  \"symptoms\": [\"string\"],\n");
        prompt.append("  \"possible_causes\": [{\"name\":\"string\",\"likelihood\":\"common|possible|rare|rule_out\"}],\n");
        prompt.append("  \"related_conditions\": [\"string\"],\n");
        prompt.append("  \"red_flags\": [\"string\"],\n");
        prompt.append("  \"self_care\": [\"string\"],\n");
        prompt.append("  \"recommended_department\": {\n");
        prompt.append("      \"code\":\"string\",\"name\":\"string\",\"confidence\":0.0,\n");
        prompt.append("      \"alternatives\":[{\"code\":\"string\",\"name\":\"string\"}]\n");
        prompt.append("  },\n");
        prompt.append("  \"doctor_query\": {\"department_code\":\"string\",\"filters\":{\"location\":\"\",\"rating_min\":0}},\n");
        prompt.append("  \"message_to_user_markdown\": \"string\",\n");
        prompt.append("  \"next_questions\": [\"string\"],\n");
        prompt.append("  \"safety_notice\": \"Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y khoa trực tiếp.\"\n");
        prompt.append("}\n");
        prompt.append("- Không in thêm chữ ngoài JSON trên.\n");
        prompt.append("- \"message_to_user_markdown\" tóm tắt nội dung chính bằng markdown tiếng Việt.\n");
        prompt.append("- \"recommended_department.code\" phải bám sát danh mục khoa (có thể để trống nếu chưa rõ, nhưng vẫn cần tên hợp lý).\n");
        prompt.append("- \"doctor_query.department_code\" nên trùng với khoa gợi ý để hệ thống tìm bác sĩ.\n");
        prompt.append("- \"safety_notice\" luôn chứa chính xác câu bắt buộc.\n");

        return prompt.toString();
    }
    
    private ChatbotResponseDto buildStructuredResponse(String rawResponse, String userMessage, List<Department> departments) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return buildFallbackDto(userMessage);
        }

        String cleanedPayload = cleanJsonPayload(rawResponse);
        JsonNode parsedNode;

        try {
            if (looksLikeJson(cleanedPayload)) {
                parsedNode = objectMapper.readTree(cleanedPayload);
            } else {
                ObjectNode wrapper = objectMapper.createObjectNode();
                wrapper.put("message_to_user_markdown", cleanedPayload);
                parsedNode = wrapper;
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse structured Gemini response, using fallback schema. Error: {}", e.getMessage());
            ObjectNode wrapper = objectMapper.createObjectNode();
            wrapper.put("message_to_user_markdown", cleanedPayload);
            parsedNode = wrapper;
        }

        ObjectNode normalizedPayload = normalizeSchemaPayload(parsedNode, userMessage);
        Map<String, Object> schemaPayload = convertNodeToMap(normalizedPayload);

        String messageText = normalizedPayload.path("message_to_user_markdown").asText("");
        List<String> symptomKeywords = extractSymptomKeywords(normalizedPayload, messageText, userMessage);

        boolean needsMoreInfo = normalizedPayload.path("next_questions").isArray()
            && normalizedPayload.path("next_questions").size() > 0;
        String followUp = null;
        if (needsMoreInfo) {
            JsonNode firstQuestion = normalizedPayload.path("next_questions").get(0);
            if (firstQuestion != null && firstQuestion.isTextual()) {
                followUp = firstQuestion.asText();
            }
        }

        JsonNode recommendedNode = normalizedPayload.path("recommended_department");
        String aiDeptName = recommendedNode.path("name").asText(null);
        String suspectedCondition = extractPrimaryPossibleCause(normalizedPayload.path("possible_causes"));
        String reason = buildDepartmentReason(normalizedPayload);

        ChatbotResponseDto.DepartmentInfo departmentInfo = resolveDepartmentInfo(
            aiDeptName,
            reason,
            suspectedCondition,
            departments
        );

        List<ChatbotResponseDto.DoctorInfo> doctorInfos = Collections.emptyList();
        if (!needsMoreInfo && departmentInfo != null && departmentInfo.getId() != null) {
            doctorInfos = fetchDoctorsForDepartment(departmentInfo.getId(), departmentInfo.getName());
        }

        return ChatbotResponseDto.builder()
            .response(normalizedPayload.toString())
            .needsMoreInfo(needsMoreInfo)
            .followUpQuestion(followUp)
            .department(departmentInfo)
            .doctors(doctorInfos)
            .symptomKeywords(symptomKeywords)
            .schemaPayload(schemaPayload)
            .build();
    }

    private Map<String, Object> convertNodeToMap(ObjectNode node) {
        if (node == null) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.convertValue(node, new TypeReference<Map<String, Object>>(){ });
        } catch (IllegalArgumentException ex) {
            log.warn("Failed to convert schema payload to map: {}", ex.getMessage());
            return Collections.emptyMap();
        }
    }

    private ObjectNode normalizeSchemaPayload(JsonNode root, String fallbackInput) {
        if (root == null || root.isMissingNode()) {
            root = objectMapper.createObjectNode();
        }

        ObjectNode normalized = objectMapper.createObjectNode();
        normalized.put("input", safeText(root.path("input"), fallbackInput));
        normalized.set("intents", toTextArrayNode(root.path("intents")));
        normalized.set("symptoms", toTextArrayNode(root.path("symptoms")));
        normalized.set("possible_causes", buildPossibleCausesArray(root.path("possible_causes")));
        normalized.set("related_conditions", toTextArrayNode(root.path("related_conditions")));
        normalized.set("red_flags", toTextArrayNode(root.path("red_flags")));
        normalized.set("self_care", toTextArrayNode(root.path("self_care")));

        ObjectNode recommended = buildRecommendedDepartmentNode(root.path("recommended_department"));
        normalized.set("recommended_department", recommended);
        normalized.set("doctor_query", buildDoctorQueryNode(root.path("doctor_query"), recommended));

        normalized.set("next_questions", toTextArrayNode(root.path("next_questions")));
        String message = safeText(root.path("message_to_user_markdown"), "");
        if (message.isBlank()) {
            message = safeText(root.path("message"), "");
        }
        if (message.isBlank()) {
            message = safeText(root.path("response"), "");
        }
        if (message.isBlank()) {
            message = buildDefaultMessageFromInput(fallbackInput);
        }
        normalized.put("message_to_user_markdown", message);
        normalized.put("safety_notice", DEFAULT_SAFETY_NOTICE);

        return normalized;
    }

    private ArrayNode toTextArrayNode(JsonNode node) {
        ArrayNode array = objectMapper.createArrayNode();
        if (node == null || node.isMissingNode() || node.isNull()) {
            return array;
        }

        if (node.isArray()) {
            node.forEach(item -> {
                if (item != null && item.isTextual()) {
                    String value = item.asText().trim();
                    if (!value.isEmpty()) {
                        array.add(value);
                    }
                }
            });
            return array;
        }

        if (node.isTextual()) {
            String value = node.asText().trim();
            if (!value.isEmpty()) {
                array.add(value);
            }
            return array;
        }

        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                JsonNode value = entry.getValue();
                if (value != null && value.isTextual()) {
                    String text = value.asText().trim();
                    if (!text.isEmpty()) {
                        array.add(text);
                    }
                }
            });
        }
        return array;
    }

    private ArrayNode buildPossibleCausesArray(JsonNode node) {
        ArrayNode causes = objectMapper.createArrayNode();
        if (node == null || node.isNull() || node.isMissingNode()) {
            return causes;
        }

        if (node.isArray()) {
            node.forEach(item -> appendCauseNode(causes, item));
        } else {
            appendCauseNode(causes, node);
        }
        return causes;
    }

    private void appendCauseNode(ArrayNode causes, JsonNode source) {
        if (source == null || source.isNull() || source.isMissingNode()) {
            return;
        }
        String name = safeText(source.path("name"), "");
        if (name.isEmpty() && source.isTextual()) {
            name = source.asText().trim();
        }
        if (name.isEmpty()) {
            return;
        }
        String likelihood = safeText(source.path("likelihood"), "possible").toLowerCase();
        if (!ALLOWED_LIKELIHOODS.contains(likelihood)) {
            likelihood = "possible";
        }
        ObjectNode cause = objectMapper.createObjectNode();
        cause.put("name", name);
        cause.put("likelihood", likelihood);
        causes.add(cause);
    }

    private ObjectNode buildRecommendedDepartmentNode(JsonNode node) {
        ObjectNode recommended = objectMapper.createObjectNode();
        String name = safeText(node.path("name"), "");
        if (name.isEmpty()) {
            name = safeText(node.path("department"), "");
        }
        String code = safeText(node.path("code"), "");
        if (code.isEmpty() && !name.isEmpty()) {
            code = normalizeText(name).replace(" ", "_");
        }
        double confidence = node != null && node.path("confidence").isNumber()
            ? node.path("confidence").asDouble()
            : 0.0;
        recommended.put("code", code);
        recommended.put("name", name);
        recommended.put("confidence", confidence);
        recommended.set("alternatives", buildAlternativesArray(node != null ? node.path("alternatives") : null));
        return recommended;
    }

    private ArrayNode buildAlternativesArray(JsonNode node) {
        ArrayNode alternatives = objectMapper.createArrayNode();
        if (node == null || node.isNull() || node.isMissingNode()) {
            return alternatives;
        }
        if (node.isArray()) {
            node.forEach(item -> addAlternative(alternatives, item));
        } else {
            addAlternative(alternatives, node);
        }
        return alternatives;
    }

    private void addAlternative(ArrayNode alternatives, JsonNode source) {
        if (source == null || source.isNull() || source.isMissingNode()) {
            return;
        }
        String name = safeText(source.path("name"), "");
        if (name.isEmpty() && source.isTextual()) {
            name = source.asText().trim();
        }
        String code = safeText(source.path("code"), "");
        if (code.isEmpty() && !name.isEmpty()) {
            code = normalizeText(name).replace(" ", "_");
        }
        if (name.isEmpty() && code.isEmpty()) {
            return;
        }
        ObjectNode alt = objectMapper.createObjectNode();
        alt.put("name", name);
        alt.put("code", code);
        alternatives.add(alt);
    }

    private ObjectNode buildDoctorQueryNode(JsonNode node, ObjectNode recommended) {
        ObjectNode doctorQuery = objectMapper.createObjectNode();
        String deptCode = safeText(node.path("department_code"), "");
        if (deptCode.isEmpty()) {
            deptCode = recommended.path("code").asText("");
        }
        doctorQuery.put("department_code", deptCode);

        JsonNode filtersNode = node.path("filters");
        ObjectNode filters = objectMapper.createObjectNode();
        filters.put("location", safeText(filtersNode.path("location"), ""));
        double rating = filtersNode != null && filtersNode.path("rating_min").isNumber()
            ? filtersNode.path("rating_min").asDouble()
            : 0.0;
        filters.put("rating_min", rating);
        doctorQuery.set("filters", filters);
        return doctorQuery;
    }

    private String safeText(JsonNode node, String fallback) {
        if (node != null && !node.isMissingNode() && !node.isNull()) {
            if (node.isTextual()) {
                String value = node.asText().trim();
                if (!value.isEmpty()) {
                    return value;
                }
            } else if (node.isNumber()) {
                return node.asText();
            }
        }
        if (fallback == null) {
            return "";
        }
        return fallback.trim();
    }

    private String buildDefaultMessageFromInput(String input) {
        if (input == null || input.isBlank()) {
            return "Mình đang ghi nhận thông tin của bạn. Vui lòng mô tả rõ triệu chứng, thời gian và mức độ để được tư vấn phù hợp.";
        }
        return "Mình đã ghi nhận mô tả: " + input.trim() + ". Dưới đây là gợi ý tổng quát và lưu ý an toàn.";
    }

    private String extractPrimaryPossibleCause(JsonNode causesNode) {
        if (causesNode == null || causesNode.isNull() || causesNode.isMissingNode()) {
            return null;
        }
        if (causesNode.isArray()) {
            for (JsonNode item : causesNode) {
                String name = safeText(item.path("name"), "");
                if (!name.isEmpty()) {
                    String likelihood = safeText(item.path("likelihood"), "");
                    return likelihood.isEmpty() ? name : name + " (" + likelihood + ")";
                }
            }
        } else {
            String name = safeText(causesNode.path("name"), "");
            if (!name.isEmpty()) {
                String likelihood = safeText(causesNode.path("likelihood"), "");
                return likelihood.isEmpty() ? name : name + " (" + likelihood + ")";
            }
        }
        return null;
    }

    private String buildDepartmentReason(JsonNode payload) {
        List<String> symptoms = extractTextItems(payload.path("symptoms"));
        if (!symptoms.isEmpty()) {
            return "Dựa trên triệu chứng: " + String.join(", ", symptoms);
        }
        List<String> related = extractTextItems(payload.path("related_conditions"));
        if (!related.isEmpty()) {
            return "Liên quan tới: " + String.join(", ", related);
        }
        List<String> redFlags = extractTextItems(payload.path("red_flags"));
        if (!redFlags.isEmpty()) {
            return "Cần theo dõi vì dấu hiệu: " + String.join(", ", redFlags);
        }
        return null;
    }

    private List<String> extractSymptomKeywords(JsonNode root, String responseText, String userMessage) {
        List<String> collected = new ArrayList<>();
        collectKeywordsFromNode(root.path("symptomKeywords"), collected);
        collectKeywordsFromNode(root.path("symptoms"), collected);
        collectKeywordsFromNode(root.path("red_flags"), collected);

        if (collected.isEmpty()) {
            collected.addAll(extractKeywordsFromText(responseText));
        }
        if (collected.isEmpty()) {
            collected.addAll(extractKeywordsFromText(userMessage));
        }

        List<String> unique = new ArrayList<>();
        for (String keyword : collected) {
            if (keyword == null) {
                continue;
            }
            String trimmed = keyword.trim();
            if (!trimmed.isEmpty() && !unique.contains(trimmed)) {
                unique.add(trimmed);
            }
        }
        if (unique.size() > 10) {
            return unique.subList(0, 10);
        }
        return unique;
    }

    private void collectKeywordsFromNode(JsonNode node, List<String> output) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }

        if (node.isArray()) {
            node.forEach(item -> {
                if (item != null && item.isTextual()) {
                    String value = item.asText().trim();
                    if (!value.isEmpty()) {
                        output.add(value);
                    }
                }
            });
            return;
        }

        if (node.isTextual()) {
            String text = node.asText();
            if (text.contains(",")) {
                for (String part : text.split(",")) {
                    if (part != null && !part.trim().isEmpty()) {
                        output.add(part.trim());
                    }
                }
            } else if (!text.trim().isEmpty()) {
                output.add(text.trim());
            }
        }
    }

    private List<String> extractKeywordsFromText(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        String normalized = text.replaceAll("[\\r\\n]+", " ").trim();
        if (normalized.isEmpty()) {
            return Collections.emptyList();
        }

        String[] parts = normalized.split("[,.;\\-]+");
        List<String> keywords = new ArrayList<>();
        for (String part : parts) {
            String cleaned = part.trim();
            if (cleaned.length() < 3) {
                continue;
            }
            keywords.add(cleaned);
            if (keywords.size() >= 5) {
                break;
            }
        }
        return keywords;
    }

    private List<String> extractTextItems(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return Collections.emptyList();
        }
        List<String> items = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(element -> {
                if (element != null && element.isTextual() && !element.asText().trim().isEmpty()) {
                    items.add(element.asText().trim());
                }
            });
        } else if (node.isTextual()) {
            String text = node.asText().trim();
            if (!text.isEmpty()) {
                items.add(text);
            }
        } else if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                JsonNode value = entry.getValue();
                if (value != null && value.isTextual() && !value.asText().trim().isEmpty()) {
                    items.add(entry.getKey() + ": " + value.asText().trim());
                }
            });
        }
        return items;
    }

    private boolean looksLikeJson(String payload) {
        String trimmed = payload.trim();
        return trimmed.startsWith("{") || trimmed.startsWith("[");
    }

    private String cleanJsonPayload(String aiResponse) {
        if (aiResponse == null) {
            return "";
        }
        String cleaned = aiResponse.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace("```json", "")
                .replace("```JSON", "")
                .replace("```", "")
                .trim();
        }
        return cleaned;
    }

    private ChatbotResponseDto.DepartmentInfo resolveDepartmentInfo(
        String aiDeptName,
        String reason,
        String suspectedCondition,
        List<Department> departments
    ) {
        if (aiDeptName == null || aiDeptName.isBlank()) {
            return null;
        }

        Department matched = matchDepartmentByName(aiDeptName, departments);
        if (matched == null) {
            return ChatbotResponseDto.DepartmentInfo.builder()
                .name(aiDeptName.trim())
                .aiProvidedName(aiDeptName.trim())
                .reason(reason)
                .suspectedCondition(suspectedCondition)
                .build();
        }

        return ChatbotResponseDto.DepartmentInfo.builder()
            .id(matched.getId())
            .name(matched.getDepartmentName())
            .description(matched.getDescription())
            .reason(reason)
            .suspectedCondition(suspectedCondition)
            .aiProvidedName(aiDeptName.trim())
            .build();
    }

    private Department matchDepartmentByName(String aiDeptName, List<Department> departments) {
        if (aiDeptName == null || departments == null) {
            return null;
        }

        String normalizedTarget = normalizeText(aiDeptName);
        if (normalizedTarget.isBlank()) {
            return null;
        }

        for (Department dept : departments) {
            if (dept != null && dept.getDepartmentName() != null) {
                if (normalizeText(dept.getDepartmentName()).equals(normalizedTarget)) {
                    return dept;
                }
            }
        }

        for (Department dept : departments) {
            if (dept != null && dept.getDepartmentName() != null) {
                String normalizedDept = normalizeText(dept.getDepartmentName());
                if (!normalizedDept.isBlank() &&
                    (normalizedTarget.contains(normalizedDept) || normalizedDept.contains(normalizedTarget))) {
                    return dept;
                }
            }
        }

        return null;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.replaceAll("[^a-zA-Z0-9 ]", "").toLowerCase().trim();
    }

    private List<ChatbotResponseDto.DoctorInfo> fetchDoctorsForDepartment(Long departmentId, String departmentName) {
        if (departmentId == null) {
            return Collections.emptyList();
        }

        try {
            List<Doctor> doctors = doctorRepository.findByDepartmentWithUserAndRole(departmentId);
            if (doctors == null || doctors.isEmpty()) {
                return Collections.emptyList();
            }

            return doctors.stream()
                .map(doctor -> ChatbotResponseDto.DoctorInfo.builder()
                    .id(doctor.getDoctorId())
                    .fullName(buildDoctorFullName(doctor))
                    .specialty(doctor.getSpecialty())
                    .avatarUrl(doctor.getUser() != null ? doctor.getUser().getAvatarUrl() : null)
                    .departmentId(departmentId)
                    .departmentName(departmentName)
                    .build())
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Failed to load doctors for department {}: {}", departmentId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private String buildDoctorFullName(Doctor doctor) {
        if (doctor == null || doctor.getUser() == null) {
            return "B├íc s─⌐";
        }
        String first = doctor.getUser().getFirstName() != null ? doctor.getUser().getFirstName() : "";
        String last = doctor.getUser().getLastName() != null ? doctor.getUser().getLastName() : "";
        String fullName = (first + " " + last).trim();
        return fullName.isEmpty() ? "B├íc s─⌐" : fullName;
    }

    private ChatbotResponseDto buildFallbackDto(String userMessage) {
        ObjectNode fallbackNode = objectMapper.createObjectNode();
        fallbackNode.put("input", userMessage == null ? "" : userMessage);
        fallbackNode.put("message_to_user_markdown", generateFallbackResponse(userMessage));
        fallbackNode.put("safety_notice", DEFAULT_SAFETY_NOTICE);

        ObjectNode normalized = normalizeSchemaPayload(fallbackNode, userMessage);
        Map<String, Object> schemaPayload = convertNodeToMap(normalized);
        List<String> keywords = extractSymptomKeywords(
            normalized,
            normalized.path("message_to_user_markdown").asText(""),
            userMessage
        );

        return ChatbotResponseDto.builder()
            .response(normalized.toString())
            .needsMoreInfo(false)
            .doctors(Collections.emptyList())
            .symptomKeywords(keywords)
            .schemaPayload(schemaPayload)
            .build();
    }

    public String buildMessageWithContext(String userMessage, String context, List<String> keywords) {
        StringBuilder sb = new StringBuilder();
        if (context != null && !context.isBlank()) {
            sb.append("Thong tin ngu canh truoc do cua nguoi dung:\n")
                .append(context.trim())
                .append("\n\n");
        }
        if (keywords != null && !keywords.isEmpty()) {
            sb.append("Cac trieu chung da duoc nhac den truoc do: ")
                .append(String.join(", ", keywords))
                .append(".\n\n");
        }
        sb.append("Cau hoi hien tai: ").append(userMessage);
        return sb.toString();
    }

    /**
     * Generate a fallback response when AI service is unavailable
     * Provides basic department recommendations based on common symptoms
     */
    private String generateFallbackResponse(String userMessage) {
        String messageLower = userMessage.toLowerCase();
        
        // A. Booking guidance & support
        if (messageLower.contains("─æß║╖t lß╗ïch") || messageLower.contains("book") || 
            messageLower.contains("appointment") || messageLower.contains("kh├ím b├íc s─⌐") ||
            messageLower.contains("c├ích ─æß║╖t") || messageLower.contains("l├ám sao ─æß║╖t")) {
            return "─Éß╗â ─æß║╖t lß╗ïch kh├ím:\n" +
                   "ΓÇó ─É─âng nhß║¡p v├áo t├ái khoß║ún cß╗ºa bß║ín\n" +
                   "ΓÇó Chß╗ìn chuy├¬n khoa v├á b├íc s─⌐ ph├╣ hß╗úp\n" +
                   "ΓÇó Chß╗ìn thß╗¥i gian kh├ím c├▓n trß╗æng\n" +
                   "ΓÇó X├íc nhß║¡n th├┤ng tin v├á ho├án tß║Ñt ─æß║╖t lß╗ïch\n\n" +
                   "Bß║ín c├│ thß╗â ─æß║╖t lß╗ïch cho ng╞░ß╗¥i th├ón khi ─æ├ú ─æ─âng nhß║¡p. " +
                   "H├úy kiß╗âm tra c├íc khung giß╗¥ c├▓n trß╗æng tr├¬n hß╗ç thß╗æng cß╗ºa ch├║ng t├┤i.";
        }
        
        // B. Basic clinic information
        if (messageLower.contains("mß╗ƒ cß╗¡a") || messageLower.contains("giß╗¥ l├ám viß╗çc") || 
            messageLower.contains("hoß║ít ─æß╗Öng")) {
            return "Ph├▓ng kh├ím hoß║ít ─æß╗Öng:\n" +
                   "ΓÇó Thß╗⌐ 2 - Thß╗⌐ 6: 7:00 - 20:00\n" +
                   "ΓÇó Thß╗⌐ 7: 7:00 - 20:00\n" +
                   "ΓÇó Chß╗º nhß║¡t: 8:00 - 17:00\n\n" +
                   "Qu├╜ kh├ích vui l├▓ng li├¬n hß╗ç hotline ─æß╗â biß║┐t th├¬m chi tiß║┐t.";
        }
        
        if (messageLower.contains("bß║úo hiß╗âm") || messageLower.contains("bß║úo hiß╗âm y tß║┐")) {
            return "Ph├▓ng kh├ím ch├║ng t├┤i chß║Ñp nhß║¡n bß║úo hiß╗âm y tß║┐. " +
                   "Vui l├▓ng mang theo thß║╗ BHYT khi ─æß║┐n kh├ím ─æß╗â ─æ╞░ß╗úc h╞░ß╗ƒng c├íc chß║┐ ─æß╗Ö theo quy ─æß╗ïnh.";
        }
        
        if (messageLower.contains("─æß╗ïa chß╗ë") || messageLower.contains("ß╗ƒ ─æ├óu") || 
            messageLower.contains("─æ╞░ß╗¥ng n├áo")) {
            return "Th├┤ng tin ─æß╗ïa chß╗ë ph├▓ng kh├ím vui l├▓ng kiß╗âm tra tr├¬n website ch├¡nh thß╗⌐c cß╗ºa ch├║ng t├┤i. " +
                   "Hoß║╖c bß║ín c├│ thß╗â li├¬n hß╗ç hotline ─æß╗â ─æ╞░ß╗úc h╞░ß╗¢ng dß║½n chi tiß║┐t.";
        }
        
        // D. Appointment management
        if (messageLower.contains("kiß╗âm tra lß╗ïch") || messageLower.contains("lß╗ïch hß║╣n") ||
            messageLower.contains("xem lß╗ïch") || messageLower.contains("appointment")) {
            return "─Éß╗â kiß╗âm tra lß╗ïch hß║╣n cß╗ºa bß║ín:\n" +
                   "ΓÇó ─É─âng nhß║¡p v├áo t├ái khoß║ún\n" +
                   "ΓÇó V├áo phß║ºn \"Lß╗ïch hß║╣n cß╗ºa t├┤i\"\n" +
                   "ΓÇó Xem chi tiß║┐t c├íc cuß╗Öc hß║╣n ─æ├ú ─æß║╖t\n\n" +
                   "Tß║íi ─æ├óy bß║ín c├│ thß╗â xem, hß╗ºy hoß║╖c thay ─æß╗òi lß╗ïch hß║╣n.";
        }
        
        if (messageLower.contains("hß╗ºy lß╗ïch") || messageLower.contains("hß╗ºy hß║╣n") ||
            messageLower.contains("cancel")) {
            return "─Éß╗â hß╗ºy lß╗ïch hß║╣n:\n" +
                   "ΓÇó ─É─âng nhß║¡p v├áo t├ái khoß║ún\n" +
                   "ΓÇó V├áo \"Lß╗ïch hß║╣n cß╗ºa t├┤i\"\n" +
                   "ΓÇó Chß╗ìn lß╗ïch hß║╣n muß╗æn hß╗ºy\n" +
                   "ΓÇó Nhß║Ñn n├║t \"Hß╗ºy lß╗ïch\"\n\n" +
                   "Vui l├▓ng hß╗ºy tr╞░ß╗¢c ├¡t nhß║Ñt 2 giß╗¥ ─æß╗â tr├ính ph├¡ hß╗ºy kh├┤ng ho├án lß║íi.";
        }
        
        if (messageLower.contains("─æß╗òi lß╗ïch") || messageLower.contains("thay ─æß╗òi") ||
            messageLower.contains("reschedule") || messageLower.contains("ho├ún")) {
            return "─Éß╗â thay ─æß╗òi lß╗ïch hß║╣n:\n" +
                   "ΓÇó Hß╗ºy lß╗ïch hß║╣n hiß╗çn tß║íi (theo h╞░ß╗¢ng dß║½n ß╗ƒ tr├¬n)\n" +
                   "ΓÇó ─Éß║╖t lß╗ïch hß║╣n mß╗¢i vß╗¢i thß╗¥i gian mong muß╗æn\n\n" +
                   "Vui l├▓ng kiß╗âm tra c├íc khung giß╗¥ c├▓n trß╗æng tr╞░ß╗¢c khi ─æß║╖t lß╗ïch mß╗¢i.";
        }
        
        // Handle single numbers or unclear messages
        if (messageLower.matches("^\\d+$") || messageLower.trim().length() < 3) {
            return "Xin ch├áo! T├┤i c├│ thß╗â gi├║p bß║ín:\n\n" +
                   "≡ƒôà **─Éß║╖t lß╗ïch kh├ím** - H╞░ß╗¢ng dß║½n ─æß║╖t lß╗ïch vß╗¢i b├íc s─⌐\n" +
                   "≡ƒÅÑ **T╞░ vß║Ñn khoa kh├ím** - Gi├║p chß╗ìn khoa ph├╣ hß╗úp vß╗¢i triß╗çu chß╗⌐ng\n" +
                   "ΓÅ░ **Giß╗¥ l├ám viß╗çc** - Th├┤ng tin thß╗¥i gian hoß║ít ─æß╗Öng\n" +
                   "≡ƒÆ│ **Bß║úo hiß╗âm y tß║┐** - Ch├¡nh s├ích BHYT\n" +
                   "≡ƒôì **─Éß╗ïa chß╗ë** - Th├┤ng tin li├¬n hß╗ç\n" +
                   "≡ƒôï **Quß║ún l├╜ lß╗ïch** - Kiß╗âm tra, hß╗ºy, ─æß╗òi lß╗ïch hß║╣n\n\n" +
                   "Vui l├▓ng m├┤ tß║ú r├╡ bß║ín cß║ºn hß╗ù trß╗ú g├¼?";
        }
        
        // C. Medical department recommendations (existing symptom mapping)
        // Map symptoms to departments
        String disclaimer = "\n\nΓÜá∩╕Å Th├┤ng tin chß╗ë mang t├¡nh tham khß║úo, anh/chß╗ï n├¬n gß║╖p b├íc s─⌐ ─æß╗â ─æ╞░ß╗úc chß║⌐n ─æo├ín ch├¡nh x├íc.";
        
        if (messageLower.contains("─æau bß╗Ñng") || messageLower.contains("dß║í d├áy") || 
            messageLower.contains("ti├¬u h├│a") || messageLower.contains("gan") || 
            messageLower.contains("mß║¡t") || messageLower.contains("ruß╗Öt")) {
            return "Vß╗¢i triß╗çu chß╗⌐ng ─æau bß╗Ñng v├á c├íc vß║Ñn ─æß╗ü vß╗ü ti├¬u h├│a, bß║ín n├¬n kh├ím tß║íi **Khoa Ti├¬u h├│a**. " +
                   "Khoa n├áy chuy├¬n ─æiß╗üu trß╗ï c├íc bß╗çnh vß╗ü dß║í d├áy, gan, mß║¡t v├á ruß╗Öt." + disclaimer;
        } else if (messageLower.contains("─æau ─æß║ºu") || messageLower.contains("thß║ºn kinh") || 
                   messageLower.contains("mß║Ñt ngß╗º") || messageLower.contains("─æß╗Öng kinh")) {
            return "Vß╗¢i triß╗çu chß╗⌐ng ─æau ─æß║ºu, bß║ín n├¬n kh├ím tß║íi **Khoa Thß║ºn kinh**. " +
                   "Khoa n├áy chuy├¬n ─æiß╗üu trß╗ï c├íc bß╗çnh vß╗ü thß║ºn kinh trung ╞░╞íng v├á ngoß║íi bi├¬n." + disclaimer;
        } else if (messageLower.contains("tim") || messageLower.contains("mß║ích") || 
                   messageLower.contains("huyß║┐t ├íp") || messageLower.contains("ngß╗▒c")) {
            return "Vß╗¢i c├íc vß║Ñn ─æß╗ü vß╗ü tim mß║ích, bß║ín n├¬n kh├ím tß║íi **Khoa Tim mß║ích**. " +
                   "Khoa n├áy chuy├¬n ─æiß╗üu trß╗ï c├íc bß╗çnh vß╗ü tim v├á mß║ích m├íu." + disclaimer;
        } else if (messageLower.contains("ho") || messageLower.contains("h├┤ hß║Ñp") || 
                   messageLower.contains("phß╗òi") || messageLower.contains("kh├│ thß╗ƒ")) {
            return "Vß╗¢i c├íc vß║Ñn ─æß╗ü vß╗ü h├┤ hß║Ñp, bß║ín n├¬n kh├ím tß║íi **Khoa H├┤ hß║Ñp**. " +
                   "Khoa n├áy chuy├¬n ─æiß╗üu trß╗ï c├íc bß╗çnh l├╜ phß╗òi v├á ─æ╞░ß╗¥ng h├┤ hß║Ñp." + disclaimer;
        } else if (messageLower.contains("mß║»t") || messageLower.contains("nh├¼n")) {
            return "Vß╗¢i c├íc vß║Ñn ─æß╗ü vß╗ü mß║»t, bß║ín n├¬n kh├ím tß║íi **Khoa Mß║»t**. " +
                   "Khoa n├áy kh├ím v├á ─æiß╗üu trß╗ï c├íc bß╗çnh l├╜ vß╗ü mß║»t." + disclaimer;
        } else if (messageLower.contains("da") || messageLower.contains("mß╗Ñn") || 
                   messageLower.contains("ngß╗⌐a") || messageLower.contains("eczema")) {
            return "Vß╗¢i c├íc vß║Ñn ─æß╗ü vß╗ü da, bß║ín n├¬n kh├ím tß║íi **Khoa Da liß╗àu**. " +
                   "Khoa n├áy ─æiß╗üu trß╗ï c├íc bß╗çnh vß╗ü da, t├│c v├á m├│ng." + disclaimer;
        } else if (messageLower.contains("r─âng") || messageLower.contains("miß╗çng")) {
            return "Vß╗¢i c├íc vß║Ñn ─æß╗ü vß╗ü r─âng miß╗çng, bß║ín n├¬n kh├ím tß║íi **Khoa R─âng - H├ám - Mß║╖t**. " +
                   "Khoa n├áy kh├ím v├á ─æiß╗üu trß╗ï c├íc vß║Ñn ─æß╗ü vß╗ü r─âng miß╗çng." + disclaimer;
        } else if (messageLower.contains("tai") || messageLower.contains("m┼⌐i") || 
                   messageLower.contains("hß╗ìng")) {
            return "Vß╗¢i c├íc vß║Ñn ─æß╗ü vß╗ü tai m┼⌐i hß╗ìng, bß║ín n├¬n kh├ím tß║íi **Khoa Tai - M┼⌐i - Hß╗ìng**. " +
                   "Khoa n├áy kh├ím v├á ─æiß╗üu trß╗ï c├íc bß╗çnh ─æ╞░ß╗¥ng h├┤ hß║Ñp tr├¬n." + disclaimer;
        } else if (messageLower.contains("x╞░╞íng") || messageLower.contains("khß╗¢p") || 
                   messageLower.contains("g├úy") || messageLower.contains("trß║¡t")) {
            return "Vß╗¢i c├íc vß║Ñn ─æß╗ü vß╗ü x╞░╞íng khß╗¢p, bß║ín n├¬n kh├ím tß║íi **Khoa Chß║Ñn th╞░╞íng chß╗ënh h├¼nh** hoß║╖c **Khoa C╞í - X╞░╞íng - Khß╗¢p**. " +
                   "C├íc khoa n├áy chuy├¬n ─æiß╗üu trß╗ï g├úy x╞░╞íng, trß║¡t khß╗¢p v├á c├íc bß╗çnh vß╗ü x╞░╞íng khß╗¢p." + disclaimer;
        } else if (messageLower.contains("trß║╗ em") || messageLower.contains("nhi khoa")) {
            return "Vß╗¢i bß╗çnh nh├ón trß║╗ em, bß║ín n├¬n kh├ím tß║íi **Khoa Nhi**. " +
                   "Khoa n├áy chuy├¬n kh├ím v├á ─æiß╗üu trß╗ï cho trß║╗ em." + disclaimer;
        }
        
        // Default fallback message
        return "Cß║úm ╞ín bß║ín ─æ├ú li├¬n hß╗ç. Hiß╗çn tß║íi dß╗ïch vß╗Ñ chatbot AI ─æang gß║╖p sß╗▒ cß╗æ. " +
               "Vui l├▓ng li├¬n hß╗ç trß╗▒c tiß║┐p vß╗¢i ph├▓ng kh├ím qua hotline hoß║╖c website ─æß╗â ─æ╞░ß╗úc t╞░ vß║Ñn vß╗ü c├íc khoa kh├ím bß╗çnh ph├╣ hß╗úp.";
    }
    
    public String getModelName() {
        return model;
    }
}


