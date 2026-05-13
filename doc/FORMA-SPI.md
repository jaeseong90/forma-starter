# FORMA SPI (Service Provider Interface)

프로젝트마다 달라질 수 있는 지점을 **인터페이스로 뚫고** 기본 구현을 프레임워크가 제공한다. 프로젝트는 같은 타입의 Spring Bean을 등록하면 자동으로 교체된다. Spring의 `@ConditionalOnMissingBean`으로 구현된다.

이 문서는 **SPI 후보 목록**이다. 실제 인터페이스 추출은 **라운드 2b-3**에서 단계적으로 진행. 단일 구현만 있는 시점에 미리 추출하는 건 오버엔지니어링이라 필요 시점에 하나씩 뽑는다. 추출 후 이 문서의 "상태" 열을 업데이트한다.

---

## 1. SPI 카탈로그

| SPI | 목적 | 기본 구현 | 상태 |
|---|---|---|---|
| `LoginUser` | 로그인 사용자 VO (기본 필드 + 프로젝트 확장) | `LoginUserVo` (`login/`) | ✅ 추출 완료 (read-only 인터페이스 v1) |
| `UserAuthProvider` | 사용자 인증·검증 | `JwtUserAuthProvider` (로컬 DB + BCrypt) | ✅ 추출 완료 (authenticate / loadByToken) |
| `PasswordEncoder` | 비밀번호 해시 | `BCryptPasswordEncoder` (Spring Security 기본) | 추출 대기 |
| `AuditLogStore` | 감사 로그 저장소 | `DbAuditLogStore` (tb_audit_log) | 추출 대기 |
| `FileStore` | 파일 물리 저장소 | `LocalFileStore` (로컬 디스크 + 선택적 X-Accel-Redirect) | ✅ 추출 완료 |
| `NotificationChannel` | 알림 송신 | — (기본 없음, 프로젝트 필수 구현) | 추출 대기 |
| `CodeProvider` | 공통코드 조회 | `DbCodeProvider` (tb_code) | 추출 대기 |
| `DeptTreeProvider` | 부서 트리 조회 | `DbDeptProvider` (tb_dept) | 추출 대기 |
| `MenuProvider` | 메뉴 트리 조회 | `DbMenuProvider` (tb_menu) | 추출 대기 |
| `DataAuthResolver` | 데이터 권한 SQL 조건 계산 | `DefaultDataAuthResolver` (ALL/DEPT/DEPT_SUB/USER) | 추출 대기 |
| `SeqGenerator` | 채번 | `DbSeqGenerator` | 추출 대기 |
| `AIClient` | 텍스트 LLM 호출 (회의록·보고서 초안 등) | `ClaudeHttpClient` (Anthropic Messages API) | ✅ 추출 완료 (텍스트 전용 v1) |

---

## 2. override 방식 (공통 패턴)

프로젝트가 기본 구현을 대체하려면 같은 타입의 `@Bean`을 등록한다:

```java
// 프로젝트 측 Config
@Configuration
public class MyProjectSpiConfig {

    @Bean
    @Primary                          // 기본 Bean을 덮어쓴다
    public FileStore fileStore() {
        return new S3FileStore(s3Client, "my-bucket");
    }
}
```

또는 프레임워크 기본 구현은 `@ConditionalOnMissingBean`으로 선언되므로 `@Primary` 없이 같은 타입을 정의하면 교체된다.

---

## 3. SPI 상세

### 3.1 `LoginUser`

**위치**: `com.saleson.frame.auth.LoginUser`

**시그니처 (현재)**
```java
public interface LoginUser {
    String getUserId();
    String getUserName();
    String getUserDeptCode();
    String getUserDeptName();
    String getUserIp();
    boolean isAdmin();
    boolean isViewAll();
}
```
- 기본 구현: `com.saleson.login.LoginUserVo` (Lombok `@Data` POJO, JWT 클레임에서 채워짐)
- 호출자: `UserInfoAspect`(`@AddUserInfo`), `AuditLogAspect`, `DataAuthService`, `DynamicSqlExecutor`, `PgmController`, `FileController`, `UserSettingsController`, `TokenInterceptor`(생성 측만)
- override 사유: 사번·회사·직급 등 프로젝트 고유 필드. JWT payload에 담을 내용 커스터마이즈.
- 다음 단계: `UserAuthProvider` 추출 시 "LoginUser 생성 책임"을 SPI로 분리 → `TokenInterceptor`가 SPI를 통해서만 생성. 그 시점에 인터페이스에 `getRoles()` / `getAttributes()` 추가 검토.

