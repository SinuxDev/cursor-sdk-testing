---
description: "Java security extending common rules"
globs: ["**/*.java"]
alwaysApply: false
---
# Java Security

> This file extends the common security rule with Java-specific content.

## Secret Management

```java
// NEVER: Hardcoded secrets
String apiKey = "sk-proj-xxxxx";

// ALWAYS: Environment or config (e.g. Spring property, env var)
@Value("${api.key}")
private String apiKey;

// Validate at startup
@PostConstruct
void validateConfig() {
    if (apiKey == null || apiKey.isBlank()) {
        throw new IllegalStateException("api.key not configured");
    }
}
```

## Input and Output

- Use parameterized queries (JPA criteria, JdbcTemplate with `?`) — never concatenate user input into SQL.
- Sanitize/escape output for the context (HTML, logs, etc.); use OWASP encoder or framework helpers.
- Validate and constrain file paths; avoid path traversal when reading files.

## Agent Support

- Use **security-reviewer** skill for comprehensive security audits of Java codebases.
