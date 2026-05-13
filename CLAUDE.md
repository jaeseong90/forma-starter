# CLAUDE.md

본 파일은 **FORMA 프레임워크 공통 규칙** 만 담는다. FORMA starter 의 일부로 신규 프로젝트에 그대로 복사된다.

프로젝트별 고유 정보(basePackage, 도메인 모듈, PGM 접두어, DB, 외부 시스템 연계 등)는 같은 디렉토리의 **`CLAUDE.instance.md`** 에 분리되어 있으며, 본 파일 끝에서 `@CLAUDE.instance.md` 임포트로 함께 로드된다. 신규 프로젝트는 클론 후 `CLAUDE.instance.md` 만 자기 프로젝트 값으로 갈아끼우면 된다.

세부 레퍼런스는 `doc/*`로 분리되어 있다. AI는 필요 시 온디맨드로 로드한다.

> **FORMA 배포 정책**: starter template 단방향(템플릿 → 프로젝트). 프로젝트에서 만든 개선은 템플릿으로 역흡수하지 않는다. 신규 프로젝트는 그 시점 최신 starter 로 시작하고, 기존 프로젝트의 FORMA 코어 업데이트는 별도 운영(수동 cherry-pick).

---
---

# ━━ FORMA 프레임워크 규칙 (모든 FORMA 프로젝트 공통) ━━

## 프레임워크 정체성

FORMA는 **AI(Claude Code/Codex)로 ERP·업무시스템을 바이브코딩**하기 위한 Spring Boot 기반 프레임워크. 메타 어노테이션 + AOP 자동화 + Map 기반 데이터 계약 + YAML 런타임 엔진으로 구성되며, 도메인 코드는 비즈니스 로직만 다룬다.

→ 상세: `doc/FORMA-프레임워크.md`

## 빌드 및 실행

```bash
./gradlew build
./gradlew bootRun    # http://localhost:8080
```

## 서버 관리 규칙 (중요)

- **포트 8080만 사용**. 다른 포트의 프로세스를 건드리지 말 것.
- 서버 재시작은 `./gradlew --stop`만 사용. **`taskkill`이나 `pkill`로 java.exe 전체를 죽이지 말 것** — 다른 서비스가 영향받음.
- 중지가 필요하면: `./gradlew --stop` → `sleep 2` → `./gradlew bootRun`.
- 8080이 이미 사용 중이면 기존 Gradle 데몬만 정리.

## 기술 스택

- Spring Boot 3.4.3, Java 21, MyBatis 3.0.4
- JWT (jjwt), Apache POI, Lombok
- 프론트: Vanilla JS (FORMA 자체 컴포넌트), Static HTML (빌드도구/프레임워크 없음)
- DB: PostgreSQL
- AI: Gemini / Claude API (회의록 자동생성, 보고서 초안 등 선택 기능)
- Thymeleaf 미사용, JPA/Hibernate 미사용

## 프레임워크 영역 (재사용 대상)

FORMA는 ERP 스타터킷 — 런타임 + 컴포넌트 + 관리자 화면 세트 + AI 인터페이스를 모두 포함. 다른 ERP 프로젝트로 이식할 때 아래가 **그대로** 간다:

**백엔드**
- `frame/*` — 코어 런타임 + 표준 공통 API
  - 런타임: `annotation`, `aop`, `auth`, `audit`, `base`, `mybatis`, `security`, `screen`(YAML 엔진), `file`, `trace`, `mvc`, `excel`, `log`, `exception`, `util`, `db`, `migration`, `docoutput`, `ai`
  - 공통 API: `admin`, `popup`, `settings`, `pgm`, `code`, `dept`, `common`(CommonService + 공통 DTO)
- `login/*` — 인증·로그인 (SPI 추출 대상 — `doc/FORMA-SPI.md` §1 카탈로그 참조)

**공통 테이블** (DDL·시드 모두 프레임워크 자산)
- `tb_user`, `tb_user_role`, `tb_user_settings`, `tb_user_favorite`
- `tb_dept`, `tb_role`, `tb_menu`, `tb_role_menu`, `tb_role_auth`, `tb_data_auth`
- `tb_pgm_info`, `tb_code_group`, `tb_code`
- `tb_audit_log`, `tb_log`, `tb_file`

