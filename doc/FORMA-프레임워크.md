# FORMA 프레임워크

AI(Claude Code / Codex 등)로 ERP·업무시스템을 **바이브코딩**하기 위해 설계된 Spring Boot 기반 프레임워크. SalesOn은 이 프레임워크의 첫 레퍼런스 구현.

이 문서는 **도메인 중립**. 어느 ERP 프로젝트에 이식하든 여기 규칙은 그대로 적용된다. 프로젝트 고유 정보(도메인 모듈, 접두어, DB 접속 등)는 `CLAUDE.md` 하단 "인스턴스" 섹션을 본다.

---

## 1. 핵심 원칙

1. **메타 어노테이션 중심**: `@FormaController(pgmId=...)` · `@FormaService(pgmId=...)`에 PGM ID만 박아두면 감사로그·트레이스·데이터권한이 AOP로 자동 주입된다. 도메인 코드는 비즈니스만 다룬다.
2. **Map 기반 데이터 계약**: 프론트 FormaGrid/Form ↔ Controller ↔ MyBatis 사이를 `Map<String, Object>`로 흐르게 한다. DTO는 복잡 로직이나 외부 API 계약에만 선택적으로 사용. 스캐폴딩 비용이 0에 수렴.
3. **namespace 기반 MyBatis 호출**: Mapper 인터페이스 없음. `FormaSqlSession.selectList("{pgmId}.selectGrid1", param)` 한 줄. 파일 위치·네이밍이 곧 라우팅.
4. **런타임 YAML 엔진(방식 A) + 커스텀 코드(방식 B) 듀얼 트랙**: 단순 CRUD는 YAML 1장으로, 복잡 로직은 4파일 스캐폴드로. AI가 요구사항을 읽고 둘 중 하나를 선택한다.
5. **프론트-백엔드 완전 분리**: Thymeleaf 없음. Static HTML + Vanilla JS(FORMA 컴포넌트). 빌드 도구 없음. 화면 한 장 = HTML 1파일(인라인 `<script>`).

---

## 2. 패키지 구조 (프레임워크 층)

프레임워크 층은 **코어 런타임 + 표준 공통 API**(`frame/`) + **인증**(`login/`) 2덩어리. `login/`은 SPI 추출 대상(`doc/FORMA-SPI.md` 참조).

### 2.1 코어 런타임

```
{basePackage}.frame/          # 수정 금지. 런타임 뼈대.
├── annotation/               # @FormaController, @FormaService, @AddUserInfo
├── aop/                      # UserInfoAspect (쓰기 시 user_id 자동 주입)
├── auth/                     # DataAuthContext, DataAuthService (조회 시 부서/사용자 WHERE 자동 추가)
├── audit/                    # AuditLogAspect (save*/delete* 자동 변경이력 기록)
├── base/                     # BaseController, BaseService, BaseResponse, ResultCode
├── mybatis/                  # FormaSqlSession (데이터권한 + snake↔camel 자동 정규화)
├── db/                       # PrimaryDataSourceConfig
├── security/                 # JWT, TokenInterceptor, CookieUtil
├── screen/                   # YAML 런타임 엔진 (ScreenRegistry, DynamicSqlExecutor, GenericCrudController, ScreenDefinition)
├── file/                     # FileController, FileService (업로드/다운로드)
├── trace/                    # ServiceTraceAspect, TraceStore (인메모리 최근 200건)
├── mvc/                      # WebMvcConfig, GlobalExceptionAdvice
├── excel/                    # ExcelController (XLSX 서버사이드 SXSSF 스트리밍)
├── log/                      # FormaLogService
├── exception/                # FormaException
├── ai/                       # AIClient (Claude/Gemini HTTP) — SPI 추출 대상
├── docoutput/                # 문서 출력(PDF/엑셀 템플릿)
├── migration/                # 스키마/시드 마이그레이션 러너
└── util/                     # Constants, SeqGenerator, OptimisticLockUtil
```

### 2.2 표준 공통 API (관리자 + 팝업 + 설정)

