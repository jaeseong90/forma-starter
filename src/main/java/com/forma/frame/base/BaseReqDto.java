package com.forma.frame.base;

import lombok.Data;

/**
 * 저장 요청 공통 필드.
 * AOP(@AddUserInfo)에서 주입하는 필드를 포함.
 */
@Data
public class BaseReqDto {
    private String userId;
    private String userName;
    private String userDept;
    private String userIp;
}
