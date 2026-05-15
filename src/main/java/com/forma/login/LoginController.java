package com.forma.login;

import com.forma.login.dto.LoginUserResDto;
import com.forma.frame.auth.AuthFailureException;
import com.forma.frame.auth.LoginUser;
import com.forma.frame.auth.UserAuthProvider;
import com.forma.frame.base.BaseResponse;
import com.forma.frame.security.CookieUtil;
import com.forma.frame.security.JwtTokenProvider;
import com.forma.frame.util.Constants;
import com.forma.frame.util.PasswordPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/login")
@RequiredArgsConstructor
public class LoginController {

    private final LoginService loginService;
    private final UserAuthProvider userAuthProvider;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/loginProcess")
    public BaseResponse<?> loginProcess(@RequestBody Map<String, Object> param,
                                        HttpServletResponse response) {
        String userId = (String) param.get("userId");
        String password = (String) param.get("password");

        if (userId == null || userId.isEmpty()) {
            return BaseResponse.Warn("사용자 ID를 입력하세요.");
        }
        if (password == null || password.isEmpty()) {
            return BaseResponse.Warn("비밀번호를 입력하세요.");
        }

        // 1. 인증 (SPI 경유)
        LoginUser user;
        try {
            user = userAuthProvider.authenticate(userId, password);
        } catch (AuthFailureException e) {
            return BaseResponse.Warn(messageFor(e.getReason()));
        }

        // 2. JWT 토큰 생성
        Map<String, Object> claims = Map.of(
                "userId", user.getUserId(),
                "userName", user.getUserName(),
                "userDeptCode", user.getUserDeptCode() != null ? user.getUserDeptCode() : "",
                "userDeptName", user.getUserDeptName() != null ? user.getUserDeptName() : "",
                "viewAll", user.isViewAll()
        );
        String token = jwtTokenProvider.createToken(user.getUserId(), claims);

        // 3. 쿠키 설정 (JWT 유효기간과 동일)
        CookieUtil.addCookie(response, Constants.JWT_COOKIE_NAME, token, (int) jwtTokenProvider.getValidSeconds());

        // 4. 로그인 로그
        try {
            loginService.insertLoginLog(user.getUserId(), (String) param.getOrDefault("userIp", ""));
        } catch (Exception e) {
            log.warn("로그인 로그 저장 실패: {}", e.getMessage());
        }

        log.info("Login success: userId={}", user.getUserId());
        return BaseResponse.Ok(Map.of(
                "userId", user.getUserId(),
                "userName", user.getUserName()
        ));
    }

    private String messageFor(AuthFailureException.Reason reason) {
        switch (reason) {
            case USER_NOT_FOUND:  return "등록되지 않은 사용자입니다.";
            case INACTIVE:        return "비활성화된 계정입니다.";
            case BAD_CREDENTIALS: return "비밀번호가 올바르지 않습니다.";
            default:              return "로그인에 실패했습니다.";
        }
    }

    @PostMapping("/changePassword")
    public BaseResponse<?> changePassword(@RequestBody Map<String, Object> param,
                                          HttpServletRequest request) {
        String currentPassword = (String) param.get("currentPassword");
        String newPassword = (String) param.get("newPassword");

        if (currentPassword == null || currentPassword.isEmpty()) {
            return BaseResponse.Warn("현재 비밀번호를 입력하세요.");
        }
        if (newPassword == null || newPassword.isEmpty()) {
            return BaseResponse.Warn("새 비밀번호를 입력하세요.");
        }

        // Get current user from JWT cookie
        String token = CookieUtil.getCookieValue(request, Constants.JWT_COOKIE_NAME);
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            return BaseResponse.Warn("로그인이 필요합니다.");
        }
        Map<String, Object> claims = jwtTokenProvider.parseBody(token);
        String userId = (String) claims.getOrDefault("userId", "");

        // Verify current password
        LoginUserResDto userInfo = loginService.selectUserById(userId);
        if (userInfo == null) {
            return BaseResponse.Warn("사용자 정보를 찾을 수 없습니다.");
        }
        String storedPw = userInfo.getUserPw();
        if (!loginService.checkPassword(currentPassword, storedPw)) {
            return BaseResponse.Warn("현재 비밀번호가 올바르지 않습니다.");
        }

        // 비밀번호 정책 검증
        String policyError = PasswordPolicy.validate(newPassword, userId);
        if (policyError != null) {
            return BaseResponse.Warn(policyError);
        }
        if (currentPassword.equals(newPassword)) {
            return BaseResponse.Warn("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
        }

        // Encode and update
        String encodedPw = loginService.encodePassword(newPassword);
        loginService.updatePassword(userId, encodedPw);

        log.info("Password changed: userId={}", userId);
        return BaseResponse.Ok("비밀번호가 변경되었습니다.");
    }

    @GetMapping("/logout")
    public void logout(HttpServletResponse response) throws Exception {
        CookieUtil.removeCookie(response, Constants.JWT_COOKIE_NAME);
        response.sendRedirect("/login.html");
    }

    @GetMapping("/userInfo")
    public BaseResponse<?> userInfo(HttpServletRequest request) {
        // /login/** 은 인터셉터 제외이므로 쿠키에서 직접 파싱 (SPI 경유)
        String token = CookieUtil.getCookieValue(request, Constants.JWT_COOKIE_NAME);
        LoginUser user = userAuthProvider.loadByToken(token, request.getRemoteAddr());
        if (user == null) {
            return BaseResponse.Warn("로그인이 필요합니다.");
        }
        return BaseResponse.Ok(Map.of(
                "userId", user.getUserId(),
                "userName", user.getUserName(),
                "deptCode", user.getUserDeptCode(),
                "deptName", user.getUserDeptName(),
                "admin", user.isAdmin()
        ));
    }
}
