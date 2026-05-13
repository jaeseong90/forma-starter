package com.saleson.frame.docoutput;

import com.saleson.frame.base.BaseController;
import com.saleson.frame.mybatis.FormaSqlSession;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * 발주서 PDF/DOCX 다운로드 엔드포인트.
 *
 * POST /api/docoutput/po/pdf         { "biz_no": "BIZ-001", "seq": 1 }
 * POST /api/docoutput/po/docx        { "biz_no": "BIZ-001", "seq": 1 }
 */
@Slf4j
@RestController
@RequestMapping("/api/docoutput")
@RequiredArgsConstructor
public class DocOutputController extends BaseController {

    private final DocOutputService docOutputService;
    private final FormaSqlSession  sql;

    // ─── 발주서 ──────────────────────────────────────

    @PostMapping("/po/pdf")
    public void poPdf(@RequestBody Map<String, Object> param,
                      HttpServletResponse response) {
        String bizNo = (String) param.get("biz_no");
        if (bizNo == null || bizNo.isBlank() || param.get("seq") == null) {
            sendError(response, 400, "biz_no, seq 는 필수입니다.");
            return;
        }
        normalizeSeq(param);
        Map<String, Object> data = sql.selectOne("docoutput.selectPoForDoc", param);
        if (data == null) {
            sendError(response, 404, "발주 정보를 찾을 수 없습니다.");
            return;
        }
        List<Map<String, Object>> milestones = sql.selectList("docoutput.selectMilestonesForDoc", param);
        try {
            String fileLabel = bizNo + "_" + param.get("seq");
            String fileName  = URLEncoder.encode("발주서_" + fileLabel + ".pdf", StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");
            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + fileName);
            docOutputService.writePoPdf(data, milestones, response.getOutputStream());
        } catch (Exception e) {
            log.error("발주서 PDF 생성 실패: {}", bizNo, e);
            sendError(response, 500, "발주서 PDF 생성 중 오류가 발생했습니다.");
        }
    }

    @PostMapping("/po/docx")
    public void poDocx(@RequestBody Map<String, Object> param,
                       HttpServletResponse response) {
        String bizNo = (String) param.get("biz_no");
        if (bizNo == null || bizNo.isBlank() || param.get("seq") == null) {
            sendError(response, 400, "biz_no, seq 는 필수입니다.");
            return;
        }
        normalizeSeq(param);
        Map<String, Object> data = sql.selectOne("docoutput.selectPoForDoc", param);
        if (data == null) {
            sendError(response, 404, "발주 정보를 찾을 수 없습니다.");
            return;
        }
        List<Map<String, Object>> milestones = sql.selectList("docoutput.selectMilestonesForDoc", param);
        try {
            String fileLabel = bizNo + "_" + param.get("seq");
            String fileName  = URLEncoder.encode("발주서_" + fileLabel + ".docx", StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");
            response.setContentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + fileName);
            docOutputService.writePoDocx(data, milestones, response.getOutputStream());
        } catch (Exception e) {
            log.error("발주서 DOCX 생성 실패: {}", bizNo, e);
            sendError(response, 500, "발주서 DOCX 생성 중 오류가 발생했습니다.");
        }
    }

    // ─── 유틸 ────────────────────────────────────────

    /** seq 파라미터를 Integer로 정규화 (프론트에서 문자열로 올 수 있음) */
    private void normalizeSeq(Map<String, Object> param) {
        Object seq = param.get("seq");
        if (seq instanceof String) {
            try { param.put("seq", Integer.parseInt((String) seq)); }
            catch (NumberFormatException ignored) {}
        }
    }

    private void sendError(HttpServletResponse response, int status, String message) {
        try {
            response.sendError(status, message);
        } catch (Exception ignored) {}
    }
}
