package com.forma.frame.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.forma.frame.exception.FormaException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class MeetingAiService {

    private static final ObjectMapper mapper = new ObjectMapper();
    private final AIClient aiClient;

    /**
     * 하위 호환용 오버로드
     */
    public Map<String, Object> structureMeetingFull(String rawText, String meetingType) {
        return structureMeetingFull(rawText, meetingType, null, null);
    }

    /**
     * segments 타임라인 + 메타정보를 포함한 고품질 회의록 생성
     */
    public Map<String, Object> structureMeetingFull(String rawText, String meetingType,
                                                     List<Map<String, Object>> segments,
                                                     Map<String, Object> meetingMeta) {
        if (rawText == null || rawText.trim().isEmpty()) {
            throw new FormaException("회의 원문 텍스트가 비어있습니다.");
        }

        String typeDesc = "CUSTOMER".equals(meetingType) ? "고객 미팅" :
                          "DEV".equals(meetingType)      ? "개발 협의" : "내부 회의";

        StringBuilder prompt = new StringBuilder();
        prompt.append("다음은 ").append(typeDesc).append("의 음성 녹취/메모 원문입니다.\n");
        prompt.append("반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 출력하지 마세요.\n\n");

        prompt.append("```json\n")
              .append("{\n")
              .append("  \"summary\": \"1~3줄 핵심 요약\",\n")
              .append("  \"discussion\": [\"논의항목1\", \"논의항목2\"],\n")
              .append("  \"decisions\": [\"결정사항1\", \"결정사항2\"],\n")
              .append("  \"action_items\": [\n")
              .append("    {\"item\": \"할 일 내용\", \"assignee\": \"담당자\", \"due_date\": \"\"}\n")
              .append("  ]\n")
              .append("}\n")
              .append("```\n\n");

        // 핵심 원칙
        prompt.append("## 핵심 원칙 (반드시 준수)\n");
        prompt.append("- 원문에 명시적으로 언급된 내용만 작성하세요. 추론, 해석, 부연설명을 추가하지 마세요.\n");
        prompt.append("- 원문에 없는 내용을 절대 만들어내지 마세요 (할루시네이션 금지).\n");
        prompt.append("- 해당 항목에 적을 내용이 없으면 빈 배열([])을 반환하세요. 억지로 채우지 마세요.\n");
        prompt.append("- 원문이 너무 짧거나 의미 있는 내용이 없으면 summary에 \"요약할 내용이 부족합니다\"라고 작성하세요.\n\n");

        // 회의 유형별 구체적 지침
        prompt.append("## 작성 지침\n");
        prompt.append("- summary: 원문에서 확인되는 핵심만 1~3줄로 요약\n");
        prompt.append("- discussion: 실제 논의된 항목만 배열 (없으면 빈 배열)\n");
        prompt.append("- decisions: 명확히 결정된 사항만 배열 (없으면 빈 배열)\n");
        prompt.append("- action_items: 원문에서 명시적으로 언급된 할 일만. due_date는 YYYYMMDD 형식 또는 빈 문자열\n");
        prompt.append("- assignee: 원문에 언급된 담당자명 (언급 없으면 빈 문자열)\n");
        if ("CUSTOMER".equals(meetingType)) {
            prompt.append("- 거래처의 요구사항, 합의사항, 후속 영업 액션을 중심으로 정리하세요\n");
        } else if ("DEV".equals(meetingType)) {
            prompt.append("- 기술적 결정사항, 일정, 담당자 배분, 리스크/블로커를 중심으로 정리하세요\n");
        } else {
            prompt.append("- 업무 분장, 진행 상황, 이슈와 후속 액션아이템을 중심으로 정리하세요\n");
        }

        // 회의 메타정보
        if (meetingMeta != null) {
            prompt.append("\n## 회의 정보\n");
            String custNm = str(meetingMeta.get("custNm"));
            String bizNm = str(meetingMeta.get("bizNm"));
            String participants = str(meetingMeta.get("participants"));
            if (!custNm.isEmpty()) prompt.append("- 거래처: ").append(custNm).append("\n");
            if (!bizNm.isEmpty()) prompt.append("- 사업명: ").append(bizNm).append("\n");
            if (!participants.isEmpty()) prompt.append("- 참석자: ").append(participants).append("\n");
        }

        // 오늘 날짜
        String today = java.time.LocalDate.now().toString();
        prompt.append("- 오늘 날짜: ").append(today).append(" (due_date 추론 시 참고)\n");

        // 원문 (segments 있으면 타임라인 형식)
        if (segments != null && !segments.isEmpty()) {
            prompt.append("\n## 원문 (타임라인)\n");
            prompt.append(formatSegmentsAsTimeline(segments));
        } else {
            prompt.append("\n## 원문\n").append(rawText);
        }

        AIResponse aiResponse = aiClient.complete(null, prompt.toString(), Map.of("maxTokens", 16000));
        String aiText = aiResponse.getText();

        if (aiResponse.isTruncated()) {
            log.error("AI response truncated by max_tokens. length={}, preview={}",
                    aiText.length(), aiText.substring(0, Math.min(200, aiText.length())));
            throw new FormaException("AI 응답이 길이 제한으로 잘렸습니다. 회의 원문을 줄이거나 구간을 나눠 다시 시도하세요.");
        }

        // JSON 파싱 시도
        try {
            String jsonStr = extractJson(aiText);
            JsonNode node = mapper.readTree(jsonStr);

            String summary = node.path("summary").asText("");
            List<String> discussion = new ArrayList<>();
            List<String> decisions = new ArrayList<>();
            List<Map<String, Object>> actionItems = new ArrayList<>();

            node.path("discussion").forEach(n -> discussion.add(n.asText()));
            node.path("decisions").forEach(n -> decisions.add(n.asText()));
            node.path("action_items").forEach(n -> {
                Map<String, Object> ai = new LinkedHashMap<>();
                ai.put("action_item", n.path("item").asText(""));
                ai.put("assignee", n.path("assignee").asText(""));
                ai.put("due_date", n.path("due_date").asText(""));
                ai.put("status", "TODO");
                actionItems.add(ai);
            });

            String formattedSummary = buildFormattedSummary(summary, discussion, decisions, actionItems);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("ai_summary", formattedSummary);
            result.put("action_items", actionItems);
            return result;

        } catch (FormaException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI structured response parse failed. preview={}",
                    aiText.substring(0, Math.min(500, aiText.length())), e);
            throw new FormaException("AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /**
     * 기존 단순 텍스트 반환 (하위 호환)
     */
    public String structureMeeting(String rawText, String meetingType) {
        Map<String, Object> result = structureMeetingFull(rawText, meetingType);
        return (String) result.get("ai_summary");
    }

    private String extractJson(String text) {
        Pattern fence = Pattern.compile("```(?:json)?\\s*([\\s\\S]+?)```", Pattern.MULTILINE);
        Matcher m = fence.matcher(text);
        if (m.find()) return m.group(1).trim();

        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) return text.substring(start, end + 1);

        return text.trim();
    }

    private String formatSegmentsAsTimeline(List<Map<String, Object>> segments) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> seg : segments) {
            double start = ((Number) seg.get("start")).doubleValue();
            double end = ((Number) seg.get("end")).doubleValue();
            String text = String.valueOf(seg.getOrDefault("text", ""));
            if (text.isEmpty()) continue;
            sb.append("[").append(formatSec(start)).append("~").append(formatSec(end)).append("] ")
              .append(text).append("\n");
        }
        return sb.toString();
    }

    private String formatSec(double seconds) {
        int total = (int) seconds;
        return String.format("%02d:%02d", total / 60, total % 60);
    }

    private String str(Object val) {
        return val != null ? String.valueOf(val).trim() : "";
    }

    private String buildFormattedSummary(String summary, List<String> discussion,
                                          List<String> decisions, List<Map<String, Object>> actionItems) {
        StringBuilder sb = new StringBuilder();
        sb.append("### 회의 요약\n").append(summary).append("\n\n");

        if (!discussion.isEmpty()) {
            sb.append("### 논의 내용\n");
            for (String d : discussion) sb.append("- ").append(d).append("\n");
            sb.append("\n");
        }

        if (!decisions.isEmpty()) {
            sb.append("### 결정 사항\n");
            for (String d : decisions) sb.append("- ").append(d).append("\n");
            sb.append("\n");
        }

        if (!actionItems.isEmpty()) {
            sb.append("### Action Items\n");
            for (Map<String, Object> ai : actionItems) {
                String item = String.valueOf(ai.getOrDefault("action_item", ""));
                String assignee = String.valueOf(ai.getOrDefault("assignee", ""));
                String due = String.valueOf(ai.getOrDefault("due_date", ""));
                sb.append("- [ ] ").append(item);
                if (!assignee.isEmpty()) sb.append(" (").append(assignee).append(")");
                if (!due.isEmpty()) sb.append(" ~").append(due);
                sb.append("\n");
            }
        }

        return sb.toString().trim();
    }
}
