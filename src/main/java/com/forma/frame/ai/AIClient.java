package com.forma.frame.ai;

import java.util.Map;

/**
 * 텍스트 LLM 호출 SPI.
 *
 * <p>기본 구현 {@link ClaudeHttpClient} — Anthropic Messages API 직접 호출.
 * OpenAI·Gemini·사내 모델 서버로 교체할 때 같은 타입의 빈을 등록하면 {@code AISpiConfig} 의
 * {@code @ConditionalOnMissingBean} 로 본 기본 빈이 비활성화된다.
 *
 * <p>본 SPI 는 텍스트 입출력 전용. 이미지 등 멀티모달 입력은 현재 범위 밖
 * ({@code CardAnalyzeService} 는 Claude API 를 직접 사용). 멀티모달 수요가 일반화되면
 * 본 인터페이스 확장 또는 별도 SPI 로 분리.
 *
 * <p>도메인 측은 프롬프트 빌드/응답 파싱은 자체 책임이고, "HTTP 호출 + 응답 텍스트 추출" 만
 * 본 SPI 가 책임진다.
 */
public interface AIClient {

    /**
     * 동기 텍스트 호출.
     *
     * @param systemPrompt 시스템 프롬프트(null 가능)
     * @param userMessage 사용자 메시지
     * @param options 공급자별 옵션. 표준 키: {@code "model"}(String), {@code "maxTokens"}(Integer),
     *                {@code "temperature"}(Double). 누락 시 구현체 기본값.
     */
    AIResponse complete(String systemPrompt, String userMessage, Map<String, Object> options);
}
