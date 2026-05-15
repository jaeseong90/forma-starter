package com.forma.frame.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class PasswordPolicyTest {

    @Test
    void 통과_영문숫자조합_7자() {
        assertNull(PasswordPolicy.validate("abcd123", "admin"));
    }

    @Test
    void 통과_영문특수문자조합() {
        assertNull(PasswordPolicy.validate("admin1!", "alice"));
    }

    @Test
    void 실패_NULL_또는_빈값() {
        assertNotNull(PasswordPolicy.validate(null, "u"));
        assertNotNull(PasswordPolicy.validate("", "u"));
    }

    @Test
    void 실패_최소길이_미만() {
        assertNotNull(PasswordPolicy.validate("abc12", "u"));
    }

    @Test
    void 실패_공백_포함() {
        assertNotNull(PasswordPolicy.validate("abcd 12", "u"));
    }

    @Test
    void 실패_한_종류만() {
        assertNotNull(PasswordPolicy.validate("abcdefgh", "u"));
        assertNotNull(PasswordPolicy.validate("12345678", "u"));
    }

    @Test
    void 실패_사용자ID_포함() {
        assertNotNull(PasswordPolicy.validate("admin123", "admin"));
    }

    @Test
    void 실패_동일문자_4회_연속() {
        assertNotNull(PasswordPolicy.validate("aaaa1234", "u"));
        assertNotNull(PasswordPolicy.validate("ab1111cd", "u"));
    }

    @Test
    void 실패_최대길이_초과() {
        String tooLong = "a".repeat(65) + "1";
        assertNotNull(PasswordPolicy.validate(tooLong, "u"));
    }
}
