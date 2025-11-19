package com.example.backend.constant;

public final class AppConstants {
    
    private AppConstants() {
        // Utility class
    }
    
    // Pagination
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final String DEFAULT_SORT_FIELD = "createdAt";
    
    // Entity-specific sort fields
    public static final String DOCTOR_SORT_FIELD = "createdAt";
    public static final String PATIENT_SORT_FIELD = "createdAt";
    
    // Error Messages
    public static final String USER_NOT_FOUND_BY_ID = "Không tìm thấy người dùng với ID: %d";
    public static final String USER_NOT_FOUND_BY_EMAIL = "Không tìm thấy người dùng với email: %s";
    public static final String EMAIL_ALREADY_EXISTS = "Email đã được sử dụng: %s";
    public static final String ROLE_NOT_FOUND = "Không tìm thấy vai trò với ID: %d";
    
    // API Endpoints
    public static final String API_V1_USERS = "/api/users";
    public static final String USER_BY_ID = "/{id}";
    public static final String USER_BY_EMAIL = "/email/{email}";
    public static final String SEARCH_USERS = "/search";
    public static final String HARD_DELETE_USER = "/{id}/hard";

    // Articles
    public static final String API_V1_ARTICLES = "/api/articles";
    public static final String ARTICLE_BY_ID = "/{id}";
    public static final String SEARCH_ARTICLES = "/search";
    public static final String HARD_DELETE_ARTICLE = "/{id}/hard";

    // Payments
    public static final String API_V1_PAYMENTS = "/api/payments";
    public static final String PAYMENT_BY_ID = "/{id}";
    public static final String SEARCH_PAYMENTS = "/search";
}