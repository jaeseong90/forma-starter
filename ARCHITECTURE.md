# Architecture

FORMA Starter 의 30초 요약. 자세한 규칙은 `CLAUDE.md` 와 `doc/*` 참조.

## 한 줄 정의

**Spring Boot 3.4 + Java 21 + MyBatis + Vanilla JS** 로 만든 ERP 스타터킷 — AI(Claude Code 등) 가 자연어 요구를 받아 YAML 한 장 또는 4파일 스캐폴드로 화면을 만들도록 설계됨.

## 전체 흐름

```
┌────────────────────────────────────────────────────────────────────┐
│  브라우저 (Vanilla JS + FORMA 컴포넌트 18종)                          │
│  ─ static/login.html  → /login/loginProcess  → JWT 쿠키                │
│  ─ static/main.html   → 메뉴 트리·MDI 탭·테마 토글                       │
│  ─ static/pages/admin/FRM_*.html  ─ 표준 관리자 화면 8종                 │
│  ─ static/pages/{module}/{PGMID}.html  ─ 도메인 화면 (인라인 <script>)   │
└────────────────────┬───────────────────────────────────────────────┘
                     │  HTTP(S) + JWT 쿠키
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│  Spring Boot (port 18080)                                            │
│                                                                      │
│  TokenInterceptor ─┐                                                 │
│   ├─ JWT 검증                                                         │
│   ├─ LoginUser 컨텍스트 주입                                            │
│   └─ DataAuthContext (부서/사용자 데이터 권한)                            │
│                    │                                                 │
│                    ▼                                                 │
│  @FormaController + @AddUserInfo AOP                                 │
│   → Service (@Transactional)                                         │
│       → FormaSqlSession (MyBatis 래핑 + 권한 자동 주입 + camelCase 정규화)│
│           → MyBatis (mapper/**/*.xml)                                │
│                    │                                                 │
│                    ▼                                                 │
│  PostgreSQL 16  (로컬은 docker-compose.yml 자동, 운영은 외부)            │
│   ├─ tb_user / tb_dept / tb_role / tb_user_role / tb_role_auth         │
│   ├─ tb_menu / tb_pgm_info / tb_code_group / tb_code / tb_data_auth   │
│   ├─ tb_audit_log / tb_log / tb_file                                  │
│   ├─ tb_release_note / tb_release_note_item                           │
│   └─ (도메인 테이블은 프로젝트 마이그레이션으로 추가)                       │
└────────────────────────────────────────────────────────────────────┘

   ⊕ 부수 흐름:
     · AuditLogAspect      → tb_audit_log (Service 메서드 before/after 비교)
     · ServiceTraceAspect  → 메모리 store + /api/trace (개발 시 트레이스)
     · FormaLogService     → tb_log (로그인/주요 이벤트)
     · ClaudeHttpClient    → Anthropic Messages API (회의록·보고서 초안 등 선택 기능)
     · LocalFileStore      → ./uploads (운영은 S3 등으로 SPI 교체)
     · springdoc-openapi   → /swagger-ui.html  (dev 한정)
```

## 핵심 컨벤션

| 레이어 | 컨벤션 |
|---|---|
| Controller | `@FormaController(value="/pgmid 소문자", pgmId="PGMID", description="화면명")` |
| Service | `@Transactional` 은 쓰기 메서드에만. 읽기는 트랜잭션 없이 |
| Mapper | `parameterType="map"`, `resultType="map"`, `#{param}` 만 사용 |
| 응답 | `BaseResponse.Ok(data) / Warn(msg) / Error(msg)` |
| 페이징 | 서버 페이징 시 `totalCount` 동봉, 클라이언트는 `ctx.grid.setData(rows, totalCount)` |
| 권한 | tb_role_menu(메뉴·버튼) + tb_data_auth(데이터 범위). FormaSqlSession 이 WHERE 자동 주입 |

## AI 워크플로 (방식 A vs B)

```
자연어 요구 ─→ /new-screen (또는 forma-screen-workflow 스킬)
                    │
                    ├──▶ 단일 테이블 CRUD + 표준 검색/권한
                    │       → 방식 A: design/screens/{PGMID}.yml 1장 → screen.html 런타임 렌더
                    │
                    └──▶ 트랜잭션 다중 테이블, 계산, 외부 API, 필드 readonly 등
                            → 방식 B: /yaml-to-code 로 4파일 스캐폴드
                              ├─ Controller.java
                              ├─ Service.java
                              ├─ mapper/{module}/{pgm}.xml
                              └─ pages/{module}/{PGMID}.html  (인라인 <script>)
```

자세한 판정 룰과 슬래시 커맨드 매핑은 `doc/AI-워크플로.md` 참조.

## SPI (교체 가능한 빈)

| SPI | 기본 구현 | 교체 사유 |
|---|---|---|
| `UserAuthProvider` | `JwtUserAuthProvider` (DB + BCrypt) | SSO / SAML / OAuth2 / LDAP |
| `LoginUser` | `LoginUserVo` | 사번·회사 등 프로젝트 고유 필드 |
| `AIClient` | `ClaudeHttpClient` (Anthropic) | OpenAI / Gemini / 사내 LLM |
| `FileStore` | `LocalFileStore` (디스크 + nginx X-Accel) | S3 / GCS / NAS |

각 SPI 는 `@ConditionalOnMissingBean` 으로 등록되어, 프로젝트가 같은 타입의 빈을 정의하면 자동 대체된다. 카탈로그: `doc/FORMA-SPI.md`.

## 배포 정책

**starter → 프로젝트 단방향**. 자동 sync 없음. 다운스트림은 `git diff` + 수동 cherry-pick. 그래서 `CHANGELOG.md` 가 cherry-pick 기준 문서로 유지된다 (`CLAUDE.md` 의 "CHANGELOG 유지 규칙" 절 참조).

## 다음 읽을거리

- 클론 직후 부트스트랩: `ONBOARDING.md`
- 백엔드 상세 패턴: `doc/FORMA-프레임워크.md`
- AI 자동화 매핑: `doc/AI-워크플로.md`
- 프론트 위젯 API: `doc/FormaForm-위젯-레퍼런스.md`
- 화면 조립 관례: `doc/프론트-패턴.md`
- 데이터 권한 설계: `doc/데이터권한-설계.md`
- SPI 카탈로그: `doc/FORMA-SPI.md`
- 변경 이력: `CHANGELOG.md`
