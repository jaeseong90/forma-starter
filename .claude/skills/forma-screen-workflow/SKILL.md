---
name: forma-screen-workflow
description: |
  FORMA 프레임워크로 화면(CRUD, 조회, 등록·수정·삭제 페이지)을 만들 때 사용. 자연어 요구를
  받아 방식 A(YAML 1장) vs 방식 B(Controller/Service/Mapper/HTML 4파일) 중 적절한 쪽을
  판정하고 설계서 → 코드 → 리뷰까지 오케스트레이션한다.
  TRIGGER when: 사용자가 "화면 만들어줘", "CRUD", "등록·조회·수정·삭제 페이지", "새 페이지",
  "XXX관리 화면" 같은 신규 화면 생성 요청을 할 때. 기존 화면의 단순 필드 추가/편집은
  forma-form-widget 또는 forma-grid-col 커맨드로 분리.
---

# FORMA 화면 제작 워크플로

이 스킬은 FORMA 프로젝트에서 신규 화면을 만드는 전 과정을 책임진다. 개별 슬래시 커맨드(`/new-screen`, `/yaml-to-code`, `/review-screen`)는 단계별 실행 도구이고, 이 스킬은 **어느 단계로 갈지 판단**하는 상위 레벨 지시서다.

---

## 1단계: 요구 분석

사용자 발화에서 추출:
- 화면명(목적)
- 엔티티/데이터 필드
- 검색 조건
- 코드 참조(FK)
- 특수 동작(자동계산·상태전이·외부연동·파일·결재)

명시되지 않은 건 합리적 추론:
- PK 후보가 없으면 `{module}_cd` 추가
- `use_yn`, 감사 컬럼(`created_by/at`, `updated_by/at`) 기본 포함
- 이름 검색·사용여부 필터는 기본 제공

## 2단계: 방식 A/B 판정

반드시 `decision-tree.md`를 참고해 판정한다. 판정은 **기계적**이어야 하며, 자의적 해석 금지.

@.claude/skills/forma-screen-workflow/decision-tree.md

판정 결과가 애매한 경우 **한 번만** 사용자에게 확인:
> "이 화면은 기본 CRUD로 충분해 보입니다(방식 A). 로직이 더 있다면 방식 B로 가야 합니다. 어느 쪽으로 갈까요?"

이후 동일 질문 반복 금지.

## 3단계: 화면 ID 채번

`CLAUDE.md` 하단 **"PGM ID 접두어"** 테이블에서 모듈 접두어 확인 → `design/screens/*.yml` + `src/main/resources/static/pages/**/*.html` + 기존 `db/migration/V*__*.sql` 들에서 해당 접두어의 최대 순번 확인 → **+10** 부여.

**금지**: `MMA010`·`SDA010`·`POA010` 같은 일반 예시 ID를 그대로 쓰는 것. 항상 프로젝트 접두어.

## 4단계: 실행

### 방식 A 경로
1. `/new-screen {요구 요약}` 실행 → `design/screens/{PGMID}.yml` 생성
2. 사용자 검토 단계: 생성된 YAML과 DDL 초안 제시, 수정 희망 항목 질문
3. 승인 후:
   - 새 테이블/코드/PGM/메뉴는 **Flyway 신규 마이그레이션**: `src/main/resources/db/migration/V{N}__{기능}.sql` 한 파일에 묶어서 작성. 다음 기동에서 자동 적용.
   - 서버 가동 중이면 `POST /api/screen/_reload` 안내. 코드 컴파일 없이 즉시 반영.
4. 프론트는 `/pages/screen.html?pgm={PGMID}` 로 접근.

### 방식 B 경로
1. 먼저 YAML이 있는지 확인. 없으면 `/new-screen`으로 설계서부터.
2. `/yaml-to-code design/screens/{PGMID}.yml` 실행 → 4파일 생성.
3. **Flyway 신규 마이그레이션**: `src/main/resources/db/migration/V{N}__{PGMID}.sql` 한 파일에 `tb_pgm_info` + `tb_menu` + `tb_role_auth` INSERT 추가 (ON CONFLICT DO NOTHING).
4. 서버 재시작 필수 (신규 Controller 등록): `./gradlew --stop` → `sleep 2` → `./gradlew bootRun`. **`taskkill` 금지**.

### 공통 마무리
- `/review-screen {PGMID}` 실행하여 체크리스트 통과 확인.
- 사용자에게 화면 URL과 메뉴 등록 완료 여부 안내.

## 5단계: 반복 개선

사용자가 후속 요구("필드 추가", "검색 조건 바꿔줘", "그리드 컬럼 하나 넣어줘")를 하면 **전체 워크플로 재실행 금지**. 해당 1곳만 수정:
- YAML 화면이면 `design/screens/{ID}.yml` 편집 + 핫리로드.
- 커스텀 코드면 영향받는 파일만. 폼/그리드 단일 필드는 `/forma-form-widget` 또는 `/forma-grid-col`로 핀포인트.

## 6단계: 방식 A → B 승격

방식 A로 시작했다가 계산·상태전이 요구가 추가되면:
1. 기존 YAML은 **설계 문서로 보존** (삭제하지 말 것).
2. `/yaml-to-code`로 4파일 생성.
3. 기존 마이그레이션 V{N} 에 PGM 정보가 YAML 엔진용으로 등록됐다면 업데이트 필요 없음 (same URL 경로). 새 PGM/메뉴 추가 시에만 V{N+1} 마이그레이션 작성.

---

## 자주 하는 실수 방지

- **PGM 접두어 무시**: 일반 예시(MMA/SDA/POA)를 그대로 사용하면 즉시 정정.
- **테이블 중복**: 이미 존재하는 테이블(예: `tb_customer`)로 신규 YAML을 만들 때 실 운영 화면과 충돌하지 않는지 확인 (DEMO_* 접두 등 고려).
- **방식 판정 재질문**: 한 대화 내 같은 질문 금지.
- **서버 재시작 방법**: 반드시 `./gradlew --stop` 경로. 다른 java 프로세스는 건드리지 않음.
- **진행현황 트래커 업데이트**: 프로젝트별 진행현황 트래커가 있으면(예: Notion·Confluence·Jira) 모듈 추가 시 거기에 반영. 위치는 `CLAUDE.md` 인스턴스 섹션 참조.

---

## 참조

- `@CLAUDE.md` — 프로젝트 규칙 + 인스턴스 접두어
- `@doc/AI-워크플로.md` — 상세 절차
- `@doc/FORMA-프레임워크.md` — 백엔드 패턴
- `@doc/프론트-패턴.md` — 프론트 관례
- `@design/_schema_guide.yml` — YAML 스키마
- `@design/screens/README.md` — 샘플 YAML 현황
