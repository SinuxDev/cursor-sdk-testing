---
description: "Java coding style extending common rules"
globs: ["**/*.java"]
alwaysApply: false
---
# Java Coding Style

> This file extends the common coding style rule with Java-specific content.

## Immutability

Prefer immutable objects and avoid mutating existing instances:

```java
// WRONG: Mutation
public void updateName(User user, String name) {
    user.setName(name);  // MUTATION!
}

// CORRECT: Return new or use builder
public User withName(User user, String name) {
    return user.toBuilder().name(name).build();
}
```

Use records for simple data carriers where appropriate (Java 16+).

## Error Handling

Use checked exceptions for recoverable errors; handle at boundaries:

```java
try {
    return riskyOperation();
} catch (SpecificException e) {
    log.error("Operation failed", e);
    throw new BusinessException("User-friendly message", e);
}
```

Never swallow exceptions; log or rethrow with context.

## Input Validation

Validate at boundaries using Bean Validation (JSR 380) or explicit checks:

```java
public record CreateUserRequest(
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age
) {}
```

Fail fast with clear messages; never trust external input.

## Naming and Structure

- Classes: PascalCase. Interfaces: no `I` prefix (e.g. `UserService`, not `IUserService`).
- Methods: camelCase. Constants: UPPER_SNAKE_CASE.
- Prefer small, focused classes; keep methods under ~50 lines, files under ~800 lines.
- No `System.out.println` in production; use a logging framework (SLF4J/Logback).
