package com.saleson.frame.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saleson.frame.exception.FormaException;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 기본 {@link AIClient} 구현 — Anthropic Messages API 직접 호출.
 */
@Slf4j
public class ClaudeHttpClient implements AIClient {

    private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
    private static final String DEFAULT_MODEL = "claude-opus-4-7";
    private static final int DEFAULT_MAX_TOKENS = 4096;
    private static final ObjectMapper mapper = new ObjectMapper();

    private final String apiKey;
    private final OkHttpClient httpClient;

    public ClaudeHttpClient(String apiKey, long readTimeoutSeconds) {
        this.apiKey = apiKey;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(readTimeoutSeconds, TimeUnit.SECONDS)
                .build();
    }

    @Override
    public AIResponse complete(String systemPrompt, String userMessage, Map<String, Object> options) {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new FormaException("Claude API 키가 설정되지 않았습니다.");
        }
        if (userMessage == null || userMessage.isEmpty()) {
            throw new FormaException("AI 입력 메시지가 비어있습니다.");
        }

        String model = strOption(options, "model", DEFAULT_MODEL);
        int maxTokens = intOption(options, "maxTokens", DEFAULT_MAX_TOKENS);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("max_tokens", maxTokens);
        if (systemPrompt != null && !systemPrompt.isEmpty()) {
            body.put("system", systemPrompt);
        }
        if (options != null && options.get("temperature") instanceof Number temp) {
            body.put("temperature", temp.doubleValue());
        }
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "user", "content", userMessage));
        body.put("messages", messages);

        try {
            String requestBody = mapper.writeValueAsString(body);

            Request request = new Request.Builder()
                    .url(CLAUDE_API_URL)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("x-api-key", apiKey)
                    .addHeader("anthropic-version", "2023-06-01")
                    .post(RequestBody.create(requestBody, MediaType.parse("application/json")))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                String responseBody = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) {
                    log.error("Claude API error: {} {}", response.code(), responseBody);
                    throw new FormaException("AI 호출 실패 (API 오류: " + response.code() + ")");
                }
                JsonNode root = mapper.readTree(responseBody);
                JsonNode content = root.path("content");
                String stopReason = root.path("stop_reason").asText("");
                if (content.isArray() && content.size() > 0) {
                    return new AIResponse(content.get(0).path("text").asText(""), stopReason);
                }
                throw new FormaException("AI 응답을 파싱할 수 없습니다.");
            }
        } catch (FormaException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI client error", e);
            throw new FormaException("AI 호출 중 오류: " + e.getMessage());
        }
    }

    private static String strOption(Map<String, Object> options, String key, String fallback) {
        if (options == null) return fallback;
        Object v = options.get(key);
        return v instanceof String s && !s.isEmpty() ? s : fallback;
    }

    private static int intOption(Map<String, Object> options, String key, int fallback) {
        if (options == null) return fallback;
        Object v = options.get(key);
        return v instanceof Number n ? n.intValue() : fallback;
    }
}
