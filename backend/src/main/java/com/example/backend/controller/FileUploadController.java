package com.example.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
public class FileUploadController {

    private static final String UPLOAD_DIR = "uploads/";
    private static final String[] ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"};
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "articleId", required = false) Long articleId,
            @RequestParam(value = "doctorId", required = false) Long doctorId,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "departmentId", required = false) Long departmentId) {
        
        System.out.println("=== UPLOAD REQUEST DEBUG ===");
        System.out.println("Received upload request - departmentId: " + departmentId + ", articleId: " + articleId + ", doctorId: " + doctorId + ", userId: " + userId);
        System.out.println("File name: " + (file != null ? file.getOriginalFilename() : "null"));
        System.out.println("File size: " + (file != null ? file.getSize() : "null"));
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Kiểm tra file có tồn tại không
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("message", "File không được để trống");
                return ResponseEntity.badRequest().body(response);
            }

            // Kiểm tra kích thước file
            if (file.getSize() > MAX_FILE_SIZE) {
                response.put("success", false);
                response.put("message", "Kích thước file không được vượt quá 10MB");
                return ResponseEntity.badRequest().body(response);
            }

            // Kiểm tra định dạng file
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !isAllowedExtension(originalFilename)) {
                response.put("success", false);
                response.put("message", "Chỉ được phép upload file ảnh (JPG, JPEG, PNG, GIF, WEBP)");
                return ResponseEntity.badRequest().body(response);
            }

            // Tạo thư mục uploads nếu chưa tồn tại
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Tạo tên file theo articleId, doctorId, userId, departmentId hoặc UUID
            String fileExtension = getFileExtension(originalFilename);
            String filename;
            String subDir = "";
            
            if (articleId != null) {
                filename = "article_" + articleId + fileExtension;
            } else if (doctorId != null) {
                filename = "doctor_" + doctorId + fileExtension;
            } else if (userId != null) {
                filename = "user_" + userId + fileExtension;
            } else if (departmentId != null) {
                filename = "department_" + departmentId + fileExtension;
                subDir = "departments/";
                System.out.println("Uploading department image for ID: " + departmentId + ", filename: " + filename);
            } else {
                filename = UUID.randomUUID().toString() + fileExtension;
                System.out.println("No departmentId provided, using UUID filename: " + filename);
            }
            
            // Tạo thư mục con nếu cần
            Path finalUploadPath = uploadPath;
            if (!subDir.isEmpty()) {
                finalUploadPath = uploadPath.resolve(subDir);
                if (!Files.exists(finalUploadPath)) {
                    Files.createDirectories(finalUploadPath);
                }
            }
            
            Path filePath = finalUploadPath.resolve(filename);

            // Lưu file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Tạo URL để truy cập file
            String fileUrl = "/uploads/" + subDir + filename;

            response.put("success", true);
            response.put("message", "Upload thành công");
            response.put("url", fileUrl);
            response.put("filename", filename);
            response.put("originalName", originalFilename);
            response.put("size", file.getSize());

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            response.put("success", false);
            response.put("message", "Lỗi khi upload file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi không xác định: " + e.getMessage());
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