### 3.2 `UserAuthProvider`

**위치**: `com.saleson.frame.auth.UserAuthProvider`

**시그니처 (현재)**
```java
public interface UserAuthProvider {
    /** 자격증명 검증. 실패 시 AuthFailureException(USER_NOT_FOUND/INACTIVE/BAD_CREDENTIALS) */
    LoginUser authenticate(String userId, String rawPassword) throws AuthFailureException;

    /** 토큰 파싱 후 LoginUser 복원. 무효 토큰이면 null. clientIp 는 userIp 필드로 주입. */
    LoginUser loadByToken(String token, String clientIp);
}
```
- 기본 구현: `com.saleson.login.JwtUserAuthProvider` — 로컬 DB(`tb_user`) + BCrypt + 자체 JWT
- 등록 방식: `com.saleson.login.AuthSpiConfig` 의 `@Bean @ConditionalOnMissingBean`. 프로젝트가 같은 타입 빈을 등록하면 본 기본 빈은 비활성화.
- 호출자: `LoginController`(loginProcess / userInfo), `TokenInterceptor`(preHandle)
- override 사유: SSO(SAML/OAuth2), LDAP, 사내 인증 게이트웨이
- 본 SPI 범위 밖: JWT 발급(`createToken`)과 토큰 갱신은 `LoginController`/`TokenInterceptor` 가 `JwtTokenProvider` 를 직접 사용. 토큰 발급 정책을 SPI 화할 필요가 생기면 별도 `TokenIssuer` SPI 로 분리.
- 비밀번호 변경(`LoginController.changePassword`)도 본 SPI 범위 밖 — `LoginService` 가 직접 처리. 확장이 필요해지면 별도 SPI(`PasswordChanger`)로.

### 3.3 `AuditLogStore`

**시그니처 (예정)**
```java
public interface AuditLogStore {
    void save(AuditLogEntry entry);
    List<AuditLogEntry> search(AuditLogQuery query);
}
```
- 기본: `tb_audit_log` INSERT + `FRM_AUDIT` 화면에서 조회.
- override 사유: Elasticsearch·외부 SIEM·Kafka 스트리밍.
- 주의: `AuditLogAspect`가 이 SPI만 바라봐야 한다 (지금은 직접 INSERT).

### 3.4 `FileStore`

**위치**: `com.saleson.frame.file.FileStore`

**시그니처 (현재)**
```java
public interface FileStore {
    void put(String key, InputStream content, long size, String contentType);
    Resource getResource(String key);
    boolean exists(String key);
    long size(String key);
    void delete(String key);

    /** nginx X-Accel-Redirect, S3 presigned URL 등 외부 위임 헤더. null 이면 호출자가 직접 서빙. */
    default Map<String, String> tryDelegateDownload(String key) { return null; }
}
```
- 기본 구현: `com.saleson.frame.file.LocalFileStore` — 로컬 디스크 + 선택적 nginx X-Accel-Redirect 위임
- 등록 방식: `FileSpiConfig` 의 `@Bean @ConditionalOnMissingBean`
- 호출자: `FileService` (메타 DB `tb_file` 처리, 키 생성, 다건 업로드 루프, HTTP 응답 빌드는 그대로 `FileService` 책임)
- override 사유: S3·GCS·NAS·사내 파일서버
- 주의: `tb_file` 메타테이블은 유지 — 본 SPI 는 바이트 저장소만 담당. 키(`{yyyy/MM}/{uuid}.{ext}`) 생성 정책도 호출자 측.
- `tryDelegateDownload` hook 으로 LocalFileStore 는 X-Accel-Redirect, 향후 S3FileStore 는 presigned URL 302 등 일관된 메커니즘 제공.

### 3.5 `CodeProvider`

**시그니처 (예정)**
```java
public interface CodeProvider {
    List<CodeItem> findByGroup(String grpCode);
    String findLabel(String grpCode, String code);
    void invalidate(String grpCode);
}
```
- 기본: `tb_code` + Caffeine 캐시.
- override 사유: 외부 코드 마스터(그룹사 공통) 연동, REST 호출.
- 프론트: `FormaUtil.getCodeItems()`는 서버 API만 호출하므로 SPI 교체 투명.

