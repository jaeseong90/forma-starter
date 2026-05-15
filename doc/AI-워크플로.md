# AI 바이브코딩 워크플로

AI가 "화면 만들어줘" 같은 요구를 받았을 때 따르는 절차. 사용자(개발자)는 자연어로만 대화하고, AI가 이 문서의 규칙에 따라 FORMA 자산을 생성·수정한다.

---

## 1. 진입점

| 사용자 발화 예시 | 트리거 | 결과 |
|---|---|---|
| "화면 만들어줘 / CRUD / 등록·조회·수정·삭제" | `forma-screen-workflow` 스킬 | 요구 분석 → 방식 A/B 판정 → 설계서 또는 4파일 생성 |
| "설계서만 뽑아줘" | `/new-screen` | `design/screens/{SCREEN_ID}.yml` 초안 |
| "이 YAML로 코드 만들어줘" | `/yaml-to-code <경로>` | Controller/Service/Mapper/HTML 4파일 |
| "이 화면 리뷰해줘" | `/review-screen [대상]` | 백엔드·프론트·보안·성능 체크리스트 리포트 |
| "폼에 필드 추가" | `/forma-form-widget` | `FormaForm-위젯-레퍼런스` 조회 → 해당 HTML 1곳 수정 |
| "그리드 컬럼 추가" | `/forma-grid-col` | 레퍼런스 조회 → 해당 HTML 1곳 수정 |

---

## 2. 방식 A(YAML) vs 방식 B(커스텀 코드) 판정

### 방식 A — YAML 1장으로 끝
모두 true면 방식 A를 고른다.

- [ ] 테이블 1~2개 (마스터 1 + 디테일 1까지)
- [ ] 기본 CRUD만. 저장 시 여러 테이블에 동시에 쓰지 않음
- [ ] 계산·자동채번·상태전이·외부 API 호출 없음
- [ ] 파일 업로드 없음
- [ ] 검색은 LIKE / Equal / dateRange 조합
- [ ] 권한은 버튼 기반 (조회/신규/저장/삭제)으로 충분

### 방식 B — 커스텀 코드 4파일
하나라도 true면 방식 B.

- [ ] 트랜잭션 내 3개+ 테이블 쓰기
- [ ] 상태 전이(승인/반려/마감 등)
- [ ] 금액·수량 자동 계산, 채번 규칙
- [ ] 회의록 AI 요약 같은 외부 API 연동
- [ ] 파일 첨부·엑셀 업로드 파싱
- [ ] 권한이 필드 단위 readonly 수준까지 필요

모호하면 **사용자에게 한 번만 확인**한다: "이 화면 YAML 1장 / 커스텀 코드 중 어느 방향이 좋을까요?" 이후엔 반복 질문 금지.

---

## 3. 방식 A 파이프라인 (`/new-screen` → `/yaml-to-code`)

1. **요구 분석**: 화면명, 데이터 필드, 검색 조건, 코드 참조, 특수 동작 추출. 명시되지 않은 것은 합리적 추론(PK, use_yn, 감사 컬럼).
2. **화면 ID 채번**: 프로젝트 접두어 규칙(`CLAUDE.md` 인스턴스 섹션)에 따라 `{접두어}{순번}`. 기존 `design/screens/` 파일명·실제 구현 PGM과 충돌 금지.
3. **YAML 작성**: `design/_schema_guide.yml` 스키마 엄수. 샘플은 `design/screens/DEMO_*.yml`.
4. **DDL 초안 + 코드 데이터 초안** 제시: 신규 `db/migration/V{N}__*.sql` (Flyway 마이그레이션)에 추가할 문장.
5. **사용자 검토**: 필드·위젯·검색 조건·특수 동작 4가지 질문. 승인되면 다음 단계.
6. **코드 생성 여부 확인**: 사용자가 "코드까지" 요청 시 `/yaml-to-code`. 그렇지 않으면 YAML만으로 서버 핫리로드(`/api/screen/_reload`)로 바로 동작.

