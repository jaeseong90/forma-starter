-- FORMA Starter — V1 (init) : 프레임워크 코어 DDL + 표준 시드 (PostgreSQL)
--
-- 본 파일은 **Flyway** 가 관리한다. 앱 기동 시 spring-boot-starter-flyway 가
-- src/main/resources/db/migration/V*__*.sql 를 버전 순으로 자동 실행한다.
--
-- 모든 문장은 CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING 로 idempotent —
-- v0.5 이전의 docker /docker-entrypoint-initdb.d 방식으로 이미 초기화된 DB 도
-- Flyway baseline 후 본 파일이 재실행되어도 안전.
--
-- 신규 프레임워크 테이블/시드는 V2__..., V3__... 로 추가하라.
-- 도메인(업무) 테이블은 본 파일에 추가하지 말고 프로젝트별 마이그레이션으로 분리.

-- ═══════════════════════════════════════════════
--  공통 코드
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_code_group (
    grp_code VARCHAR(20) NOT NULL PRIMARY KEY,
    grp_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS tb_code (
    grp_code VARCHAR(20) NOT NULL,
    code VARCHAR(20) NOT NULL,
    code_name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    use_yn VARCHAR(1) DEFAULT 'Y',
    attr1 VARCHAR(100),
    attr2 VARCHAR(100),
    attr3 VARCHAR(100),
    PRIMARY KEY (grp_code, code)
);

-- ═══════════════════════════════════════════════
--  사용자 / 조직 / 권한
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_user (
    user_id VARCHAR(20) NOT NULL PRIMARY KEY,
    user_pw VARCHAR(200),
    user_nm VARCHAR(50),
    dept_code VARCHAR(20),
    emp_no VARCHAR(20),
    email VARCHAR(100),
    grade_cd VARCHAR(20),
    use_yn VARCHAR(1) DEFAULT 'Y'
);

CREATE TABLE IF NOT EXISTS tb_dept (
    dept_code VARCHAR(20) NOT NULL PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    parent_code VARCHAR(20),
    dept_level INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    use_yn VARCHAR(1) DEFAULT 'Y',
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_role (
    role_cd VARCHAR(20) NOT NULL PRIMARY KEY,
    role_nm VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    use_yn VARCHAR(1) DEFAULT 'Y',
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_user_role (
    user_id VARCHAR(20) NOT NULL,
    role_cd VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, role_cd)
);

-- ═══════════════════════════════════════════════
--  메뉴 / 프로그램 / 권한 매트릭스
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_pgm_info (
    pgm_id VARCHAR(20) NOT NULL PRIMARY KEY,
    pgm_nm VARCHAR(100) NOT NULL,
    srch_yn VARCHAR(1) DEFAULT 'Y',
    new_yn VARCHAR(1) DEFAULT 'N',
    save_yn VARCHAR(1) DEFAULT 'Y',
    del_yn VARCHAR(1) DEFAULT 'Y',
    prnt_yn VARCHAR(1) DEFAULT 'N',
    upld_yn VARCHAR(1) DEFAULT 'N',
    init_yn VARCHAR(1) DEFAULT 'Y',
    icon VARCHAR(50),
    etc_desc1 VARCHAR(50), etc_desc2 VARCHAR(50), etc_desc3 VARCHAR(50),
    etc_desc4 VARCHAR(50), etc_desc5 VARCHAR(50),
    use_yn VARCHAR(1) DEFAULT 'Y'
);

CREATE TABLE IF NOT EXISTS tb_menu (
    menu_id VARCHAR(20) NOT NULL PRIMARY KEY,
    menu_nm VARCHAR(100) NOT NULL,
    parent_id VARCHAR(20),
    menu_type VARCHAR(10) DEFAULT 'P',  -- G=그룹, P=화면
    pgm_id VARCHAR(20),
    url VARCHAR(200),
    sort_order INT DEFAULT 0,
    use_yn VARCHAR(1) DEFAULT 'Y'
);

CREATE TABLE IF NOT EXISTS tb_role_auth (
    role_cd VARCHAR(20) NOT NULL,
    pgm_id VARCHAR(20) NOT NULL,
    srch_yn VARCHAR(1) DEFAULT 'N',
    new_yn VARCHAR(1) DEFAULT 'N',
    save_yn VARCHAR(1) DEFAULT 'N',
    del_yn VARCHAR(1) DEFAULT 'N',
    prnt_yn VARCHAR(1) DEFAULT 'N',
    upld_yn VARCHAR(1) DEFAULT 'N',
    init_yn VARCHAR(1) DEFAULT 'N',
    etc1_yn VARCHAR(1) DEFAULT 'N',
    etc2_yn VARCHAR(1) DEFAULT 'N',
    etc3_yn VARCHAR(1) DEFAULT 'N',
    PRIMARY KEY (role_cd, pgm_id)
);

CREATE TABLE IF NOT EXISTS tb_data_auth (
    auth_seq BIGSERIAL PRIMARY KEY,
    role_cd VARCHAR(20) NOT NULL,
    auth_type VARCHAR(20) NOT NULL,  -- DEPT / DEPT_SUB / USER / ALL / CUSTOM
    auth_target VARCHAR(100),
    table_name VARCHAR(50),
    description VARCHAR(200)
);

-- ═══════════════════════════════════════════════
--  개인 설정 / 즐겨찾기
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_user_favorite (
    user_id VARCHAR(20) NOT NULL,
    menu_id VARCHAR(20) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, menu_id)
);

CREATE TABLE IF NOT EXISTS tb_user_settings (
    user_id VARCHAR(20) NOT NULL,
    setting_key VARCHAR(50) NOT NULL,
    setting_value VARCHAR(4000),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, setting_key)
);

