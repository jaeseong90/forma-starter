package com.forma.frame.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .headers(h -> {
                h.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin);
                h.contentTypeOptions(c -> {});          // X-Content-Type-Options: nosniff
                h.httpStrictTransportSecurity(hsts -> hsts
                        .includeSubDomains(true)
                        .maxAgeInSeconds(31536000));    // HSTS 1년
                h.cacheControl(c -> {});                // Cache-Control: no-cache
            })
            .logout(AbstractHttpConfigurer::disable)
            .csrf(AbstractHttpConfigurer::disable);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
