package com.saleson.frame.migration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Slf4j
@Component
public class StartupMigrationRunner implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public StartupMigrationRunner(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    @Override
    public void run(ApplicationArguments args) {
        addUserGradeColumn();
        seedGradeCodes();
        seedUserGrades();
        dropReportItemSortOrder();
        dropEstimateHistory();
        addSalesApprovalRevisionReason();
        grpRedesignAssetBilling();
        grpPgmRebalance();
    }

    private void grpPgmRebalance() {
        // GRP010 이름 변경 — sidebar 메뉴는 pgm_nm 우선 표시. 그룹사 컨텍스트는 M60(그룹사) 부모가 제공.
        jdbc.update("UPDATE tb_pgm_info SET pgm_nm = '자산관리' WHERE pgm_id = 'GRP010'");

        // 구 GRP020 폐기
        jdbc.update("DELETE FROM tb_role_auth WHERE pgm_id = 'GRP020'");
        jdbc.update("DELETE FROM tb_menu      WHERE pgm_id = 'GRP020'");
        jdbc.update("DELETE FROM tb_pgm_info  WHERE pgm_id = 'GRP020'");

        // GRP011 청구약정관리 등록 (upsert)
        jdbc.update("INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, upld_yn, init_yn, icon) " +
                "VALUES ('GRP011', '청구약정관리', 'Y', 'Y', 'Y', 'Y', 'N', 'Y', '💰') " +
                "ON CONFLICT (pgm_id) DO UPDATE SET pgm_nm = EXCLUDED.pgm_nm");

        // GRP012 연도별 청구조회 등록
        jdbc.update("INSERT INTO tb_pgm_info (pgm_id, pgm_nm, srch_yn, new_yn, save_yn, del_yn, init_yn, icon) " +
                "VALUES ('GRP012', '연도별 청구조회', 'Y', 'N', 'N', 'N', 'Y', '📅') " +
                "ON CONFLICT (pgm_id) DO UPDATE SET pgm_nm = EXCLUDED.pgm_nm");

        // 메뉴 갱신
        jdbc.update("UPDATE tb_menu SET menu_nm = '자산관리' WHERE menu_id = 'M61'");
        // M62 는 구 GRP020(연도별청구) 삭제 단계에서 함께 사라졌을 수 있어 upsert
        jdbc.update("INSERT INTO tb_menu (menu_id, menu_nm, parent_id, menu_type, pgm_id, url, sort_order, use_yn) " +
                "VALUES ('M62', '청구약정관리', 'M60', 'P', 'GRP011', '/pages/group/GRP011.html', 2, 'Y') " +
                "ON CONFLICT (menu_id) DO UPDATE SET menu_nm = EXCLUDED.menu_nm, pgm_id = EXCLUDED.pgm_id, " +
                "url = EXCLUDED.url, sort_order = EXCLUDED.sort_order, use_yn = 'Y'");
        // 기존 M63(매입계약)이 있다면 sort_order 를 4로 밀어 GRP012 자리 확보
        jdbc.update("UPDATE tb_menu SET sort_order = 4 WHERE menu_id = 'M63' AND pgm_id = 'GRP030'");
        jdbc.update("INSERT INTO tb_menu (menu_id, menu_nm, parent_id, menu_type, pgm_id, url, sort_order, use_yn) " +
                "VALUES ('M64', '연도별 청구조회', 'M60', 'P', 'GRP012', '/pages/group/GRP012.html', 3, 'Y') " +
                "ON CONFLICT (menu_id) DO UPDATE SET menu_nm = EXCLUDED.menu_nm, pgm_id = EXCLUDED.pgm_id, " +
                "url = EXCLUDED.url, sort_order = EXCLUDED.sort_order");

        // 역할권한
        jdbc.update("INSERT INTO tb_role_auth (role_cd, pgm_id, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn) " +
                "VALUES ('ADMIN', 'GRP011', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y') " +
                "ON CONFLICT (role_cd, pgm_id) DO NOTHING");
        jdbc.update("INSERT INTO tb_role_auth (role_cd, pgm_id, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn) " +
                "VALUES ('ADMIN', 'GRP012', 'Y', 'N', 'N', 'N', 'N', 'N', 'Y') " +
                "ON CONFLICT (role_cd, pgm_id) DO NOTHING");
        jdbc.update("INSERT INTO tb_role_auth (role_cd, pgm_id, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn) " +
                "VALUES ('GRP_ADMIN', 'GRP011', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y') " +
                "ON CONFLICT (role_cd, pgm_id) DO NOTHING");
        jdbc.update("INSERT INTO tb_role_auth (role_cd, pgm_id, srch_yn, new_yn, save_yn, del_yn, prnt_yn, upld_yn, init_yn) " +
                "VALUES ('GRP_ADMIN', 'GRP012', 'Y', 'N', 'N', 'N', 'N', 'N', 'Y') " +
                "ON CONFLICT (role_cd, pgm_id) DO NOTHING");

        log.info("Startup migration applied: GRP010/011/012 PGM rebalance");

        // 검증: GRP 모듈 메뉴·PGM 현재 상태 출력
        log.info("[GRP 메뉴 상태]");
        jdbc.queryForList("SELECT menu_id, menu_nm, pgm_id, url, sort_order, use_yn FROM tb_menu " +
                "WHERE menu_id='M60' OR parent_id='M60' ORDER BY sort_order, menu_id").forEach(row ->
                log.info("  menu_id={}, nm={}, pgm={}, url={}, sort={}, use={}",
                        row.get("menu_id"), row.get("menu_nm"), row.get("pgm_id"),
                        row.get("url"), row.get("sort_order"), row.get("use_yn")));
        log.info("[GRP PGM 상태]");
        jdbc.queryForList("SELECT pgm_id, pgm_nm FROM tb_pgm_info WHERE pgm_id LIKE 'GRP%' ORDER BY pgm_id")
                .forEach(row -> log.info("  pgm_id={}, nm={}", row.get("pgm_id"), row.get("pgm_nm")));
        log.info("[GRP_ADMIN 권한]");
        jdbc.queryForList("SELECT pgm_id, srch_yn, new_yn, save_yn, del_yn FROM tb_role_auth " +
                "WHERE role_cd='GRP_ADMIN' AND pgm_id LIKE 'GRP%' ORDER BY pgm_id").forEach(row ->
                log.info("  pgm={}, srch={}, new={}, save={}, del={}",
                        row.get("pgm_id"), row.get("srch_yn"), row.get("new_yn"),
                        row.get("save_yn"), row.get("del_yn")));
        log.info("[GRP 테이블 카운트]");
        jdbc.queryForList(
                "SELECT 'tb_group_asset' AS t, COUNT(*) AS c FROM tb_group_asset " +
                "UNION ALL SELECT 'tb_grp_asset', COUNT(*) FROM tb_grp_asset " +
                "UNION ALL SELECT 'tb_grp_billing PRN', COUNT(*) FROM tb_grp_billing WHERE bill_type='PRN' " +
                "UNION ALL SELECT 'tb_grp_billing FIN', COUNT(*) FROM tb_grp_billing WHERE bill_type='FIN' " +
                "UNION ALL SELECT 'tb_grp_billing MNT', COUNT(*) FROM tb_grp_billing WHERE bill_type='MNT'"
        ).forEach(row -> log.info("  {}: {}", row.get("t"), row.get("c")));
    }

    private void grpRedesignAssetBilling() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS tb_grp_asset (" +
                "  asset_seq    BIGSERIAL PRIMARY KEY," +
                "  asset_name   VARCHAR(200) NOT NULL," +
                "  asset_type   VARCHAR(20)," +
                "  intro_ym     VARCHAR(6)," +
                "  intro_amount DECIMAL(15,2) DEFAULT 0," +
                "  vendor       VARCHAR(100)," +
                "  spec         TEXT," +
                "  use_yn       VARCHAR(1) DEFAULT 'Y'," +
                "  note         TEXT," +
                "  created_by   VARCHAR(50)," +
                "  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
                "  updated_by   VARCHAR(50)," +
                "  updated_at   TIMESTAMP" +
                ")");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_grp_asset_type  ON tb_grp_asset(asset_type)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_grp_asset_intro ON tb_grp_asset(intro_ym)");

        jdbc.execute("CREATE TABLE IF NOT EXISTS tb_grp_billing (" +
                "  billing_seq      BIGSERIAL PRIMARY KEY," +
                "  asset_seq        BIGINT REFERENCES tb_grp_asset(asset_seq) ON DELETE CASCADE," +
                "  bill_type        VARCHAR(10) NOT NULL," +
                "  from_ym          VARCHAR(6)," +
                "  to_ym            VARCHAR(6)," +
                "  contract_year    INT," +
                "  base_amount      DECIMAL(15,2)," +
                "  principal_months INT," +
                "  premium_rate     DECIMAL(5,2) DEFAULT 0," +
                "  apply_rate       DECIMAL(6,2)," +
                "  monthly_override DECIMAL(15,2)," +
                "  note             TEXT," +
                "  created_by       VARCHAR(50)," +
                "  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
                "  updated_by       VARCHAR(50)," +
                "  updated_at       TIMESTAMP," +
                "  CONSTRAINT chk_grp_billing_type CHECK (bill_type IN ('PRN','FIN','MNT','ADJ'))" +
                ")");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_grp_billing_asset ON tb_grp_billing(asset_seq)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_grp_billing_type  ON tb_grp_billing(bill_type)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_grp_billing_from  ON tb_grp_billing(from_ym)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_grp_billing_to    ON tb_grp_billing(to_ym)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_grp_billing_year  ON tb_grp_billing(contract_year)");

        // 기존 tb_group_asset 데이터 1회성 이전 (이미 옮긴 행은 건너뜀)
        // intro_ym/bill_from/bill_to 는 'YYYY.MM' 또는 'YYYY' 가 섞여 있을 수 있어
        // 숫자만 남기고 6자 절단한 뒤 6자 미만이면 NULL 처리한다.
        String normYm = "NULLIF(LEFT(regexp_replace(COALESCE(%s,''), '[^0-9]', '', 'g'), 6), '')";
        String introYmN  = String.format(normYm, "g.intro_ym");
        String billFromN = String.format("CASE WHEN length(regexp_replace(COALESCE(g.bill_from,''), '[^0-9]', '', 'g'))>=6 " +
                "THEN LEFT(regexp_replace(g.bill_from, '[^0-9]', '', 'g'), 6) END");
        String billToN   = String.format("CASE WHEN length(regexp_replace(COALESCE(g.bill_to,''), '[^0-9]', '', 'g'))>=6 " +
                "THEN LEFT(regexp_replace(g.bill_to, '[^0-9]', '', 'g'), 6) END");

        // 자산 마스터
        int assetMoved = jdbc.update(
                "INSERT INTO tb_grp_asset (asset_name, asset_type, intro_ym, intro_amount, spec, note, created_by, created_at) " +
                "SELECT COALESCE(g.category, '(이름없음)'), g.asset_type, " + introYmN + ", COALESCE(g.intro_amount, 0), " +
                "       g.description, g.note, g.created_by, g.created_at " +
                "  FROM tb_group_asset g " +
                " WHERE NOT EXISTS (" +
                "   SELECT 1 FROM tb_grp_asset a " +
                "    WHERE a.asset_name = COALESCE(g.category, '(이름없음)') " +
                "      AND COALESCE(a.intro_ym, '') = COALESCE(" + introYmN + ", '') " +
                "      AND COALESCE(a.created_by, '') = COALESCE(g.created_by, '') " +
                " )");

        // PRN 청구라인 — intro_amount > 0
        int prnMoved = jdbc.update(
                "INSERT INTO tb_grp_billing (asset_seq, bill_type, from_ym, to_ym, base_amount, principal_months, premium_rate, created_by, created_at, note) " +
                "SELECT a.asset_seq, 'PRN', " + billFromN + ", " + billToN + ", g.intro_amount, " +
                "  CASE WHEN " + billFromN + " IS NOT NULL AND " + billToN + " IS NOT NULL " +
                "       THEN (CAST(SUBSTRING(" + billToN + ",1,4) AS INT)*12 + CAST(SUBSTRING(" + billToN + ",5,2) AS INT)) " +
                "          - (CAST(SUBSTRING(" + billFromN + ",1,4) AS INT)*12 + CAST(SUBSTRING(" + billFromN + ",5,2) AS INT)) + 1 " +
                "       ELSE 48 END, " +
                "  0, g.created_by, g.created_at, '[migrated] 분할개월=청구개월수 추정' " +
                "  FROM tb_group_asset g " +
                "  JOIN tb_grp_asset a " +
                "    ON a.asset_name = COALESCE(g.category, '(이름없음)') " +
                "   AND COALESCE(a.intro_ym, '') = COALESCE(" + introYmN + ", '') " +
                "   AND COALESCE(a.created_by, '') = COALESCE(g.created_by, '') " +
                " WHERE COALESCE(g.intro_amount, 0) > 0 " +
                "   AND NOT EXISTS (SELECT 1 FROM tb_grp_billing b WHERE b.asset_seq = a.asset_seq AND b.bill_type = 'PRN')");

        // FIN 청구라인 — interest_rate > 0
        int finMoved = jdbc.update(
                "INSERT INTO tb_grp_billing (asset_seq, bill_type, from_ym, to_ym, base_amount, apply_rate, created_by, created_at, note) " +
                "SELECT a.asset_seq, 'FIN', " + billFromN + ", " + billToN + ", g.intro_amount, g.interest_rate, g.created_by, g.created_at, '[migrated]' " +
                "  FROM tb_group_asset g " +
                "  JOIN tb_grp_asset a " +
                "    ON a.asset_name = COALESCE(g.category, '(이름없음)') " +
                "   AND COALESCE(a.intro_ym, '') = COALESCE(" + introYmN + ", '') " +
                "   AND COALESCE(a.created_by, '') = COALESCE(g.created_by, '') " +
                " WHERE COALESCE(g.interest_rate, 0) > 0 AND COALESCE(g.intro_amount, 0) > 0 " +
                "   AND NOT EXISTS (SELECT 1 FROM tb_grp_billing b WHERE b.asset_seq = a.asset_seq AND b.bill_type = 'FIN')");

        // MNT 청구라인 — maint_rate > 0
        int mntMoved = jdbc.update(
                "INSERT INTO tb_grp_billing (asset_seq, bill_type, from_ym, to_ym, base_amount, apply_rate, created_by, created_at, note) " +
                "SELECT a.asset_seq, 'MNT', " + billFromN + ", " + billToN + ", g.intro_amount, g.maint_rate, g.created_by, g.created_at, '[migrated]' " +
                "  FROM tb_group_asset g " +
                "  JOIN tb_grp_asset a " +
                "    ON a.asset_name = COALESCE(g.category, '(이름없음)') " +
                "   AND COALESCE(a.intro_ym, '') = COALESCE(" + introYmN + ", '') " +
                "   AND COALESCE(a.created_by, '') = COALESCE(g.created_by, '') " +
                " WHERE COALESCE(g.maint_rate, 0) > 0 AND COALESCE(g.intro_amount, 0) > 0 " +
                "   AND NOT EXISTS (SELECT 1 FROM tb_grp_billing b WHERE b.asset_seq = a.asset_seq AND b.bill_type = 'MNT')");

        log.info("Startup migration applied: tb_grp_asset/tb_grp_billing created; migrated asset={}, PRN={}, FIN={}, MNT={}",
                assetMoved, prnMoved, finMoved, mntMoved);
    }

    private void addSalesApprovalRevisionReason() {
        jdbc.execute("ALTER TABLE tb_sales_approval ADD COLUMN IF NOT EXISTS revision_reason VARCHAR(200)");
        jdbc.execute("COMMENT ON COLUMN tb_sales_approval.revision_reason IS '새 버전 생성 사유 (createRevision 시점 입력)'");
        log.info("Startup migration applied: tb_sales_approval.revision_reason added (idempotent)");
    }

    private void dropReportItemSortOrder() {
        jdbc.execute("ALTER TABLE tb_report_item DROP COLUMN IF EXISTS sort_order");
        log.info("Startup migration applied: tb_report_item.sort_order dropped (idempotent)");
    }

    private void dropEstimateHistory() {
        jdbc.execute("DROP INDEX IF EXISTS idx_est_hist_biz");
        jdbc.execute("DROP TABLE IF EXISTS tb_estimate_history");
        log.info("Startup migration applied: tb_estimate_history dropped (idempotent)");
    }

    private void addUserGradeColumn() {
        jdbc.execute("ALTER TABLE tb_user ADD COLUMN IF NOT EXISTS grade_cd VARCHAR(20)");
        jdbc.execute("COMMENT ON COLUMN tb_user.grade_cd IS '직급코드 (tb_code GRADE)'");
    }

    private void seedGradeCodes() {
        jdbc.update("INSERT INTO tb_code_group(grp_code, grp_name) VALUES ('GRADE', '직급') "
                + "ON CONFLICT (grp_code) DO NOTHING");

        String upsert = "INSERT INTO tb_code(grp_code, code, code_name, sort_order, use_yn) "
                + "VALUES (?, ?, ?, ?, 'Y') "
                + "ON CONFLICT (grp_code, code) DO UPDATE "
                + "SET code_name = EXCLUDED.code_name, sort_order = EXCLUDED.sort_order, use_yn = EXCLUDED.use_yn";

        Object[][] rows = {
                {"GRADE", "CEO",       "대표이사", 1},
                {"GRADE", "EXECUTIVE", "이사",     2},
                {"GRADE", "DIRECTOR",  "부장",     3},
                {"GRADE", "MANAGER",   "차장",     4},
                {"GRADE", "SENIOR",    "과장",     5},
                {"GRADE", "JUNIOR",    "대리",     6},
                {"GRADE", "STAFF",     "사원",     7}
        };
        for (Object[] r : rows) jdbc.update(upsert, r);

        log.info("Startup migration applied: tb_user.grade_cd + GRADE codes (idempotent)");
    }

    private void seedUserGrades() {
        String sql = "UPDATE tb_user u SET grade_cd = ? "
                + "FROM tb_dept d "
                + "WHERE u.dept_code = d.dept_code "
                + "AND d.dept_name = ? AND u.user_nm = ? "
                + "AND u.grade_cd IS NULL";

        Object[][] rows = {
                // 경영지원팀
                {"MANAGER",  "경영지원팀", "이슬"},
                {"SENIOR",   "경영지원팀", "백혜지"},
                {"JUNIOR",   "경영지원팀", "송채헌"},
                {"STAFF",    "경영지원팀", "김은지"},
                // R&D팀
                {"MANAGER",  "R&D팀",     "차선명"},
                {"SENIOR",   "R&D팀",     "이경환"},
                {"SENIOR",   "R&D팀",     "박재성"},
                // 인프라팀
                {"DIRECTOR", "인프라팀",   "김중욱"},
                {"DIRECTOR", "인프라팀",   "표창식"},
                {"DIRECTOR", "인프라팀",   "김원규"},
                {"MANAGER",  "인프라팀",   "황지환"},
                {"MANAGER",  "인프라팀",   "이승석"},
                {"JUNIOR",   "인프라팀",   "전재영"},
                {"STAFF",    "인프라팀",   "최규현"},
                // 영업팀
                {"MANAGER",  "영업팀",     "이광운"},
                {"MANAGER",  "영업팀",     "백창훈"},
                {"SENIOR",   "영업팀",     "송수정"},
                {"SENIOR",   "영업팀",     "박소윤"},
                {"JUNIOR",   "영업팀",     "신효란"},
                // 개발1팀
                {"DIRECTOR", "개발1팀",    "정의열"},
                {"MANAGER",  "개발1팀",    "이철환"},
                {"MANAGER",  "개발1팀",    "최주석"},
                {"SENIOR",   "개발1팀",    "김재환"},
                {"JUNIOR",   "개발1팀",    "이민석"},
                {"JUNIOR",   "개발1팀",    "임희정"},
                {"JUNIOR",   "개발1팀",    "하경훈"},
                {"JUNIOR",   "개발1팀",    "성봉규"},
                {"JUNIOR",   "개발1팀",    "이상협"},
                {"STAFF",    "개발1팀",    "김나현"},
                // 개발2팀
                {"MANAGER",  "개발2팀",    "김혁무"},
                {"JUNIOR",   "개발2팀",    "김동현"},
                {"JUNIOR",   "개발2팀",    "안상균"},
                {"JUNIOR",   "개발2팀",    "김민수"},
                {"JUNIOR",   "개발2팀",    "이효진"},
                {"STAFF",    "개발2팀",    "조윤지"},
                // 개발3팀
                {"MANAGER",  "개발3팀",    "마종희"},
                {"MANAGER",  "개발3팀",    "김동현"},
                {"SENIOR",   "개발3팀",    "임동현"},
                {"SENIOR",   "개발3팀",    "사경진"},
                {"SENIOR",   "개발3팀",    "이경현"},
                {"SENIOR",   "개발3팀",    "한승희"},
                {"JUNIOR",   "개발3팀",    "송진우"},
                {"STAFF",    "개발3팀",    "오병주"},
                {"STAFF",    "개발3팀",    "홍서현"},
                // 개발4팀
                {"DIRECTOR", "개발4팀",    "이승한"},
                {"SENIOR",   "개발4팀",    "오유경"},
                {"SENIOR",   "개발4팀",    "김애경"},
                {"SENIOR",   "개발4팀",    "윤명현"},
                {"JUNIOR",   "개발4팀",    "김규남"},
                {"JUNIOR",   "개발4팀",    "이한샘"},
                {"JUNIOR",   "개발4팀",    "최세훈"},
                {"JUNIOR",   "개발4팀",    "이수진"},
                {"JUNIOR",   "개발4팀",    "박성현"},
                {"STAFF",    "개발4팀",    "김효진"},
                // 개발5팀
                {"DIRECTOR", "개발5팀",    "권옥근"},
                {"SENIOR",   "개발5팀",    "김남훈"},
                {"SENIOR",   "개발5팀",    "황재민"},
                {"JUNIOR",   "개발5팀",    "김종국"},
                {"JUNIOR",   "개발5팀",    "이동준"},
                {"JUNIOR",   "개발5팀",    "황윤진"},
                {"JUNIOR",   "개발5팀",    "최기석"},
                {"STAFF",    "개발5팀",    "김대현"},
                {"STAFF",    "개발5팀",    "임한준"}
        };

        int updated = 0;
        for (Object[] r : rows) updated += jdbc.update(sql, r);
        log.info("Startup migration applied: tb_user.grade_cd seed = {} rows", updated);
    }
}
