package com.forma.login;

import com.forma.frame.auth.AuthFailureException;
import com.forma.frame.auth.AuthFailureException.Reason;
import com.forma.frame.auth.LoginUser;
import com.forma.frame.auth.UserAuthProvider;
import com.forma.frame.security.JwtTokenProvider;
import com.forma.login.dto.LoginUserResDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

/**
 * 기본 {@link UserAuthProvider} 구현 — 로컬 DB({@code tb_user}) + BCrypt + 자체 JWT.
 *
 * <p>SSO·LDAP 환경에서는 같은 타입의 빈을 등록하면 {@link AuthSpiConfig} 의
 * {@code @ConditionalOnMissingBean} 로 본 빈이 비활성화된다.
 */
@Slf4j
@RequiredArgsConstructor
public class JwtUserAuthProvider implements UserAuthProvider {

    private final LoginService loginService;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public LoginUser authenticate(String userId, String rawPassword) {
        LoginUserResDto userInfo = loginService.selectUserById(userId);
        if (userInfo == null) {
            throw new AuthFailureException(Reason.USER_NOT_FOUND);
        }
        if (!"Y".equals(userInfo.getUseYn())) {
            throw new AuthFailureException(Reason.INACTIVE);
        }
        if (!loginService.checkPassword(rawPassword, userInfo.getUserPw())) {
            throw new AuthFailureException(Reason.BAD_CREDENTIALS);
        }

        LoginUserVo user = new LoginUserVo();
        user.setUserId(userInfo.getUserId());
        user.setUserName(userInfo.getUserNm());
        user.setUserDeptCode(userInfo.getDeptCode() != null ? userInfo.getDeptCode() : "");
        user.setUserDeptName(userInfo.getDeptName() != null ? userInfo.getDeptName() : "");
        user.setViewAll(loginService.checkViewAll(userId));
        return user;
    }

    @Override
    public LoginUser loadByToken(String token, String clientIp) {
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            return null;
        }
        try {
            Map<String, Object> claims = jwtTokenProvider.parseBody(token);
            LoginUserVo user = new LoginUserVo();
            user.setUserId((String) claims.getOrDefault("userId", ""));
            user.setUserName((String) claims.getOrDefault("userName", ""));
            user.setUserDeptCode((String) claims.getOrDefault("userDeptCode", ""));
            user.setUserDeptName((String) claims.getOrDefault("userDeptName", ""));
            user.setAdmin(Boolean.TRUE.equals(claims.get("admin")));
            user.setViewAll(Boolean.TRUE.equals(claims.get("viewAll")));
            user.setUserIp(clientIp != null ? clientIp : "");
            return user;
        } catch (Exception e) {
            log.debug("Failed to parse JWT token: {}", e.getMessage());
            return null;
        }
    }
}
