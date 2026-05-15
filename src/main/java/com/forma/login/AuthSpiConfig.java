package com.forma.login;

import com.forma.frame.auth.UserAuthProvider;
import com.forma.frame.security.JwtTokenProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * FORMA 인증 SPI 의 기본 구현 등록. 프로젝트가 자기 {@link UserAuthProvider} 빈을 등록하면
 * {@link ConditionalOnMissingBean} 로 본 기본 구현은 비활성화된다.
 */
@Configuration
public class AuthSpiConfig {

    @Bean
    @ConditionalOnMissingBean
    public UserAuthProvider userAuthProvider(LoginService loginService, JwtTokenProvider jwtTokenProvider) {
        return new JwtUserAuthProvider(loginService, jwtTokenProvider);
    }
}
