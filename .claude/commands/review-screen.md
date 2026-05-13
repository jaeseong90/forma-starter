---
description: FORMA 화면(YAML 또는 4파일)에 대해 백엔드/프론트/보안/성능 체크리스트 리뷰
argument-hint: <PGMID 또는 파일 경로, 생략 시 git diff 대상>
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*)
---

# /review-screen

FORMA 화면을 `prompts/review-checklist.md` 기준으로 정적 리뷰.

## 인자

$ARGUMENTS — 옵션:
- PGMID (예: `CST020`) → 해당 화면의 4파일 + YAML 전수 리뷰
- 파일 경로 → 해당 파일만
- 생략 → 현재 브랜치의 uncommitted diff 대상

## 작업 단계

1. **대상 수집**
   - PGMID: `find src -path '*{module}*{PGMID}*' -o -path '*{pgmId}.xml'` + `design/screens/{PGMID}.yml`
   - 파일: 직접 읽음
   - diff: `git diff --name-only` 결과 중 FORMA 관련 파일만
2. **체크리스트 적용**: `@prompts/review-checklist.md`의 백엔드 / 프론트엔드 / 보안 / 성능 섹션 전수 점검.
3. **리포트 출력** (형식 고정):

```markdown
## 리뷰 리포트 — {대상}

### ✅ 통과
- 항목1 (파일:라인)
- ...

### ⚠️ 개선 권장
- 항목 (파일:라인) — 이유 + 제안

### ❌ 수정 필요
- 항목 (파일:라인) — 이유 + 수정안 (패치 블록)

### 스코어
- 백엔드: x/10  |  프론트: x/10  |  보안: x/10  |  성능: x/10
```

## 추가 규칙

- 체크리스트 통과여도 FORMA 고유 규칙(@FormaController pgmId 일치, namespace 일치, `$` vs `#` 바인딩 등)은 반드시 별도 확인.
- `Constants.GSTAT_INSERT` 대신 문자열 `"I"`를 직접 쓰는 코드는 **❌**.
- 쓰기 메서드에 `@Transactional` 누락은 **❌**.
- 프론트 `setData(rows)` 단일 인자 호출 + 서버 페이징 설정 공존 시 **⚠️**.

## 참조

- 체크리스트 원본: `@prompts/review-checklist.md`
- 패턴 레퍼런스: `@doc/FORMA-프레임워크.md`, `@doc/프론트-패턴.md`
