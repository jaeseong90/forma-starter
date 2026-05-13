package com.saleson.frame.aop;

import com.saleson.frame.auth.LoginUser;
import com.saleson.frame.util.Constants;
import com.saleson.login.LoginUserVo;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Map;

@Slf4j
@Aspect
@Component
public class UserInfoAspect {

    @Before("@annotation(com.saleson.frame.annotation.AddUserInfo)")
    public void addUserInfo(JoinPoint joinPoint) {
        LoginUser user = getLoginUser();
        if (user == null) {
            user = LoginUserVo.systemUser();
        }

        for (Object arg : joinPoint.getArgs()) {
            injectUserInfo(arg, user);
        }
    }

    @SuppressWarnings("unchecked")
    private void injectUserInfo(Object target, LoginUser user) {
        if (target instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) target;
            map.put("userId", user.getUserId());
            map.put("userName", user.getUserName());
            map.put("userDept", user.getUserDeptCode());
            map.put("userIp", user.getUserIp());
            map.put("userAdmin", user.isAdmin());
            map.put("userViewAll", user.isViewAll());
        } else if (target instanceof List<?> list) {
            for (Object item : list) {
                injectUserInfo(item, user);
            }
        }
    }

    private LoginUser getLoginUser() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest request = attrs.getRequest();
            return (LoginUser) request.getAttribute(Constants.LOGIN_USER_ATTR);
        } catch (Exception e) {
            return null;
        }
    }
}
