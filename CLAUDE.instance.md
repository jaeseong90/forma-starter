# ━━ 프로젝트 인스턴스 (이 starter 를 클론한 신규 프로젝트가 갈아끼우는 부분) ━━

> 본 파일은 **starter template 의 placeholder 본**이다. 클론 직후 모든 항목을 자기 프로젝트
> 값으로 교체하라. 본 파일은 `CLAUDE.md` 끝에서 `@CLAUDE.instance.md` 로 임포트되어 모든
> AI 세션의 컨텍스트로 로드된다 — 정확히 채울수록 AI 결과 일관성이 좋아진다.
>
> 부트스트랩 절차 전반은 `ONBOARDING.md` 참조.

## basePackage

`com.saleson` (starter 의 출발 패키지. 신규 프로젝트는 IDE Refactor → Rename Package 로 자기 값으로 교체)

## 프로젝트 개요

> **TODO**: 프로젝트 이름·목적·주요 도메인을 1~3줄로 기술.
>
> 예시: "ACME Orders — ACME 사 주문관리 시스템. 견적 → 수주 → 출하 → 청구 흐름을 전산화.
> FORMA 프레임워크 기반, 백엔드(Spring Boot REST) + 프론트(Static HTML/JS) 완전 분리."

## 외부 시스템 연계

> **TODO**: 프로젝트가 의존하는 외부 시스템이 있다면 기입. 없으면 본 섹션 삭제.
>
> 예시:
> - 진행현황 트래커: Notion `<page-id>` 또는 Confluence/Jira URL
> - 그룹웨어 결재: `<system-url>`
> - 외부 인증: SSO 게이트웨이 `<url>`

## PGM ID 접두어

| 모듈 | 접두어 | 예시 |
|---|---|---|
| 프레임워크 관리자 | FRM_ | FRM_MENU, FRM_PGM, FRM_ROLE, FRM_USER, FRM_AUDIT, FRM_CODE, FRM_DEPT (공용 세트, 재명명 금지) |
| **TODO 모듈1** | **TODO** | **TODO** |
| **TODO 모듈2** | **TODO** | **TODO** |

신규 화면 ID 채번 시 위 접두어 내 마지막 순번+10.

## 비즈니스 모듈 (Phase 1 — MVP)

> **TODO**: 첫 출시 범위에 들어갈 업무 모듈 목록.

| 모듈 | 주요 기능 | 우선순위 |
|---|---|---|
| **TODO** | **TODO** | 필수 |

## 비즈니스 모듈 (Phase 2 — 확장)

> **TODO**: 후속 단계 모듈. 없으면 본 섹션 삭제.

## AI 기능 계획

> **TODO**: AIClient SPI 를 활용한 AI 기능(회의록 자동작성, 보고서 초안, 분석 등). 없으면 본 섹션 삭제.

## 공통 팝업 (도메인)

> **TODO**: 프로젝트별 도메인 팝업(거래처 검색·품목 검색 등). 프레임워크 공통(PGM_P01, USR_P01, USR_CHPW, DEPT_P01) 은 starter 기본 탑재.

| 팝업 | 경로 | 반환 |
|---|---|---|
| **TODO** | `/pages/popup/<CODE>_P01.html` | `{CODE, NAME}` |

## 설계 결정 기록

> **TODO**: 프로젝트 진행 중 내린 굵직한 결정(스코프 제외, 인프라 선택, 표준 패턴 등) 한 줄씩 누적.
>
> 예시:
> - **인건비·손익 분리** — 민감정보라 본 시스템 미포함.
> - **DB 호스트 단일화** — 로컬/운영 모두 동일 PostgreSQL.
> - **CSS 네임스페이스** — 전역 태그 스타일 금지, `.forma-*` 클래스만.