-- ═══════════════════════════════════════════════
--  로그 / 감사 / 파일
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_log (
    log_seq BIGSERIAL PRIMARY KEY,
    log_type VARCHAR(20),
    pgm_id VARCHAR(20),
    user_id VARCHAR(20),
    user_ip VARCHAR(50),
    log_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_audit_log (
    audit_seq    BIGSERIAL PRIMARY KEY,
    trace_id     VARCHAR(50),
    pgm_id       VARCHAR(20),
    table_name   VARCHAR(50),
    action       VARCHAR(10),
    row_key      VARCHAR(200),
    before_data  TEXT,
    after_data   TEXT,
    user_id      VARCHAR(50),
    user_ip      VARCHAR(50),
    audit_dt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════
--  릴리즈노트 (FRM_RLS / 프론트 forma.releasenote.js 가 사용)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_release_note (
    note_seq      BIGSERIAL PRIMARY KEY,
    version       VARCHAR(20) NOT NULL,
    title         VARCHAR(200) NOT NULL,
    summary       TEXT,
    release_date  VARCHAR(8),                    -- YYYYMMDD
    target        VARCHAR(20) DEFAULT 'DESKTOP', -- DESKTOP / MOBILE / ALL
    use_yn        VARCHAR(1) DEFAULT 'Y',
    sort_order    INT DEFAULT 0,
    created_by    VARCHAR(50),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by    VARCHAR(50),
    updated_at    TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_release_note_target ON tb_release_note(target, use_yn);

CREATE TABLE IF NOT EXISTS tb_release_note_item (
    item_seq      BIGSERIAL PRIMARY KEY,
    note_seq      BIGINT NOT NULL,
    category      VARCHAR(20),                   -- NEW / IMPROVE / BUGFIX / NOTICE
    content       TEXT NOT NULL,
    sort_order    INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_release_note_item_note ON tb_release_note_item(note_seq);

CREATE TABLE IF NOT EXISTS tb_file (
    file_id VARCHAR(50) NOT NULL PRIMARY KEY,
    ref_type VARCHAR(20) NOT NULL,
    ref_id VARCHAR(50) NOT NULL,
    ref_id2 VARCHAR(50),
    ref_id3 VARCHAR(50),
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT DEFAULT 0,
    content_type VARCHAR(100),
    sort_order INT DEFAULT 0,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_file_ref ON tb_file (ref_type, ref_id);

-- ═══════════════════════════════════════════════
--  FK 제약조건 (ON DELETE RESTRICT)
--  IF NOT EXISTS 미지원이므로 DO 블록으로 idempotent 처리
-- ═══════════════════════════════════════════════

DO $$ BEGIN
    BEGIN ALTER TABLE tb_code ADD CONSTRAINT fk_code_group
        FOREIGN KEY (grp_code) REFERENCES tb_code_group(grp_code) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_user ADD CONSTRAINT fk_user_dept
        FOREIGN KEY (dept_code) REFERENCES tb_dept(dept_code) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_user_role ADD CONSTRAINT fk_user_role_user
        FOREIGN KEY (user_id) REFERENCES tb_user(user_id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_user_role ADD CONSTRAINT fk_user_role_role
        FOREIGN KEY (role_cd) REFERENCES tb_role(role_cd) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_menu ADD CONSTRAINT fk_menu_parent
        FOREIGN KEY (parent_id) REFERENCES tb_menu(menu_id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_menu ADD CONSTRAINT fk_menu_pgm
        FOREIGN KEY (pgm_id) REFERENCES tb_pgm_info(pgm_id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_role_auth ADD CONSTRAINT fk_role_auth_role
        FOREIGN KEY (role_cd) REFERENCES tb_role(role_cd) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_role_auth ADD CONSTRAINT fk_role_auth_pgm
        FOREIGN KEY (pgm_id) REFERENCES tb_pgm_info(pgm_id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_data_auth ADD CONSTRAINT fk_data_auth_role
        FOREIGN KEY (role_cd) REFERENCES tb_role(role_cd) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_user_favorite ADD CONSTRAINT fk_user_fav_user
        FOREIGN KEY (user_id) REFERENCES tb_user(user_id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_user_favorite ADD CONSTRAINT fk_user_fav_menu
        FOREIGN KEY (menu_id) REFERENCES tb_menu(menu_id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_user_settings ADD CONSTRAINT fk_user_settings_user
        FOREIGN KEY (user_id) REFERENCES tb_user(user_id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN ALTER TABLE tb_release_note_item ADD CONSTRAINT fk_release_note_item_note
        FOREIGN KEY (note_seq) REFERENCES tb_release_note(note_seq) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
-- FORMA Starter — 도메인 공통 코드 시드
--
-- 본 파일은 프로젝트별 도메인 코드 그룹을 정의한다. starter 는 예시 1건(직급) 만 포함하며,
-- 프레임워크 자체는 어떤 코드 그룹도 강제하지 않는다.
-- 신규 프로젝트는 자기 도메인에 맞춰 본 파일을 채우거나, 별도 마이그레이션 으로 관리하라.

-- 예시: 직급(GRADE) — tb_user.grade_cd 와 연결. 프로젝트 사정에 맞춰 자유롭게 수정/삭제.
INSERT INTO tb_code_group (grp_code, grp_name) VALUES ('GRADE', '직급')
ON CONFLICT (grp_code) DO NOTHING;

INSERT INTO tb_code (grp_code, code, code_name, sort_order, use_yn) VALUES
    ('GRADE', 'CEO',       '대표이사', 1, 'Y'),
    ('GRADE', 'EXECUTIVE', '이사',     2, 'Y'),
    ('GRADE', 'DIRECTOR',  '부장',     3, 'Y'),
    ('GRADE', 'MANAGER',   '차장',     4, 'Y'),
    ('GRADE', 'SENIOR',    '과장',     5, 'Y'),
    ('GRADE', 'JUNIOR',    '대리',     6, 'Y'),
    ('GRADE', 'STAFF',     '사원',     7, 'Y')
ON CONFLICT (grp_code, code) DO NOTHING;
-- FORMA Starter — 표준 프로그램(PGM) 시드 (PostgreSQL)
--
-- 본 파일은 프레임워크가 기본 탑재하는 화면(FRM_*) + 데모 화면(*_DEMO) 의 tb_pgm_info 등록.
-- 도메인 화면은 본 파일에 추가하지 말고 별도 마이그레이션 으로 관리하라.

-- ═══════════════════════════════════════════════
--  표준 관리자 화면 세트 (FRM_*) — 변경/재명명 금지
-- ═══════════════════════════════════════════════

INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn, icon, etc_desc1) VALUES
    ('FRM_MENU',  '메뉴관리',       'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '📋', NULL),
    ('FRM_PGM',   '프로그램관리',   'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '🖥️', NULL),
    ('FRM_ROLE',  '역할/권한관리',  'Y', 'Y', 'Y', 'N', 'N', 'N', 'Y', '🔑', NULL),
    ('FRM_USER',  '사용자관리',     'Y', 'Y', 'Y', 'N', 'N', 'N', 'Y', '🔐', '비밀번호초기화'),
    ('FRM_AUDIT', '감사로그',       'Y', 'N', 'N', 'N', 'N', 'N', 'Y', '📊', NULL),
    ('FRM_CODE',  '코드관리',       'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '🏷️', '코드추가'),
    ('FRM_DEPT',  '조직관리',       'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '🏗️', NULL),
    ('FRM_RLS',   '릴리즈노트관리', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '📣', NULL)
ON CONFLICT (pgm_id) DO NOTHING;

-- ═══════════════════════════════════════════════
--  개발자 가이드 데모 화면
-- ═══════════════════════════════════════════════

INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn, icon) VALUES
    ('GRID_DEMO',  '그리드 데모',        'N', 'N', 'N', 'N', 'N', 'N', 'N', '📊'),
    ('FORM_DEMO',  '폼 데모',            'N', 'N', 'N', 'N', 'N', 'N', 'N', '📝'),
    ('COMP_DEMO',  '컴포넌트 데모',      'N', 'N', 'N', 'N', 'N', 'N', 'N', '🧩'),
    ('SHEET_DEMO', '시트 데모',          'N', 'N', 'N', 'N', 'N', 'N', 'N', '📑'),
    ('FW_DEMO',    '프레임워크 데모',    'N', 'N', 'N', 'N', 'N', 'N', 'N', '🔧')
ON CONFLICT (pgm_id) DO NOTHING;
-- FORMA Starter — 표준 메뉴 시드 (PostgreSQL)
--
-- 본 파일은 프레임워크 기본 탑재 화면(FRM_*) 의 메뉴 트리를 등록한다.
-- 도메인 화면 메뉴는 본 파일에 추가하지 말고 별도 마이그레이션으로 관리하라.

-- ═══════════════════════════════════════════════
--  상위 그룹: 시스템관리
-- ═══════════════════════════════════════════════

INSERT INTO tb_menu (menu_id, menu_nm, parent_id, menu_type, pgm_id, url, sort_order, use_yn)
    VALUES ('M_SYS', '시스템관리', NULL, 'G', NULL, NULL, 100, 'Y')
ON CONFLICT (menu_id) DO NOTHING;

-- ═══════════════════════════════════════════════
--  FRM_* 표준 관리자 화면 메뉴
-- ═══════════════════════════════════════════════

INSERT INTO tb_menu (menu_id, menu_nm, parent_id, menu_type, pgm_id, url, sort_order, use_yn) VALUES
    ('M_FRM_MENU',  '메뉴관리',       'M_SYS', 'P', 'FRM_MENU',  '/pages/admin/FRM_MENU.html',  10, 'Y'),
    ('M_FRM_PGM',   '프로그램관리',   'M_SYS', 'P', 'FRM_PGM',   '/pages/admin/FRM_PGM.html',   20, 'Y'),
    ('M_FRM_ROLE',  '역할/권한관리',  'M_SYS', 'P', 'FRM_ROLE',  '/pages/admin/FRM_ROLE.html',  30, 'Y'),
    ('M_FRM_USER',  '사용자관리',     'M_SYS', 'P', 'FRM_USER',  '/pages/admin/FRM_USER.html',  40, 'Y'),
    ('M_FRM_DEPT',  '조직관리',       'M_SYS', 'P', 'FRM_DEPT',  '/pages/admin/FRM_DEPT.html',  50, 'Y'),
    ('M_FRM_CODE',  '코드관리',       'M_SYS', 'P', 'FRM_CODE',  '/pages/admin/FRM_CODE.html',  60, 'Y'),
    ('M_FRM_AUDIT', '감사로그',       'M_SYS', 'P', 'FRM_AUDIT', '/pages/admin/FRM_AUDIT.html', 70, 'Y'),
    ('M_FRM_RLS',   '릴리즈노트관리', 'M_SYS', 'P', 'FRM_RLS',   '/pages/admin/FRM_RLS.html',   80, 'Y')
ON CONFLICT (menu_id) DO NOTHING;

-- ═══════════════════════════════════════════════
--  개발자 가이드 그룹
-- ═══════════════════════════════════════════════

INSERT INTO tb_menu (menu_id, menu_nm, parent_id, menu_type, pgm_id, url, sort_order, use_yn)
    VALUES ('M_DEV', '개발자 가이드', NULL, 'G', NULL, NULL, 900, 'Y')
ON CONFLICT (menu_id) DO NOTHING;

INSERT INTO tb_menu (menu_id, menu_nm, parent_id, menu_type, pgm_id, url, sort_order, use_yn) VALUES
    ('M_GRID_DEMO',  '그리드 데모',       'M_DEV', 'P', 'GRID_DEMO',  '/pages/dev/GRID_DEMO.html',  10, 'Y'),
    ('M_FORM_DEMO',  '폼 데모',           'M_DEV', 'P', 'FORM_DEMO',  '/pages/dev/FORM_DEMO.html',  20, 'Y'),
    ('M_COMP_DEMO',  '컴포넌트 데모',     'M_DEV', 'P', 'COMP_DEMO',  '/pages/dev/COMP_DEMO.html',  30, 'Y'),
    ('M_SHEET_DEMO', '시트 데모',         'M_DEV', 'P', 'SHEET_DEMO', '/pages/dev/SHEET_DEMO.html', 40, 'Y'),
    ('M_FW_DEMO',    '프레임워크 데모',   'M_DEV', 'P', 'FW_DEMO',    '/pages/dev/FW_DEMO.html',    50, 'Y')
ON CONFLICT (menu_id) DO NOTHING;
-- FORMA Starter — 최초 부트스트랩 시드 (PostgreSQL)
--
-- 본 파일은 컨테이너 첫 기동 시 자동 실행되어 최소 운영 가능한 상태(조직 1건 + ADMIN 역할 +
-- 전체 FRM_* 권한 + 관리자 1명) 를 만든다.
-- 비밀번호는 NULL 로 두며, 애플리케이션 기동 시 InitialAdminBootstrapRunner 가 BCrypt('admin1!')
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
--  user_pw 는 NULL — InitialAdminBootstrapRunner 가 BCrypt('admin1!') 로 채운다.
-- ═══════════════════════════════════════════════

INSERT INTO tb_user (user_id, user_pw, user_nm, dept_code, grade_cd, use_yn)
    VALUES ('admin', NULL, '홍길동', 'FORMA', 'CEO', 'Y')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO tb_user_role (user_id, role_cd)
    VALUES ('admin', 'ADMIN')
ON CONFLICT (user_id, role_cd) DO NOTHING;