**프론트 자산**
- `static/assets/js/framework/forma.*.js` 15개 + `static/assets/css/forma.css`
- `static/login.html`, `main.html`, `index.html` (브랜딩·로고만 인스턴스 설정으로 교체)
- `static/pages/screen.html` (YAML 엔진 렌더러)
- `static/pages/admin/*.html` — 표준 관리자 화면 세트 (아래 참조)
- `static/pages/popup/` 중 프레임워크용 (PGM_P01, USR_P01)

**표준 관리자 화면 세트** (FORMA 기본 탑재 — ERP 구동에 필수)

| PGM ID | 화면 | 역할 |
|---|---|---|
| FRM_MENU | 메뉴관리 | tb_menu 트리, 즐겨찾기 |
| FRM_PGM | 프로그램관리 (단위프로그램) | tb_pgm_info (화면 등록·버튼 권한 기본값) |
| FRM_ROLE | 역할/권한관리 | tb_role + tb_role_auth 버튼 권한 |
| FRM_USER | 사용자관리 | tb_user + tb_user_role |
| FRM_AUDIT | 감사로그 조회 | tb_audit_log before/after 비교 + 서비스 트레이스 |
| FRM_CODE | 공통코드관리 | tb_code_group + tb_code |
| FRM_DEPT | 조직(부서)관리 | tb_dept 트리 |

라운드 2b-2에서 SY010~SY050/COD010/ORG010 → FRM_* 로 재명명됨. 기존 DB 마이그레이션은 `schema/migrations/20260422-rename-admin-pgm-to-frm.sql`.

**AI 인터페이스**
- `.claude/commands/*`, `.claude/skills/forma-*`, `.claude/settings.json`, `.claude/hooks/check-yaml-schema.sh`
- `design/_schema_guide.yml`, `design/_prompts/*`, `design/screens/DEMO_*.yml`

**문서**
- `CLAUDE.md` 상단, `doc/FORMA-프레임워크.md`, `doc/AI-워크플로.md`, `doc/프론트-패턴.md`, `doc/FORMA-SPI.md`, `doc/FormaForm-위젯-레퍼런스.md`, `doc/데이터권한-설계.md`

## 패키지 구조 (현재 상태)

```
{basePackage}/
├── frame/       # 코어 런타임 + 표준 공통 API (admin/popup/code/pgm/dept/settings 포함, 수정 금지)
├── login/       # 프레임워크 인증 (SPI 추출 대상 — doc/FORMA-SPI.md)
└── domain/      # 업무 코드 (인스턴스만 교체)
```

→ 상세: `doc/FORMA-프레임워크.md` §2, 경계 애매 지점의 추상화 방식: `doc/FORMA-SPI.md`

## 프론트엔드 구조 (골격)

```
static/
├── login.html, main.html, index.html   # 프레임워크 (브랜딩만 인스턴스)
├── pages/
│   ├── screen.html                     # 프레임워크 — YAML 엔진 렌더러
│   ├── admin/                          # 프레임워크 — 표준 관리자 화면 세트
│   ├── popup/PGM_P01, USR_P01          # 프레임워크 — 공통 팝업
│   ├── popup/CUS_P01, BIZ_P*           # 인스턴스 — 도메인 팝업
│   ├── {module}/{PGMID}.html           # 인스턴스 — 업무 화면
│   └── dev/                            # 프레임워크 — 개발자 가이드
└── assets/
    ├── css/forma.css                   # 프레임워크 — CSS 변수 기반 테마
    └── js/framework/                   # 프레임워크 — 컴포넌트 15종
```

## 네이밍 규칙

| 대상 | 규칙 |
|---|---|
| 패키지 | `{basePackage}.domain.{module}` |
| Controller | `{PgmId}Controller.java` |
| Service | `{PgmId}Service.java` |
| MyBatis XML | `mapper/domain/{module}/{pgmId소문자}.xml` |
| namespace | pgmId 소문자 |
| 화면 HTML | `static/pages/{module}/{PGMID}.html` |
| API 경로 | `/{pgmId소문자}/{action}` |
| SQL 테이블 | `tb_{snake_case}` |
| SQL 컬럼 | snake_case |
| 코드 그룹 | UPPER_SNAKE |

프로젝트별 PGM 접두어는 아래 인스턴스 섹션.

