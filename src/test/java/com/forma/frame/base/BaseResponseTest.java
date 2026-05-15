package com.forma.frame.base;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class BaseResponseTest {

    @Test
    void Ok_무인자() {
        BaseResponse<Object> r = BaseResponse.Ok();
        assertEquals("OK", r.getResultCode());
        assertNull(r.getResultData());
        assertNull(r.getResultMessage());
    }

    @Test
    void Ok_데이터_전달() {
        Map<String, Object> data = Map.of("count", 10);
        BaseResponse<Map<String, Object>> r = BaseResponse.Ok(data);
        assertEquals("OK", r.getResultCode());
        assertEquals(data, r.getResultData());
    }

    @Test
    void Warn_메시지() {
        BaseResponse<Object> r = BaseResponse.Warn("권한이 없습니다");
        assertEquals("WARN", r.getResultCode());
        assertEquals("권한이 없습니다", r.getResultMessage());
    }

    @Test
    void Error_메시지() {
        BaseResponse<Object> r = BaseResponse.Error("서버 오류");
        assertEquals("ERROR", r.getResultCode());
        assertEquals("서버 오류", r.getResultMessage());
    }
}
