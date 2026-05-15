package com.forma.frame.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * FORMA AI SPI 의 기본 구현 등록. 프로젝트가 자기 {@link AIClient} 빈을 등록하면
 * {@link ConditionalOnMissingBean} 로 본 기본 구현은 비활성화된다.
 */
@Configuration
public class AISpiConfig {

    @Bean
    @ConditionalOnMissingBean
    public AIClient aiClient(
            @Value("${forma.claude.api-key:}") String apiKey,
            @Value("${forma.claude.read-timeout-seconds:90}") long readTimeoutSeconds) {
        return new ClaudeHttpClient(apiKey, readTimeoutSeconds);
    }
}
