package com.forma.frame.docoutput;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.util.List;
import java.util.Map;

/**
 * 발주서 PDF/DOCX 생성 서비스.
 *
 * PDF: OpenPDF (LGPL) — Malgun Gothic 폰트로 한글 지원
 * DOCX: Apache POI XWPF — 맑은 고딕 폰트로 한글 지원
 */
@Slf4j
@Service
public class DocOutputService {

    private static final String KOREAN_FONT_PATH = "C:/Windows/Fonts/malgun.ttf";
    private static final DecimalFormat AMOUNT_FMT = new DecimalFormat("#,##0");

    // ═══════════════════════════════════════════════
    // PDF 생성
    // ═══════════════════════════════════════════════

    /** 발주서 PDF */
    public void writePoPdf(Map<String, Object> data,
                           List<Map<String, Object>> milestones,
                           OutputStream out) throws Exception {
        com.lowagie.text.Document doc =
            new com.lowagie.text.Document(PageSize.A4, 60, 60, 60, 60);
        PdfWriter.getInstance(doc, out);
        doc.open();

        BaseFont baseFont = loadKoreanFont();
        Font titleFont = new Font(baseFont, 20, Font.BOLD);
        Font headFont  = new Font(baseFont, 11, Font.BOLD);
        Font bodyFont  = new Font(baseFont,  9, Font.NORMAL);
        Font labelFont = new Font(baseFont,  9, Font.BOLD);

        // 제목
        Paragraph title = new Paragraph("발  주  서", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(4);
        doc.add(title);

        Paragraph bizInfo = new Paragraph(
            "사업번호: " + str(data.get("biz_no")) + "  |  발주번호: " + str(data.get("biz_no")) + "-" + str(data.get("seq")),
            bodyFont);
        bizInfo.setAlignment(Element.ALIGN_CENTER);
        bizInfo.setSpacingAfter(20);
        doc.add(bizInfo);

        // 발주 정보
        doc.add(sectionHeader("■ 발주 정보", headFont));
        doc.add(infoTable(new String[][]{
            {"발주처",    str(data.get("cust_nm"))},
            {"사업자번호", str(data.get("cust_biz_no"))},
            {"주소",      str(data.get("cust_addr"))},
            {"연락처",    str(data.get("cust_tel"))},
            {"발주금액",  fmtAmount(data.get("amount"))},
            {"발주일",    fmtDate(str(data.get("est_date")))},
            {"비고",      str(data.get("remark"))},
        }, labelFont, bodyFont));

        // 사업 정보
        doc.add(sectionHeader("■ 사업 정보", headFont));
        doc.add(infoTable(new String[][]{
            {"사업명",   str(data.get("biz_nm"))},
            {"사업유형",  str(data.get("biz_type_nm"))},
            {"사업기간",  fmtYm(str(data.get("plan_from"))) + " ~ " + fmtYm(str(data.get("plan_to")))},
            {"담당자",   str(data.get("owner_nm"))},
        }, labelFont, bodyFont));

        // 대금 일정
        if (milestones != null && !milestones.isEmpty()) {
            doc.add(sectionHeader("■ 대금 일정", headFont));
            doc.add(milestoneTable(milestones, labelFont, bodyFont));
        }

        // 서명란
        doc.add(signatureTable(bodyFont));

        doc.close();
    }

    // ═══════════════════════════════════════════════
    // DOCX 생성
    // ═══════════════════════════════════════════════

    /** 발주서 DOCX */
    public void writePoDocx(Map<String, Object> data,
                            List<Map<String, Object>> milestones,
                            OutputStream out) throws Exception {
        try (XWPFDocument docx = new XWPFDocument()) {
            addDocxTitle(docx, "발  주  서");
            addDocxSubtitle(docx,
                "사업번호: " + str(data.get("biz_no")) + "  |  발주번호: " + str(data.get("biz_no")) + "-" + str(data.get("seq")));

            addDocxSectionHeader(docx, "■ 발주 정보");
            addDocxInfoTable(docx, new String[][]{
                {"발주처",    str(data.get("cust_nm"))},
                {"사업자번호", str(data.get("cust_biz_no"))},
                {"주소",      str(data.get("cust_addr"))},
                {"연락처",    str(data.get("cust_tel"))},
                {"발주금액",  fmtAmount(data.get("amount"))},
                {"발주일",    fmtDate(str(data.get("est_date")))},
                {"비고",      str(data.get("remark"))},
            });

            addDocxSectionHeader(docx, "■ 사업 정보");
            addDocxInfoTable(docx, new String[][]{
                {"사업명",   str(data.get("biz_nm"))},
                {"사업유형",  str(data.get("biz_type_nm"))},
                {"사업기간",  fmtYm(str(data.get("plan_from"))) + " ~ " + fmtYm(str(data.get("plan_to")))},
                {"담당자",   str(data.get("owner_nm"))},
            });

            if (milestones != null && !milestones.isEmpty()) {
                addDocxSectionHeader(docx, "■ 대금 일정");
                addDocxMilestoneTable(docx, milestones);
            }

            addDocxSignatureTable(docx);
            docx.write(out);
            out.flush();
        }
    }

    // ═══════════════════════════════════════════════
    // PDF 헬퍼
    // ═══════════════════════════════════════════════

    private BaseFont loadKoreanFont() {
        try {
            return BaseFont.createFont(KOREAN_FONT_PATH, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception e) {
            log.warn("Malgun Gothic 폰트 로드 실패, Helvetica 사용: {}", e.getMessage());
            try {
                return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            } catch (Exception ex) {
                throw new RuntimeException("폰트 로드 실패", ex);
            }
        }
    }

    private Paragraph sectionHeader(String text, Font font) {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingBefore(14);
        p.setSpacingAfter(4);
        return p;
    }

    private PdfPTable infoTable(String[][] rows, Font labelFont, Font valueFont) throws Exception {
        PdfPTable table = new PdfPTable(new float[]{2f, 5f});
        table.setWidthPercentage(100);
        table.setSpacingAfter(8);

        for (String[] row : rows) {
            PdfPCell label = new PdfPCell(new Phrase(row[0], labelFont));
            label.setBackgroundColor(new java.awt.Color(240, 240, 240));
            label.setPadding(5);
            label.setBorderWidth(0.5f);

            PdfPCell value = new PdfPCell(new Phrase(row[1], valueFont));
            value.setPadding(5);
            value.setBorderWidth(0.5f);

            table.addCell(label);
            table.addCell(value);
        }
        return table;
    }

    private PdfPTable milestoneTable(List<Map<String, Object>> milestones,
                                     Font headFont, Font bodyFont) throws Exception {
        PdfPTable table = new PdfPTable(new float[]{3f, 3f, 2f, 2f, 2f});
        table.setWidthPercentage(100);
        table.setSpacingAfter(8);

        for (String h : new String[]{"유형", "일정명", "예정일", "금액", "완료"}) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headFont));
            cell.setBackgroundColor(new java.awt.Color(220, 230, 241));
            cell.setPadding(4);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setBorderWidth(0.5f);
            table.addCell(cell);
        }

