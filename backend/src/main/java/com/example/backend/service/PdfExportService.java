package com.example.backend.service;

import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.stereotype.Service;
// (Reverted) Removed HTML rendering libraries

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.*;

@Service
public class PdfExportService {
    private static final float MARGIN = 50f;
    private static final float LEADING = 16f;
    private static final float TITLE_FONT_SIZE = 18f;
    private static final float BODY_FONT_SIZE = 12f;
    private static final String FONT_PATH = "/fonts/NotoSans-Regular.ttf";

    public byte[] generateSimplePdf(String title, List<String> lines) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Set basic metadata
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle(safe(title).isEmpty() ? "Report" : safe(title));
            info.setAuthor("ClinicBooking");
            info.setCreator("ClinicBooking PDF Exporter");
            info.setCreationDate(Calendar.getInstance());
            doc.setDocumentInformation(info);

            PDFont titleFont;
            PDFont bodyFont;
            try (InputStream is = getClass().getResourceAsStream(FONT_PATH)) {
                if (is != null) {
                    titleFont = PDType0Font.load(doc, is, true);
                    bodyFont = titleFont;
                } else {
                    titleFont = PDType1Font.HELVETICA_BOLD;
                    bodyFont = PDType1Font.HELVETICA;
                }
            }
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            float contentWidth = page.getMediaBox().getWidth() - 2 * MARGIN;
            float y = page.getMediaBox().getHeight() - MARGIN;

            PDPageContentStream cs = new PDPageContentStream(doc, page);
            try {
                String t = safe(title);
                if (!t.isEmpty()) {
                    cs.beginText();
                    cs.setFont(titleFont, TITLE_FONT_SIZE);
                    cs.newLineAtOffset(MARGIN, y);
                    cs.showText(normalizeForFont(t, titleFont));
                    cs.endText();
                    y -= 2 * LEADING;
                }
                List<String> prepared = prepareLines(lines, bodyFont, contentWidth);
                for (String line : prepared) {
                    if (y <= MARGIN) {
                        cs.close();
                        page = new PDPage(PDRectangle.A4);
                        doc.addPage(page);
                        y = page.getMediaBox().getHeight() - MARGIN;
                        cs = new PDPageContentStream(doc, page);
                    }
                    cs.beginText();
                    cs.setFont(bodyFont, BODY_FONT_SIZE);
                    cs.newLineAtOffset(MARGIN, y);
                    cs.showText(normalizeForFont(safe(line), bodyFont));
                    cs.endText();
                    y -= LEADING;
                }
            } finally {
                cs.close();
            }
            // Add page numbers footer
            addPageNumbers(doc, bodyFont);
            doc.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    /**
     * Generate a simple table PDF with optional title, headers and rows.
     */
    public byte[] generateTablePdf(String title, List<String> headers, List<List<String>> rows) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Fonts
            PDFont titleFont;
            PDFont bodyFont;
            try (InputStream is = getClass().getResourceAsStream(FONT_PATH)) {
                if (is != null) {
                    titleFont = PDType0Font.load(doc, is, true);
                    bodyFont = titleFont;
                } else {
                    titleFont = PDType1Font.HELVETICA_BOLD;
                    bodyFont = PDType1Font.HELVETICA;
                }
            }

            // Metadata
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle(safe(title).isEmpty() ? "Report" : safe(title));
            info.setAuthor("ClinicBooking");
            info.setCreator("ClinicBooking PDF Exporter");
            info.setCreationDate(Calendar.getInstance());
            doc.setDocumentInformation(info);

            // Landscape A4 for more width (create new rectangle by swapping width/height)
            PDRectangle landscape = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            PDPage page = new PDPage(landscape);
            doc.addPage(page);

            float margin = 36f; // tighter margins to make it wider
            final PDPage[] pageRef = new PDPage[]{ page };
            float contentWidth = pageRef[0].getMediaBox().getWidth() - 2 * margin;
            float y = pageRef[0].getMediaBox().getHeight() - margin;

            // Resolve columns
            int cols = Math.max(1, headers != null && !headers.isEmpty() ? headers.size() : (rows != null && !rows.isEmpty() ? rows.get(0).size() : 1));

