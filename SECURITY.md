# Security Policy

## 지원 버전

본 저장소는 starter template 이며 단방향(starter → 프로젝트) 배포다 — 다운스트림 프로젝트는 클론 시점의 starter 를 기반으로 자체 운영하므로, starter 측 보안 패치가 자동으로 흐르지 않는다. **본 정책이 적용되는 대상은 본 저장소 자체와 최신 main 브랜치** 다.

| 버전 | 패치 지원 |
|---|---|
| main (latest) | ✅ |
| 그 이전 태그 | ❌ |

## 취약점 보고

발견 시 **공개 이슈로 등록하지 말고** 다음 중 하나로 비공개 보고하라:

- GitHub Security Advisory: <https://github.com/jaeseong90/forma-starter/security/advisories/new>

다음을 포함하면 트리아지가 빨라진다:
- 영향받는 파일/엔드포인트/SPI
- 재현 절차 (가능하면 최소 PoC)
- 잠재적 영향 범위 (인증 우회 / 권한 상승 / 데이터 노출 / DoS 등)
- 제안하는 수정 (선택)

## 응답 기대치

- 영업일 기준 5일 이내 1차 응답
- 심각도가 높은 경우 30일 이내 패치를 목표로 한다 — 단, 단방향 배포 정책상 다운스트림 프로젝트는 별도 cherry-pick 필요.

## 알려진 보안 가정

본 starter 의 **기본값**은 로컬 개발 편의를 위해 일부러 약하게 설정돼 있다 — 운영 전환 시 반드시 교체할 것:

- `forma.jwt.secret` 기본값 (`formaDefaultSecretKey...`) — `FORMA_JWT_SECRET` 환경변수로 32자+ 랜덤 시크릿 주입
- admin 초기 비밀번호 `admin1!` — 최초 로그인 후 즉시 변경
- docker-compose 의 postgres 비밀번호 `forma` — 운영에선 사용하지 말 것
- `forma.security.reset-all-passwords=true` 는 1회성 운영 도구 — 사용 후 false 로 되돌릴 것
