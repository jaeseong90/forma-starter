package com.forma.frame.common.dto;

import lombok.Data;

@Data
public class DeptResDto {
    private String deptCode;
    private String deptName;
    private String parentCode;
    private String parentName;
    private Integer deptLevel;
    private Integer sortOrder;
    private String useYn;
    private String createdBy;
    private String createdAt;
}
