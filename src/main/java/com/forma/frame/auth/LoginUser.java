package com.forma.frame.auth;

/**
 * FORMA 인증 사용자 SPI.
 *
 * <p>기본 구현은 {@code com.forma.login.LoginUserVo}. 프로젝트가 필드를 확장하거나
 * 인증 방식을 갈아끼울 때 이 인터페이스를 구현한 빈 + 별도 SPI(예: {@code UserAuthProvider})
 * 조합으로 교체한다. 자세한 내용은 {@code doc/FORMA-SPI.md} §3.1 참조.
 */
public interface LoginUser {

    String getUserId();

    String getUserName();

    String getUserDeptCode();

    String getUserDeptName();

    String getUserIp();

    boolean isAdmin();

    boolean isViewAll();
}
