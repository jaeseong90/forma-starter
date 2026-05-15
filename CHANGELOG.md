# Changelog

본 파일은 **FORMA Starter 프레임워크 자산**의 변경 이력을 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 를 따르고, [Semantic Versioning](https://semver.org/lang/ko/) 을 따른다.

## 본 파일의 정체성

FORMA 는 **단방향(starter → 프로젝트)** 배포 정책을 따른다(`CLAUDE.md` 상단 참조). 즉, 다운스트림 프로젝트는 starter 측 변경을 `git diff` + 수동 cherry-pick 으로 따라잡아야 한다. 본 CHANGELOG 는 **무엇을 들고 갈지 판단하는 기준 문서**다.

규칙:
- **프레임워크 자산 변경만 기록**한다. 도메인 코드·예제·문서 오타 같은 노이즈는 제외.
- 항목은 `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security` 6 종으로 분류.
- 다운스트림에 영향이 큰 항목은 앞에 **`Breaking:`** 라벨을 붙인다 (DDL 마이그레이션·SPI 시그니처·환경변수/포트 변경 등).
- `[Unreleased]` 섹션에 누적하고, 릴리즈 시점에 버전 헤더로 잘라낸다.

## [Unreleased]

### Added
- `CHANGELOG.md` (Keep a Changelog 포맷) — starter→프로젝트 cherry-pick 판단 기준 문서.
- `CLAUDE.md` 에 CHANGELOG 유지 규칙 섹션 — AI 가 프레임워크 자산 변경 시 자동으로 누적하도록 트리거 조건·분류·Breaking 라벨 판단 기준 명시.
- `src/test/java` 신설 — `PasswordPolicyTest`, `BaseResponseTest` 로 핵심 유틸 검증.
- `.github/workflows/ci.yml` — push/PR 시 build + test 자동 실행 (JDK 21 + gradle cache).
- `SECURITY.md` — 취약점 비공개 보고 채널(GitHub Security Advisory) 안내, 알려진 보안 가정 명시(기본 JWT 시크릿/admin 비밀번호/postgres 비밀번호).
- `.github/pull_request_template.md` — Breaking 영향·CHANGELOG 누적·검증 체크리스트.
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml` — 프레임워크 자산 한정 이슈 폼.

### Removed
- **Breaking: `login/UserSeedRunner`** 제거 — `seed/users.tsv`(존재하지 않고 `.gitignore` 처리됨) 를 읽는 SalesOn 전용 bulk import 코드였다. admin 시드는 `InitialAdminBootstrapRunner` 가 담당하므로 중복.
- `mapper/common/admin.xml` 의 `updateUserEmpEmailPw`, `updateAdminPw` 매퍼 — `UserSeedRunner` 전용이라 동반 제거.

### Changed
- `application.yml` 의 `forma.security.*` 키 재정렬: `seed-users`/`seed-users-admin-pw` 제거, `initial-admin-pw` 추가(`InitialAdminBootstrapRunner` 의 BCrypt 대상값). `reset-all-passwords` 계열은 운영 도구로 유지.

## [0.5.0] - 2026-05-15

### Added
- **Docker PostgreSQL 부트스트랩**: 루트 `docker-compose.yml` 로 `postgres:16-alpine` 컨테이너 즉시 기동. 첫 기동 시 `src/main/resources/schema/*.sql` 가 `/docker-entrypoint-initdb.d` 로 마운트되어 자동 실행 (테이블·코드·프로그램·메뉴·admin 사용자 시드 한 번에).
- `schema/04-menu.sql` — 표준 관리자 화면(FRM_*) + 개발자 가이드 데모 메뉴 트리.
- `schema/05-admin-seed.sql` — 초기 조직(`FORMA`), `ADMIN` 역할 + 전체 FRM_* 권한, `admin` 사용자(홍길동), `ALL` 데이터 권한.
- `InitialAdminBootstrapRunner` — 기동 시 `admin.user_pw` 가 NULL 이면 `BCrypt('admin1!')` 자동 채움. 정적 BCrypt 해시를 SQL 시드에 박지 않으려는 의도.
- `src/main/resources/mybatis-config.xml` — 그동안 누락돼 있던 MyBatis 설정 파일. `callSettersOnNulls=true`, `jdbcTypeForNull=NULL`, `mapUnderscoreToCamelCase=true`.

### Changed
- **Breaking: 기본 패키지 `com.saleson` → `com.forma`** 전환. 모든 `.java` 의 `package` / `import`, MyBatis XML 의 `parameterType`/`resultType`, `application.yml` 의 `saleson.*` 설정 키, `SALESON_*` 환경변수 prefix 가 모두 `forma.*` / `FORMA_*` 로 일괄 변경.
- **Breaking: 서비스 포트 `8080` → `18080`**. 로컬 PostgreSQL 호스트 포트 `5432` → `15432` (컨테이너 내부는 5432 유지).
- `schema/01-tables.sql` 을 PostgreSQL 호환 DDL 로 재작성: `AUTO_INCREMENT` → `BIGSERIAL`, `CLOB` → `TEXT`, FK 제약은 `DO $$ EXCEPTION WHEN duplicate_object` 블록으로 idempotent 처리.
- `schema/02-codes.sql` / `schema/03-pgm.sql` 에 `ON CONFLICT DO NOTHING` 적용 — 수동 재실행 안전.
- `application-local.yml.example` 의 datasource 기본값을 docker postgres(`jdbc:postgresql://localhost:15432/forma`, `forma/forma`)와 자동 정합. 클론 후 그대로 복사하면 추가 수정 없이 동작.
- 브랜딩: 로그인 페이지·favicon·메인 화면의 "SalesOn" 표기를 "FORMA" 로 통일. 사내 식별자(SJINC, sjinc.co.kr) 제거.

### Removed
- **Breaking: `frame/migration/StartupMigrationRunner.java`** 제거. SalesOn 프로젝트 전용 비즈니스 마이그레이션(`tb_group_asset`, `tb_grp_billing`, `tb_sales_approval`, `tb_estimate_history` 등)이 들어 있어 신규 DB 에서 기동 실패 원인이었다. 프로젝트별 마이그레이션은 자체 `ApplicationRunner` 로 분리.

### Fixed
- schema init 스크립트 실행 순서 — `tb_menu.pgm_id` 가 `tb_pgm_info` 를 참조하므로 `03-pgm.sql` → `04-menu.sql` 순으로 정렬. 이전 순서(`03-menu` → `04-pgm`)에서는 FK(`fk_menu_pgm`) 위반으로 postgres init 이 중단되어 admin 시드 미실행 → 로그인 불가 증상이 있었다.

### Security
- `tmp/` 디렉토리를 `.gitignore` 에 추가 — 일회성 리네임/마이그레이션 스크립트가 저장소에 섞이지 않도록.

## [0.3.0] - 2026-05-13

### Changed
- 메인 클래스 명칭을 `SalesOnApplication` 에서 `FormaApplication` 으로 일반화.

## [0.2.0] - 2026-05-13

### Added
- `application-local.yml.example` / `application-prod.yml.example` 분리 — 시크릿(DB 비밀번호·JWT secret·API 키) 평문 커밋 방지를 위해 `.example` 만 추적하고 실제 yml 은 `.gitignore` 처리.
- `settings.gradle` 의 `rootProject.name = 'forma-starter'` 명시.

### Removed
- `build.gradle` 에서 환경 특정 시크릿 제거.

## [0.1.0] - 2026-05-13

### Added
- **초기 FORMA Starter 릴리즈**.
- 백엔드 코어: `frame/*` (YAML 런타임 엔진·JWT·데이터 권한·감사 로그·서비스 트레이스·AI/파일 SPI), `login/*` (BCrypt + JWT 인증).
- 프레임워크 공통 테이블 16종: `tb_user`, `tb_dept`, `tb_role`, `tb_user_role`, `tb_menu`, `tb_pgm_info`, `tb_role_auth`, `tb_data_auth`, `tb_user_favorite`, `tb_user_settings`, `tb_code_group`, `tb_code`, `tb_audit_log`, `tb_log`, `tb_file`.
- 표준 관리자 화면 세트(FRM_*) 7종: `FRM_MENU`, `FRM_PGM`, `FRM_ROLE`, `FRM_USER`, `FRM_DEPT`, `FRM_CODE`, `FRM_AUDIT`.
- 프론트 컴포넌트: `static/assets/js/framework/forma.*.js` 15개 + `forma.css` (CSS 변수 기반 테마).
- 개발자 가이드 데모 화면 5종: `GRID_DEMO`, `FORM_DEMO`, `COMP_DEMO`, `SHEET_DEMO`, `FW_DEMO`.
- AI 코딩 자산: `.claude/commands/`, `.claude/skills/forma-screen-workflow/`, `design/_prompts/`, `design/_schema_guide.yml`, `design/screens/DEMO_*.yml`.
- 문서 세트: `CLAUDE.md`, `doc/FORMA-프레임워크.md`, `doc/AI-워크플로.md`, `doc/FORMA-SPI.md`, `doc/FormaForm-위젯-레퍼런스.md`, `doc/프론트-패턴.md`, `doc/데이터권한-설계.md`, `ONBOARDING.md`.

[Unreleased]: https://github.com/jaeseong90/forma-starter/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/jaeseong90/forma-starter/compare/v0.3.0...v0.5.0
[0.3.0]: https://github.com/jaeseong90/forma-starter/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/jaeseong90/forma-starter/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/jaeseong90/forma-starter/releases/tag/v0.1.0
