package com.forma.frame.mvc;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.io.IOException;

@Controller
public class FormaErrorController implements ErrorController {

    @RequestMapping("/error")
    public void handleError(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Object statusObj = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = statusObj != null ? Integer.parseInt(statusObj.toString()) : 500;

        // API 요청(/api/**, 컨트롤러 경로)은 JSON 응답
        String uri = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        String accept = request.getHeader("Accept");
        if (uri != null && !uri.endsWith(".html") && (accept == null || !accept.contains("text/html"))) {
            response.setStatus(status);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"resultCode\":\"ERROR\",\"resultMessage\":\"" + status + " Error\"}");
            return;
        }

        // 페이지 요청은 에러 페이지로 리다이렉트
        response.sendRedirect("/error.html?status=" + status);
    }
}
