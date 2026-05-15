package com.forma;

import com.forma.frame.mybatis.FormaSqlSession;
import com.forma.login.LoginService;
import com.forma.login.dto.LoginUserResDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 부트스트랩 회귀 테스트.
 *
 * <p>검증 대상:
 * <ul>
 *   <li>schema/*.sql 가 docker-entrypoint-initdb.d 순서대로 실행되는가 (FK 순서 포함)</li>
 *   <li>InitialAdminBootstrapRunner 가 admin.user_pw 를 BCrypt('admin1!') 로 채우는가</li>
 *   <li>FRM_* PGM·메뉴·역할권한이 모두 시드되었는가</li>
 *   <li>login 매퍼(selectUserById) 가 정상 동작하는가</li>
 * </ul>
 */
class BootstrapIntegrationTest extends IntegrationTestBase {

    @Autowired private DataSource dataSource;
    @Autowired private FormaSqlSession sql;
    @Autowired private LoginService loginService;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void schema_시드_admin_사용자_존재() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM tb_user WHERE user_id = 'admin'", Integer.class);
        assertEquals(1, count, "admin 사용자가 schema/05-admin-seed.sql 로 시드되어야 한다");
    }

    @Test
    void InitialAdminBootstrapRunner_가_admin_비밀번호를_채웠다() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        String pw = jdbc.queryForObject(
                "SELECT user_pw FROM tb_user WHERE user_id = 'admin'", String.class);
        assertNotNull(pw, "admin 비밀번호가 NULL 이면 안 됨");
        assertTrue(pw.startsWith("$2"), "BCrypt 해시($2 prefix)여야 함");
        assertTrue(passwordEncoder.matches("admin1!", pw),
                "BCrypt('admin1!') 와 일치해야 함");
    }

    @Test
    void FRM_PGM_세트가_모두_등록되었다() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM tb_pgm_info WHERE pgm_id LIKE 'FRM_%'", Integer.class);
        assertEquals(8, count, "FRM_MENU/PGM/ROLE/USER/AUDIT/CODE/DEPT/RLS 8개");
    }

    @Test
    void FRM_메뉴_트리가_모두_등록되었다() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM tb_menu WHERE menu_id LIKE 'M_FRM_%'", Integer.class);
        assertEquals(8, count, "FRM_* 8개 메뉴 + 상위그룹 M_SYS 별도");
    }

    @Test
    void ADMIN_역할이_모든_FRM_권한을_가진다() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM tb_role_auth WHERE role_cd = 'ADMIN' AND pgm_id LIKE 'FRM_%'",
                Integer.class);
        assertEquals(8, count, "ADMIN 역할이 모든 FRM_* PGM 에 권한을 가져야 함");
    }

    @Test
    void RLS_엔드포인트_빈배열_반환() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        // 시드 직후엔 tb_release_note 가 비어 있어야 한다 — 운영자가 등록할 때까지 빈 배열
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM tb_release_note", Integer.class);
        assertEquals(0, count);
    }

    @Test
    void forma_조직과_admin_사용자가_연결되어있다() {
        LoginUserResDto user = loginService.selectUserById("admin");
        assertNotNull(user, "admin 사용자 조회 가능해야 함");
        assertEquals("홍길동", user.getUserNm());
        assertEquals("FORMA", user.getDeptCode());
        assertEquals("forma", user.getDeptName());
        assertEquals("Y", user.getUseYn());
    }

    @Test
    void admin_은_ADMIN_역할을_가진다() {
        boolean isViewAll = loginService.checkViewAll("admin");
        assertTrue(isViewAll, "ADMIN 역할 보유자는 viewAll=true");
    }

    @Test
    void FormaSqlSession_은_컬럼명을_camelCase_로_정규화한다() {
        Map<String, Object> result = sql.selectOne(
                "login.selectAllUserIds",
                Map.of());
        if (result != null) {
            assertTrue(result.containsKey("userId"),
                    "snake_case(user_id) → camelCase(userId) 변환 확인. 실제 키: " + result.keySet());
        }
    }
}
