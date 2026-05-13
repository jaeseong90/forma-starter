package com.saleson.frame.file;

import com.saleson.frame.exception.FormaException;
import com.saleson.frame.mybatis.FormaSqlSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    private final FormaSqlSession sql;
    private final FileStore fileStore;

    /**
     * 다건 파일 업로드. refId2/refId3 는 복합키 참조 시 지정, 단건 참조면 null.
     */
    public List<Map<String, Object>> uploadFiles(MultipartFile[] files, String refType, String refId,
                                                 String refId2, String refId3, String userId) {
        List<Map<String, Object>> results = new ArrayList<>();
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));

        for (int i = 0; i < files.length; i++) {
            MultipartFile file = files[i];
            if (file.isEmpty()) continue;

            String fileId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
            String originalName = file.getOriginalFilename();
            String ext = originalName != null && originalName.contains(".")
                    ? originalName.substring(originalName.lastIndexOf(".")) : "";
            String storedName = fileId + ext;
            String relativePath = datePath + "/" + storedName;

            try (InputStream in = file.getInputStream()) {
                fileStore.put(relativePath, in, file.getSize(), file.getContentType());
            } catch (IOException e) {
                log.error("File upload failed: {}", originalName, e);
                throw new FormaException("파일 업로드 실패: " + originalName);
            }

            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("fileId", fileId);
            fileInfo.put("refType", refType);
            fileInfo.put("refId", refId);
            fileInfo.put("refId2", (refId2 == null || refId2.isEmpty()) ? null : refId2);
            fileInfo.put("refId3", (refId3 == null || refId3.isEmpty()) ? null : refId3);
            fileInfo.put("fileName", originalName);
            fileInfo.put("filePath", relativePath);
            fileInfo.put("fileSize", file.getSize());
            fileInfo.put("contentType", file.getContentType());
            fileInfo.put("sortOrder", i);
            fileInfo.put("userId", userId);
            sql.insert("common.insertFile", fileInfo);

            results.add(Map.of(
                    "fileId", fileId,
                    "fileName", originalName != null ? originalName : "",
                    "fileSize", file.getSize()
            ));
        }

        log.info("Uploaded {} files for {}/{}/{}/{}", results.size(), refType, refId, refId2, refId3);
        return results;
    }

    public List<Map<String, Object>> selectFiles(String refType, String refId, String refId2, String refId3) {
        Map<String, Object> param = new HashMap<>();
        param.put("refType", refType);
        param.put("refId", refId);
        param.put("refId2", (refId2 == null || refId2.isEmpty()) ? null : refId2);
        param.put("refId3", (refId3 == null || refId3.isEmpty()) ? null : refId3);
        return sql.selectList("common.selectFiles", param);
    }

    /**
     * 파일 다운로드.
     * - FileStore.tryDelegateDownload 가 헤더를 반환하면(nginx X-Accel, S3 presigned 등) 본문 비워 위임.
     * - 그렇지 않으면 FileStore.getResource 로 직접 스트리밍.
     */
    public ResponseEntity<Resource> downloadFile(String fileId) {
        log.debug("[download] start fileId={}", fileId);
        Map<String, Object> fileInfo = sql.selectOne("common.selectFileById", Map.of("fileId", fileId));
        if (fileInfo == null) {
            log.warn("[download] meta not found in DB. fileId={}", fileId);
            throw new FormaException("파일을 찾을 수 없습니다.");
        }

        String filePath = (String) fileInfo.get("filePath");
        String fileName = (String) fileInfo.get("fileName");
        String contentType = (String) fileInfo.get("contentType");
        log.debug("[download] meta loaded fileId={}, fileName={}, filePath={}, contentType={}",
                fileId, fileName, filePath, contentType);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM);
        String disposition = (contentType != null && contentType.startsWith("image/")) ? "inline" : "attachment";
        String encodedName = URLEncoder.encode(fileName != null ? fileName : "file", StandardCharsets.UTF_8).replace("+", "%20");
        headers.add(HttpHeaders.CONTENT_DISPOSITION,
                disposition + "; filename=\"" + encodedName + "\"; filename*=UTF-8''" + encodedName);

        Map<String, String> delegated = fileStore.tryDelegateDownload(filePath);
        if (delegated != null) {
            delegated.forEach(headers::add);
            log.debug("[download] delegated. fileId={}, headers={}", fileId, delegated.keySet());
            return ResponseEntity.ok().headers(headers).build();
        }

        if (!fileStore.exists(filePath)) {
            log.warn("[download] file not in store. fileId={}, key={}", fileId, filePath);
            throw new FormaException("파일이 존재하지 않습니다.");
        }
        headers.setContentLength(fileStore.size(filePath));
        log.debug("[download] serving via FileStore. fileId={}, key={}", fileId, filePath);
        return ResponseEntity.ok().headers(headers).body(fileStore.getResource(filePath));
    }

    /**
     * 파일 삭제 (DB + 물리 파일)
     */
    public void deleteFile(String fileId) {
        Map<String, Object> fileInfo = sql.selectOne("common.selectFileById", Map.of("fileId", fileId));
        if (fileInfo == null) return;

        String filePath = (String) fileInfo.get("filePath");
        fileStore.delete(filePath);
        sql.delete("common.deleteFile", Map.of("fileId", fileId));
    }

    /**
     * 참조키(refType, refId)에 매칭되는 모든 파일 삭제 (DB + 물리).
     * 담당자 삭제 시 명함 일괄 정리 등 참조 엔티티 제거용.
     */
    public void deleteFilesByRef(String refType, String refId) {
        List<String> fileIds = sql.selectList("common.selectFileIdsByRef",
                Map.of("refType", refType, "refId", refId));
        for (String fileId : fileIds) {
            deleteFile(fileId);
        }
    }
}
