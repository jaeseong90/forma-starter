package com.saleson.frame.common.dto;

import lombok.Data;

@Data
public class MenuResDto {
    private String menuId;
    private String menuNm;
    private String parentId;
    private String menuType;
    private String pgmId;
    private String url;
    private String icon;
    private Integer sortOrder;
}
