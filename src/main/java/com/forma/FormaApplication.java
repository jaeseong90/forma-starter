package com.forma;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * FORMA Starter 기동점.
 *
 * <p>패키지(`com.forma`) 와 클래스명은 starter 의 출발 값이며, 신규 프로젝트는 IDE Refactor →
 * Rename Package/Class 로 자기 값으로 일괄 변경한다. 자세한 절차는 {@code ONBOARDING.md} §1.
 */
@SpringBootApplication
public class FormaApplication {
    public static void main(String[] args) {
        SpringApplication.run(FormaApplication.class, args);
    }
}
