/**
 * Configuration file for the application
 * Centralized configuration for API endpoints, URLs, and other settings
 */

const config = {
  // Backend API Configuration
  API: {
    // Base URL for backend API
    //'http://localhost:8080' or 'https://m3qdgtht-8080.asse.devtunnels.ms'
    BASE_URL: 'http://localhost:8080',
    
    // API endpoints
    ENDPOINTS: {
      // Auth endpoints
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      GOOGLE_AUTH: '/api/auth/google',
      VERIFY_OTP: '/api/auth/verify-otp',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      
      // User endpoints
      USERS: '/api/users',
      USER_PROFILE: '/api/users/me',
      USER_ROLE: '/api/users/role',
      
      // Article endpoints
      ARTICLES: '/api/articles',
      ARTICLES_SEARCH: '/api/articles/search',
      ARTICLES_TEST_SEARCH: '/api/articles/test-search',
      
      // Appointment endpoints
      APPOINTMENTS: '/api/appointments',
      
      // Department endpoints
      DEPARTMENTS: '/api/departments',
      
      // Medicine endpoints
      MEDICINES: '/api/medicines',
      
      // Prescription endpoints
      PRESCRIPTIONS: '/api/prescriptions',
      
      // Payment endpoints
      PAYMENTS: '/api/payments',
      
      // Review endpoints
      REVIEWS: '/api/reviews',
      
      // File upload endpoints
      UPLOAD: '/api/upload',
      
      // WebSocket endpoint
      WEBSOCKET: '/ws'
    }
  },
  
  // Frontend Configuration
  FRONTEND: {
    // Default page sizes
    DEFAULT_PAGE_SIZE: 12,
    HOME_ARTICLES_SIZE: 8,
    
    // Timeout settings
    REQUEST_TIMEOUT: 30000,
    
    // Pagination settings
    PAGINATION: {
      DEFAULT_SIZE: 12,
      MAX_SIZE: 50
    }
  },
  
  // Helper functions
  helpers: {
    /**
     * Get full API URL for an endpoint
     * @param {string} endpoint - The endpoint path
     * @returns {string} - Full URL
     */
    getApiUrl: (endpoint) => {
      return `${config.API.BASE_URL}${endpoint}`;
    },
    
    /**
     * Get full WebSocket URL
     * @returns {string} - Full WebSocket URL
     */
    getWebSocketUrl: () => {
      return `${config.API.BASE_URL}${config.API.ENDPOINTS.WEBSOCKET}`;
    },
    
    /**
     * Get full image URL for uploaded files
     * @param {string} imagePath - The image path
     * @returns {string} - Full image URL
     */
    getImageUrl: (imagePath) => {
      if (!imagePath) return null;
      if (imagePath.startsWith('http')) return imagePath;
      return `${config.API.BASE_URL}${imagePath}`;
    },
    
    /**
     * Get full avatar URL
     * @param {string} avatarPath - The avatar path
     * @returns {string} - Full avatar URL
     */
    getAvatarUrl: (avatarPath) => {
      if (!avatarPath) return null;
      if (avatarPath.startsWith('http')) return avatarPath;
      if (avatarPath.startsWith('/')) {
        return `${config.API.BASE_URL}${avatarPath}`;
      }
      return `${config.API.BASE_URL}/${avatarPath}`;
    }
  }
};

export default config;
