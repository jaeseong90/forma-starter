package com.saleson.frame.popup;

import com.saleson.frame.base.BaseController;
import com.saleson.frame.base.BaseResponse;
import com.saleson.frame.mybatis.FormaSqlSession;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 공통 팝업 검색 API.
 * 거래처 등 공통 코드 팝업에서 사용.
 */
@RestController
@RequestMapping("/api/popup")
@RequiredArgsConstructor
public class PopupController extends BaseController {

    private final FormaSqlSession sql;

    @PostMapping("/customer")
    public BaseResponse<List<Map<String, Object>>> searchCustomer(@RequestBody Map<String, Object> param) {
        return BaseResponse.Ok(sql.selectList("popup.selectCustomer", param));
    }
}