## 권한 체계 개요

3계층(메뉴/버튼/데이터):
- `tb_menu` + `tb_role_menu` — 메뉴·버튼 권한 (srch/new/save/del/prnt/upld/init)
- `tb_data_auth` — 데이터 권한 (ALL/DEPT/DEPT_SUB/USER/CUSTOM). `FormaSqlSession`이 WHERE 조건 자동 주입.

→ 상세: `doc/데이터권한-설계.md`

## AI 코드 생성 워크플로 (요약)

요구사항을 받으면 **방식 A**(YAML) vs **방식 B**(커스텀 코드) 중 선택:

- **방식 A** — 단일 테이블 CRUD, LIKE/Equal/dateRange 검색, 기본 JOIN, 표준 권한: `design/screens/{SCREEN_ID}.yml` 1파일로 끝.
- **방식 B** — 트랜잭션 내 다중 테이블, 계산·상태전이, 외부 API, 파일 처리, 필드 단위 readonly: Controller + Service + MyBatis XML + HTML 4파일.

모호하면 사용자에게 한 번만 확인.

→ 상세: `doc/AI-워크플로.md` (슬래시 커맨드/스킬 트리거 매핑 포함)

## 백엔드 표준 패턴 (요약)

```java
@FormaController(value = "/{pgmId소문자}", pgmId = "{PGMID}", description = "{화면명}")
public class {PgmId}Controller extends BaseController {
    @PostMapping("/selectGrid1")
    public BaseResponse<?> selectGrid1(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(service.selectGrid1(param));
    }
    @AddUserInfo  // 쓰기에만
    @PostMapping("/saveGrid1")
    public BaseResponse<?> saveGrid1(@RequestBody List<Map<String, Object>> param) {
        service.saveGrid1(param);
        return BaseResponse.Ok(param);
    }
}
```

- 반환: `BaseResponse.Ok/Warn/Error`.
- Service는 `@Transactional` 쓰기에만, `FormaSqlSession`으로 namespace 호출.
- gstat "I"/"U"는 `Constants.GSTAT_INSERT/UPDATE` 상수 사용.
- MyBatis: `parameterType="map"`, `resultType="map"`, `#{param}`만 사용(`${}`는 sortField 한정).

→ 상세: `doc/FORMA-프레임워크.md` §3

## 프론트 패턴 (요약)

- 화면 1개 = HTML 1파일 (인라인 `<script>`, IIFE).
- `platform.startPage(PGM, listener)` → 권한 로딩 + 툴바 + `listener.initPgm()` 자동 실행.
- `listener.button.{search|save|del|...}.click`만 채우면 단축키·권한 연동 자동.
- `ctx.grid1.setData(data, totalCount)` — 서버 페이징 시 totalCount 필수.
- split 레이아웃: `FormaUtil.initSplit('#split-' + PGM)` 필수.

→ 상세: `doc/프론트-패턴.md`
→ 컴포넌트 API 레퍼런스: `doc/FormaForm-위젯-레퍼런스.md`

## 공통 팝업 규약

- `codePopup` 위젯으로 FK 선택. 팝업은 `/pages/popup/{코드}_P01.html`.
- 팝업 내: `FormaModal.current().ok({CODE, NAME})`로 결과 반환.

## 참조 문서 맵

| 주제 | 문서 |
|---|---|
| 신규 프로젝트 부트스트랩(starter 클론 직후) | `ONBOARDING.md` |
| 프레임워크 전체 | `doc/FORMA-프레임워크.md` |
| AI 바이브코딩 절차 | `doc/AI-워크플로.md` |
| 프론트 조립 관례 | `doc/프론트-패턴.md` |
| 컴포넌트 API | `doc/FormaForm-위젯-레퍼런스.md` |
| 권한 상세 | `doc/데이터권한-설계.md` |
| SPI 카탈로그 | `doc/FORMA-SPI.md` |
| 아키텍처 | `doc/아키텍처/*.md` |
| 기술스택 | `doc/기술스택/*.md` |
| YAML 설계서 스키마 | `design/_schema_guide.yml` |
| YAML 샘플 (학습용) | `design/screens/DEMO_*.yml` |

---
---

# ━━ 프로젝트 인스턴스 정보 ━━

@CLAUDE.instance.md
