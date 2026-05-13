---
description: FormaGrid 컬럼을 추가·변경·삭제하는 핀포인트 편집
argument-hint: <PGMID 또는 HTML 경로> <작업 내용 예: "amount 컬럼 currency 포맷 추가">
allowed-tools: Read, Edit, Grep, Glob
---

# /forma-grid-col

기존 FORMA 화면의 그리드 컬럼 1~2곳만 고치는 핀포인트 커맨드.

## 인자

$ARGUMENTS — `{PGMID} {자연어 작업}` 또는 `{HTML 경로} {자연어 작업}`

## 작업 단계

1. **대상 파일 특정**
   - HTML 또는 `design/screens/*.yml`의 `grids.gridN.columns` 배열.
2. **컬럼 속성 결정**
   - 데이터 유형 → 컬럼 속성 매핑:
     | 데이터 | 속성 |
     |---|---|
     | 코드 FK | `editor: select, code: {GRP}` |
     | Y/N | `editor: check, align: center` |
     | 금액 | `type: number, format: currency, align: right, footer: sum` 옵션 |
     | 수량 | `type: number, align: right` |
     | 날짜 | `editor: date` |
     | 긴 텍스트 | 넓은 width |
   - 필수 값은 `required: true`, 편집 불가는 `readOnly: true`, 좌측 고정은 `frozen: true`.
3. **서버 매핑 확인**
   - 조회 SQL(`selectGrid1` 등)의 `columns` 또는 `SELECT` 절에 해당 필드 포함 여부.
   - 저장 SQL의 INSERT/UPDATE에 해당 컬럼 포함 여부.
4. **테스트**
   - `/review-screen {PGMID}` 실행으로 체크리스트 통과 확인.

## 자주 하는 실수 방지

- `editor` vs `format` 구분: editor는 편집 모드 위젯, format은 표시 포맷. 편집 가능한 금액은 **둘 다** 필요.
- `resultType="map"`의 필드 케이싱이 DB 드라이버에 따라 대/소문자 다름. 프로젝트의 실제 응답을 확인하고 맞춘다.
- 멀티헤더: `label: [{text, colspan}, {text}]` 배열 형식. 자식 컬럼과 colspan 합이 맞는지.
- `footer: sum` 은 `type: number`에만 의미 있음.

## 참조

- `@doc/FormaForm-위젯-레퍼런스.md` — 그리드 컬럼 속성 전체
- `@doc/프론트-패턴.md` §5 — 서버 페이징 주의 (setData(data, totalCount))
