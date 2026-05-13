-- FORMA Starter — 표준 프로그램(PGM) 시드
--
-- 본 파일은 프레임워크가 기본 탑재하는 화면(FRM_*) + 데모 화면(*_DEMO) 의 tb_pgm_info 등록.
-- 도메인 화면은 본 파일에 추가하지 말고 별도 마이그레이션 으로 관리하라.

-- ═══════════════════════════════════════════════
--  표준 관리자 화면 세트 (FRM_*) — 변경/재명명 금지
-- ═══════════════════════════════════════════════

INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('FRM_MENU', '메뉴관리', 'Y', 'Y', 'Y', 'Y', 'Y', '📋');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('FRM_PGM', '프로그램관리', 'Y', 'Y', 'Y', 'Y', 'Y', '🖥️');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('FRM_ROLE', '역할/권한관리', 'Y', 'Y', 'Y', 'N', 'Y', '🔑');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon, etc_desc1)
    VALUES ('FRM_USER', '사용자관리', 'Y', 'Y', 'Y', 'N', 'Y', '🔐', '비밀번호초기화');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('FRM_AUDIT', '감사로그', 'Y', 'N', 'N', 'N', 'Y', '📊');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon, etc_desc1)
    VALUES ('FRM_CODE', '코드관리', 'Y', 'Y', 'Y', 'Y', 'Y', '🏷️', '코드추가');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn, icon)
    VALUES ('FRM_DEPT', '조직관리', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '🏗️');

-- ═══════════════════════════════════════════════
--  개발자 가이드 데모 화면
-- ═══════════════════════════════════════════════

INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('GRID_DEMO', '그리드 데모', 'N', 'N', 'N', 'N', 'N', '📊');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('FORM_DEMO', '폼 데모', 'N', 'N', 'N', 'N', 'N', '📝');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('COMP_DEMO', '컴포넌트 데모', 'N', 'N', 'N', 'N', 'N', '🧩');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('SHEET_DEMO', '시트 데모', 'N', 'N', 'N', 'N', 'N', '📑');
INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon)
    VALUES ('FW_DEMO', '프레임워크 데모', 'N', 'N', 'N', 'N', 'N', '🔧');