```
{basePackage}.frame/
├── pgm/PgmController              # GET /api/pgm/{id}/init — 화면 진입 시 pgmInfo·pgmAuth 제공
├── code/CodeController            # GET /api/code/{grpCode} — 코드 그룹 조회 (Combo 용)
├── code/FrmCodeController         # FRM_CODE — 공통코드관리 화면 API
├── admin/AdminController          # 관리자 API (메뉴·역할·사용자·감사)
├── popup/PopupController          # 공통 팝업(PGM/USR) API
├── settings/UserSettingsController# 사용자 테마·즐겨찾기 설정
├── dept/FrmDeptController         # FRM_DEPT — 부서관리 화면 API
└── common/                        # CommonService + 공통 DTO (CodeResDto, MenuResDto, PgmInfoResDto 등)
```

### 2.3 인증 — `login/`

```
{basePackage}.login/
├── LoginController            # POST /api/login, /api/logout
├── LoginService               # 사용자 검증, JWT 발급
├── LoginUserVo                # ← SPI 후보 (doc/FORMA-SPI.md §3.1 LoginUser)
├── PasswordBootstrapRunner    # 초기 비밀번호 시드/해시 마이그레이션
├── UserSeedRunner             # 기본 사용자/역할 시드
└── dto/LoginUserResDto
```

### 2.4 도메인 (인스턴스 영역)

```
{basePackage}.domain.{module}/
├── {PgmId}Controller.java
├── {PgmId}Service.java
└── dto/                       # 선택. 외부 API·복잡 DTO가 필요한 경우만.
```

---

## 3. 백엔드 표준 패턴

### 3.1 Controller

```java
@FormaController(value = "/{pgmId소문자}", pgmId = "{PGMID}", description = "{화면명}")
@RequiredArgsConstructor
public class {PgmId}Controller extends BaseController {
    private final {PgmId}Service service;

    @PostMapping("/selectGrid1")
    public BaseResponse<List<Map<String, Object>>> selectGrid1(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(service.selectGrid1(param));
    }

    @AddUserInfo                                // 쓰기에만 — AOP가 Map에 user_id 주입
    @PostMapping("/saveGrid1")
    public BaseResponse<?> saveGrid1(@RequestBody List<Map<String, Object>> param) {
        service.saveGrid1(param);
        return BaseResponse.Ok(param);
    }
}
```

규약:
- 반환은 항상 `BaseResponse.Ok(data)` / `BaseResponse.Warn(msg)` / `BaseResponse.Error(msg)`.
- `GlobalExceptionAdvice`가 `FormaException → WARN`, 일반 `Exception → ERROR` 자동 변환.
- 페이징 필요 시 `param.put("_offset", (page-1) * pageSize)` 후 `Map("data", totalCount)` 반환.

### 3.2 Service

```java
@FormaService(pgmId = "{PGMID}", description = "{화면명}")
public class {PgmId}Service extends BaseService {
    private final FormaSqlSession sql;
    private final String ns = "{pgmId소문자}";

    public {PgmId}Service(FormaSqlSession sql) { this.sql = sql; }

    public List<Map<String, Object>> selectGrid1(Map<String, Object> param) {
        return sql.selectList(ns + ".selectGrid1", param);
    }

    @Transactional
    public void saveGrid1(List<Map<String, Object>> param) {
        for (Map<String, Object> item : param) {
            if (Constants.GSTAT_INSERT.equals(item.get(Constants.GSTAT))) {
                sql.insert(ns + ".insertGrid1", item);
            } else {
                sql.update(ns + ".updateGrid1", item);
            }
        }
    }
}
```

규약:
- `gstat`는 프론트 FormaGrid가 자동 관리: `"I"` = Insert, `"U"` = Update.
- 쓰기 메서드는 반드시 `@Transactional`.
- 채번은 `SeqGenerator.next("ORD")`.

### 3.3 MyBatis XML

경로: `resources/mapper/domain/{module}/{pgmId소문자}.xml`, namespace: pgmId 소문자.

```xml
<mapper namespace="{pgmId소문자}">
    <sql id="whereGrid1">
        <if test="keyword != null and keyword != ''">
            AND name LIKE '%' || #{keyword} || '%'
        </if>
        <if test="date_from != null and date_from != ''">
            AND order_date &gt;= #{date_from}
        </if>
    </sql>
    <select id="selectGrid1" parameterType="map" resultType="map">
        SELECT * FROM tb_xxx
        <where><include refid="whereGrid1"/></where>
        <if test="sortField != null">ORDER BY ${sortField} ${sortDir}</if>
        <if test="page != null">LIMIT #{pageSize} OFFSET #{_offset}</if>
    </select>
    <insert id="insertGrid1" parameterType="map">
        INSERT INTO tb_xxx (..., created_by, created_at, updated_by, updated_at)
        VALUES (..., #{user_id}, NOW(), #{user_id}, NOW())
    </insert>
    <update id="updateGrid1" parameterType="map">
        UPDATE tb_xxx SET ..., updated_by=#{user_id}, updated_at=NOW()
        WHERE pk = #{pk}
    </update>
</mapper>
```

