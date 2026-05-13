-- FORMA Starter — 도메인 공통 코드 시드
--
-- 본 파일은 프로젝트별 도메인 코드 그룹을 정의한다. starter 는 예시 1건(직급) 만 포함하며,
-- 프레임워크 자체는 어떤 코드 그룹도 강제하지 않는다.
-- 신규 프로젝트는 자기 도메인에 맞춰 본 파일을 채우거나, 별도 마이그레이션 으로 관리하라.

-- 예시: 직급(GRADE) — tb_user.grade_cd 와 연결. 프로젝트 사정에 맞춰 자유롭게 수정/삭제.
INSERT INTO tb_code_group VALUES ('GRADE', '직급');
INSERT INTO tb_code VALUES ('GRADE', 'CEO',       '대표이사', 1, 'Y');
INSERT INTO tb_code VALUES ('GRADE', 'EXECUTIVE', '이사',     2, 'Y');
INSERT INTO tb_code VALUES ('GRADE', 'DIRECTOR',  '부장',     3, 'Y');
INSERT INTO tb_code VALUES ('GRADE', 'MANAGER',   '차장',     4, 'Y');
INSERT INTO tb_code VALUES ('GRADE', 'SENIOR',    '과장',     5, 'Y');
INSERT INTO tb_code VALUES ('GRADE', 'JUNIOR',    '대리',     6, 'Y');
INSERT INTO tb_code VALUES ('GRADE', 'STAFF',     '사원',     7, 'Y');
