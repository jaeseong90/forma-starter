package com.forma.frame.releasenote;

import com.forma.frame.annotation.AddUserInfo;
import com.forma.frame.annotation.FormaController;
import com.forma.frame.base.BaseController;
import com.forma.frame.base.BaseResponse;
import com.forma.frame.mybatis.FormaSqlSession;
import com.forma.frame.util.Constants;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

/**
 * 릴리즈노트 관리.
 *
 * <p>프론트의 {@code FormaReleaseNote.show()} (forma.releasenote.js) 가 로그인 후
 * {@code selectActiveByTarget} 을 호출해 새 노트만 모달로 띄운다.
 *
 * <p>본 starter 는 관리 UI(FRM_RLS) 와 API 만 제공하며, 실제 노트 작성은 운영자가
 * 화면에서 입력한다 — 프레임워크 자체 CHANGELOG.md 와는 별개로, 사용자(현업)에게 보여줄
 * 도메인 릴리즈 공지를 다루기 위한 채널이다.
 */
@FormaController(value = "/frm_rls", pgmId = "FRM_RLS", description = "릴리즈노트관리")
public class FrmRlsController extends BaseController {

    private final FormaSqlSession sql;
    private final String ns = "frm_rls";

    public FrmRlsController(FormaSqlSession sql) {
        this.sql = sql;
    }

    /** 관리자 검색 — 전체 목록 + 키워드/타깃 필터. */
    @PostMapping("/selectList")
    public BaseResponse<?> selectList(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList(ns + ".selectList", param));
    }

    /** 단건 + 항목 목록 (편집/상세). */
    @PostMapping("/selectOne")
    public BaseResponse<?> selectOne(@RequestBody Map<String, Object> param) {
        Map<String, Object> note = sql.selectOne(ns + ".selectOne", param);
        if (note != null) {
            note.put("items", sql.selectList(ns + ".selectItems", param));
        }
        return BaseResponse.Ok(note);
    }

    /** 노트 + 항목 일괄 저장. */
    @AddUserInfo
    @Transactional
    @PostMapping("/saveNote")
    public BaseResponse<?> saveNote(@RequestBody Map<String, Object> param) {
        String gstat = (String) param.get(Constants.GSTAT);
        if (Constants.GSTAT_INSERT.equals(gstat)) {
            sql.insert(ns + ".insertNote", param);
        } else if (Constants.GSTAT_UPDATE.equals(gstat)) {
            sql.update(ns + ".updateNote", param);
        }

        Object noteSeq = param.get("noteSeq");
        if (noteSeq != null) {
            // 단순 전략: 기존 items 전체 삭제 후 재삽입
            sql.delete(ns + ".deleteItemsByNote", Map.of("noteSeq", noteSeq));
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) param.get("items");
            if (items != null) {
                int order = 1;
                for (Map<String, Object> it : items) {
                    it.put("noteSeq", noteSeq);
                    it.put("sortOrder", order++);
                    sql.insert(ns + ".insertItem", it);
                }
            }
        }
        return BaseResponse.Ok(param);
    }

    /** 노트 삭제 (cascade 로 항목도 함께 삭제). */
    @Transactional
    @PostMapping("/deleteNote")
    public BaseResponse<?> deleteNote(@RequestBody List<Map<String, Object>> param) {
        for (Map<String, Object> item : param) {
            sql.delete(ns + ".deleteNote", item);
        }
        return BaseResponse.Ok(null);
    }

    /**
     * 프론트 forma.releasenote.js 가 사용하는 엔드포인트.
     * target(DESKTOP/MOBILE/ALL) 에 해당하는 use_yn='Y' 릴리즈노트 + 항목 목록을 반환.
     * 권한 체크는 PGM 단위가 아닌 누구나 접근(use_yn='Y' 인 것만 노출) — 로그인된 사용자라면 누구나 볼 수 있다.
     */
    @PostMapping("/selectActiveByTarget")
    public BaseResponse<?> selectActiveByTarget(@RequestBody Map<String, Object> param) {
        List<Map<String, Object>> notes = sql.selectList(ns + ".selectActiveByTarget", param);
        for (Map<String, Object> note : notes) {
            note.put("items", sql.selectList(ns + ".selectItems",
                    Map.of("noteSeq", note.get("noteSeq"))));
        }
        return BaseResponse.Ok(notes);
    }
}
