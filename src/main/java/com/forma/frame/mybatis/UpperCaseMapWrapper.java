package com.forma.frame.mybatis;

import org.apache.ibatis.reflection.MetaObject;
import org.apache.ibatis.reflection.wrapper.MapWrapper;

import java.util.Map;

/**
 * MyBatis Map 결과의 키를 대문자로 변환하여 camelCase 매핑을 통일.
 */
public class UpperCaseMapWrapper extends MapWrapper {

    public UpperCaseMapWrapper(MetaObject metaObject, Map<String, Object> map) {
        super(metaObject, map);
    }

    @Override
    public String findProperty(String name, boolean useCamelCaseMapping) {
        return name == null ? null : name.toUpperCase();
    }
}