규약:
- `parameterType="map"`, `resultType="map"` 기본.
- `#{param}`만 사용. `${param}`은 sortField/sortDir에만 허용 (SQL 인젝션 주의).
- dateRange 필드는 프론트가 `{field}_from`, `{field}_to`로 쪼개서 보낸다.
- INSERT/UPDATE는 감사 컬럼(`created_by`·`created_at`·`updated_by`·`updated_at`) 필수.

---

## 4. 데이터권한 자동 주입

`FormaSqlSession`은 조회 시 `DataAuthContext`를 읽어 param에 다음 키를 자동으로 심는다:

| 키 | 의미 |
|---|---|
| `_userId` | 로그인 사용자 ID |
| `_userDept` | 사용자 부서 코드 |
| `_dataAuthType` | `ALL` / `DEPT` / `DEPT_SUB` / `USER` / `CUSTOM` |
| `_deptList` | DEPT_SUB일 때 하위 부서 코드 리스트 |

MyBatis XML에서는 `<if test="_dataAuthType == 'DEPT'">AND dept_code = #{_userDept}</if>` 식으로 쓴다. 상세: `doc/데이터권한-설계.md`.

---

## 5. YAML 스크린 엔진 (방식 A)

### 동작
`classpath:design/screens/*.yml`을 `ScreenRegistry`가 로드 → `GenericCrudController`가 `/api/screen/{screenId}/selectGrid1` 등 엔드포인트 자동 노출 → `DynamicSqlExecutor`가 YAML 정의로 SQL 생성·실행.

### YAML이 커버하는 것
- LIKE 검색, Equal 필터, dateRange
- JOIN (LEFT/INNER), 기본 ORDER BY, LIMIT/OFFSET 페이징
- 권한 기반 버튼 표시
- INSERT/UPDATE 감사 컬럼 자동, UPDATE 낙관적 잠금(`updated_at` 비교)

### YAML이 못 하는 것
- 트랜잭션 내 다중 테이블 쓰기
- 계산 로직, 상태 전이
- 외부 API 호출, 파일 처리
- 유효성 검증(비즈니스 규칙)

이 경계는 `doc/AI-워크플로.md`의 방식 A/B 판정 트리를 따른다.

### 스키마
`design/_schema_guide.yml` 참조. 학습용 샘플은 `design/screens/DEMO_*.yml`.

---

## 6. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 패키지 | `{basePackage}.domain.{module}` | `com.saleson.domain.customer` |
| Controller | `{PgmId}Controller.java` | `Cst010Controller.java` |
| Service | `{PgmId}Service.java` | `Cst010Service.java` |
| MyBatis XML | `mapper/domain/{module}/{pgmId소문자}.xml` | `mapper/domain/customer/cst010.xml` |
| namespace | pgmId 소문자 | `cst010` |
| 화면 HTML | `static/pages/{module}/{PGMID}.html` | `pages/customer/CST010.html` |
| API 경로 | `/{pgmId소문자}/{action}` | `/cst010/selectGrid1` |
| SQL 테이블 | `tb_{snake_case}` | `tb_customer` |
| SQL 컬럼 | snake_case | `cust_cd`, `created_at` |
| 코드 그룹 | UPPER_SNAKE | `CUST_TYPE` |

PGM ID 접두어는 프로젝트 고유값이라 `CLAUDE.md` 인스턴스 섹션에서 정의한다.

---

## 7. 표준 관리자 화면 세트

FORMA는 런타임 + 컴포넌트만이 아니라 **ERP 구동에 필수인 관리자 화면 7종을 기본 탑재**한다. 새 프로젝트는 이 세트를 그대로 쓰고 업무 모듈만 추가하면 된다.