            // Compute natural widths based on header and sample rows
            float[] natural = new float[cols];
            Arrays.fill(natural, 50f); // minimum
            float headerFontSize = 12f;
            float tableFontSize = 11f;
            float padding = 4f;
            float lineH = tableFontSize + 4f;

            try {
                for (int c = 0; c < cols; c++) {
                    String h = headers != null && c < headers.size() ? headers.get(c) : "";
                    float hw = stringWidth(h, titleFont, headerFontSize) + 2 * padding;
                    natural[c] = Math.max(natural[c], hw);
                }
                List<List<String>> data = rows != null ? rows : Collections.emptyList();
                int sample = Math.min(100, data.size());
                for (int r = 0; r < sample; r++) {
                    List<String> row = data.get(r);
                    for (int c = 0; c < cols; c++) {
                        String v = (row != null && c < row.size()) ? Objects.toString(row.get(c), "") : "";
                        float w = stringWidth(v, bodyFont, tableFontSize) + 2 * padding;
                        natural[c] = Math.max(natural[c], w);
                    }
                }
            } catch (Exception ignore) { /* fallback to equal widths if needed */ }

            // Scale natural widths to fit content width
            float sum = 0f; for (float n : natural) sum += n;
            float[] colWidths = new float[cols];
            if (sum <= 0.1f) {
                Arrays.fill(colWidths, contentWidth / cols);
            } else {
                float scale = contentWidth / sum;
                for (int i = 0; i < cols; i++) {
                    colWidths[i] = Math.max(50f, natural[i] * scale); // enforce a minimum per column
                }
                // adjust to exact contentWidth if we grew due to minimums
                float total = 0f; for (float cw : colWidths) total += cw;
                float fixScale = contentWidth / total;
                for (int i = 0; i < cols; i++) colWidths[i] *= fixScale;
            }

            float tableX = margin;

            // Helper to draw header on current page
            final float[] yRef = new float[]{ y }; // mutable reference for lambda
            java.util.function.Function<PDPageContentStream, Float> drawHeader = (cs) -> {
                try {
                    // Title
                    String t = safe(title);
                    float yTop = yRef[0];
                    if (!t.isEmpty()) {
                        float tw = stringWidth(t, titleFont, TITLE_FONT_SIZE);
                        cs.beginText();
                        cs.setFont(titleFont, TITLE_FONT_SIZE);
                        float currentPageWidth = pageRef[0].getMediaBox().getWidth();
                        cs.newLineAtOffset((currentPageWidth - tw) / 2f, yTop);
                        cs.showText(normalizeForFont(t, titleFont));
                        cs.endText();
                        yTop -= (LEADING * 1.4f);
                    }

                    // Header text wrapping and height
                    List<List<String>> headerLines = new ArrayList<>();
                    float headerH = 0f;
                    for (int i = 0; i < cols; i++) {
                        String h = headers != null && i < headers.size() ? headers.get(i) : "";
                        List<String> lines = wrapLineSized(safe(h), titleFont, tableFontSize, colWidths[i] - 2 * padding);
                        headerLines.add(lines);
                        headerH = Math.max(headerH, lines.size() * lineH + 2 * padding);
                    }
                    float totalWidth = 0f; for (float cw : colWidths) totalWidth += cw;
                    // Fill background
                    cs.setNonStrokingColor(new java.awt.Color(235, 235, 235));
                    cs.addRect(tableX, yTop - headerH, totalWidth, headerH);
                    cs.fill();
                    cs.setNonStrokingColor(java.awt.Color.BLACK);
                    // Border and text
                    drawTableRowBorder(cs, tableX, yTop, colWidths, headerH);
                    float cx = tableX;
                    for (int i = 0; i < cols; i++) {
                        drawCellLines(cs, titleFont, headerLines.get(i), cx, yTop, tableFontSize, padding, lineH);
                        cx += colWidths[i];
                    }
                    yRef[0] = yTop - headerH; // update shared y
                    return yRef[0]; // new y after header
                } catch (Exception ex) {
                    throw new RuntimeException(ex);
                }
            };

