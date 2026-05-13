# FORMA Starter Onboarding

신규 FORMA 기반 프로젝트를 starter 에서 시작할 때 따라할 부트스트랩 가이드.

> 본 문서는 **starter 를 막 클론한 직후의 신규 프로젝트** 입장에서 쓰여 있다.
> 기존 프로젝트의 개발자 합류 가이드가 아니다(그건 `README.md` / `doc/*` 참조).

## 이 starter 정체성

FORMA 기반 ERP 스타터킷. 백엔드 코어(`frame/`, `login/`) + 표준 관리자 화면 세트(FRM_*) + AI 코딩 자산(`.claude/`, `design/_prompts/`, `doc/*`) + 프론트 컴포넌트(`static/assets/js/framework/`) 까지 부팅에 필요한 한 벌이 포함되어 있다.

**배포 정책: 단방향(starter → 프로젝트)**. 자동 sync 도구 없음. 자세한 정책은 `CLAUDE.md` 상단 참조.

## 사전 준비

- JDK 21 (Gradle wrapper 가 자동 설치)
- PostgreSQL 인스턴스 + 접속 정보(URL, 사용자, 비밀번호, DB 이름)
- (선택) Claude API 키 — 회의록 자동작성·보고서 초안 등 AI 기능 사용 시
- (권장) Claude Code — `.claude/commands/` · `.claude/skills/` 자산 활용

## 부트스트랩 체크리스트

### 1. 패키지 리네임

- [ ] `src/main/java/com/saleson/...` 의 패키지 구조를 자기 프로젝트 값으로 변경
  - 예: `com.saleson` → `com.acme.orders`
- [ ] 모든 `.java` 파일의 `package` / `import` 선언 일괄 치환
- [ ] 디렉토리 트리 이동
- 도구: IDE Refactor → Rename Package(권장) 또는 `find` + `sed` 일괄 치환

### 2. 프로젝트 설정

- [ ] `settings.gradle` 의 `rootProject.name` 변경
- [ ] `build.gradle` 의 그룹/이름/버전 확인
- [ ] `src/main/resources/application.yml` — 기본 프로파일 + 환경변수 키. 그대로 두거나 키 이름(`saleson.*`) 을 자기 프로젝트 prefix 로 일괄 변경(`JwtTokenProvider` 등 `@Value` 동반 교체).
- [ ] **환경별 yml 생성** — 시크릿 평문 커밋 방지를 위해 `.gitignore` 처리되어 있다. `.example` 파일을 복사해 사용:
  - `cp src/main/resources/application-local.yml.example src/main/resources/application-local.yml`
  - `cp src/main/resources/application-prod.yml.example src/main/resources/application-prod.yml`
  - 각 파일의 DB 접속(URL/user/password), JWT 시크릿(`saleson.jwt.secret` — 충분히 긴 랜덤), 파일 업로드 경로(`saleson.file.upload-path`), (선택) AI 키를 자기 값으로 교체.

### 3. `CLAUDE.instance.md` 작성

- [ ] starter 의 `CLAUDE.instance.md` 모든 항목을 자기 프로젝트 값으로 교체
  - `basePackage`
  - 프로젝트 개요(이름·목적·도메인)
  - 외부 시스템 연계(Notion / Confluence / Jira 등) 위치·ID — 있을 때만
  - PGM ID 접두어 카탈로그(도메인 모듈별)
  - 비즈니스 모듈 목록(Phase 별)
  - 설계 결정 기록(프로젝트 관점)
- 본 파일은 `CLAUDE.md` 끝에서 `@CLAUDE.instance.md` 로 임포트되어 모든 AI 세션의 컨텍스트로 로드된다 — 정확히 작성할수록 AI 결과 일관성이 좋아진다.

### 4. DB 스키마 적용

- [ ] PostgreSQL DB 생성 (예: `createdb my_erp`)
- [ ] `src/main/resources/schema/01-tables.sql` 실행 — 프레임워크 공통 테이블 (`tb_user` / `tb_dept` / `tb_role` / `tb_menu` / `tb_pgm_info` / `tb_code_group` / `tb_code` / `tb_audit_log` / `tb_log` / `tb_file` 등 16개) + FK 제약조건
- [ ] `src/main/resources/schema/02-codes.sql` 실행 — 예시 코드 그룹(직급) 1건. 자기 도메인 코드는 자유롭게 추가/수정
- [ ] `src/main/resources/schema/04-pgm.sql` 실행 — 표준 관리자 화면(FRM_*) 7건 + 개발자 가이드 데모 5건 의 `tb_pgm_info` 등록

