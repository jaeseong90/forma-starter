package com.saleson.login.dto;

import lombok.Data;

@Data
public class LoginUserResDto {
    private String userId;
    private String userPw;
    private String userNm;
    private String deptCode;
    private String deptName;
    private String useYn;
}
