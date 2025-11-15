package com.example.backend.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Custom Error Controller để trả về JSON thay vì HTML error page
 */
@RestController
public class ErrorControllerConfig implements ErrorController {

    @RequestMapping(value = "/error", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> handleError(HttpServletRequest request) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        Object exception = request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
        Object message = request.getAttribute(RequestDispatcher.ERROR_MESSAGE);
        Object path = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);

        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        
        if (status != null) {
            int statusCode = Integer.parseInt(status.toString());
            errorResponse.put("status", statusCode);
            errorResponse.put("error", HttpStatus.valueOf(statusCode).getReasonPhrase());
        } else {
            errorResponse.put("status", 500);
            errorResponse.put("error", "Internal Server Error");
        }
        
        if (exception != null) {
            Throwable ex = (Throwable) exception;
            errorResponse.put("message", ex.getMessage() != null ? ex.getMessage() : "Đã xảy ra lỗi");
            errorResponse.put("exception", ex.getClass().getName());
            
            if (ex.getCause() != null) {
                errorResponse.put("cause", ex.getCause().getMessage());
            }
        } else if (message != null) {
            errorResponse.put("message", message.toString());
        } else {
            errorResponse.put("message", "Đã xảy ra lỗi không xác định");
        }
        
        if (path != null) {
            errorResponse.put("path", path.toString());
        }

        int statusCode = status != null ? Integer.parseInt(status.toString()) : 500;
        return ResponseEntity.status(statusCode).body(errorResponse);
    }
}

