package com.saleson.frame.dept;

import com.saleson.frame.common.dto.DeptResDto;
import com.saleson.frame.annotation.AddUserInfo;
import com.saleson.frame.annotation.FormaController;
import com.saleson.frame.base.BaseController;
import com.saleson.frame.base.BaseResponse;
import com.saleson.frame.mybatis.FormaSqlSession;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

@FormaController(value = "/frm_dept", pgmId = "FRM_DEPT", description = "조직관리")
public class FrmDeptController extends BaseController {

    private final FormaSqlSession sql;
    private final String ns = "frm_dept";

    public FrmDeptController(FormaSqlSession sql) { this.sql = sql; }

    @PostMapping("/selectDeptTree")
    public BaseResponse<List<DeptResDto>> selectDeptTree(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList(ns + ".selectDeptTree", param));
    }

    @PostMapping("/selectDept")
    public BaseResponse<DeptResDto> selectDept(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.<DeptResDto>selectOne(ns + ".selectDept", param));
    }

    @PostMapping("/selectDeptMembers")
    public BaseResponse<List<Map<String, Object>>> selectDeptMembers(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList(ns + ".selectDeptMembers", param));
    }

    @AddUserInfo
    @PostMapping("/saveDept")
    public BaseResponse<?> saveDept(@RequestBody Map<String, Object> param) {
        String gstat = (String) param.get("_gstat");
        if ("I".equals(gstat)) {
            sql.insert(ns + ".insertDept", param);
        } else {
            sql.update(ns + ".updateDept", param);
        }
        return BaseResponse.Ok(param);
    }

    @AddUserInfo
    @PostMapping("/deleteDept")
    public BaseResponse<?> deleteDept(@RequestBody Map<String, Object> param) {
        sql.delete(ns + ".deleteDept", param);
        return BaseResponse.Ok(null);
    }
}
