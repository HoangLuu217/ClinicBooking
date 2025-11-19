package com.example.backend.web;

import com.example.backend.service.PdfExportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/export")
@CrossOrigin(origins = "*")
public class PdfExportController {

    private static final Logger log = LoggerFactory.getLogger(PdfExportController.class);
    private final PdfExportService pdfService;

    public PdfExportController(PdfExportService pdfService) {
        this.pdfService = pdfService;
    }

    @GetMapping(value = "/pdf/sample", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> sample() {
        byte[] bytes = pdfService.generateSimplePdf("Báo cáo mẫu",
                List.of("Dòng 1", "Dòng 2 dài để test tự xuống dòng…", "Dòng 3"));
        return build(bytes, "sample");
    }

    // Simple health endpoint to verify mapping exists
    @GetMapping("/pdf/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> byQuery(@RequestParam(defaultValue = "Report") String title,
                                          @RequestParam(name = "line", required = false) List<String> lines) {
        List<String> ls = lines == null ? List.of() : lines.stream().map(s -> s == null ? "" : s).collect(Collectors.toList());
        return build(pdfService.generateSimplePdf(title, ls), title);
    }

    @PostMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> byJson(@RequestBody(required = false) Map<String, Object> body) {
        String title = "Report";
        List<String> lines = List.of();
        if (body != null) {
            title = Objects.toString(body.getOrDefault("title", "Report"), "Report");
            Object o = body.get("lines");
            if (o instanceof List<?> l) {
                lines = l.stream().map(v -> v == null ? "" : v.toString()).collect(Collectors.toList());
            }
        }
        log.info("PDF export title='{}' lines={}", title, lines.size());
        return build(pdfService.generateSimplePdf(title, lines), title);
    }

    /**
     * Generic table export: { title: string, headers: string[], rows: string[][] }
     */
    @PostMapping(value = "/table-pdf", produces = MediaType.APPLICATION_PDF_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> tableByJson(@RequestBody Map<String, Object> body) {
        String title = Objects.toString(body.getOrDefault("title", "Report"), "Report");
        List<String> headers = new ArrayList<>();
        List<List<String>> rows = new ArrayList<>();

        Object h = body.get("headers");
        if (h instanceof List<?> list) {
            for (Object x : list) headers.add(Objects.toString(x, ""));
        }
        Object r = body.get("rows");
        if (r instanceof List<?> list) {
            for (Object row : list) {
                if (row instanceof List<?> l2) {
                    List<String> rr = new ArrayList<>();
                    for (Object v : l2) rr.add(Objects.toString(v, ""));
                    rows.add(rr);
                }
            }
        }

        byte[] pdf = pdfService.generateTablePdf(title, headers, rows);
        return build(pdf, title);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<byte[]> badJson(HttpMessageNotReadableException ex) {
        String msg = "JSON không hợp lệ. Dạng: {\"title\":\"...\",\"lines\":[\"...\"]}";
        return ResponseEntity.badRequest()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_PLAIN_VALUE + ";charset=UTF-8")
                .body(msg.getBytes(StandardCharsets.UTF_8));
    }

    private ResponseEntity<byte[]> build(byte[] bytes, String title) {
        String base = (title == null || title.isBlank()) ? "report" : title.trim();
        String file = URLEncoder.encode(base + ".pdf", StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file + "\"; filename*=UTF-8''" + file)
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(bytes.length)
                .body(bytes);
    }
}