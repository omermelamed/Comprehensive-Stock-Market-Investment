FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY backend/ .
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
# Constrained for Render free tier (512MB). UseSerialGC avoids G1GC overhead on low-RAM containers.
ENTRYPOINT ["java", \
  "-Xmx380m", \
  "-Xss512k", \
  "-XX:MaxMetaspaceSize=96m", \
  "-XX:+UseSerialGC", \
  "-jar", "app.jar"]