            PDPageContentStream cs = new PDPageContentStream(doc, page);
            try {
                // Draw header and compute next y
                drawHeader.apply(cs);

                // Rows with pagination and zebra stripes
                List<List<String>> data = rows != null ? rows : Collections.emptyList();
                boolean zebra = true;
                for (int r = 0; r < data.size(); r++) {
                    List<String> row = data.get(r);
                    // compute row height by wrapping
                    List<List<String>> cellLines = new ArrayList<>(cols);
                    float rowH = 0f;
                    for (int i = 0; i < cols; i++) {
                        String v = (row != null && i < row.size()) ? Objects.toString(row.get(i), "") : "";
                        List<String> lines = wrapLineSized(v, bodyFont, tableFontSize, colWidths[i] - 2 * padding);
                        cellLines.add(lines);
                        rowH = Math.max(rowH, lines.size() * lineH + 2 * padding);
                    }

                    // page break if needed
                    if (yRef[0] - rowH < margin) {
                        cs.close();
                        PDRectangle landscape2 = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
                        PDPage newPage = new PDPage(landscape2);
                        doc.addPage(newPage);
                        pageRef[0] = newPage;
                        yRef[0] = pageRef[0].getMediaBox().getHeight() - margin;
                        cs = new PDPageContentStream(doc, newPage);
                        drawHeader.apply(cs);
                    }

                    // zebra background
                    float rowTop = yRef[0];
                    float totalWidth = 0f; for (float cw : colWidths) totalWidth += cw;
                    if (zebra && (r % 2 == 1)) {
                        cs.setNonStrokingColor(new java.awt.Color(250, 250, 250));
                        cs.addRect(tableX, rowTop - rowH, totalWidth, rowH);
                        cs.fill();
                        cs.setNonStrokingColor(java.awt.Color.BLACK);
                    }

                    // Draw border and text
                    drawTableRowBorder(cs, tableX, rowTop, colWidths, rowH);
                    float cx = tableX;
                    for (int i = 0; i < cols; i++) {
                        drawCellLines(cs, bodyFont, cellLines.get(i), cx, rowTop, tableFontSize, padding, lineH);
                        cx += colWidths[i];
                    }
                    yRef[0] -= rowH;
                }
            } finally {
                cs.close();
            }

