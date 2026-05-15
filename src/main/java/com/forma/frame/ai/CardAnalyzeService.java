package com.forma.frame.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.forma.frame.exception.FormaException;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class CardAnalyzeService {

    private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
    private static final ObjectMapper mapper = new ObjectMapper();
    private final OkHttpClient httpClient;

    @Value("${forma.claude.api-key:}")
    private String apiKey;

    public CardAnalyzeService() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    public Map<String, String> analyzeCard(String imageBase64) {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new FormaException("Claude API 키가 설정되지 않았습니다.");
        }

        // data:image/jpeg;base64,... 형식에서 base64 부분만 추출
        String base64Data = imageBase64;
        String mediaType = "image/jpeg";
        if (imageBase64.contains(",")) {
            String header = imageBase64.substring(0, imageBase64.indexOf(","));
            base64Data = imageBase64.substring(imageBase64.indexOf(",") + 1);
            if (header.contains("image/png")) mediaType = "image/png";
            else if (header.contains("image/webp")) mediaType = "image/webp";
            else if (header.contains("image/gif")) mediaType = "image/gif";
        }

        try {
            String requestBody = mapper.writeValueAsString(Map.of(
                "model", "claude-opus-4-7",
                "max_tokens", 500,
                "messages", new Object[]{
                    Map.of("role", "user", "content", new Object[]{
                        Map.of(
                            "type", "image",
                            "source", Map.of(
                                "type", "base64",
                                "media_type", mediaType,
                                "data", base64Data
                            )
                        ),
                        Map.of(
                            "type", "text",
                            "text", "이 명함 이미지에서 다음 정보를 추출해주세요. JSON 형식으로만 응답하세요.\n" +
                                    "{\"custNm\":\"회사명\",\"contactNm\":\"이름\",\"position\":\"직위\",\"deptNm\":\"부서\"," +
                                    "\"tel\":\"전화번호\",\"mobile\":\"휴대폰\",\"email\":\"이메일\",\"fax\":\"팩스\"," +
                                    "\"addr\":\"주소\"}\n" +
                                    "정보가 없는 필드는 빈 문자열로 두세요. JSON만 출력하세요."
                        )
                    })
                }
            ));

            Request request = new Request.Builder()
                    .url(CLAUDE_API_URL)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("x-api-key", apiKey)
                    .addHeader("anthropic-version", "2023-06-01")
                    .post(RequestBody.create(requestBody, okhttp3.MediaType.parse("application/json")))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String body = response.body() != null ? response.body().string() : "";

                if (!response.isSuccessful()) {
                    log.error("Claude API error: {} {}", response.code(), body);
                    throw new FormaException("명함 분석 실패 (API 오류: " + response.code() + ")");
                }

                JsonNode root = mapper.readTree(body);
                JsonNode content = root.path("content");
                if (content.isArray() && content.size() > 0) {
                    String text = content.get(0).path("text").asText("");

                    // JSON 블록 추출 (```json ... ``` 또는 { ... })
                    if (text.contains("```")) {
                        text = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
                    }
                    text = text.trim();
                    if (text.startsWith("{")) {
                        JsonNode parsed = mapper.readTree(text);
                        Map<String, String> result = new HashMap<>();
                        parsed.fields().forEachRemaining(e ->
                                result.put(e.getKey(), e.getValue().asText("")));
                        log.info("Card analyzed: {}", result.get("custNm"));
                        return result;
                    }
                }
                throw new FormaException("명함 분석 결과를 파싱할 수 없습니다.");
            }
        } catch (FormaException e) {
            throw e;
        } catch (Exception e) {
            log.error("Card analyze error", e);
            throw new FormaException("명함 분석 중 오류: " + e.getMessage());
        }
    }
}
