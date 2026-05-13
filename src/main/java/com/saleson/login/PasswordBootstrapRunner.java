package com.saleson.login;

import com.saleson.frame.mybatis.FormaSqlSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 비밀번호 일괄 초기화 1회성 러너.
 * application.yml에서 saleson.security.reset-all-passwords=true 로 켠 뒤 재기동하면
 * 모든 사용자의 user_pw를 BCrypt("1")로 초기화. 완료 후 플래그를 false로 되돌릴 것.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PasswordBootstrapRunner implements CommandLineRunner {

    private final FormaSqlSession sql;
    private final PasswordEncoder passwordEncoder;

    @Value("${saleson.security.reset-all-passwords:false}")
    private boolean resetAll;

    @Value("${saleson.security.reset-all-passwords-value:1}")
    private String resetValue;

    @Override
    public void run(String... args) {
        if (!resetAll) return;

        String encoded = passwordEncoder.encode(resetValue);
        Map<String, Object> param = new HashMap<>();
        param.put("userPw", encoded);

        List<Map<String, Object>> users = sql.selectList("login.selectAllUserIds", Map.of());
        int count = 0;
        for (Map<String, Object> u : users) {
            // FormaSqlSession이 컬럼명을 camelCase로 정규화함 (user_id → userId)
            param.put("userId", u.get("userId"));
            sql.update("admin.resetPassword", param);
            count++;
        }
        log.warn("[SECURITY] 전체 사용자 비밀번호를 '{}' 로 초기화 완료 ({}건). " +
                "운영 전환 시 application.yml 의 saleson.security.reset-all-passwords 를 false 로 되돌릴 것.",
                resetValue, count);
    }
}
