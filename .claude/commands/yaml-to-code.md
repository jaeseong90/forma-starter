---
description: YAML 설계서 경로를 받아 Controller + Service + MyBatis XML + HTML 4파일을 스캐폴드
argument-hint: <YAML 경로 예: design/screens/CST020.yml>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(grep:*)
---

# /yaml-to-code

YAML 설계서를 **방식 B 커스텀 코드 4파일**로 변환. 단순 CRUD는 방식 A(YAML 1장 + 엔진)만으로 충분하므로 **이 커맨드는 "방식 A로는 표현 못 하는 로직이 필요해 코드로 승격"할 때만 사용**.

## 인자

$ARGUMENTS — YAML 파일 경로 (예: `design/screens/ITM010.yml`)

## basePackage

`CLAUDE.md` 인스턴스 섹션의 `basePackage` 값을 사용한다(예: `com.saleson`). 이하 경로는 `{basePkg}` 자리에 그 값을 슬래시로 표기한 것(`com.saleson` → `com/saleson`)을 넣는다.

## 생성 대상

YAML의 `screen.id`(예: `ITM010`)와 `screen.module`(예: `material/item`) 기준:

| 파일 | 경로 |
|---|---|
| Controller | `src/main/java/{basePkg}/domain/{module}/{PgmId}Controller.java` |
| Service | `src/main/java/{basePkg}/domain/{module}/{PgmId}Service.java` |
| MyBatis XML | `src/main/resources/mapper/domain/{module}/{pgmId소문자}.xml` |
| HTML | `src/main/resources/static/pages/{module}/{PGMID}.html` |

`PgmId`는 CamelCase (`Itm010`), `pgmId소문자`는 소문자 (`itm010`), `PGMID`는 대문자 (`ITM010`).

## 규칙 (엄수)

- Controller: `@FormaController(value="/{pgmId소문자}", pgmId="{PGMID}", description="{name}")` + `@RequiredArgsConstructor` + `extends BaseController`. 쓰기에만 `@AddUserInfo`.
- Service: `@FormaService(pgmId="{PGMID}", description="{name}")` + `extends BaseService`. `FormaSqlSession sql` 주입, `private final String ns = "{pgmId소문자}"`. 쓰기에 `@Transactional`. `gstat` 분기는 `Constants.GSTAT_INSERT`.
- XML: `namespace="{pgmId소문자}"`, `parameterType="map"`, `resultType="map"`. `<sql id="whereGrid1">` + `<include>` 패턴. INSERT/UPDATE에 감사 컬럼 필수.
- HTML: IIFE + `platform.startPage(PGM, listener)`. 화면 유형별 레이아웃은 `@doc/프론트-패턴.md` §4 참조.

## 완료 후 안내 (고정 문구)

```
코드 생성 완료:
- Controller: src/main/java/{basePkg}/domain/{module}/{PgmId}Controller.java
- Service:    src/main/java/{basePkg}/domain/{module}/{PgmId}Service.java
- Mapper XML: src/main/resources/mapper/domain/{module}/{pgmId}.xml
- HTML:       src/main/resources/static/pages/{module}/{PGMID}.html

다음 단계:
1. schema/04-pgm.sql 에 tb_pgm_info + tb_menu + tb_role_menu INSERT 추가
2. 서버 재시작: ./gradlew --stop → sleep 2 → ./gradlew bootRun (taskkill 금지)
3. /review-screen {PGMID} 로 체크리스트 검증
```

## 상세 프롬프트 (원본)

@design/_prompts/01-generate-code.md

## 프레임워크 레퍼런스

- 백엔드 패턴: `@doc/FORMA-프레임워크.md` §3
- 프론트 패턴: `@doc/프론트-패턴.md`
