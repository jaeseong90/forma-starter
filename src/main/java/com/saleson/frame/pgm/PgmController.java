package com.saleson.frame.pgm;

import com.saleson.frame.auth.LoginUser;
import com.saleson.frame.common.dto.MenuResDto;
import com.saleson.frame.common.dto.PgmAuthResDto;
import com.saleson.frame.common.dto.PgmInfoResDto;
import com.saleson.frame.base.BaseResponse;
import com.saleson.frame.mybatis.FormaSqlSession;
import com.saleson.frame.screen.ScreenRegistry;
import com.saleson.frame.util.Constants;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pgm")
@RequiredArgsConstructor
public class PgmController {

    private final FormaSqlSession sql;
    private final ScreenRegistry screenRegistry;

    @GetMapping("/{pgmId}/init")
    public BaseResponse<Map<String, Object>> init(@PathVariable String pgmId, HttpServletRequest request) {
        Map<String, Object> result = new HashMap<>();

        // 1. PGM 정보
        PgmInfoResDto pgmInfo = sql.selectOne("pgm.selectPgmInfo", Map.of("pgmId", pgmId));
        if (pgmInfo == null && screenRegistry.hasDefinition(pgmId)) {
            result.put("pgmInfo", convertToPgmInfoDto(screenRegistry.getDefinition(pgmId).toPgmInfo()));
        } else if (pgmInfo == null) {
            result.put("pgmInfo", defaultPgmInfo(pgmId));
        } else {
            result.put("pgmInfo", pgmInfo);
        }

        // 2. 권한 조회 — 로그인 사용자 기반
        LoginUser user = (LoginUser) request.getAttribute(Constants.LOGIN_USER_ATTR);

        if (user != null && user.isAdmin()) {
            // 관리자: 전체 권한
            result.put("pgmAuth", fullAuth());
        } else if (user != null) {
            // 일반 사용자: 역할 기반 권한
            PgmAuthResDto pgmAuth = sql.selectOne("login.selectPgmAuthByUser",
                    Map.of("userId", user.getUserId(), "pgmId", pgmId));
            if (pgmAuth != null) {
                result.put("pgmAuth", pgmAuth);
            } else {
                result.put("pgmAuth", noAuth());
            }
        } else {
            // 비로그인: 기본 권한 (조회만)
            result.put("pgmAuth", noAuth());
        }

        return BaseResponse.Ok(result);
    }

    @GetMapping("/menus")
    public BaseResponse<List<MenuResDto>> menus(HttpServletRequest request) {
        LoginUser user = (LoginUser) request.getAttribute(Constants.LOGIN_USER_ATTR);
        if (user == null) {
            return BaseResponse.Warn("로그인이 필요합니다.");
        }

        List<MenuResDto> menus;
        if (user.isAdmin()) {
            menus = sql.selectList("login.selectMenusByUser", Map.of("userId", user.getUserId()));
        } else {
            menus = sql.selectList("login.selectMenusByUser", Map.of("userId", user.getUserId()));
        }
        return BaseResponse.Ok(menus);
    }

    private PgmInfoResDto convertToPgmInfoDto(Map<String, Object> map) {
        PgmInfoResDto dto = new PgmInfoResDto();
        dto.setPgmId((String) map.get("PGM_ID"));
        dto.setPgmNm((String) map.get("PGM_NM"));
        dto.setSrchYn((String) map.get("SRCH_YN"));
        dto.setNewYn((String) map.get("NEW_YN"));
        dto.setSaveYn((String) map.get("SAVE_YN"));
        dto.setDelYn((String) map.get("DEL_YN"));
        dto.setPrntYn((String) map.get("PRNT_YN"));
        dto.setUpldYn((String) map.get("UPLD_YN"));
        dto.setInitYn((String) map.get("INIT_YN"));
        return dto;
    }

    private PgmInfoResDto defaultPgmInfo(String pgmId) {
        PgmInfoResDto info = new PgmInfoResDto();
        info.setPgmId(pgmId);
        info.setPgmNm(pgmId);
        info.setSrchYn("Y");
        info.setNewYn("Y");
        info.setSaveYn("Y");
        info.setDelYn("Y");
        info.setPrntYn("N");
        info.setUpldYn("N");
        info.setInitYn("Y");
        return info;
    }

    private PgmAuthResDto fullAuth() {
        PgmAuthResDto auth = new PgmAuthResDto();
        auth.setSrchYn("Y");
        auth.setNewYn("Y");
        auth.setSaveYn("Y");
        auth.setDelYn("Y");
        auth.setPrntYn("Y");
        auth.setUpldYn("Y");
        auth.setInitYn("Y");
        return auth;
    }

    private PgmAuthResDto noAuth() {
        PgmAuthResDto auth = new PgmAuthResDto();
        auth.setSrchYn("Y");
        auth.setNewYn("N");
        auth.setSaveYn("N");
        auth.setDelYn("N");
        auth.setPrntYn("N");
        auth.setUpldYn("N");
        auth.setInitYn("N");
        return auth;
    }
}
