package com.forma.frame.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.forma.frame.exception.FormaException;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class WhisperService {

    private static final String WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";
    private static final String DEFAULT_HINT = "영업 회의, 견적, 발주, 납기, 거래처, 사업, 프로젝트, 액션아이템, 담당자";
    private static final ObjectMapper mapper = new ObjectMapper();
    private final OkHttpClient httpClient;

    @Value("${forma.openai.api-key:}")
    private String apiKey;

    public WhisperService() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .build();
    }

    /**
     * 하위 호환용 — 단순 텍스트 반환
     */
    public String transcribe(MultipartFile file) {
        Map<String, Object> result = transcribeWithSegments(file, 0, null);
        return (String) result.get("text");
    }

    /**
     * verbose_json으로 segment 타임스탬프 포함 반환 (하위 호환)
     */
    public Map<String, Object> transcribeWithSegments(MultipartFile file, double sessionOffset, String hint) {
        return transcribeWithSegments(file, sessionOffset, hint, null);
    }

    /**
     * verbose_json으로 segment 타임스탬프 포함 반환
     * @param sessionOffset 이전 세션 누적 시간 (초)
     * @param hint STT 품질 향상용 도메인 힌트 (거래처명, 사업명 등)
     * @param prevText 이전 chunk의 마지막 텍스트 (Context Stitching용, 문장 끊김 방지)
     * @return { text, segments: [{start, end, text}], duration }
     */
    public Map<String, Object> transcribeWithSegments(MultipartFile file, double sessionOffset, String hint, String prevText) {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new FormaException("OpenAI API 키가 설정되지 않았습니다.");
        }
        if (file == null || file.isEmpty()) {
            throw new FormaException("음성 파일이 비어있습니다.");
        }

        try {
            String filename = file.getOriginalFilename();
            if (filename == null || filename.isEmpty()) filename = "audio.webm";

            RequestBody fileBody = RequestBody.create(
                    file.getBytes(),
                    okhttp3.MediaType.parse(file.getContentType() != null ? file.getContentType() : "audio/webm")
            );

            MultipartBody.Builder bodyBuilder = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", filename, fileBody)
                    .addFormDataPart("model", "whisper-1")
                    .addFormDataPart("language", "ko")
                    .addFormDataPart("response_format", "verbose_json")
                    .addFormDataPart("timestamp_granularities[]", "segment");

            // 도메인 힌트 + Context Stitching (Whisper prompt 224 토큰 제한 주의)
            String promptHint = buildHint(hint, prevText);
            if (!promptHint.isEmpty()) {
                bodyBuilder.addFormDataPart("prompt", promptHint);
            }

            Request request = new Request.Builder()
                    .url(WHISPER_API_URL)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .post(bodyBuilder.build())
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String body = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) {
                    log.error("Whisper API error: {} {}", response.code(), body);
                    throw new FormaException("음성 변환 실패 (API 오류: " + response.code() + ")");
                }
                return parseVerboseJson(body, sessionOffset);
            }
        } catch (FormaException e) {
            throw e;
        } catch (Exception e) {
            log.error("Whisper transcription error", e);
            throw new FormaException("음성 변환 중 오류: " + e.getMessage());
        }
    }

    private Map<String, Object> parseVerboseJson(String body, double sessionOffset) throws Exception {
        JsonNode root = mapper.readTree(body);
        String fullText = root.path("text").asText("");
        double duration = root.path("duration").asDouble(0.0);

        List<Map<String, Object>> segments = new ArrayList<>();
        root.path("segments").forEach(seg -> {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("start", seg.path("start").asDouble(0.0) + sessionOffset);
            s.put("end", seg.path("end").asDouble(0.0) + sessionOffset);
            s.put("text", seg.path("text").asText("").trim());
            segments.add(s);
        });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("text", fullText);
        result.put("segments", segments);
        result.put("duration", duration);
        return result;
    }

    private String buildHint(String extraHint, String prevText) {
        StringBuilder sb = new StringBuilder(DEFAULT_HINT);
        if (extraHint != null && !extraHint.isBlank()) {
            sb.append(", ").append(extraHint.trim());
        }
        // Context Stitching: 이전 chunk의 마지막 텍스트를 포함하여 문장 끊김 방지
        if (prevText != null && !prevText.isBlank()) {
            String tail = prevText.trim();
            if (tail.length() > 100) tail = tail.substring(tail.length() - 100);
            sb.append("\n").append(tail);
        }
        // Whisper prompt 길이 제한 — 안전하게 500자 이내
        String result = sb.toString();
        return result.length() > 500 ? result.substring(result.length() - 500) : result;
    }
}
