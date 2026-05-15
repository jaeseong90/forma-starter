package com.forma.frame.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Map;

@Slf4j
@Component
public class JwtTokenProvider {

    /** application.yml 의 기본값 — 운영에서 그대로 쓰면 안 된다. */
    private static final String DEFAULT_DEV_SECRET = "formaDefaultSecretKeyForDevelopmentOnly1234567890abcdef";

    private final Key key;
    private final long validMillis;

    public JwtTokenProvider(
            @Value("${forma.jwt.secret}") String secret,
            @Value("${forma.jwt.valid-seconds}") long validSeconds,
            Environment env) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.validMillis = validSeconds * 1000;

        if (DEFAULT_DEV_SECRET.equals(secret)) {
            boolean isLocal = isLocalProfile(env);
            String msg = "[SECURITY] forma.jwt.secret 가 starter 기본값(development-only)으로 설정돼 있다. "
                    + "FORMA_JWT_SECRET 환경변수로 32자 이상 랜덤 시크릿을 주입할 것 "
                    + "(예: `openssl rand -base64 48`).";
            if (isLocal) {
                log.warn(msg);
            } else {
                // 운영/스테이징/그 외 알 수 없는 프로파일 — 기본 시크릿은 즉시 위험 신호.
                log.error(msg);
            }
        }
    }

    private boolean isLocalProfile(Environment env) {
        for (String p : env.getActiveProfiles()) {
            if ("local".equalsIgnoreCase(p) || "test".equalsIgnoreCase(p)) return true;
        }
        return env.getActiveProfiles().length == 0; // 명시 안 했으면 local default
    }

    public String createToken(String userPk, Map<String, Object> claims) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(userPk)
                .addClaims(claims)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + validMillis))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUserPk(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public Map<String, Object> parseBody(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody();
        return claims;
    }

    /**
     * Returns the remaining validity time in milliseconds for the given token.
     */
    public long getRemainingMillis(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody();
        Date expiration = claims.getExpiration();
        return expiration.getTime() - System.currentTimeMillis();
    }

    public long getValidSeconds() {
        return validMillis / 1000;
    }
}
