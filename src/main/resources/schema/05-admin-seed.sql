-- FORMA Starter — 최초 부트스트랩 시드 (PostgreSQL)
--
-- 본 파일은 컨테이너 첫 기동 시 자동 실행되어 최소 운영 가능한 상태(조직 1건 + ADMIN 역할 +
-- 전체 FRM_* 권한 + 관리자 1명) 를 만든다.
-- 비밀번호는 NULL 로 두며, 애플리케이션 기동 시 InitialAdminBootstrapRunner 가 BCrypt('forma21')
-- 로 채운다. (정적 BCrypt 해시를 시드에 박지 않기 위함.)

-- ═══════════════════════════════════════════════
--  조직 (forma)
-- ═══════════════════════════════════════════════

INSERT INTO tb_dept (dept_code, dept_name, parent_code, dept_level, sort_order, use_yn, created_by, created_at)
    VALUES ('FORMA', 'forma', NULL, 0, 1, 'Y', 'system', CURRENT_TIMESTAMP)
ON CONFLICT (dept_code) DO NOTHING;

-- ═══════════════════════════════════════════════
--  역할 (ADMIN)
-- ═══════════════════════════════════════════════

INSERT INTO tb_role (role_cd, role_nm, description, use_yn, created_by, created_at)
    VALUES ('ADMIN', '관리자', '전체 권한', 'Y', 'system', CURRENT_TIMESTAMP)
ON CONFLICT (role_cd) DO NOTHING;

-- ═══════════════════════════════════════════════
--  ADMIN 역할의 FRM_* 권한 (전체 허용)
-- ═══════════════════════════════════════════════

INSERT INTO tb_role_auth (role_cd, pgm_id, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn)
SELECT 'ADMIN', pgm_id, 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'
  FROM tb_pgm_info
 WHERE pgm_id LIKE 'FRM_%'
ON CONFLICT (role_cd, pgm_id) DO NOTHING;

INSERT INTO tb_role_auth (role_cd, pgm_id, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn)
SELECT 'ADMIN', pgm_id, 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'
  FROM tb_pgm_info
 WHERE pgm_id LIKE '%_DEMO'
ON CONFLICT (role_cd, pgm_id) DO NOTHING;

-- ═══════════════════════════════════════════════
--  데이터 권한 (전체)
-- ═══════════════════════════════════════════════

INSERT INTO tb_data_auth (role_cd, auth_type, auth_target, table_name, description)
SELECT 'ADMIN', 'ALL', NULL, NULL, '관리자 전체 데이터 권한'
 WHERE NOT EXISTS (SELECT 1 FROM tb_data_auth WHERE role_cd = 'ADMIN' AND auth_type = 'ALL');

-- ═══════════════════════════════════════════════
--  최초 관리자 사용자 (admin / 홍길동)
--  user_pw 는 NULL — InitialAdminBootstrapRunner 가 BCrypt('forma21') 로 채운다.
-- ═══════════════════════════════════════════════

INSERT INTO tb_user (user_id, user_pw, user_nm, dept_code, grade_cd, use_yn)
    VALUES ('admin', NULL, '홍길동', 'FORMA', 'CEO', 'Y')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO tb_user_role (user_id, role_cd)
    VALUES ('admin', 'ADMIN')
ON CONFLICT (user_id, role_cd) DO NOTHING;
