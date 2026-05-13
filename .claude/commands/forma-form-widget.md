---
description: FormaForm 폼 위젯(입력 필드)을 추가·변경·삭제하는 핀포인트 편집
argument-hint: <PGMID 또는 HTML 경로> <작업 내용 예: "stage 콤보 추가">
allowed-tools: Read, Edit, Grep, Glob
---

# /forma-form-widget

기존 FORMA 화면의 폼 1곳만 고치는 핀포인트 커맨드. 화면 전체 재생성 방지.

## 인자

$ARGUMENTS — `{PGMID} {자연어 작업}` 또는 `{HTML 경로} {자연어 작업}`

## 작업 단계

1. **대상 파일 특정**
   - PGMID 주어지면 `src/main/resources/static/pages/**/{PGMID}.html` 검색.
   - 경로 주어지면 그대로.
   - YAML 엔진 화면(`design/screens/*.yml`)이면 YAML의 `form` 섹션 수정.
2. **위젯 스펙 결정**
   - 데이터 유형 → widget 매핑 규칙은 `@doc/프론트-패턴.md` + `@doc/FormaForm-위젯-레퍼런스.md`.
   - 코드 FK면 `combo` + `code: {GRP}` 또는 `codePopup`.
3. **편집 적용** (HTML인 경우)
   - FormaForm `elements` 배열에서 해당 위치에 필드 삽입/수정.
   - 저장·조회 로직이 `getData()`로 필드를 자동 수집하므로 별도 JS 수정 불필요.
   - 서버 API가 새 필드를 받도록 `sql.insert/update` XML에 컬럼 추가 필요 여부 확인.
4. **검증**
   - `widget: codePopup`이면 `popup.codeField/nameField`가 올바른지 확인.
   - `widget: combo`인데 `code`와 `options`가 둘 다 있으면 제거 (둘 중 하나).
   - `dependsOn`으로 부모 콤보 변경 시 자식 초기화·재로드 되는지 확인.

## 자주 하는 실수 방지

- address 위젯은 `getData()`에서 `{field}_zip`, `{field}_addr`, `{field}_detail`로 분해 반환. DB 컬럼명 매핑 확인 필수.
- switch 위젯은 `'Y'/'N'`으로 반환. `true/false` 아님.
- currency 위젯은 숫자로 반환 (콤마 포맷은 화면 표시만). Number 타입으로 저장.

## 참조

- `@doc/FormaForm-위젯-레퍼런스.md` — 위젯 21종 전체 스펙
- `@doc/프론트-패턴.md` §6 — 저장 플로우
