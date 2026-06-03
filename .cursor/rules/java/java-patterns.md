---
description: "Java patterns extending common rules"
globs: ["**/*.java"]
alwaysApply: false
---
# Java Patterns

> This file extends the common patterns rule with Java-specific content.

## API Response Format

Use a consistent envelope for REST responses:

```java
public record ApiResponse<T>(
    boolean success,
    T data,
    String error,
    PageMeta meta
) {}

public record PageMeta(long total, int page, int limit) {}
```

## Repository Pattern

Encapsulate data access behind interfaces:

```java
public interface Repository<T, ID> {
    List<T> findAll(Specification<T> spec);
    Optional<T> findById(ID id);
    T save(T entity);
    void deleteById(ID id);
}
```

Business logic depends on the interface, not JPA/DAO implementation.

## Dependency Injection

Prefer constructor injection; keep classes testable:

```java
@Service
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }
}
```

## Records and Sealed Types

Use records for DTOs and value types (Java 16+). Consider sealed interfaces for closed hierarchies (Java 17+).