            addPageNumbers(doc, PDType1Font.HELVETICA);
            doc.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate table PDF", e);
        }
    }


    // Generate a simple English invoice with a 2-column table (Description, Amount)
    public byte[] generateInvoiceEn(
            String invoiceNo,
            String date,
            String patient,
            String doctor,
            String paymentMethod,
            String status,
            String currency,
            List<String[]> items,
            String totalAmount
    ) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDFont titleFont;
            PDFont bodyFont;
            try (InputStream is = getClass().getResourceAsStream(FONT_PATH)) {
                if (is != null) {
                    titleFont = PDType0Font.load(doc, is, true);
                    bodyFont = titleFont;
                } else {
                    titleFont = PDType1Font.HELVETICA_BOLD;
                    bodyFont = PDType1Font.HELVETICA;
                }
            }

            // metadata
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle("INVOICE " + invoiceNo);
            info.setAuthor("ClinicBooking");
            info.setCreator("ClinicBooking PDF Exporter");
            info.setCreationDate(Calendar.getInstance());
            doc.setDocumentInformation(info);

            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();
            float contentWidth = pageWidth - 2 * MARGIN;
            float y = pageHeight - MARGIN;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                // Title centered
                String title = "INVOICE";
                float tw = stringWidth(title, titleFont, TITLE_FONT_SIZE);
                cs.beginText();
                cs.setFont(titleFont, TITLE_FONT_SIZE);
                cs.newLineAtOffset((pageWidth - tw) / 2f, y);
                cs.showText(normalizeForFont(title, titleFont));
                cs.endText();
                y -= 2 * LEADING;

                // Info block (left and right columns)
                float leftX = MARGIN;
                float rightX = MARGIN + contentWidth / 2f;
                float lineH = LEADING;

                // Left column
                y -= 4; // small spacing
                y = drawKeyValue(cs, bodyFont, "Invoice No:", safe(invoiceNo), leftX, y, lineH);
                y = drawKeyValue(cs, bodyFont, "Date:", safe(date), leftX, y, lineH);
                y = drawKeyValue(cs, bodyFont, "Patient:", safe(patient), leftX, y, lineH);
                y = drawKeyValue(cs, bodyFont, "Doctor:", safe(doctor), leftX, y, lineH);

                // Right column (aligned to the same y-start as after title)
                float yRight = y + 4 + 4 * lineH; // approximate original Y before left block
                yRight = drawKeyValue(cs, bodyFont, "Method:", safe(paymentMethod), rightX, yRight, lineH);
                yRight = drawKeyValue(cs, bodyFont, "Status:", safe(status), rightX, yRight, lineH);
                yRight = drawKeyValue(cs, bodyFont, "Currency:", safe(currency), rightX, yRight, lineH);

                // Position y to the lower of left/right
                y = Math.min(y, yRight) - (LEADING);

                // Table header
                float tableY = y;
                float[] colWidths = new float[]{ contentWidth * 0.70f, contentWidth * 0.30f };
                float rowH = LEADING + 4f;
                float tableX = MARGIN;

                // Draw header row borders
                drawTableRowBorder(cs, tableX, tableY, colWidths, rowH);
                // Header text
                drawCellText(cs, bodyFont, "Description", tableX + 4, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                drawCellText(cs, bodyFont, "Amount", tableX + colWidths[0] + 4, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                tableY -= rowH;

                // Items
                List<String[]> safeItems = (items != null) ? items : Collections.emptyList();
                for (String[] it : safeItems) {
                    drawTableRowBorder(cs, tableX, tableY, colWidths, rowH);
                    String desc = it != null && it.length > 0 ? it[0] : "";
                    String amt = it != null && it.length > 1 ? it[1] : "";
                    drawCellText(cs, bodyFont, desc, tableX + 4, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                    drawCellText(cs, bodyFont, amt, tableX + colWidths[0] + 4, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                    tableY -= rowH;
                }

                // Total row
                drawTableRowBorder(cs, tableX, tableY, colWidths, rowH);
                drawCellText(cs, bodyFont, "Total", tableX + 4, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                drawCellText(cs, bodyFont, safe(totalAmount), tableX + colWidths[0] + 4, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                tableY -= rowH;

                y = tableY - LEADING;

                // Footer
                String thanks = "Thank you for your visit";
                cs.beginText();
                cs.setFont(bodyFont, BODY_FONT_SIZE);
                cs.newLineAtOffset(MARGIN, y);
                cs.showText(normalizeForFont(thanks, bodyFont));
                cs.endText();
            }

            addPageNumbers(doc, (PDFont) (doc.getNumberOfPages() > 0 ? PDType1Font.HELVETICA : PDType1Font.HELVETICA));
            doc.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate invoice PDF", e);
        }
    }

    private float drawKeyValue(PDPageContentStream cs, PDFont font, String key, String val, float x, float y, float lineH) throws Exception {
        String kv = key + " " + val;
        cs.beginText();
        cs.setFont(font, BODY_FONT_SIZE);
        cs.newLineAtOffset(x, y);
        cs.showText(normalizeForFont(kv, font));
        cs.endText();
        return y - lineH;
    }

    private void drawTableRowBorder(PDPageContentStream cs, float x, float yTop, float[] colWidths, float rowH) throws Exception {
        float w = 0f;
        for (float cw : colWidths) w += cw;
        float yBottom = yTop - rowH;
        // outer rect for the row
        cs.addRect(x, yBottom, w, rowH);
        cs.stroke();
        // vertical separators for each column boundary
        float curX = x;
        for (int i = 0; i < colWidths.length - 1; i++) {
            curX += colWidths[i];
            cs.moveTo(curX, yBottom);
            cs.lineTo(curX, yTop);
            cs.stroke();
        }
    }

    private void drawCellText(PDPageContentStream cs, PDFont font, String text, float x, float y) throws Exception {
        cs.beginText();
        cs.setFont(font, BODY_FONT_SIZE);
        cs.newLineAtOffset(x, y);
        cs.showText(normalizeForFont(safe(text), font));
        cs.endText();
    }

    // (removed) fitToWidth - no longer used since we wrap text in cells

    // Wrap text to a given width with a specific font size
    private List<String> wrapLineSized(String text, PDFont font, float fontSize, float maxWidth) throws Exception {
        if (text == null || text.isBlank()) return List.of("");
        List<String> result = new ArrayList<>();
        List<String> words = new ArrayList<>(Arrays.asList(text.split(" ")));
        StringBuilder line = new StringBuilder();
        while (!words.isEmpty()) {
            String w = words.remove(0);
            if (line.length() == 0) {
                if (stringWidth(w, font, fontSize) <= maxWidth) line.append(w);
                else {
                    List<String> chunks = splitWordByWidth(w, font, fontSize, maxWidth);
                    if (chunks.size() > 1) result.addAll(chunks.subList(0, chunks.size() - 1));
                    line.append(chunks.get(chunks.size() - 1));
                }
            } else {
                String cand = line + " " + w;
                if (stringWidth(cand, font, fontSize) <= maxWidth) line.append(" ").append(w);
                else {
                    result.add(line.toString());
                    line.setLength(0);
                    if (stringWidth(w, font, fontSize) <= maxWidth) line.append(w);
                    else {
                        List<String> chunks = splitWordByWidth(w, font, fontSize, maxWidth);
                        if (chunks.size() > 1) result.addAll(chunks.subList(0, chunks.size() - 1));
                        line.append(chunks.get(chunks.size() - 1));
                    }
                }
            }
        }
        if (line.length() > 0) result.add(line.toString());
        return result;
    }

    private void drawCellLines(PDPageContentStream cs, PDFont font, List<String> lines, float cellX, float yTop, float fontSize, float padding, float lineH) throws Exception {
        float y = yTop - padding - 1f; // small top inset
        for (String l : lines) {
            cs.beginText();
            cs.setFont(font, fontSize);
            cs.newLineAtOffset(cellX + padding, y - fontSize);
            cs.showText(normalizeForFont(safe(l), font));
            cs.endText();
            y -= lineH;
        }
    }

    // Build a C17-like travel expense form (single page/table; auto add pages if needed)
    public byte[] generateTravelExpenseFormC17(
            String unit,
            String qhnsCode,
            String month,
            String year,
            List<String[]> rows,
            String totalInWords
    ) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDFont titleFont;
            PDFont bodyFont;
            try (InputStream is = getClass().getResourceAsStream(FONT_PATH)) {
                if (is != null) {
                    titleFont = PDType0Font.load(doc, is, true);
                    bodyFont = titleFont;
                } else {
                    titleFont = PDType1Font.HELVETICA_BOLD;
                    bodyFont = PDType1Font.HELVETICA;
                }
            }

            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();
            float contentWidth = pageWidth - 2 * MARGIN;
            float y = pageHeight - MARGIN;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                // Header left
                cs.beginText();
                cs.setFont(bodyFont, 10f);
                cs.newLineAtOffset(MARGIN, y);
                cs.showText(normalizeForFont("Don vi: " + safe(unit), bodyFont));
                cs.endText();
                y -= LEADING;
                cs.beginText();
                cs.setFont(bodyFont, 10f);
                cs.newLineAtOffset(MARGIN, y);
                cs.showText(normalizeForFont("Ma QHNS: " + safe(qhnsCode), bodyFont));
                cs.endText();

                // Header right (form code)
                String formCode = "Form C17-HD";
                float tw = stringWidth(formCode, bodyFont, 10f);
                cs.beginText();
                cs.setFont(bodyFont, 10f);
                cs.newLineAtOffset(pageWidth - MARGIN - tw, pageHeight - MARGIN);
                cs.showText(normalizeForFont(formCode, bodyFont));
                cs.endText();

                // Title center
                y -= (LEADING * 1.2f);
                String title = "BANG KE THANH TOAN CONG TAC PHI"; // ASCII safe
                float ttw = stringWidth(title, titleFont, TITLE_FONT_SIZE);
                cs.beginText();
                cs.setFont(titleFont, TITLE_FONT_SIZE);
                cs.newLineAtOffset((pageWidth - ttw) / 2f, y);
                cs.showText(title);
                cs.endText();

                y -= LEADING;
                String timeLine = "Thang " + safe(month) + "  Nam " + safe(year);
                float tmw = stringWidth(timeLine, bodyFont, 12f);
                cs.beginText();
                cs.setFont(bodyFont, 12f);
                cs.newLineAtOffset((pageWidth - tmw) / 2f, y);
                cs.showText(timeLine);
                cs.endText();

                y -= (LEADING * 1.2f);

                // Table headers (12 columns)
                String[] headers = new String[]{
                        "STT","Ho va ten","Don vi","Tien ve (tau, xe, ...)",
                        "Tien thue PT di lai","Tien phu cap luu tru","Tien phong nghi",
                        "Cong","So tien da tam ung","So nop tra lai","So tien con duoc nhan","Ky nhan"
                };
                float[] base = new float[]{35, 90, 70, 60, 60, 60, 60, 55, 60, 55, 70, 70};
                float sum = 0f; for (float b : base) sum += b;
                float scale = contentWidth / sum;
                float[] colWidths = new float[base.length];
                for (int i = 0; i < base.length; i++) colWidths[i] = base[i] * scale;

                float rowH = LEADING + 6f;
                float tableX = MARGIN;
                float tableY = y;

                // Header row
                drawTableRowBorder(cs, tableX, tableY, colWidths, rowH);
                float cx = tableX;
                for (int i = 0; i < headers.length; i++) {
                    drawCellText(cs, bodyFont, headers[i], cx + 3, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                    cx += colWidths[i];
                }
                tableY -= rowH;

                // Data rows
                List<String[]> data = rows != null ? rows : Collections.emptyList();
                for (int r = 0; r < data.size(); r++) {
                    // new page if needed
                    if (tableY <= MARGIN + 120) {
                        cs.close();
                        page = new PDPage(PDRectangle.A4);
                        doc.addPage(page);
                        tableY = page.getMediaBox().getHeight() - MARGIN;
                        try (PDPageContentStream cs2 = new PDPageContentStream(doc, page)) {
                            // redraw header on new page
                            drawTableRowBorder(cs2, tableX, tableY, colWidths, rowH);
                            float cx2 = tableX;
                            for (int i = 0; i < headers.length; i++) {
                                drawCellText(cs2, bodyFont, headers[i], cx2 + 3, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                                cx2 += colWidths[i];
                            }
                        }
                        tableY -= rowH;
                        // open a new append stream for subsequent rows
                        // Note: We'll reopen cs for consistency
                        // However, to keep code simple in single try block, we won't paginate extremely; rows expected small
                    }
                    drawTableRowBorder(cs, tableX, tableY, colWidths, rowH);
                    cx = tableX;
                    String[] row = data.get(r);
                    for (int i = 0; i < headers.length; i++) {
                        String cell = (row != null && i < row.length) ? row[i] : "";
                        drawCellText(cs, bodyFont, cell, cx + 3, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                        cx += colWidths[i];
                    }
                    tableY -= rowH;
                }

                // Total line
                drawTableRowBorder(cs, tableX, tableY, colWidths, rowH);
                drawCellText(cs, bodyFont, "Cong", tableX + 3, tableY - (rowH - BODY_FONT_SIZE) / 2 - 3);
                tableY -= (rowH + LEADING);

                // Sum in words
                cs.beginText();
                cs.setFont(bodyFont, 12f);
                cs.newLineAtOffset(MARGIN, tableY);
                cs.showText(normalizeForFont("Tong so tien (bang chu): " + safe(totalInWords), bodyFont));
                cs.endText();
                tableY -= (LEADING * 2f);

                // Signature lines
                String[] sigs = new String[]{"Nguoi lap", "Ke toan truong", "Thu truong don vi"};
                float sigWidth = (contentWidth - 40) / 3f;
                float sigY = tableY;
                for (int i = 0; i < 3; i++) {
                    float sx = MARGIN + i * (sigWidth + 20);
                    cs.beginText();
                    cs.setFont(bodyFont, 12f);
                    cs.newLineAtOffset(sx, sigY);
                    cs.showText(sigs[i]);
                    cs.endText();
                }
            }

            addPageNumbers(doc, PDType1Font.HELVETICA);
            doc.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate C17 form", e);
        }
    }

    private List<String> prepareLines(List<String> lines, PDFont font, float width) throws Exception {
        List<String> result = new ArrayList<>();
        List<String> src = lines == null ? List.of() : lines;
        for (String raw : src) {
            String r = raw == null ? "" : raw;
            String[] paras = r.split("\\R", -1);
            for (String p : paras) {
                if (p.isEmpty()) result.add("");
                else result.addAll(wrapLine(p, font, BODY_FONT_SIZE, width));
            }
        }
        return result;
    }

    private String safe(String s) {
        return s == null ? "" : s.replace("\r", "").replace("\n", " ");
    }

    private List<String> wrapLine(String text, PDFont font, float fontSize, float maxWidth) throws Exception {
        if (text.isBlank()) return List.of("");
        List<String> result = new ArrayList<>();
        List<String> words = new ArrayList<>(Arrays.asList(text.split(" ")));
        StringBuilder line = new StringBuilder();
        while (!words.isEmpty()) {
            String w = words.remove(0);
            if (line.length() == 0) {
                if (stringWidth(w, font, fontSize) <= maxWidth) {
                    line.append(w);
                } else {
                    List<String> chunks = splitWordByWidth(w, font, fontSize, maxWidth);
                    if (chunks.size() > 1) result.addAll(chunks.subList(0, chunks.size() - 1));
                    line.append(chunks.get(chunks.size() - 1));
                }
            } else {
                String cand = line + " " + w;
                if (stringWidth(cand, font, fontSize) <= maxWidth) {
                    line.append(" ").append(w);
                } else {
                    result.add(line.toString());
                    line.setLength(0);
                    if (stringWidth(w, font, fontSize) <= maxWidth) {
                        line.append(w);
                    } else {
                        List<String> chunks = splitWordByWidth(w, font, fontSize, maxWidth);
                        if (chunks.size() > 1) result.addAll(chunks.subList(0, chunks.size() - 1));
                        line.append(chunks.get(chunks.size() - 1));
                    }
                }
            }
        }
        if (line.length() > 0) result.add(line.toString());
        return result;
    }

    private List<String> splitWordByWidth(String word, PDFont font, float fontSize, float maxWidth) throws Exception {
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < word.length(); i++) {
            char c = word.charAt(i);
            String cand = current.toString() + c;
            if (stringWidth(cand, font, fontSize) <= maxWidth) {
                current.append(c);
            } else {
                if (current.length() > 0) {
                    chunks.add(current.toString());
                    current.setLength(0);
                    i--;
                } else {
                    chunks.add(String.valueOf(c));
                }
            }
        }
        if (current.length() > 0) chunks.add(current.toString());
        return chunks;
    }

    private float stringWidth(String text, PDFont font, float fontSize) throws Exception {
        // Normalize text first to avoid IllegalArgumentException for missing glyphs
        String t = text;
        if (t != null) {
            t = normalizeForFont(t, font);
        }
        return font.getStringWidth(t) / 1000f * fontSize;
    }

    // Sanitize text when Unicode font is unavailable to avoid missing glyph errors
    private String normalizeForFont(String text, PDFont font) {
        if (font instanceof PDType0Font) {
            return text; // Unicode font loaded; keep original
        }
        // Replace common Unicode punctuation with ASCII equivalents
        String t = text
                .replace("…", "...")
                .replace("–", "-")
                .replace("—", "-")
                .replace("“", "\"")
                .replace("”", "\"")
                .replace("‘", "'")
                .replace("’", "'");
        // Remove diacritics (Vietnamese accents) and non-ASCII characters
        String noMarks = Normalizer.normalize(t, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        // Replace any remaining non-ASCII with '?'
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < noMarks.length(); i++) {
            char c = noMarks.charAt(i);
            if (c >= 32 && c <= 126) sb.append(c); else sb.append('?');
        }
        return sb.toString();
    }

    private void addPageNumbers(PDDocument doc, PDFont font) throws Exception {
        int total = doc.getNumberOfPages();
        if (total <= 0) return;
        float footerFontSize = 10f;
        for (int i = 0; i < total; i++) {
            PDPage p = doc.getPage(i);
            PDRectangle box = p.getMediaBox();
            float y = 20f; // bottom margin for footer
            String text = String.format("Trang %d/%d", i + 1, total);
            float textWidth = stringWidth(text, font, footerFontSize);
            float x = box.getWidth() - MARGIN - textWidth;
            try (PDPageContentStream footer = new PDPageContentStream(doc, p, PDPageContentStream.AppendMode.APPEND, true, true)) {
                footer.beginText();
                footer.setFont(font, footerFontSize);
                footer.newLineAtOffset(x, y);
                footer.showText(text);
                footer.endText();
            }
        }
    }

    // Generate a single-row table PDF with dynamic columns (used for Payment list-like view)
    public byte[] generateSingleRowTable(String title, String[] headers, String[] values) {
        Objects.requireNonNull(headers, "headers");
        Objects.requireNonNull(values, "values");
        if (headers.length != values.length) {
            throw new IllegalArgumentException("headers and values must have the same length");
        }
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Load fonts
            PDFont titleFont;
            PDFont bodyFont;
            try (InputStream is = getClass().getResourceAsStream(FONT_PATH)) {
                if (is != null) {
                    titleFont = PDType0Font.load(doc, is, true);
                    bodyFont = titleFont;
                } else {
                    titleFont = PDType1Font.HELVETICA_BOLD;
                    bodyFont = PDType1Font.HELVETICA;
                }
            }

            // metadata
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle(safe(title).isEmpty() ? "Payment" : safe(title));
            info.setAuthor("ClinicBooking");
            info.setCreator("ClinicBooking PDF Exporter");
            info.setCreationDate(Calendar.getInstance());
            doc.setDocumentInformation(info);

            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();
            float contentWidth = pageWidth - 2 * MARGIN;
            float y = pageHeight - MARGIN;

            float tableFontSize = 10f; // denser
            float padding = 3f;
            float lineH = tableFontSize + 3f;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                // Title centered
                String t = safe(title).isEmpty() ? "Payment" : safe(title);
                float tw = stringWidth(t, titleFont, TITLE_FONT_SIZE);
                cs.beginText();
                cs.setFont(titleFont, TITLE_FONT_SIZE);
                cs.newLineAtOffset((pageWidth - tw) / 2f, y);
                cs.showText(normalizeForFont(t, titleFont));
                cs.endText();
                y -= (LEADING * 1.6f);

                // fixed base widths scaled to fit page for 10 columns
                int n = headers.length;
                float[] base;
                if (n == 10) {
                    base = new float[]{60, 60, 100, 90, 80, 130, 75, 120, 110, 120};
                } else {
                    base = new float[n];
                    Arrays.fill(base, contentWidth / n);
                }
                float sumBase = 0f; for (float b : base) sumBase += b;
                float scale = contentWidth / sumBase;
                float[] colWidths = new float[n];
                for (int i = 0; i < n; i++) colWidths[i] = base[i] * scale;

                float tableX = MARGIN;
                float tableY = y;
                // Header row with background and wrapping
                List<List<String>> headerLines = new ArrayList<>();
                float headerH = 0f;
                for (int i = 0; i < n; i++) {
                    List<String> lines = wrapLineSized(safe(headers[i]), titleFont, tableFontSize, colWidths[i] - 2 * padding);
                    headerLines.add(lines);
                    headerH = Math.max(headerH, lines.size() * lineH + 2 * padding);
                }
                float totalWidth = 0f; for (float cw : colWidths) totalWidth += cw;
                cs.setNonStrokingColor(new java.awt.Color(230, 230, 230));
                cs.addRect(tableX, tableY - headerH, totalWidth, headerH);
                cs.fill();
                cs.setNonStrokingColor(java.awt.Color.BLACK);
                drawTableRowBorder(cs, tableX, tableY, colWidths, headerH);
                float cx = tableX;
                for (int i = 0; i < n; i++) {
                    drawCellLines(cs, titleFont, headerLines.get(i), cx, tableY, tableFontSize, padding, lineH);
                    cx += colWidths[i];
                }
                tableY -= headerH;

                // Single data row with wrapping
                List<List<String>> dataLines = new ArrayList<>();
                float dataH = 0f;
                for (int i = 0; i < n; i++) {
                    String v = values[i] == null ? "" : values[i];
                    List<String> lines = wrapLineSized(v, bodyFont, tableFontSize, colWidths[i] - 2 * padding);
                    dataLines.add(lines);
                    dataH = Math.max(dataH, lines.size() * lineH + 2 * padding);
                }
                drawTableRowBorder(cs, tableX, tableY, colWidths, dataH);
                cx = tableX;
                for (int i = 0; i < n; i++) {
                    drawCellLines(cs, bodyFont, dataLines.get(i), cx, tableY, tableFontSize, padding, lineH);
                    cx += colWidths[i];
                }
            }

            addPageNumbers(doc, PDType1Font.HELVETICA);
            doc.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate single-row table PDF", e);
        }
    }

}