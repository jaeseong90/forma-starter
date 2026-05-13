package com.saleson.frame.code;

import com.saleson.frame.common.dto.CodeGroupResDto;
import com.saleson.frame.common.dto.CodeResDto;
import com.saleson.frame.annotation.AddUserInfo;
import com.saleson.frame.annotation.FormaController;
import com.saleson.frame.base.BaseController;
import com.saleson.frame.base.BaseResponse;
import com.saleson.frame.mybatis.FormaSqlSession;
import com.saleson.frame.util.Constants;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

@FormaController(value = "/frm_code", pgmId = "FRM_CODE", description = "코드관리")
public class FrmCodeController extends BaseController {

    private final FormaSqlSession sql;
    private final String ns = "frm_code";

    public FrmCodeController(FormaSqlSession sql) { this.sql = sql; }

    @PostMapping("/selectGroups")
    public BaseResponse<List<CodeGroupResDto>> selectGroups(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList(ns + ".selectGroups", param));
    }

    @PostMapping("/selectCodes")
    public BaseResponse<List<CodeResDto>> selectCodes(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList(ns + ".selectCodes", param));
    }

    @AddUserInfo
    @Transactional
    @PostMapping("/saveGroups")
    public BaseResponse<?> saveGroups(@RequestBody List<Map<String, Object>> param) {
        for (Map<String, Object> item : param) {
            String gstat = (String) item.get(Constants.GSTAT);
            if (Constants.GSTAT_INSERT.equals(gstat)) {
                sql.insert(ns + ".insertGroup", item);
            } else {
                sql.update(ns + ".updateGroup", item);
            }
        }
        return BaseResponse.Ok(null);
    }

    @AddUserInfo
    @Transactional
    @PostMapping("/saveCodes")
    public BaseResponse<?> saveCodes(@RequestBody List<Map<String, Object>> param) {
        for (Map<String, Object> item : param) {
            String gstat = (String) item.get(Constants.GSTAT);
            if (Constants.GSTAT_INSERT.equals(gstat)) {
                sql.insert(ns + ".insertCode", item);
            } else {
                sql.update(ns + ".updateCode", item);
            }
        }
        return BaseResponse.Ok(null);
    }

    @Transactional
    @PostMapping("/deleteGroups")
    public BaseResponse<?> deleteGroups(@RequestBody List<Map<String, Object>> param) {
        for (Map<String, Object> item : param) {
            sql.delete(ns + ".deleteGroupCodes", item);
            sql.delete(ns + ".deleteGroup", item);
        }
        return BaseResponse.Ok(null);
    }

    @Transactional
    @PostMapping("/deleteCodes")
    public BaseResponse<?> deleteCodes(@RequestBody List<Map<String, Object>> param) {
        for (Map<String, Object> item : param) {
            sql.delete(ns + ".deleteCode", item);
        }
        return BaseResponse.Ok(null);
    }
}
