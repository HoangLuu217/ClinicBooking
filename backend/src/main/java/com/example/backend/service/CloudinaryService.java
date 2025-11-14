package com.example.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}") String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {
        
        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", cloudName);
        config.put("api_key", apiKey);
        config.put("api_secret", apiSecret);
        this.cloudinary = new Cloudinary(config);
        log.info("CloudinaryService initialized with cloud_name: {}", cloudName);
    }

    public String uploadImage(MultipartFile file, String folder) throws IOException {
        try {
            // Tạo public_id unique
            String publicId = folder + "/" + UUID.randomUUID().toString();
            
            log.info("Uploading image to Cloudinary - folder: {}, public_id: {}", folder, publicId);
            
            // Upload lên Cloudinary
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", folder,
                    "public_id", publicId,
                    "resource_type", "image",
                    "overwrite", false,
                    "use_filename", false
                )
            );
            
            // Lấy secure URL (HTTPS)
            String secureUrl = (String) uploadResult.get("secure_url");
            log.info("Upload thành công: {}", secureUrl);
            return secureUrl;
            
        } catch (IOException e) {
            log.error("Lỗi khi upload lên Cloudinary: {}", e.getMessage(), e);
            throw e;
        }
    }

    public boolean deleteImage(String imageUrl) {
        try {
            // Extract public_id từ URL
            // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{ext}
            String publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId != null) {
                cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                log.info("Xóa ảnh thành công: {}", publicId);
                return true;
            }
            return false;
        } catch (Exception e) {
            log.error("Lỗi khi xóa ảnh từ Cloudinary: {}", e.getMessage(), e);
            return false;
        }
    }

    private String extractPublicIdFromUrl(String url) {
        try {
            // Parse URL để lấy public_id
            // Ví dụ: https://res.cloudinary.com/dxwiirlxr/image/upload/v1234567890/clinic/department_1.jpg
            // -> public_id = clinic/department_1
            if (url.contains("/image/upload/")) {
                String[] parts = url.split("/image/upload/");
                if (parts.length > 1) {
                    String path = parts[1];
                    // Remove version prefix if exists (v1234567890/)
                    if (path.matches("^v\\d+/.*")) {
                        path = path.substring(path.indexOf('/') + 1);
                    }
                    // Remove extension
                    int lastDot = path.lastIndexOf('.');
                    if (lastDot > 0) {
                        path = path.substring(0, lastDot);
                    }
                    return path;
                }
            }
        } catch (Exception e) {
            log.warn("Không thể extract public_id từ URL: {}", url);
        }
        return null;
    }
}