| PGM ID | 화면 | 데이터 | Controller / XML |
|---|---|---|---|
| FRM_MENU | 메뉴관리 (트리, 즐겨찾기) | tb_menu | AdminController `/api/admin/*` (공용) |
| FRM_PGM | 프로그램관리 (단위프로그램 등록·버튼 권한 기본값) | tb_pgm_info | AdminController 공용 |
| FRM_ROLE | 역할/권한관리 (역할별 메뉴·버튼 권한) | tb_role, tb_role_auth | AdminController 공용 |
| FRM_USER | 사용자 + 사용자별 역할 | tb_user, tb_user_role | AdminController 공용 |
| FRM_AUDIT | 감사로그 조회 (before/after) + 서비스 트레이스 | tb_audit_log, (인메모리) | AdminController 공용 |
| FRM_CODE | 공통코드 그룹·항목 관리 | tb_code_group, tb_code | `frame/code/FrmCodeController` + `mapper/frame/code/frm_code.xml` |
| FRM_DEPT | 조직(부서) 트리 | tb_dept | `frame/dept/FrmDeptController` + `mapper/frame/dept/frm_dept.xml` |

기본 팝업 2종도 프레임워크에 포함:
- `PGM_P01` — 프로그램 검색 (권한 설정 시 사용)
- `USR_P01` — 사용자 검색 (담당자 지정 등)

---

## 8. FORMA를 다른 ERP에 이식할 때

1. **패키지 복사**: `{basePackage}.frame/`, `{basePackage}.login/` 두 덩어리를 새 프로젝트에 복사. `{basePackage}`만 바꾸면 됨.
2. **공통 테이블 DDL 유지**: `schema/01-tables.sql`의 프레임워크 테이블만 남기고(tb_user, tb_user_role, tb_user_settings, tb_user_favorite, tb_dept, tb_role, tb_menu, tb_role_menu, tb_role_auth, tb_data_auth, tb_pgm_info, tb_code_group, tb_code, tb_audit_log, tb_log, tb_file), 업무 테이블은 제거.
3. **프레임워크 시드 유지**: `schema/02-codes.sql`의 공통 코드 그룹만 유지, 업무 코드는 프로젝트별.
4. **정적 자원 복사**: `static/assets/js/framework/*.js`, `forma.css`, `login.html`, `main.html`, `index.html`, `pages/screen.html`, `pages/admin/*`, `pages/popup/PGM_P01`·`USR_P01`.
5. **application.yml**의 DB·JWT secret·파일 업로드 경로 교체.
6. **CLAUDE.md**: 상단(FORMA 공통 섹션)은 그대로, 하단(인스턴스)만 새 도메인에 맞춰 교체.
7. **.claude/**: `commands/`, `skills/`는 대부분 그대로. `yaml-to-code.md`의 `basePackage` 변수만 맞춤.
8. **SPI 주입**: 프로젝트에서 기본 구현을 교체할 것이 있으면 `doc/FORMA-SPI.md` 참조. Spring Bean을 override.

이 경로로 가면 "로그인·메뉴·권한·코드·감사 조회"가 즉시 동작하는 ERP 스타터가 된다. 업무 모듈만 올리면 됨.

---

## 9. 공통 엔드포인트

| 경로 | 설명 |
|---|---|
| `/api/login`, `/api/logout` | 로그인/로그아웃 (JWT 쿠키) |
| `/api/pgm/{PGMID}/init` | 화면 진입 시 pgmInfo + pgmAuth 반환 |
| `/api/code/{grpCode}` | 코드 그룹 조회 (Combo/Select 용) |
| `/api/file/upload`, `/api/file/download/{id}` | 파일 업로드/다운로드 |
| `/api/excel/download` | XLSX 서버 다운로드 (SXSSF 스트리밍) |
| `/api/screen/{screenId}/*` | YAML 스크린 엔진 CRUD |
| `/api/screen/_reload` | YAML 핫리로드 (개발) |

---

## 10. 참고 문서

- `doc/AI-워크플로.md` — AI가 요구사항을 받아 YAML 또는 4파일을 생성하는 절차
- `doc/프론트-패턴.md` — 화면 HTML/JS 관례, 레이아웃, Listener, 저장·삭제 플로우
- `doc/FORMA-SPI.md` — 프로젝트가 override 가능한 Service Provider Interface 목록
- `doc/FormaForm-위젯-레퍼런스.md` — 폼/그리드 컴포넌트 API 레퍼런스
- `doc/데이터권한-설계.md` — 권한 테이블 구조, DataAuthContext 상세
- `doc/프레임워크-구성요소.md` — 각 모듈의 책임과 의존성
