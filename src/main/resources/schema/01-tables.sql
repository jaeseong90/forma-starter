-- FORMA Starter — 프레임워크 공통 테이블 DDL (PostgreSQL)
--
-- docker-compose.yml 의 postgres 컨테이너 첫 기동 시
-- /docker-entrypoint-initdb.d 로 마운트되어 자동 실행된다.
--
-- 본 파일은 신규 프로젝트가 그대로 적용해도 되는 프레임워크 인프라 테이블만 포함한다.
-- 도메인(업무) 테이블은 본 파일에 추가하지 말고 별도 마이그레이션(schema/migrations/)으로 관리하라.

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
END $$;
