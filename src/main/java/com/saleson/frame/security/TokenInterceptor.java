package com.saleson.frame.security;

import com.saleson.frame.auth.DataAuthContext;
import com.saleson.frame.auth.DataAuthService;
import com.saleson.frame.auth.LoginUser;
import com.saleson.frame.auth.UserAuthProvider;
import com.saleson.frame.util.Constants;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class TokenInterceptor implements HandlerInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserAuthProvider userAuthProvider;
    private final DataAuthService dataAuthService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = CookieUtil.getCookieValue(request, Constants.JWT_COOKIE_NAME);

        if (token == null || token.isEmpty()) {
            return handleAuthError(request, response, "token_missing");
        }

        LoginUser user = userAuthProvider.loadByToken(token, request.getRemoteAddr());
        if (user == null) {
            return handleAuthError(request, response, "token_expired");
        }

        try {
            request.setAttribute(Constants.LOGIN_USER_ATTR, user);

            // Auto-renew token if less than 6 hours remaining (JWT 발급 책임은 SPI 외부 — 직접 처리)
            renewTokenIfNeeded(token, user, response);

            // 데이터 권한 컨텍스트 설정
            Map<String, Object> authParams = dataAuthService.buildAuthParams(user);
            DataAuthContext.set(authParams);

            return true;
        } catch (Exception e) {
            log.warn("Failed to set auth context", e);
            return handleAuthError(request, response, "token_expired");
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        DataAuthContext.clear();
    }

    private static final long RENEWAL_THRESHOLD_MILLIS = 6 * 60 * 60 * 1000L; // 6 hours

    /**
     * If the token has less than 6 hours remaining, issue a fresh 24-hour token.
     */
    private void renewTokenIfNeeded(String token, LoginUser user, HttpServletResponse response) {
        try {
            long remaining = jwtTokenProvider.getRemainingMillis(token);
            if (remaining < RENEWAL_THRESHOLD_MILLIS) {
                Map<String, Object> newClaims = Map.of(
                        "userId", user.getUserId(),
                        "userName", user.getUserName(),
                        "userDeptCode", user.getUserDeptCode() != null ? user.getUserDeptCode() : "",
                        "userDeptName", user.getUserDeptName() != null ? user.getUserDeptName() : "",
                        "admin", user.isAdmin(),
                        "viewAll", user.isViewAll()
                );
                String newToken = jwtTokenProvider.createToken(user.getUserId(), newClaims);
                CookieUtil.addCookie(response, Constants.JWT_COOKIE_NAME, newToken, (int) jwtTokenProvider.getValidSeconds());
                log.debug("JWT token renewed for user: {}, remaining was: {}ms", user.getUserId(), remaining);
            }
        } catch (Exception e) {
            log.warn("Failed to renew JWT token", e);
        }
    }

    private boolean handleAuthError(HttpServletRequest request, HttpServletResponse response, String errorCode) throws Exception {
        response.setHeader("error", errorCode);

        if (isAjaxRequest(request)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        } else {
            response.sendRedirect("/login.html?error=" + errorCode);
        }
        return false;
    }

    private boolean isAjaxRequest(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        String xRequested = request.getHeader("X-Requested-With");
        String contentType = request.getHeader("Content-Type");
        return "XMLHttpRequest".equals(xRequested)
                || (accept != null && accept.contains("application/json"))
                || (contentType != null && contentType.contains("application/json"));
    }
}
