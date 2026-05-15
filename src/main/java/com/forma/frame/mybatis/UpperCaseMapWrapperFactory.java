package com.forma.frame.mybatis;

import org.apache.ibatis.reflection.MetaObject;
import org.apache.ibatis.reflection.wrapper.ObjectWrapper;
import org.apache.ibatis.reflection.wrapper.ObjectWrapperFactory;

import java.util.Map;

/**
 * resultType="map" 결과의 키를 대문자로 통일하는 Factory.
 * mybatis-config.xml에 등록하여 사용.
 */
public class UpperCaseMapWrapperFactory implements ObjectWrapperFactory {

    @Override
    public boolean hasWrapperFor(Object object) {
        return object instanceof Map;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ObjectWrapper getWrapperFor(MetaObject metaObject, Object object) {
        return new UpperCaseMapWrapper(metaObject, (Map<String, Object>) object);
    }
}