### 3.6 `DataAuthResolver`

**시그니처 (예정)**
```java
public interface DataAuthResolver {
    /** FormaSqlSession이 조회 전 param에 심어줄 데이터권한 컨텍스트를 계산. */
    DataAuthContext resolve(LoginUser user, String pgmId);
}
```
- 기본: `tb_data_auth` 테이블 기반 (ALL/DEPT/DEPT_SUB/USER/CUSTOM).
- override 사유: 회사별 커스텀 권한 룰(예: 매출 데이터는 영업본부장만, 인사 데이터는 HR만).
- 주의: SQL `<if test="_dataAuthType == 'XXX'">`에서 참조하는 키 이름은 보존해야 MyBatis XML 호환.

### 3.7 `SeqGenerator`

**시그니처**
```java
public interface SeqGenerator {
    String next(String prefix);              // "ORD" → "ORD-20260422-001"
    long nextNumber(String seqKey);          // 단순 증가 번호
}
```
- 기본: DB 트랜잭션 기반 (동시성 안전).
- override 사유: Snowflake ID·외부 채번 서비스·레거시 포맷 호환.

### 3.8 `AIClient`

**위치**: `com.saleson.frame.ai.AIClient`

**시그니처 (현재)**
```java
public interface AIClient {
    AIResponse complete(String systemPrompt, String userMessage, Map<String, Object> options);
}

public class AIResponse {
    String getText();
    String getStopReason();   // "end_turn" / "max_tokens" / ...
    boolean isTruncated();    // stopReason == "max_tokens"
}
```
- 기본 구현: `com.saleson.frame.ai.ClaudeHttpClient` (Anthropic Messages API, okhttp3)
- 등록 방식: `AISpiConfig` 의 `@Bean @ConditionalOnMissingBean`
- 옵션 표준 키: `model`(String), `maxTokens`(Integer), `temperature`(Double). 누락 시 구현체 기본(`claude-opus-4-7` / 4096 / 미설정).
- 호출자: `MeetingAiService` (도메인 측은 프롬프트 빌드/응답 파싱만 담당)
- override 사유: OpenAI·Gemini·사내 모델 서버, 외부 LLM 금지 환경
- 본 SPI 범위 밖:
  - **멀티모달 입력**(이미지 등) — `CardAnalyzeService` 는 Claude API 직접 사용. 수요 일반화 시 인터페이스 확장 또는 별도 SPI(`AIVisionClient`) 로 분리.
  - **STT** — `WhisperService` 는 OpenAI Whisper 직접 호출. 별도 SPI(`STTClient`) 후보.
  - **스트리밍** — 현재 호출자 없음. 필요 시 `stream(...)` 메서드 추가.

---

## 4. 추출 우선순위 (라운드 2b-3용)

1. **P0 — 지금 단일 구현이지만 자주 바뀌는**: ✅ `AIClient`(추출 완료, 텍스트 전용), ✅ `FileStore`(추출 완료), ✅ `UserAuthProvider`(추출 완료)
2. **P1 — 인터페이스 명확하고 교체 수요 뚜렷**: ✅ `LoginUser`(추출 완료), `CodeProvider`, `AuditLogStore`
3. **P2 — 당분간 단일 구현으로 충분**: `DataAuthResolver`, `DeptTreeProvider`, `MenuProvider`, `SeqGenerator`, `NotificationChannel`

P0만 선행 추출해도 "다른 ERP에 붙일 때 초기 진입 장벽" 대부분 해소. P1·P2는 실제로 교체 수요가 발생하는 시점에 뽑는다.

**진행 순서(의존성 기준)**: `LoginUser` → `UserAuthProvider` → `AIClient` → `FileStore`. `UserAuthProvider`가 `LoginUser`를 반환하므로 `LoginUser`가 선행.

---

## 5. SPI 추출의 반례 (하지 말 것)

- **단일 구현에 미리 인터페이스를 파는 것**: 호출자·테스트 구성만 복잡해지고 override 수요는 없음.
- **SPI를 도메인 레벨에 두는 것**: FORMA는 ERP 인프라 SPI만 정의. 업무 로직(예: "견적 계산기")은 프로젝트의 책임.
- **기본 구현을 제거하고 SPI만 남기는 것**: 새 프로젝트가 `./gradlew bootRun` 한 방에 안 뜸. 스타터킷 가치 훼손. 반드시 기본 구현 유지.
