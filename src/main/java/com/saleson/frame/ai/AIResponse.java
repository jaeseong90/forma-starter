package com.saleson.frame.ai;

/**
 * {@link AIClient#complete} 응답.
 */
public class AIResponse {

    private final String text;
    private final String stopReason;

    public AIResponse(String text, String stopReason) {
        this.text = text != null ? text : "";
        this.stopReason = stopReason != null ? stopReason : "";
    }

    public String getText() {
        return text;
    }

    /**
     * 공급자가 반환한 종료 사유. Anthropic 기준 {@code "end_turn"}, {@code "max_tokens"},
     * {@code "stop_sequence"} 등.
     */
    public String getStopReason() {
        return stopReason;
    }

    /**
     * 응답이 토큰 한도로 잘렸는지.
     */
    public boolean isTruncated() {
        return "max_tokens".equals(stopReason);
    }
}
