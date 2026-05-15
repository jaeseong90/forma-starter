package com.forma;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

import java.io.File;

import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * 통합 테스트 베이스. PostgreSQL 컨테이너를 한 번 띄워 모든 통합 테스트가 공유한다.
 *
 * <p>schema/*.sql 를 /docker-entrypoint-initdb.d 로 마운트해 production 부트스트랩과 동일 경로를
 * 검증한다. schema 순서가 깨지거나 admin 시드가 실패하면 본 테스트가 fail 한다.
 *
 * <p>Docker 미가용 환경(로컬에서 Docker Desktop 미실행 등)에서는 {@link #checkDocker()} 가
 * JUnit Assumption 으로 모든 테스트를 스킵 처리한다. CI(GitHub Actions ubuntu-latest)에서는
 * Docker 가 항상 가용하므로 정상 실행된다.
 */
@Tag("integration")
@SpringBootTest
public abstract class IntegrationTestBase {

    private static PostgreSQLContainer<?> POSTGRES;

    @BeforeAll
    static void checkDocker() {
        boolean dockerAvailable;
        try {
            dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            dockerAvailable = false;
        }
        assumeTrue(dockerAvailable,
                "Docker 가 가용하지 않아 통합 테스트를 스킵한다. (로컬 Docker Desktop 실행 또는 CI 환경에서 실행 가능)");
    }

    static {
        try {
            POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("forma")
                    .withUsername("forma")
                    .withPassword("forma");

            File schemaDir = new File("src/main/resources/schema");
            File[] sqls = schemaDir.listFiles((d, n) -> n.endsWith(".sql"));
            if (sqls != null) {
                for (File f : sqls) {
                    POSTGRES.withCopyFileToContainer(
                            MountableFile.forHostPath(f.getAbsolutePath()),
                            "/docker-entrypoint-initdb.d/" + f.getName());
                }
            }
            POSTGRES.start();
        } catch (Throwable t) {
            // Docker 가 없으면 static init 자체가 실패한다. @BeforeAll 의 assumeTrue 가 스킵으로 마무리.
            POSTGRES = null;
        }
    }

    @DynamicPropertySource
    static void overrideProps(DynamicPropertyRegistry r) {
        if (POSTGRES == null) return;
        r.add("forma.primary.datasource.jdbc-url", POSTGRES::getJdbcUrl);
        r.add("forma.primary.datasource.username", POSTGRES::getUsername);
        r.add("forma.primary.datasource.password", POSTGRES::getPassword);
        r.add("forma.primary.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }
}
