---
description: "Java testing extending common rules"
globs: ["**/*.java"]
alwaysApply: false
---
# Java Testing

> This file extends the common testing rule with Java-specific content.

## Unit Tests

- Use **JUnit 5** (Jupiter) and **AssertJ** or Hamcrest for assertions.
- One test class per production class; place in `src/test/java` mirroring package structure.
- Prefer meaningful test names: `shouldReturnEmptyWhenUserNotFound()` not `testFindById()`.

## Integration Tests

- Use **Spring Boot Test** (or equivalent) for slice/context tests: `@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`.
- Use Testcontainers for real DB/Redis when needed; avoid shared mutable state.

## E2E and Coverage

- E2E: Use RestAssured or Spring MockMvc for API flows; Playwright/WebDriver for browser flows when required.
- Aim for **80%+ coverage**; focus on business logic and boundaries.
- Use **tdd-guide** and **e2e-runner** agents when adding tests or critical user flows.
