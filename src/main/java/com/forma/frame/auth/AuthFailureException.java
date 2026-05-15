package com.forma.frame.auth;

/**
 * 인증 실패 사유를 코드로 전달하는 런타임 예외. {@link UserAuthProvider#authenticate} 에서 던짐.
 */
public class AuthFailureException extends RuntimeException {

    public enum Reason {
        USER_NOT_FOUND,
        INACTIVE,
        BAD_CREDENTIALS
    }

    private final Reason reason;

    public AuthFailureException(Reason reason) {
        super(reason.name());
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