        for (Map<String, Object> m : milestones) {
            table.addCell(dataCell(str(m.get("milestone_nm")), bodyFont));
            table.addCell(dataCell(str(m.get("remark")),       bodyFont));
            table.addCell(dataCell(fmtDate(str(m.get("expected_date"))), bodyFont));
            table.addCell(dataCell(fmtAmount(m.get("amount")), bodyFont));
            table.addCell(dataCell("Y".equals(str(m.get("done_yn"))) ? "완료" : "예정", bodyFont));
        }
        return table;
    }

    private PdfPCell dataCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(4);
        cell.setBorderWidth(0.5f);
        return cell;
    }

    private PdfPTable signatureTable(Font bodyFont) throws Exception {
        PdfPTable table = new PdfPTable(new float[]{1f, 1f, 1f});
        table.setWidthPercentage(60);
        table.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.setSpacingBefore(30);

        for (String role : new String[]{"작성", "검토", "승인"}) {
            PdfPCell cell = new PdfPCell();
            cell.setFixedHeight(60);
            cell.setBorderWidth(0.5f);
            cell.setPadding(6);
            Paragraph p = new Paragraph(role + "\n\n\n", bodyFont);
            p.setAlignment(Element.ALIGN_CENTER);
            cell.addElement(p);
            table.addCell(cell);
        }
        return table;
    }

    // ═══════════════════════════════════════════════
    // DOCX 헬퍼
    // ═══════════════════════════════════════════════

    private void addDocxTitle(XWPFDocument docx, String text) {
        XWPFParagraph p = docx.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingAfter(120);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(22);
        run.setBold(true);
        run.setFontFamily("맑은 고딕");
    }

    private void addDocxSubtitle(XWPFDocument docx, String text) {
        XWPFParagraph p = docx.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingAfter(280);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(10);
        run.setFontFamily("맑은 고딕");
    }

    private void addDocxSectionHeader(XWPFDocument docx, String text) {
        XWPFParagraph p = docx.createParagraph();
        p.setSpacingBefore(200);
        p.setSpacingAfter(80);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(11);
        run.setBold(true);
        run.setFontFamily("맑은 고딕");
    }

    private void addDocxParagraph(XWPFDocument docx, String text) {
        XWPFParagraph p = docx.createParagraph();
        p.setIndentationLeft(200);
        XWPFRun run = p.createRun();
        run.setText(text != null ? text : "");
        run.setFontSize(9);
        run.setFontFamily("맑은 고딕");
    }

    private void addDocxInfoTable(XWPFDocument docx, String[][] rows) {
        XWPFTable table = docx.createTable(rows.length, 2);

        for (int i = 0; i < rows.length; i++) {
            XWPFTableRow row = table.getRow(i);

            XWPFTableCell labelCell = row.getCell(0);
            labelCell.setColor("F0F0F0");
            setDocxCellText(labelCell, rows[i][0], true, 9);

            XWPFTableCell valueCell = row.getCell(1);
            setDocxCellText(valueCell, rows[i][1], false, 9);
        }
    }

    private void addDocxMilestoneTable(XWPFDocument docx, List<Map<String, Object>> milestones) {
        String[] headers = {"유형", "일정명", "예정일", "금액", "완료"};
        XWPFTable table = docx.createTable(milestones.size() + 1, headers.length);

        XWPFTableRow headerRow = table.getRow(0);
        for (int c = 0; c < headers.length; c++) {
            XWPFTableCell cell = headerRow.getCell(c);
            cell.setColor("DCE6F1");
            setDocxCellText(cell, headers[c], true, 9);
        }

        for (int i = 0; i < milestones.size(); i++) {
            Map<String, Object> m = milestones.get(i);
            XWPFTableRow row = table.getRow(i + 1);
            setDocxCellText(row.getCell(0), str(m.get("milestone_nm")), false, 9);
            setDocxCellText(row.getCell(1), str(m.get("remark")),       false, 9);
            setDocxCellText(row.getCell(2), fmtDate(str(m.get("expected_date"))), false, 9);
            setDocxCellText(row.getCell(3), fmtAmount(m.get("amount")), false, 9);
            setDocxCellText(row.getCell(4), "Y".equals(str(m.get("done_yn"))) ? "완료" : "예정", false, 9);
        }
    }

    private void addDocxSignatureTable(XWPFDocument docx) {
        XWPFParagraph spacer = docx.createParagraph();
        spacer.setSpacingBefore(400);

        XWPFTable table = docx.createTable(2, 3);

        String[] roles = {"작성", "검토", "승인"};
        XWPFTableRow headerRow = table.getRow(0);
        for (int c = 0; c < 3; c++) {
            headerRow.getCell(c).setColor("F0F0F0");
            setDocxCellText(headerRow.getCell(c), roles[c], true, 9);
        }

        // 서명 공간 확보
        XWPFTableRow signRow = table.getRow(1);
        for (int c = 0; c < 3; c++) {
            XWPFTableCell cell = signRow.getCell(c);
            for (int l = 0; l < 4; l++) {
                cell.addParagraph();
            }
        }
    }

    private void setDocxCellText(XWPFTableCell cell, String text, boolean bold, int fontSize) {
        XWPFParagraph p = cell.getParagraphs().isEmpty()
            ? cell.addParagraph() : cell.getParagraphs().get(0);
        XWPFRun run = p.getRuns().isEmpty() ? p.createRun() : p.getRuns().get(0);
        run.setText(text != null ? text : "");
        run.setBold(bold);
        run.setFontSize(fontSize);
        run.setFontFamily("맑은 고딕");
    }

    // ═══════════════════════════════════════════════
    // 포맷 유틸
    // ═══════════════════════════════════════════════

    private String str(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private boolean notBlank(Object v) {
        return v != null && !String.valueOf(v).isBlank();
    }

    /** YYYYMMDD → YYYY-MM-DD */
    private String fmtDate(String raw) {
        if (raw == null || raw.length() != 8) return raw == null ? "" : raw;
        return raw.substring(0, 4) + "-" + raw.substring(4, 6) + "-" + raw.substring(6, 8);
    }

    /** YYYYMM → YYYY-MM */
    private String fmtYm(String raw) {
        if (raw == null || raw.length() != 6) return raw == null ? "" : raw;
        return raw.substring(0, 4) + "-" + raw.substring(4, 6);
    }

    private String fmtAmount(Object v) {
        if (v == null) return "0원";
        try {
            BigDecimal bd = v instanceof BigDecimal ? (BigDecimal) v
                          : new BigDecimal(String.valueOf(v));
            return AMOUNT_FMT.format(bd) + "원";
        } catch (Exception e) {
            return str(v) + "원";
        }
    }
}
