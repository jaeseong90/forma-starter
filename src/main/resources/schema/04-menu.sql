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
    ('M_FRM_AUDIT', '감사로그',       'M_SYS', 'P', 'FRM_AUDIT', '/pages/admin/FRM_AUDIT.html', 70, 'Y')
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
