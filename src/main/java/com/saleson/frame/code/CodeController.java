package com.saleson.frame.code;

import com.saleson.frame.base.BaseResponse;
import com.saleson.frame.common.CommonService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/codes")
@RequiredArgsConstructor
public class CodeController {

    private final CommonService commonService;

    @GetMapping("/{grpCode}")
    public BaseResponse<List<Map<String, Object>>> getCodeList(@PathVariable String grpCode) {
        return BaseResponse.Ok(commonService.selectCodeList(grpCode));
    }
}
