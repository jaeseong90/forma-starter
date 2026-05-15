# FORMA Starter 기여 가이드

FORMA Starter 는 **AI(Claude Code 등) 와 함께 ERP·업무시스템을 빠르게 만들기 위한 단방향 starter** 다. 본 저장소는 다운스트림 프로젝트의 출발점이 되므로, 기여는 **프레임워크 자산** 한정으로 받는다.

## 기여 가능 범위

| 영역 | 환영 | 거절 사유 |
|---|---|---|
| `frame/*`, `login/*` 의 버그 수정 | ✅ | |
| 프레임워크 공통 테이블 DDL (`schema/*.sql`) 보강 | ✅ | |
| 프론트 컴포넌트(`static/assets/js/framework/forma.*.js`) 개선 | ✅ | |
| 표준 관리자 화면(`FRM_*`) 개선 | ✅ | |
| 문서(`doc/*`, `CLAUDE.md`, `ONBOARDING.md`) 정확도 향상 | ✅ | |
| AI 자산(`.claude/commands`, `.claude/skills/forma-*`) | ✅ | |
| Docker / CI / 빌드 개선 | ✅ | |
| 도메인 특화 기능 (영업·자재·회계 등) | ❌ | starter 의 범용성을 깬다 |
| 회사 / 프로젝트 특정 식별자 추가 | ❌ | 단방향 배포 정책 위배 |
| 기존 안정 SPI 시그니처 변경 | ⚠️ | Breaking 라벨 + 마이그레이션 가이드 필수 |

## 기여 절차

1. **이슈 먼저** — 큰 변경은 PR 전에 이슈(혹은 Discussions) 로 방향 확인. 작은 버그 수정은 바로 PR 가능.
2. **포크 + 브랜치** — `feat/`, `fix/`, `docs/`, `refactor/` prefix.
3. **로컬 검증**:
   ```bash
   docker compose up -d        # postgres 띄우고
   cp src/main/resources/application-local.yml.example src/main/resources/application-local.yml
   ./gradlew test               # 단위 + 통합 테스트
   ./gradlew bootRun            # 수동 확인 (admin/admin1!)
   ```
4. **CHANGELOG 누적** — 프레임워크 자산 변경 시 `CHANGELOG.md` 의 `[Unreleased]` 섹션에 한 줄 추가. 분류는 Added/Changed/Deprecated/Removed/Fixed/Security 중 1택, 다운스트림 영향이 크면 `Breaking:` 라벨.
5. **PR 등록** — `.github/pull_request_template.md` 양식을 채워서 제출. CI(build + test) 통과 필수.

## 커밋 메시지

```
영역: 한 줄 요약 (50자 이내)

본문 — 무엇을 왜 바꿨는지 (선택, 80자 줄바꿈).
다운스트림 영향이 있으면 명시.

Breaking-Change: ... (선택)
```

영역 예: `schema:`, `frame/auth:`, `static/admin:`, `ci:`, `doc:` 등.

## 코드 스타일

- Java: 4-space indent, 120자 줄바꿈, `@Slf4j` + Lombok 적극 활용
- HTML/JS/YAML: 2-space indent
- 주석: WHY 만 쓴다 (WHAT 은 코드와 식별자가 말한다)
- BaseResponse 반환 패턴 / FormaSqlSession namespace.statement 호출 패턴 / `@FormaController` 메타 어노테이션 등 starter 의 관례는 `CLAUDE.md` 와 `doc/FORMA-프레임워크.md` 참조

## 행동 규범

존중과 명확한 의사소통. 기술적 비평은 코드/설계 대상이지 사람 대상이 아니다.

## 릴리즈

메인테이너 전용. 절차:

1. `CHANGELOG.md` 의 `[Unreleased]` 섹션을 `[X.Y.Z] - YYYY-MM-DD` 로 잘라낸다. 새 `[Unreleased]` 빈 헤더를 위에 둔다.
2. 비교 링크(`[X.Y.Z]: ...compare/...`) 갱신.
3. 커밋 후 `git tag vX.Y.Z && git push --tags`.
4. `.github/workflows/release.yml` 가 자동으로 GitHub Release 를 만들고 CHANGELOG 의 해당 버전 섹션을 본문으로, `build/libs/*.jar` 를 첨부물로 올린다.

## 라이선스

기여한 코드는 본 저장소의 [MIT 라이선스](LICENSE) 로 배포된다.
