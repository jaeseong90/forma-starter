package com.saleson.frame.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * FORMA 파일 SPI 의 기본 구현 등록. 프로젝트가 자기 {@link FileStore} 빈을 등록하면
 * {@link ConditionalOnMissingBean} 로 본 기본 구현은 비활성화된다.
 */
@Configuration
public class FileSpiConfig {

    @Bean
    @ConditionalOnMissingBean
    public FileStore fileStore(
            @Value("${saleson.file.upload-path:./uploads}") String uploadBase,
            @Value("${saleson.file.xaccel.enabled:false}") boolean xaccelEnabled,
            @Value("${saleson.file.xaccel.internal-location:/download/}") String xaccelInternalLocation) {
        return new LocalFileStore(uploadBase, xaccelEnabled, xaccelInternalLocation);
    }
}
