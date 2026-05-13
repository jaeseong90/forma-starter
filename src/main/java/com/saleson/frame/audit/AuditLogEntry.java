package com.saleson.frame.audit;

import lombok.Builder;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
public class AuditLogEntry {
    private String traceId;
    private String pgmId;
    private String tableName;
    private String action;      // INSERT, UPDATE, DELETE
    private String rowKey;
    private String beforeData;  // JSON
    private String afterData;   // JSON
    private String userId;
    private String userIp;

    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("traceId", traceId);
        map.put("pgmId", pgmId);
        map.put("tableName", tableName);
        map.put("action", action);
        map.put("rowKey", rowKey);
        map.put("beforeData", beforeData);
        map.put("afterData", afterData);
        map.put("userId", userId);
        map.put("userIp", userIp);
        return map;
    }
}
