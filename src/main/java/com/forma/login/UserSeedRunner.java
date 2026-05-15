package com.forma.login;

import com.forma.frame.mybatis.FormaSqlSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 1회성: tb_user에 emp_no/email 컬럼을 확보(IF NOT EXISTS)하고,
 * seed/users.tsv 파일의 이메일 prefix(@ 앞)로 user_id를 매칭하여
 * emp_no/email/비밀번호(BCrypt(empNo))를 UPDATE한다. admin 비번은 별도 값으로 설정.
 * 완료 후 forma.security.seed-users 플래그를 false로 되돌릴 것.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserSeedRunner implements CommandLineRunner {

    private final FormaSqlSession sql;
    private final PasswordEncoder passwordEncoder;
    private final DataSource dataSource;

    @Value("${forma.security.seed-users:false}")
    private boolean enabled;

    @Value("${forma.security.seed-users-admin-pw:admin1!}")
    private String adminPw;

    @Override
    public void run(String... args) throws Exception {
        if (!enabled) return;

        // 1) 컬럼 확보 (idempotent)
        try (Connection c = dataSource.getConnection(); Statement s = c.createStatement()) {
            s.execute("ALTER TABLE tb_user ADD COLUMN IF NOT EXISTS emp_no VARCHAR(20)");
            s.execute("ALTER TABLE tb_user ADD COLUMN IF NOT EXISTS email VARCHAR(100)");
        }

        // 2) seed 데이터 로드
        int updated = 0, notFound = 0;
        ClassPathResource res = new ClassPathResource("seed/users.tsv");
        try (BufferedReader br = new BufferedReader(new InputStreamReader(res.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] cols = line.split("\t");
                if (cols.length < 4) { log.warn("seed skip(malformed): {}", line); continue; }
                String empNo = cols[0].trim();
                String email = cols[3].trim();
                int at = email.indexOf('@');
                if (at <= 0) { log.warn("seed skip(bad email): {}", email); continue; }
                String userId = email.substring(0, at);

                Map<String, Object> param = new HashMap<>();
                param.put("userId", userId);
                param.put("empNo", empNo);
                param.put("email", email);
                param.put("userPw", passwordEncoder.encode(empNo));
                int n = sql.update("admin.updateUserEmpEmailPw", param);
                if (n > 0) updated++;
                else {
                    notFound++;
                    log.warn("seed: user_id '{}' not found (empNo={}, name={})", userId, empNo, cols[2]);
                }
            }
        }

        // 3) admin 비밀번호 별도 설정
        Map<String, Object> adminParam = new HashMap<>();
        adminParam.put("userId", "admin");
        adminParam.put("userPw", passwordEncoder.encode(adminPw));
        sql.update("admin.updateAdminPw", adminParam);

        log.warn("[SEED-USERS] tb_user emp_no/email/pw 업데이트 완료 — updated={}, notFound={}, admin pw set. " +
                "application.yml 의 forma.security.seed-users 를 false 로 되돌릴 것.", updated, notFound);
    }
}
