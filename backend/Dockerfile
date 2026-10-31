FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B package
FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && useradd --create-home transit
WORKDIR /app
COPY --from=build /app/target/smart-transit-1.0.0.jar app.jar
USER transit
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
