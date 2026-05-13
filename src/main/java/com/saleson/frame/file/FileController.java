package com.saleson.frame.file;

import com.saleson.frame.auth.LoginUser;
import com.saleson.frame.base.BaseResponse;
import com.saleson.frame.util.Constants;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/file")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    /**
     * 파일 업로드 (다건). refId2/refId3 는 복합키 참조 시에만 지정.
     */
    @PostMapping("/upload")
    public BaseResponse<List<Map<String, Object>>> upload(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam("refType") String refType,
            @RequestParam("refId") String refId,
            @RequestParam(value = "refId2", required = false) String refId2,
            @RequestParam(value = "refId3", required = false) String refId3,
            HttpServletRequest request) {
        LoginUser user = (LoginUser) request.getAttribute(Constants.LOGIN_USER_ATTR);
        String userId = user != null ? user.getUserId() : "system";
        List<Map<String, Object>> result = fileService.uploadFiles(files, refType, refId, refId2, refId3, userId);
        return BaseResponse.Ok(result);
    }

    /**
     * 파일 목록 조회. refId2/refId3 미지정 시 해당 컬럼이 NULL 인 레코드만 매칭.
     */
    @GetMapping("/list")
    public BaseResponse<List<Map<String, Object>>> list(
            @RequestParam("refType") String refType,
            @RequestParam("refId") String refId,
            @RequestParam(value = "refId2", required = false) String refId2,
            @RequestParam(value = "refId3", required = false) String refId3) {
        return BaseResponse.Ok(fileService.selectFiles(refType, refId, refId2, refId3));
    }

    /**
     * 파일 다운로드. 로컬은 Spring 이 Resource 로 직접 서빙,
     * 운영은 X-Accel-Redirect 로 nginx 가 서빙.
     */
    @GetMapping("/download/{fileId}")
    public ResponseEntity<Resource> download(@PathVariable String fileId) {
        return fileService.downloadFile(fileId);
    }

    /**
     * 파일 삭제
     */
    @PostMapping("/delete")
    public BaseResponse<?> delete(@RequestBody Map<String, Object> param) {
        String fileId = (String) param.get("fileId");
        fileService.deleteFile(fileId);
        return BaseResponse.Ok(null);
    }
}
