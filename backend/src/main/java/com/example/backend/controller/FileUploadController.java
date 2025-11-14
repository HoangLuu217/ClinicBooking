package com.example.backend.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
@Slf4j
public class FileUploadController {

    private static final String[] ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"};
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "articleId", required = false) Long articleId,
            @RequestParam(value = "doctorId", required = false) Long doctorId,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "departmentId", required = false) Long departmentId) {
        
        log.info("=== UPLOAD REQUEST ===");
        log.info("departmentId: {}, articleId: {}, doctorId: {}, userId: {}", 
                 departmentId, articleId, doctorId, userId);
        log.info("File: {} ({} bytes)", 
                 file != null ? file.getOriginalFilename() : "null",
                 file != null ? file.getSize() : 0);
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validation
            if (file == null || file.isEmpty()) {
                response.put("success", false);
                response.put("message", "File không được để trống");
                return ResponseEntity.badRequest().body(response);
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                response.put("success", false);
                response.put("message", "Kích thước file không được vượt quá 10MB");
                return ResponseEntity.badRequest().body(response);
            }

            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !isAllowedExtension(originalFilename)) {
                response.put("success", false);
                response.put("message", "Chỉ được phép upload file ảnh (JPG, JPEG, PNG, GIF, WEBP)");
                return ResponseEntity.badRequest().body(response);
            }

            // Xác định subfolder trong uploads/
            String subfolder = "";
            if (articleId != null) {
                subfolder = "articles";
            } else if (doctorId != null) {
                subfolder = "doctors";
            } else if (userId != null) {
                subfolder = "users";
            } else if (departmentId != null) {
                subfolder = "departments";
                log.info("Uploading department image for ID: {}", departmentId);
            }

            // Tạo tên file unique
            String extension = getFileExtension(originalFilename);
            String uniqueFilename = UUID.randomUUID().toString() + extension;
            
            // Tạo thư mục uploads nếu chưa có
            String uploadDir = "uploads/" + (subfolder.isEmpty() ? "" : subfolder + "/");
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Lưu file
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Tạo URL để trả về
            String fileUrl = "/uploads/" + (subfolder.isEmpty() ? "" : subfolder + "/") + uniqueFilename;

            log.info("File uploaded successfully: {}", fileUrl);

            response.put("success", true);
            response.put("message", "Upload thành công");
            response.put("url", fileUrl);
            response.put("filename", uniqueFilename);
            response.put("originalName", originalFilename);
            response.put("size", file.getSize());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Lỗi khi upload file: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Lỗi khi upload file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private boolean isAllowedExtension(String filename) {
        String extension = getFileExtension(filename).toLowerCase();
        for (String allowedExt : ALLOWED_EXTENSIONS) {
            if (allowedExt.equals(extension)) {
                return true;
            }
        }
        return false;
    }

    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0) {
            return filename.substring(lastDotIndex);
        }
        return "";
    }
}
