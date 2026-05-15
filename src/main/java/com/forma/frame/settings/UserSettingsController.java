package com.forma.frame.settings;

import com.forma.frame.auth.LoginUser;
import com.forma.frame.base.BaseController;
import com.forma.frame.base.BaseResponse;
import com.forma.frame.mybatis.FormaSqlSession;
import com.forma.frame.util.Constants;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 즐겨찾기 + 개인 설정 API
 */
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserSettingsController extends BaseController {

    private final FormaSqlSession sql;

    // ═══ 즐겨찾기 ═══

    @GetMapping("/favorites")
    public BaseResponse<List<Map<String, Object>>> getFavorites(HttpServletRequest request) {
        LoginUser user = getUser(request);
        if (user == null) return BaseResponse.Warn("로그인 필요");
        try {
            return BaseResponse.Ok(sql.selectList("userSettings.selectFavorites", Map.of("userId", user.getUserId())));
        } catch (Exception e) {
            return BaseResponse.Ok(List.of());
        }
    }

    @PostMapping("/favorites/add")
    public BaseResponse<?> addFavorite(@RequestBody Map<String, Object> param, HttpServletRequest request) {
        LoginUser user = getUser(request);
        if (user == null) return BaseResponse.Warn("로그인 필요");
        param.put("userId", user.getUserId());

        // pgm_id가 전달된 경우 menu_id 조회
        if (param.get("pgmId") != null && param.get("menuId") == null) {
            Map<String, Object> menu = sql.selectOne("userSettings.selectMenuIdByPgmId", param);
            if (menu == null) return BaseResponse.Warn("메뉴를 찾을 수 없습니다.");
            param.put("menuId", menu.get("MENU_ID"));
        }

        sql.insert("userSettings.insertFavorite", param);
        return BaseResponse.Ok();
    }

    @PostMapping("/favorites/remove")
    public BaseResponse<?> removeFavorite(@RequestBody Map<String, Object> param, HttpServletRequest request) {
        LoginUser user = getUser(request);
        if (user == null) return BaseResponse.Warn("로그인 필요");
        param.put("userId", user.getUserId());
        sql.delete("userSettings.deleteFavorite", param);
        return BaseResponse.Ok();
    }

    // ═══ 개인 설정 ═══

    @GetMapping("/settings")
    public BaseResponse<Map<String, String>> getSettings(HttpServletRequest request) {
        LoginUser user = getUser(request);
        if (user == null) return BaseResponse.Warn("로그인 필요");
        try {
            List<Map<String, Object>> list = sql.selectList("userSettings.selectSettings",
                    Map.of("userId", user.getUserId()));
            Map<String, String> result = new HashMap<>();
            for (Map<String, Object> row : list) {
                String key = row.get("settingKey") != null ? (String) row.get("settingKey")
                           : row.get("SETTING_KEY") != null ? (String) row.get("SETTING_KEY") : null;
                String val = row.get("settingValue") != null ? (String) row.get("settingValue")
                           : (String) row.get("SETTING_VALUE");
                if (key != null) result.put(key, val);
            }
            return BaseResponse.Ok(result);
        } catch (Exception e) {
            return BaseResponse.Ok(new HashMap<>());
        }
    }

    @PostMapping("/settings")
    public BaseResponse<?> saveSettings(@RequestBody Map<String, String> param, HttpServletRequest request) {
        LoginUser user = getUser(request);
        if (user == null) return BaseResponse.Warn("로그인 필요");
        for (Map.Entry<String, String> entry : param.entrySet()) {
            Map<String, Object> row = new HashMap<>();
            row.put("userId", user.getUserId());
            row.put("settingKey", entry.getKey());
            row.put("settingValue", entry.getValue());
            sql.delete("userSettings.deleteSetting", row);
            sql.insert("userSettings.insertSetting", row);
        }
        return BaseResponse.Ok();
    }

    private LoginUser getUser(HttpServletRequest request) {
        return (LoginUser) request.getAttribute(Constants.LOGIN_USER_ATTR);
    }
}
