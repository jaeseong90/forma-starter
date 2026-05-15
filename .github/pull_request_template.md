## 개요

(이 PR 이 무엇을 / 왜 바꾸는지 1~3문장)

## 변경 범위

- [ ] 프레임워크 자산(`frame/*`, `login/*`, `schema/*.sql`, `static/assets/js/framework/*`, `static/pages/admin/FRM_*`, `.claude/*`)
- [ ] 빌드/배포(`build.gradle`, `docker-compose.yml`, `Dockerfile`, CI)
- [ ] 문서(`CLAUDE.md`, `doc/*`, `ONBOARDING.md`, `README.md`)
- [ ] 예제/데모(`design/screens/DEMO_*`, `static/pages/dev/*`)
- [ ] 기타: ___________

## 다운스트림 영향 (Breaking?)

- [ ] **Breaking**: 패키지/메서드 시그니처 변경
- [ ] **Breaking**: DB 스키마 변경 (마이그레이션 가이드 필요)
- [ ] **Breaking**: 환경변수/포트/설정 기본값 변경
- [ ] **Breaking**: SPI 인터페이스 변경
- [ ] non-breaking

## CHANGELOG

- [ ] `CHANGELOG.md` 의 `[Unreleased]` 섹션에 한 줄 누적했다
- [ ] 해당 없음(프레임워크 자산 변경 아님)

## 검증

- [ ] `./gradlew test` 통과
- [ ] `./gradlew bootRun` 으로 기동 + admin/admin1! 로그인 확인 (해당 시)
- [ ] 관리자 화면 1개 이상 클릭 테스트 (해당 시)
