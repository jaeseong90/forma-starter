package com.saleson.frame.log;

import com.saleson.frame.mybatis.FormaSqlSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FormaLogService {

    private final FormaSqlSession sql;

    public void insertLog(FormaLogType type, String pgmId, String userId, String userIp) {
        try {
            sql.insert("common.insertLog", Map.of(
                    "log_type", type.name(),
                    "pgm_id", pgmId,
                    "userId", userId != null ? userId : "system",
                    "userIp", userIp != null ? userIp : ""
            ));
        } catch (Exception e) {
            log.warn("Failed to insert log: {}", e.getMessage());
        }
    }
}
