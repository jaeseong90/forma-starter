package com.saleson.frame.ai;

import com.saleson.frame.base.BaseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/card")
@RequiredArgsConstructor
public class CardAnalyzeController {

    private final CardAnalyzeService cardAnalyzeService;

    @PostMapping("/analyze")
    public BaseResponse<Map<String, String>> analyze(@RequestBody Map<String, Object> param) {
        String imageBase64 = (String) param.get("image");
        if (imageBase64 == null || imageBase64.isEmpty()) {
            return BaseResponse.Warn("이미지 데이터가 없습니다.");
        }
        Map<String, String> result = cardAnalyzeService.analyzeCard(imageBase64);
        return BaseResponse.Ok(result);
    }
}
