package com.example.backend.controller;

import com.example.backend.service.PaymentService;
import com.example.backend.service.WebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.payos.PayOS;
import vn.payos.model.webhooks.WebhookData;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PayOSWebhookController {

    private final PayOS payOS;
    private final WebhookService webhookService;

    @PostMapping("/webhook")
    public ResponseEntity<String> handlePayOSWebhook(@RequestBody Object body) {
        try {
            log.info("Received PayOS webhook: {}", body);

            // Verify webhook signature using PayOS SDK
            WebhookData webhookData = payOS.webhooks().verify(body);
            
            // Process webhook using WebhookService
            webhookService.processPayOSWebhook(webhookData);

            log.info("Webhook processed successfully");
            return ResponseEntity.ok("Webhook processed successfully");

        } catch (Exception e) {
            log.error("Error processing PayOS webhook: ", e);
            return ResponseEntity.status(500).body("Error processing webhook");
        }
    }
}