> **DB 호환성**: starter 의 DDL 은 H2 / MySQL 친화(`AUTO_INCREMENT`, `CLOB`). PostgreSQL 사용 시
> `AUTO_INCREMENT` → `BIGSERIAL`, `CLOB` → `TEXT` 로 치환해 실행하라(starter v0.3 에서 PostgreSQL
> 전용 DDL 분리 예정).

### 5. 초기 사용자 시드

- [ ] admin 계정 1건 `tb_user` 에 INSERT (비밀번호는 `LoginService.encodePassword(...)` 로 BCrypt 해시 생성)
- [ ] `tb_user_role` 에 ADMIN 역할 부여
- [ ] 첫 로그인 후 비밀번호 변경

### 6. 빌드 + 기동

- [ ] `./gradlew bootRun` → http://localhost:8080
- [ ] admin 계정 로그인
- [ ] 관리자 화면 동작 확인: `FRM_MENU` / `FRM_USER` / `FRM_ROLE` / `FRM_CODE` / `FRM_DEPT` / `FRM_PGM` / `FRM_AUDIT`

### 7. (선택) 브랜딩 / SPI 교체

- [ ] `static/login.html` / `main.html` / `index.html` 의 프로젝트명·로고 교체
- [ ] `static/assets/css/forma.css` 의 CSS 변수(테마 컬러)
- [ ] SPI 갈아끼우기 — 필요 시 `doc/FORMA-SPI.md` 참조
  - SSO/LDAP/사내 IAM 사용: `UserAuthProvider` 빈 등록
  - S3/GCS 사용: `FileStore` 빈 등록
  - OpenAI/사내 LLM 사용: `AIClient` 빈 등록
  - 사번·회사 등 프로젝트 고유 사용자 필드: `LoginUser` 구현체 + `UserAuthProvider` 동반 교체

## 첫 화면 만들기

Claude Code 에서:

- **자연어 요청**: "{모듈명} 관리 화면 만들어줘" → `forma-screen-workflow` 스킬이 자동 활성화되어 방식 A(YAML 1장) vs 방식 B(코드 4파일) 판정 후 진행
- **명시적 시작**: `/new-screen` → 화면 ID·필드·검색 조건 입력 → YAML 초안 생성
- **코드 승격**: `/yaml-to-code design/screens/{ID}.yml` → Controller + Service + MyBatis XML + HTML 스캐폴드

YAML 학습 예시: `design/screens/DEMO_*.yml`. 스키마: `design/_schema_guide.yml`.

## 다음 단계 참조

| 주제 | 문서 |
|---|---|
| 공통 규칙 (변경 금지) | `CLAUDE.md` |
| 본 프로젝트 고유 정보 | `CLAUDE.instance.md` |
| 패키지 구조·백엔드 패턴 | `doc/FORMA-프레임워크.md` |
| AI 코딩 절차·슬래시 커맨드 | `doc/AI-워크플로.md` |
| SPI 카탈로그(확장 포인트) | `doc/FORMA-SPI.md` |
| 프론트 위젯 21종 API | `doc/FormaForm-위젯-레퍼런스.md` |
| 화면 조립 관례 | `doc/프론트-패턴.md` |
| 권한 체계 상세 | `doc/데이터권한-설계.md` |

## FORMA 코어 업데이트는 어떻게?

**정책: 단방향, 수동.** 자동 sync 도구 없음.

- 신규 프로젝트는 클론 시점의 starter 로 출발 → 이후 starter 측 업데이트가 본 프로젝트로 자동으로 흐르지 않는다.
- starter 측에 버그 수정·신규 기능이 생기면 `git diff` 로 변경 식별 → 본 프로젝트 사정에 맞춰 수동 cherry-pick.
- 본 프로젝트에서 만든 개선은 starter 로 역흡수하지 않는다 — 정말 일반화 가치가 있다면 별도 새 starter 메이저 버전으로 정리.
- 이 정책은 "프로젝트별 진화 속도가 다르고, 한쪽 변경이 다른 쪽을 깨면 안 된다" 는 가정에서 출발. 자세한 결정 배경은 `CLAUDE.md` 상단의 "FORMA 배포 정책" 줄 참조.
