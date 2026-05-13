package com.saleson.frame.file;

import org.springframework.core.io.Resource;

import java.io.InputStream;
import java.util.Map;

/**
 * 파일 물리 저장소 SPI.
 *
 * <p>기본 구현 {@link LocalFileStore} — 로컬 디스크. S3·GCS·NAS·사내 파일서버로 교체할 때
 * 같은 타입의 빈을 등록하면 {@code FileSpiConfig} 의 {@code @ConditionalOnMissingBean} 으로
 * 본 기본 구현은 비활성화된다.
 *
 * <p>본 SPI 는 "물리 바이트" 만 책임진다. 메타데이터(`tb_file`) 와 키 생성 정책,
 * 다건 업로드 루프, HTTP 응답 빌드는 {@code FileService}/{@code FileController} 책임.
 *
 * <p>키({@code key}) 는 저장소 내 상대 경로(예: {@code "2026/05/abc.pdf"}). 호출자가 생성·전달한다.
 */
public interface FileStore {

    /**
     * 키 위치에 바이트 저장. 디렉토리 부족 시 생성. 같은 키가 있으면 덮어쓴다.
     */
    void put(String key, InputStream content, long size, String contentType);

    /**
     * Spring {@link Resource} 로 반환. 로컬은 {@code PathResource}, S3 는 {@code InputStreamResource} 등.
     */
    Resource getResource(String key);

    boolean exists(String key);

    long size(String key);

    void delete(String key);

    /**
     * 외부(nginx X-Accel-Redirect, S3 presigned URL 등)에 다운로드 위임이 가능한 경우 해당 응답 헤더
     * 맵을 반환. {@code null} 이면 호출자가 {@link #getResource(String)} 로 직접 서빙한다.
     */
    default Map<String, String> tryDelegateDownload(String key) {
        return null;
    }
}
