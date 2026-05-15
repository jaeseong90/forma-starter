-- FORMA Starter — V2 : 방식 A(YAML) 학습 샘플 테이블/시드 (PostgreSQL)
--
-- design/screens/DEMO_*.yml 세 화면이 실제로 동작하도록 도메인 테이블·코드그룹·더미 데이터를 추가.
-- DEMO_DEPT 는 tb_dept(V1) 를 사용하므로 본 마이그레이션 대상이 아니다.
--
-- 대상 화면:
--   DEMO_CUSTOMER  (split-detail) → tb_customer / tb_customer_contact
--   DEMO_BIZ       (master-detail) → tb_business / tb_business_milestone
--
-- 프로젝트 시작 시 본 데모 데이터가 거슬리면 V3 로 DROP/TRUNCATE 추가하거나 use_yn='N' 처리.

-- ═══════════════════════════════════════════════
--  거래처 (DEMO_CUSTOMER 마스터)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_customer (
    cust_cd    VARCHAR(20)  NOT NULL PRIMARY KEY,
    cust_nm    VARCHAR(200) NOT NULL,
    cust_type  VARCHAR(20),
    biz_no     VARCHAR(20),
    ceo_nm     VARCHAR(50),
    tel        VARCHAR(50),
    address    VARCHAR(300),
    buy_yn     VARCHAR(1) DEFAULT 'Y',
    sell_yn    VARCHAR(1) DEFAULT 'Y',
    use_yn     VARCHAR(1) DEFAULT 'Y',
    remark     TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_nm ON tb_customer(cust_nm);

CREATE TABLE IF NOT EXISTS tb_customer_contact (
    cust_cd     VARCHAR(20) NOT NULL,
    seq         INT NOT NULL,
    contact_nm  VARCHAR(100),
    dept_nm     VARCHAR(100),
    position    VARCHAR(100),
    tel         VARCHAR(50),
    mobile      VARCHAR(50),
    email       VARCHAR(100),
    is_primary  VARCHAR(1) DEFAULT 'N',
    created_by  VARCHAR(50),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by  VARCHAR(50),
    updated_at  TIMESTAMP,
    PRIMARY KEY (cust_cd, seq)
);

DO $$ BEGIN
    BEGIN ALTER TABLE tb_customer_contact ADD CONSTRAINT fk_customer_contact_cust
        FOREIGN KEY (cust_cd) REFERENCES tb_customer(cust_cd) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══════════════════════════════════════════════
--  영업기회 (DEMO_BIZ 마스터)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_business (
    biz_no            VARCHAR(20) NOT NULL PRIMARY KEY,
    biz_nm            VARCHAR(250) NOT NULL,
    cust_cd           VARCHAR(20),
    stage             VARCHAR(20),
    probability       INT,
    owner_id          VARCHAR(20),
    owner_nm          VARCHAR(50),
    plan_from         VARCHAR(6),    -- YYYYMM
    plan_to           VARCHAR(6),
    plan_order_amt    DECIMAL(15,2) DEFAULT 0,
    actual_order_amt  DECIMAL(15,2) DEFAULT 0,
    remark            TEXT,
    created_by        VARCHAR(50),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by        VARCHAR(50),
    updated_at        TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_business_cust ON tb_business(cust_cd);
CREATE INDEX IF NOT EXISTS idx_business_stage ON tb_business(stage);

CREATE TABLE IF NOT EXISTS tb_business_milestone (
    biz_no          VARCHAR(20) NOT NULL,
    seq             INT NOT NULL,
    milestone_type  VARCHAR(20),
    milestone_nm    VARCHAR(200) NOT NULL,
    milestone_ym    VARCHAR(6),
    expected_date   DATE,
    actual_date     DATE,
    amount          DECIMAL(15,2) DEFAULT 0,
    done_yn         VARCHAR(1) DEFAULT 'N',
    owner_id        VARCHAR(20),
    owner_nm        VARCHAR(50),
    remark          TEXT,
    created_by      VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by      VARCHAR(50),
    updated_at      TIMESTAMP,
    PRIMARY KEY (biz_no, seq)
);

DO $$ BEGIN
    BEGIN ALTER TABLE tb_business_milestone ADD CONSTRAINT fk_milestone_biz
        FOREIGN KEY (biz_no) REFERENCES tb_business(biz_no) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══════════════════════════════════════════════
--  코드 그룹 (DEMO_CUSTOMER/BIZ 의 select·combo widget 이 참조)
-- ═══════════════════════════════════════════════

INSERT INTO tb_code_group (grp_code, grp_name) VALUES
    ('CUST_TYPE',      '거래처유형'),
    ('BIZ_STAGE',      '영업단계'),
    ('MILESTONE_TYPE', '마일스톤유형')
ON CONFLICT (grp_code) DO NOTHING;

INSERT INTO tb_code (grp_code, code, code_name, sort_order, use_yn) VALUES
    ('CUST_TYPE', 'BUY',     '매입처',     1, 'Y'),
    ('CUST_TYPE', 'SELL',    '매출처',     2, 'Y'),
    ('CUST_TYPE', 'BOTH',    '매입/매출',  3, 'Y'),
    ('CUST_TYPE', 'PARTNER', '협력사',     4, 'Y'),

    ('BIZ_STAGE', 'LEAD',    '발굴',       1, 'Y'),
    ('BIZ_STAGE', 'PROSPECT','검토',       2, 'Y'),
    ('BIZ_STAGE', 'NEGO',    '협상',       3, 'Y'),
    ('BIZ_STAGE', 'WIN',     '수주확정',   4, 'Y'),
    ('BIZ_STAGE', 'CLOSED',  '종결',       5, 'Y'),
    ('BIZ_STAGE', 'LOST',    '실주',       6, 'Y'),

    ('MILESTONE_TYPE', 'QUOTE',    '견적',     1, 'Y'),
    ('MILESTONE_TYPE', 'ORDER',    '발주',     2, 'Y'),
    ('MILESTONE_TYPE', 'CONTRACT', '계약',     3, 'Y'),
    ('MILESTONE_TYPE', 'DELIVERY', '납품',     4, 'Y'),
    ('MILESTONE_TYPE', 'PAYMENT',  '결제',     5, 'Y'),
    ('MILESTONE_TYPE', 'REVIEW',   '검수',     6, 'Y')
ON CONFLICT (grp_code, code) DO NOTHING;

-- ═══════════════════════════════════════════════
--  학습용 더미 데이터
--  (실 사용 시 거슬리면 후속 마이그레이션으로 DELETE 처리)
-- ═══════════════════════════════════════════════

INSERT INTO tb_customer (cust_cd, cust_nm, cust_type, biz_no, ceo_nm, tel, buy_yn, sell_yn, use_yn, created_by) VALUES
    ('C001', '아크미 주식회사',   'SELL',    '123-45-67890', '김아크', '02-1000-2000', 'N', 'Y', 'Y', 'system'),
    ('C002', '글로벌트레이딩',     'BOTH',    '234-56-78901', '이글로', '02-2000-3000', 'Y', 'Y', 'Y', 'system'),
    ('C003', '베스트파트너',       'PARTNER', '345-67-89012', '박베스', '031-100-2000', 'N', 'N', 'Y', 'system'),
    ('C004', '서플라이코퍼레이션', 'BUY',     '456-78-90123', '최서플', '02-4000-5000', 'Y', 'N', 'Y', 'system')
ON CONFLICT (cust_cd) DO NOTHING;

INSERT INTO tb_customer_contact (cust_cd, seq, contact_nm, dept_nm, position, tel, mobile, email, is_primary, created_by) VALUES
    ('C001', 1, '홍길동', '영업1팀', '팀장', '02-1000-2001', '010-1111-2222', 'gildong@acme.example.com', 'Y', 'system'),
    ('C001', 2, '김영업', '영업2팀', '대리', '02-1000-2002', '010-1111-3333', 'sales@acme.example.com',   'N', 'system'),
    ('C002', 1, '이무역', '구매팀',  '과장', '02-2000-3001', '010-2222-3333', 'buyer@global.example.com', 'Y', 'system'),
    ('C002', 2, '박해외', '해외영업','부장', '02-2000-3002', '010-2222-4444', 'oversea@global.example.com', 'N', 'system'),
    ('C003', 1, '최협력', '제휴팀',  '이사', '031-100-2001', '010-3333-4444', 'partner@best.example.com', 'Y', 'system')
ON CONFLICT (cust_cd, seq) DO NOTHING;

INSERT INTO tb_business (biz_no, biz_nm, cust_cd, stage, probability, owner_nm, plan_from, plan_to, plan_order_amt, actual_order_amt, remark, created_by) VALUES
    ('B-2026-001', 'ERP 도입 컨설팅',         'C001', 'NEGO',     70, '홍길동', '202604', '202612',  50000000.00,         0.00, '핵심 제안 단계', 'system'),
    ('B-2026-002', '클라우드 인프라 마이그레이션', 'C002', 'PROSPECT', 40, '김영업', '202605', '202611', 120000000.00,         0.00, '경쟁사 1곳',      'system'),
    ('B-2026-003', '모바일 앱 신규 개발',       'C003', 'WIN',     100, '박개발', '202604', '202608',  80000000.00,  80000000.00, '계약완료',       'system')
ON CONFLICT (biz_no) DO NOTHING;

INSERT INTO tb_business_milestone (biz_no, seq, milestone_type, milestone_nm, milestone_ym, expected_date, actual_date, amount, done_yn, owner_nm, created_by) VALUES
    ('B-2026-001', 1, 'QUOTE',    '제안서 제출',      '202604', '2026-04-30', NULL,           0.00, 'N', '홍길동', 'system'),
    ('B-2026-001', 2, 'CONTRACT', '계약 체결',        '202606', '2026-06-15', NULL,    50000000.00, 'N', '홍길동', 'system'),
    ('B-2026-002', 1, 'QUOTE',    '1차 제안',         '202605', '2026-05-20', NULL,           0.00, 'N', '김영업', 'system'),
    ('B-2026-003', 1, 'QUOTE',    '제안 및 PoC',      '202604', '2026-04-10', '2026-04-12',   0.00, 'Y', '박개발', 'system'),
    ('B-2026-003', 2, 'CONTRACT', '계약 체결',        '202605', '2026-05-01', '2026-05-03', 80000000.00, 'Y', '박개발', 'system'),
    ('B-2026-003', 3, 'DELIVERY', '1차 산출물',       '202607', '2026-07-31', NULL,           0.00, 'N', '박개발', 'system')
ON CONFLICT (biz_no, seq) DO NOTHING;
