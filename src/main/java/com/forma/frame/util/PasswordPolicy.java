package com.forma.frame.util;

/**
 * 비밀번호 정책 검증.
 *
 * 규칙:
 *   1. 길이 8자 이상
 *   2. 영문 / 숫자 / 특수문자 중 2종 이상 조합
 *   3. 사용자 ID와 동일하거나 사용자 ID 포함 금지
 *   4. 동일 문자 4회 이상 연속 금지
 *   5. 공백 포함 금지
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 7;
    public static final int MAX_LENGTH = 64;

    private PasswordPolicy() {}

    /** 검증 결과를 메시지로 반환. null 이면 통과. */
    public static String validate(String pw, String userId) {
        if (pw == null || pw.isEmpty()) return "비밀번호를 입력하세요.";
        if (pw.length() < MIN_LENGTH) return "비밀번호는 " + MIN_LENGTH + "자 이상 입력하세요.";
        if (pw.length() > MAX_LENGTH) return "비밀번호는 " + MAX_LENGTH + "자 이내로 입력하세요.";
        if (pw.contains(" ")) return "비밀번호에 공백을 포함할 수 없습니다.";

        boolean hasAlpha = pw.matches(".*[A-Za-z].*");
        boolean hasDigit = pw.matches(".*[0-9].*");
        boolean hasSpecial = pw.matches(".*[^A-Za-z0-9].*");
        int kinds = (hasAlpha ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSpecial ? 1 : 0);
        if (kinds < 2) {
            return "비밀번호는 영문/숫자/특수문자 중 2종 이상을 조합해야 합니다.";
        }

        if (userId != null && !userId.isEmpty()) {
            String pwLower = pw.toLowerCase();
            String idLower = userId.toLowerCase();
            if (pwLower.equals(idLower) || pwLower.contains(idLower)) {
                return "비밀번호에 사용자 ID를 포함할 수 없습니다.";
            }
        }

        // 동일 문자 4회 이상 연속 (예: aaaa, 1111)
        for (int i = 0; i + 3 < pw.length(); i++) {
            char c = pw.charAt(i);
            if (pw.charAt(i + 1) == c && pw.charAt(i + 2) == c && pw.charAt(i + 3) == c) {
                return "동일한 문자를 4회 이상 연속 사용할 수 없습니다.";
            }
        }

        return null;
    }
}
