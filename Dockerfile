# FORMA — Multi-stage Docker Build
FROM gradle:8.5-jdk21 AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle gradle
COPY src src
COPY design design
RUN gradle bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S forma && adduser -S forma -G forma
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
RUN mkdir -p /app/uploads /app/logs && chown -R forma:forma /app
USER forma
EXPOSE 8080
ENV JAVA_OPTS="-Xmx1536m -Xms1024m -XX:+UseG1GC"
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