### 방식 A에서 AI가 자주 틀리는 것
- PGM ID 접두어를 프로젝트 고유값으로 쓰지 않고 일반 예시(MMA, SDA 등)를 그대로 씀 → **항상 `CLAUDE.md` 인스턴스 섹션의 접두어 테이블을 먼저 읽는다**.
- `sql.selectGrid2`에 `where` 절(마스터 키 필터) 누락 → split-detail/master-detail 유형은 필수.
- 컬럼 `field`명을 소문자로 씀 → `resultType="map"` 기본이 DB 대문자 반환(H2/PostgreSQL 드라이버 설정에 따라 다름). 프로젝트의 실제 케이싱을 따른다.

---

## 4. 방식 B 파이프라인 (`/yaml-to-code` 또는 직접 작성)

4파일을 생성한다:

```
src/main/java/{basePackage}/domain/{module}/{PgmId}Controller.java
src/main/java/{basePackage}/domain/{module}/{PgmId}Service.java
src/main/resources/mapper/domain/{module}/{pgmId}.xml
src/main/resources/static/pages/{module}/{PGMID}.html
```

`basePackage`는 `CLAUDE.md`에서 읽는다 (FORMA: `com.forma`).

표준 템플릿은 `doc/FORMA-프레임워크.md` §3(백엔드 패턴) + `doc/프론트-패턴.md`(프론트 패턴) 참조.

### 방식 B에서 AI가 자주 틀리는 것
- `@AddUserInfo`를 조회에도 붙임 → **쓰기(save/delete/approve 등)에만**.
- Service 쓰기 메서드에 `@Transactional` 누락.
- MyBatis INSERT/UPDATE에 감사 컬럼(`created_by`·`created_at`·`updated_by`·`updated_at`) 누락.
- `gstat` 값 상수화: 문자 `"I"`/`"U"`를 직접 쓰지 말고 `Constants.GSTAT_INSERT` 사용.
- 프론트 `ctx.grid.setData(data)` 호출 시 `totalCount` 누락 → 서버 페이징 화면의 페이저가 표시되지 않음.
- `FormaUtil.initSplit()` 누락 → split-detail/split-tab 레이아웃에서 드래그 리사이즈 미동작.

---

## 5. 저장 후 후속 작업

1. **서버 재시작**: 백엔드 변경이 있으면 `./gradlew --stop` → `sleep 2` → `./gradlew bootRun`. 자바/XML만 바뀐 경우는 DevTools가 자동 반영할 수도 있으나, 신규 Controller 등록은 재시작 필요.
2. **메뉴 등록**: `tb_pgm_info` INSERT + `tb_menu` INSERT + `tb_role_menu`에 ADMIN 권한. DDL 초안에 포함시켜 둔다.
3. **index.html 링크 추가** (개발자 포털): 선택.
4. **리뷰**: `/review-screen`으로 체크리스트 자동 돌림.

서버 재시작 규칙: **`taskkill` / `pkill`로 java.exe 전체를 죽이지 말 것**. 포트 18080만 쓰며, 다른 서비스가 영향받을 수 있다. `./gradlew --stop`만.

---

## 6. 리뷰 체크리스트 요약

`/review-screen` 실행 시 다음 카테고리로 점검:

- **백엔드**: Controller 반환 타입, @AddUserInfo 위치, @Transactional, namespace 일치, SQL 인젝션(`${}` 위험)
- **프론트**: IIFE 패턴, platform.startPage, Listener 버튼 등록, setData(data, totalCount), validate 후 저장
- **보안**: `${param}` 직접 삽입 금지(sortField 제외), 파일 업로드 확장자 검증, 민감정보 로그 금지
- **성능**: 1000건+ 서버 페이징, 10000건+ virtualScroll, XLSX 대량은 서버 다운로드, N+1 쿼리

상세 체크 항목은 `prompts/review-checklist.md` (레거시이지만 내용 유효).

---

## 7. 여러 번 반복할 때의 원칙

- 사용자가 추가 요구("필드 추가", "검색 조건 바꿔줘")를 할 때는 **다시 전 과정 반복하지 않는다**. 해당 파일 1곳만 핀포인트 수정.
- YAML 화면이면 `design/screens/{ID}.yml` 1파일 + 재로드 호출. 커스텀 코드 화면이면 영향받는 파일만.
- 방식 A → 방식 B 승격이 필요해지면 (YAML로 시작했는데 로직이 커졌다) 사용자에게 알리고 YAML을 "화면 설계서"로 유지한 채 커스텀 코드로 전환한다. YAML은 설계 문서로 보존.
