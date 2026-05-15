---
description: 자연어 요구를 받아 FORMA YAML 설계서 초안을 design/screens/ 아래 생성
argument-hint: <화면 요구사항 자유 텍스트>
allowed-tools: Read, Write, Glob, Grep, Bash(grep:*)
---

# /new-screen

자연어 요구사항을 받아 **FORMA 방식 A(YAML 스크린 엔진)** 설계서 초안을 만드는 슬래시 커맨드.

## 인자

$ARGUMENTS — 화면 요구사항 (화면명, 필드, 검색조건, 특수 동작 등 자유 서술)

## 작업 규칙

1. **방식 A 판정 먼저**: 아래 판정 트리를 통과해야 YAML로 진행. 실패 시 사용자에게 알리고 `/yaml-to-code` 또는 수동 작성 제안.
   - 테이블 1~2개, 기본 CRUD, 트랜잭션 다중쓰기 없음, 계산 로직 없음, 파일 업로드 없음, 외부 API 없음.
   - 상세 판정: `@doc/AI-워크플로.md` §2 참조.
2. **스키마 엄수**: `@design/_schema_guide.yml` 키와 타입 그대로 따름. 샘플 참조: `@design/screens/DEMO_DEPT.yml`, `@design/screens/DEMO_CUSTOMER.yml`, `@design/screens/DEMO_BIZ.yml`.
3. **화면 ID 채번**: `CLAUDE.md` 인스턴스 섹션 "PGM ID 접두어" 테이블에서 모듈 접두어를 찾고, `design/screens/*.yml` + `src/main/resources/static/pages/**/*.html` 기존 ID와 충돌하지 않는 순번 부여. 일반 예시(MMA/SDA 등) 사용 금지 — 반드시 프로젝트 접두어.
4. **저장 위치**: `design/screens/{SCREEN_ID}.yml`. 다른 곳에 저장 금지.
5. **DDL 초안 (Flyway 마이그레이션)**: 새 테이블이 필요하면 `CREATE TABLE` 문을 별도 제시. **저장 위치**: `src/main/resources/db/migration/V{N}__{기능}.sql` (신규 파일, N = 마지막 V 번호 + 1). 기존 테이블 활용 시 컬럼 일치 검증.
6. **코드 데이터 초안**: 새 코드 그룹이 필요하면 `INSERT INTO tb_code ... ON CONFLICT DO NOTHING` 문을 위 같은 마이그레이션 파일에 포함.

## 생성 후 사용자 안내 (고정 문구)

```
설계서 생성 완료: design/screens/{SCREEN_ID}.yml

검토 요청:
1. 필드 구성 OK?
2. 위젯 타입(widget/editor/format) OK?
3. 검색 조건 OK?
4. 특수 동작(자동계산·상태전이·외부연동)이 필요 → 방식 B(/yaml-to-code로 코드 생성) 전환

확정되면:
- 서버 가동 중이면 POST /api/screen/_reload (코드 컴파일 불필요)
- 코드까지 필요하면 /yaml-to-code design/screens/{SCREEN_ID}.yml
```

## 상세 프롬프트 (원본)

@design/_prompts/00-generate-design.md
