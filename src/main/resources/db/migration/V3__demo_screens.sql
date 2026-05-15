-- FORMA Starter — V3 : 방식 A(YAML) 학습 샘플 화면을 PGM/메뉴/권한에 등록 (PostgreSQL)
--
-- design/screens/DEMO_*.yml 3종을 사이드바 클릭만으로 진입할 수 있게 한다.
-- YAML 엔진(/pages/screen.html?pgm=DEMO_*) 으로 라우팅하므로 별도 컨트롤러·HTML 불필요.
--
-- 실 프로젝트로 들어갈 때 학습 데이터 정리하려면 후속 마이그레이션에서:
--   DELETE FROM tb_menu     WHERE menu_id LIKE 'M_DEMO%';
--   DELETE FROM tb_pgm_info WHERE pgm_id  LIKE 'DEMO_%';
-- (role_auth 는 FK CASCADE 가 없으니 함께 정리)

-- ═══════════════════════════════════════════════
--  PGM
-- ═══════════════════════════════════════════════

INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn, icon) VALUES
    ('DEMO_DEPT',     '부서관리 (학습샘플)',          'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '🏗️'),
    ('DEMO_CUSTOMER', '거래처-담당자 (학습샘플)',     'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '🤝'),
    ('DEMO_BIZ',      '영업기회-마일스톤 (학습샘플)', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', '📈')
ON CONFLICT (pgm_id) DO NOTHING;

-- ═══════════════════════════════════════════════
--  메뉴
-- ═══════════════════════════════════════════════

INSERT INTO tb_menu (menu_id, menu_nm, parent_id, menu_type, pgm_id, url, sort_order, use_yn)
    VALUES ('M_DEMO', '학습샘플 (YAML 화면)', NULL, 'G', NULL, NULL, 800, 'Y')
ON CONFLICT (menu_id) DO NOTHING;

INSERT INTO tb_menu (menu_id, menu_nm, parent_id, menu_type, pgm_id, url, sort_order, use_yn) VALUES
    ('M_DEMO_DEPT',     '부서관리',         'M_DEMO', 'P', 'DEMO_DEPT',     '/pages/screen.html?pgm=DEMO_DEPT',     10, 'Y'),
    ('M_DEMO_CUSTOMER', '거래처-담당자',    'M_DEMO', 'P', 'DEMO_CUSTOMER', '/pages/screen.html?pgm=DEMO_CUSTOMER', 20, 'Y'),
    ('M_DEMO_BIZ',      '영업기회-마일스톤','M_DEMO', 'P', 'DEMO_BIZ',      '/pages/screen.html?pgm=DEMO_BIZ',      30, 'Y')
ON CONFLICT (menu_id) DO NOTHING;

-- ═══════════════════════════════════════════════
--  권한 (ADMIN 에게 모든 DEMO_* 전체 권한)
-- ═══════════════════════════════════════════════

INSERT INTO tb_role_auth (role_cd, pgm_id, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn)
SELECT 'ADMIN', pgm_id, 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'
  FROM tb_pgm_info
 WHERE pgm_id LIKE 'DEMO\_%' ESCAPE '\'
ON CONFLICT (role_cd, pgm_id) DO NOTHING;
