package com.forma.frame.admin;

import com.forma.frame.base.BaseController;
import com.forma.frame.base.BaseResponse;
import com.forma.frame.mybatis.FormaSqlSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 화면 API (감사 로그, 사용자/역할/메뉴 관리)
 */
@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController extends BaseController {

    private final FormaSqlSession sql;
    private final PasswordEncoder passwordEncoder;

    // ═══ 감사 로그 ═══

    @PostMapping("/auditLog")
    public BaseResponse<?> selectAuditLog(@RequestBody Map<String, Object> param) {
        try {
            if (param.get("pgmId") != null) param.put("searchPgmId", param.get("pgmId"));
            if (param.get("userId") != null) param.put("searchUserId", param.get("userId"));
            if (param.get("tableName") != null) param.put("searchTableName", param.get("tableName"));
            if (param.get("action") != null) param.put("searchAction", param.get("action"));

            return BaseResponse.Ok(sql.selectList("common.selectAuditLog", param));
        } catch (Exception e) {
            log.error("Audit log query failed", e);
            return BaseResponse.Error("감사로그 조회 실패: " + e.getMessage());
        }
    }

    // ═══ 사용자 관리 ═══

    @PostMapping("/users")
    public BaseResponse<List<Map<String, Object>>> selectUsers(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList("admin.selectUsers", param));
    }

    @PostMapping("/users/save")
    @Transactional
    public BaseResponse<?> saveUsers(@RequestBody List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            String gstat = (String) row.get("gstat");
            // 신규 사용자: 비밀번호 미입력 시 사원번호(없으면 user_id)와 동일하게 세팅 후 BCrypt 저장
            if ("I".equals(gstat)) {
                String userId = (String) row.getOrDefault("userId", "");
                String empNo = (String) row.getOrDefault("empNo", "");
                String rawPw = (String) row.getOrDefault("userPw", "");
                if (rawPw == null || rawPw.isEmpty()) rawPw = (empNo != null && !empNo.isEmpty()) ? empNo : userId;
                row.put("userPw", passwordEncoder.encode(rawPw));
                sql.insert("admin.insertUser", row);
            } else {
                sql.update("admin.updateUser", row);
            }
        }
        return BaseResponse.Ok();
    }

    @PostMapping("/users/resetPassword")
    public BaseResponse<?> resetPassword(@RequestBody Map<String, Object> param) {
        String userId = (String) param.get("userId");
        if (userId == null || userId.isEmpty()) return BaseResponse.Warn("사용자 ID가 필요합니다.");
        // 초기화 규칙: 사원번호로 세팅. 사원번호가 없으면 user_id로 폴백.
        String empNo = sql.selectOne("admin.selectUserEmpNo", Map.of("userId", userId));
        String rawPw = (empNo != null && !empNo.isEmpty()) ? empNo : userId;
        param.put("userPw", passwordEncoder.encode(rawPw));
        sql.update("admin.resetPassword", param);
        String hint = (empNo != null && !empNo.isEmpty()) ? "사원번호" : "사용자ID";
        return BaseResponse.Ok("비밀번호가 초기화되었습니다. (초기 비밀번호: " + hint + "와 동일)");
    }

    @PostMapping("/users/delete")
    @Transactional
    public BaseResponse<?> deleteUsers(@RequestBody List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            sql.delete("admin.deleteUserRoles", row);
            sql.delete("admin.deleteUser", row);
        }
        return BaseResponse.Ok();
    }

    // ═══ 사용자-역할 매핑 ═══

    @PostMapping("/userRoles")
    public BaseResponse<List<Map<String, Object>>> selectUserRoles(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList("admin.selectUserRoles", param));
    }

    @PostMapping("/rolesWithAssign")
    public BaseResponse<List<Map<String, Object>>> selectRolesWithAssign(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList("admin.selectRolesWithAssign", param));
    }

    @PostMapping("/userRoles/save")
    @Transactional
    public BaseResponse<?> saveUserRoles(@RequestBody Map<String, Object> param) {
        String userId = (String) param.get("userId");
        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) param.get("roles");
        sql.delete("admin.deleteUserRoles", Map.of("userId", userId));
        if (roles != null) {
            for (String role : roles) {
                sql.insert("admin.insertUserRole", Map.of("userId", userId, "roleCd", role));
            }
        }
        return BaseResponse.Ok();
    }

    // ═══ 역할 관리 ═══

    @PostMapping("/roles")
    public BaseResponse<List<Map<String, Object>>> selectRoles(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList("admin.selectRoles", param));
    }

    @PostMapping("/roles/save")
    @Transactional
    public BaseResponse<?> saveRoles(@RequestBody List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            if ("I".equals(row.get("gstat"))) {
                sql.insert("admin.insertRole", row);
            } else {
                sql.update("admin.updateRole", row);
            }
        }
        return BaseResponse.Ok();
    }

    @PostMapping("/roles/delete")
    @Transactional
    public BaseResponse<?> deleteRoles(@RequestBody List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            sql.delete("admin.deleteRole", row);
        }
        return BaseResponse.Ok();
    }

    // ═══ 역할-프로그램 권한 ═══

    @PostMapping("/roleAuths")
    public BaseResponse<List<Map<String, Object>>> selectRoleAuths(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList("admin.selectRoleAuths", param));
    }

    @PostMapping("/roleAuths/save")
    @Transactional
    public BaseResponse<?> saveRoleAuths(@RequestBody List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            sql.delete("admin.deleteRoleAuth", row);
            sql.insert("admin.insertRoleAuth", row);
        }
        return BaseResponse.Ok();
    }

    // ═══ 메뉴 관리 ═══

    @PostMapping("/menus")
    public BaseResponse<List<Map<String, Object>>> selectMenus(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList("admin.selectMenus", param));
    }

    @PostMapping("/menus/save")
    @Transactional
    public BaseResponse<?> saveMenus(@RequestBody List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            if ("I".equals(row.get("gstat"))) {
                sql.insert("admin.insertMenu", row);
            } else {
                sql.update("admin.updateMenu", row);
            }
        }
        return BaseResponse.Ok();
    }

    @PostMapping("/menus/delete")
    @Transactional
    public BaseResponse<?> deleteMenus(@RequestBody List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            sql.delete("admin.deleteMenu", row);
        }
        return BaseResponse.Ok();
    }

    // ═══ 프로그램 관리 ═══

    @PostMapping("/programs")
    public BaseResponse<List<Map<String, Object>>> selectPrograms(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList("admin.selectPrograms", param));
    }

    @PostMapping("/programs/save")
    @Transactional
    public BaseResponse<?> savePrograms(@RequestBody List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            String gstat = (String) row.get("gstat");
            if ("I".equals(gstat)) {
                sql.insert("admin.insertProgram", row);
            } else if ("D".equals(gstat)) {
                sql.delete("admin.deleteProgram", row);
            } else {
                sql.update("admin.updateProgram", row);
            }
        }
        return BaseResponse.Ok();
    }

    // ═══ 부서 목록 (콤보용) ═══

    @GetMapping("/depts")
    public BaseResponse<List<Map<String, Object>>> selectDepts() {
        return BaseResponse.Ok(sql.selectList("admin.selectDepts", Map.of()));
    }
}
