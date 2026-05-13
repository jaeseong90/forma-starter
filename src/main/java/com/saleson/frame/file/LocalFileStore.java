package com.saleson.frame.file;

import com.saleson.frame.exception.FormaException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;

/**
 * 기본 {@link FileStore} 구현 — 로컬 디스크 + 선택적 nginx X-Accel-Redirect 위임.
 */
@Slf4j
public class LocalFileStore implements FileStore {

    private final String uploadBase;
    private final boolean xaccelEnabled;
    private final String xaccelInternalLocation;

    public LocalFileStore(String uploadBase, boolean xaccelEnabled, String xaccelInternalLocation) {
        this.uploadBase = Paths.get(uploadBase).toAbsolutePath().normalize().toString();
        this.xaccelEnabled = xaccelEnabled;
        this.xaccelInternalLocation = xaccelInternalLocation.endsWith("/") ? xaccelInternalLocation : xaccelInternalLocation + "/";
        log.info("LocalFileStore base: {}, X-Accel-Redirect: {}{}",
                this.uploadBase, xaccelEnabled ? "ON → " : "OFF", xaccelEnabled ? this.xaccelInternalLocation : "");
    }

    public String getUploadBase() {
        return uploadBase;
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        Path target = Paths.get(uploadBase, key);
        try {
            if (target.getParent() != null) {
                Files.createDirectories(target.getParent());
            }
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("File put failed: key={}", key, e);
            throw new FormaException("파일 저장 실패: " + key);
        }
    }

    @Override
    public Resource getResource(String key) {
        return new PathResource(Paths.get(uploadBase, key));
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(Paths.get(uploadBase, key));
    }

    @Override
    public long size(String key) {
        try {
            return Files.size(Paths.get(uploadBase, key));
        } catch (IOException e) {
            log.error("File size lookup failed: key={}", key, e);
            throw new FormaException("파일 크기 조회 실패");
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(Paths.get(uploadBase, key));
        } catch (IOException e) {
            log.warn("Physical file delete failed: key={}", key);
        }
    }

    @Override
    public Map<String, String> tryDelegateDownload(String key) {
        if (!xaccelEnabled) return null;
        return Map.of("X-Accel-Redirect", xaccelInternalLocation + key);
    }
}
