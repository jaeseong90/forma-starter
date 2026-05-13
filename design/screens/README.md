# design/screens/

FORMA **YAML 스크린 엔진(방식 A)** 설계서 디렉토리. `ScreenRegistry`가 부팅 시 여기 `*.yml`을 모두 로드하고, `GenericCrudController`가 `/api/screen/{screen.id}/*` 엔드포인트를 자동 노출한다.

- 스키마: [`../_schema_guide.yml`](../_schema_guide.yml)
- AI 생성 프롬프트: [`../_prompts/00-generate-design.md`](../_prompts/00-generate-design.md), [`../_prompts/01-generate-code.md`](../_prompts/01-generate-code.md)
- 판정 기준: [`../../doc/AI-워크플로.md`](../../doc/AI-워크플로.md) §2

## 현재 있는 파일

| 파일 | 타입 | 테이블 | 용도 |
|---|---|---|---|
| `DEMO_DEPT.yml` | list | tb_dept | 단일 테이블 CRUD 학습 |
| `DEMO_CUSTOMER.yml` | split-detail | tb_customer + tb_customer_contact | 좌우분할 마스터-디테일 학습 |
| `DEMO_BIZ.yml` | master-detail | tb_business + tb_business_milestone | 상하 마스터-디테일 + 입력폼 학습 |

`DEMO_*` 접두는 **학습용 샘플** 표시. 실 서비스 화면과 화면 ID 충돌이 없고, AI가 방식 A를 설명할 때의 레퍼런스로 쓴다. 같은 테이블을 쓰는 실 서비스 화면(CST010, BIZ010 등)은 방식 B(커스텀 Controller/Service)로 구현되어 있다.

## 신규 화면 추가

1. 자연어 요구를 `/new-screen`에 전달하거나 `_prompts/00-generate-design.md` 프롬프트로 AI에게 지시.
2. 생성된 YAML을 검토하고 저장.
3. 서버 구동 중이라면 `POST /api/screen/_reload` 호출로 핫리로드. 코드 재컴파일 불필요.

## 엔드포인트

YAML 1장당 다음이 자동 생성된다:
- `POST /api/screen/{screen.id}/selectGrid1`, `selectGrid2`
- `POST /api/screen/{screen.id}/saveGrid1`, `saveGrid2`
- `POST /api/screen/{screen.id}/deleteGrid1`, `deleteGrid2`
- `GET  /api/screen/{screen.id}/definition`

프론트에서는 `/pages/screen.html?pgm={screen.id}`로 열린다.

## 방식 A의 경계 (YAML로 불가능한 것)

- 트랜잭션 내 3개 이상 테이블 쓰기
- 상태 전이(승인/반려/마감) 로직
- 자동 계산·채번
- 외부 API 연동, 파일 처리
- 필드 단위 권한(readonly 분기)

위 중 하나라도 필요하면 **방식 B**(Controller + Service + MyBatis XML + HTML 4파일)로 간다.
