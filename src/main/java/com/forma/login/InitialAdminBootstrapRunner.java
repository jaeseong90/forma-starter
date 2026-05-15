package com.forma.login;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * 초기 관리자 계정 비밀번호 부트스트랩.
 *
 * <p>schema/05-admin-seed.sql 는 user_pw 를 NULL 로 두고 사용자(admin/홍길동)만 만든다.
 * 정적 BCrypt 해시를 SQL 시드에 박아두지 않으려는 의도이며, 본 러너가 기동 시 user_pw 가
 * 비어 있는 admin 행에 BCrypt('forma21') 를 채워준다.
 *
 * <p>이미 비밀번호가 설정돼 있으면 아무 일도 하지 않는다 — 안전하게 매 기동마다 호출 가능.
 * 최초 로그인 후 비밀번호 변경 권장.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InitialAdminBootstrapRunner implements ApplicationRunner {

    private final DataSource dataSource;
    private final PasswordEncoder passwordEncoder;

    @Value("${forma.security.initial-admin-pw:forma21}")
    private String initialAdminPw;

    @Override
    public void run(ApplicationArguments args) {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);

        Integer count;
        try {
            count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM tb_user WHERE user_id = 'admin' AND user_pw IS NULL",
                    Integer.class);
        } catch (Exception e) {
            log.warn("InitialAdminBootstrap: tb_user 조회 실패 — 스키마 초기화 전이거나 접근 불가. 스킵. ({})",
                    e.getMessage());
            return;
        }

        if (count == null || count == 0) return;

        String encoded = passwordEncoder.encode(initialAdminPw);
        jdbc.update("UPDATE tb_user SET user_pw = ? WHERE user_id = 'admin' AND user_pw IS NULL", encoded);
        log.warn("[InitialAdminBootstrap] admin 비밀번호를 초기값('{}') 으로 설정. 최초 로그인 후 변경하세요.",
                initialAdminPw);
    }
}
