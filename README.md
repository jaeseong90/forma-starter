# FORMA Starter

[![CI](https://github.com/jaeseong90/forma-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/jaeseong90/forma-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.3-6db33f)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-21-orange)](https://openjdk.org/projects/jdk/21/)

**AI 바이브코딩을 위한 ERP·업무시스템 스타터킷** (Spring Boot 3.4 + Java 21 + MyBatis + Vanilla JS)

YAML 1파일로 CRUD 화면을 즉시 만들고, 복잡한 로직은 커스텀 코드로 확장하는 ERP 개발 프레임워크. Claude Code 와 같은 AI 코딩 도구로 신규 화면을 자연어 요청만으로 만들도록 설계되었다.

## Quick Start

```bash
git clone https://github.com/jaeseong90/forma-starter.git my-erp
cd my-erp

# 1) PostgreSQL 컨테이너 기동 — 첫 기동 시 schema/*.sql 자동 실행 (테이블·메뉴·권한·admin 사용자 시드)
docker compose up -d

# 2) 로컬 설정 파일 생성 (그대로 복사하면 docker postgres 와 자동 연결)
cp src/main/resources/application-local.yml.example src/main/resources/application-local.yml

# 3) 애플리케이션 기동
./gradlew bootRun
```

기동 후 http://localhost:18080 접속 → **admin / admin1!** 로 로그인. 최초 로그인 후 비밀번호 변경 권장.

> **로그인이 안되면**: postgres 볼륨에 이전 상태가 남아 있을 수 있다. `docker compose down -v && docker compose up -d` 로 초기화 후 다시 `./gradlew bootRun`.

부트스트랩 전 과정은 [`ONBOARDING.md`](ONBOARDING.md) 참조.

## 무엇이 들어있나

| 영역 | 자산 |
|---|---|
| 백엔드 코어 | `src/main/java/com/forma/frame/` — YAML 런타임 엔진, JWT, 데이터 권한, 감사로그, 서비스 트레이스, AI/파일 SPI 등 |
| 인증 | `src/main/java/com/forma/login/` — BCrypt + JWT (SPI 추출됨, SSO/LDAP 교체 가능) |
| 표준 관리자 화면 | `FRM_MENU / FRM_PGM / FRM_ROLE / FRM_USER / FRM_AUDIT / FRM_CODE / FRM_DEPT` (`static/pages/admin/`) |
| 프론트 컴포넌트 | `static/assets/js/framework/forma.*.js` — Grid·Form·Toolbar·Modal·Menu·Chart 등 |
| AI 코딩 자산 | `.claude/commands/`, `.claude/skills/forma-screen-workflow/`, `design/_prompts/`, `design/_schema_guide.yml` |
| 문서 | `doc/FORMA-*.md`, `doc/FormaForm-위젯-레퍼런스.md`, `doc/프론트-패턴.md`, `doc/데이터권한-설계.md` |

## YAML = 화면

```yaml
screen:
  id: ITM010
  name: 품목관리
  type: list

search:
  - { field: item_nm, label: 품목명, widget: text }

grids:
  grid1:
    editable: true
    checkable: true
    columns:
      - { field: ITEM_CD, label: 품목코드, width: 100 }
      - { field: ITEM_NM, label: 품목명, width: 200, editor: text }
      - { field: UNIT_PRICE, label: 단가, width: 120, editor: currency }

sql:
  tables:
    - { name: tb_item }
```

이 파일 하나로 검색폼, 그리드, SELECT/INSERT/UPDATE/DELETE SQL, 서버 페이징, 데이터 권한, 감사 로그가 자동 생성된다.

## 지원 화면 타입

| 타입 | 설명 |
|------|------|
| `list` | 검색폼 + 편집 그리드 |
| `split-detail` | 좌측 마스터 + 우측 디테일 |
| `master-detail` | 마스터 그리드 + 입력폼 + 디테일 그리드 |
| `split-tab` | 마스터 + 탭 + 다중 디테일 (커스텀 코드 권장) |

## SPI (확장 포인트)

프로젝트별로 기본 구현을 빈 등록으로 갈아끼울 수 있는 인터페이스가 `frame/auth/` · `frame/ai/` · `frame/file/` 에 정의되어 있다.

| SPI | 기본 구현 | 교체 사유 |
|---|---|---|
| `UserAuthProvider` | `JwtUserAuthProvider` (로컬 DB + BCrypt) | SSO/SAML/OAuth2/LDAP |
| `LoginUser` | `LoginUserVo` | 사번·회사 등 프로젝트 고유 필드 |
| `AIClient` | `ClaudeHttpClient` (Anthropic Messages API) | OpenAI/Gemini/사내 LLM |
| `FileStore` | `LocalFileStore` (로컬 디스크 + nginx X-Accel) | S3/GCS/NAS |

자세한 카탈로그·등록 방법: `doc/FORMA-SPI.md`

## AI 코딩 도구와 함께 사용

본 starter 는 Claude Code · Cursor · ChatGPT 등 AI 도구와의 협업을 전제로 설계되었다.

| 파일 | 용도 |
|------|------|
| `CLAUDE.md` | FORMA 공통 규칙 — AI 컨텍스트에 자동 로드 |
| `CLAUDE.instance.md` | 프로젝트별 정보(neighbor: `@CLAUDE.instance.md` 임포트) — 클론 후 자기 값으로 갈아끼움 |
| `.claude/commands/` | 슬래시 커맨드: `/new-screen`, `/yaml-to-code`, `/review-screen` 등 |
| `.claude/skills/forma-screen-workflow/` | 자연어 화면 요청 자동 오케스트레이션 |
| `design/_schema_guide.yml` | YAML 설계서 스키마 (AI 가 참고) |
| `design/screens/DEMO_*.yml` | 학습용 YAML 예시 |

## 배포 정책

**단방향(starter → 프로젝트)**. 자동 sync 도구 없음.
- 신규 프로젝트는 클론 시점의 starter 로 시작.
- starter 측 업데이트가 본 프로젝트로 자동 흐르지 않음 — 필요 시 `git diff` + 수동 cherry-pick.
- 프로젝트에서 만든 개선은 starter 로 역흡수하지 않음.

자세한 배경: `CLAUDE.md` 상단 / `ONBOARDING.md` 마지막 섹션.

## Tech Stack

| 영역 | 기술 |
|------|------|
| Backend | Spring Boot 3.4.3, Java 21, MyBatis 3 |
| Auth | JWT (jjwt), BCrypt |
| DB | PostgreSQL (권장) |
| Frontend | Vanilla JS (빌드 도구 없음), Static HTML |
| Excel | Apache POI (SXSSF 스트리밍) |

## License

MIT — `LICENSE` 참조.
