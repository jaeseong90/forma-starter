package com.saleson.frame.auth;

/**
 * 사용자 인증 SPI.
 *
 * <p>로컬 DB + BCrypt 가 기본 구현({@code JwtUserAuthProvider}). SSO·LDAP·사내 인증 게이트웨이로
 * 교체할 때 같은 타입의 빈을 등록하면 {@code @ConditionalOnMissingBean} 으로 기본 빈이 비활성화된다.
 *
 * <p>토큰 발급(JWT createToken) 자체는 본 SPI 범위 밖 — 토큰 발급 정책은 호출자
 * ({@code LoginController}) 에서 {@code JwtTokenProvider} 를 직접 사용한다.
 * 다음 단계(별도 SPI)에서 토큰 발급도 추출 가능.
 *
 * @see com.saleson.frame.auth.LoginUser
 * @see com.saleson.frame.auth.AuthFailureException
 */
public interface UserAuthProvider {

    /**
     * 자격증명 검증. 성공 시 {@link LoginUser} 반환, 실패 시 {@link AuthFailureException} 던짐.
     * <p>반환된 {@link LoginUser} 의 {@code userIp} 는 비어있을 수 있음(인증 시점엔 클라이언트 IP를
     * 알지 못함). 토큰 발급 후 매 요청마다 {@link #loadByToken(String, String)} 으로 IP 와 함께
     * 복원되는 객체가 실제로 컨텍스트에 들어간다.
     */
    LoginUser authenticate(String userId, String rawPassword) throws AuthFailureException;

    /**
     * 인증 토큰(JWT 등) 파싱 후 {@link LoginUser} 복원. 무효한 토큰이면 {@code null}.
     *
     * @param clientIp 요청 클라이언트 IP. 복원된 {@link LoginUser#getUserIp()} 에 주입된다.
     */
    LoginUser loadByToken(String token, String clientIp);
}
