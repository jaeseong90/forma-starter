package com.forma.login;

import com.forma.login.dto.LoginUserResDto;
import com.forma.frame.mybatis.FormaSqlSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class LoginService {

    private final FormaSqlSession sql;
    private final PasswordEncoder passwordEncoder;

    private final String ns = "login";

    /**
     * 사용자 조회
     */
    public LoginUserResDto selectUserById(String userId) {
        return sql.selectOne(ns + ".selectUserById", Map.of("userId", userId));
    }

    /**
     * 전체조회 권한 여부 (ADMIN 또는 MANAGER role 보유 시 true)
     */
    public boolean checkViewAll(String userId) {
        String yn = sql.selectOne(ns + ".selectViewAll", Map.of("userId", userId));
        return "Y".equals(yn);
    }

    /**
     * 비밀번호 검증 — BCrypt 해시만 허용.
     */
    public boolean checkPassword(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null || storedPassword.isEmpty()) {
            return false;
        }
        if (!storedPassword.startsWith("$2")) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, storedPassword);
    }

    /**
     * 비밀번호 암호화
     */
    public String encodePassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }

    /**
     * 비밀번호 변경
     */
    public void updatePassword(String userId, String encodedPassword) {
        sql.update(ns + ".updatePassword", Map.of("userId", userId, "userPw", encodedPassword));
    }

    /**
     * 로그인 로그 저장
     */
    public void insertLoginLog(String userId, String userIp) {
        sql.insert("common.insertLog", Map.of(
                "logType", "LOGIN",
                "pgmId", "LOGIN",
                "userId", userId,
                "userIp", userIp
        ));
    }
}
