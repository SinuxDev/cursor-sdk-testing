---
description: "Java hooks extending common rules"
globs: ["**/*.java"]
alwaysApply: false
---
# Java Hooks

> This file extends the common hooks rule with Java-specific content.

## Post-Edit Hooks

Configure in Cursor/hooks or project settings:

- **Formatter**: Run project formatter (e.g. Google Java Format, Spotless) after editing `.java` files
- **Compile check**: Run `javac` or build (Maven/Gradle) after edits to catch compile errors
- **System.out/print audit**: Warn about `System.out` / `System.err` / `printStackTrace()` in edited files

## Stop Hooks

- **System.out audit**: Check all modified Java files for `System.out`, `System.err`, or raw `printStackTrace()` before session ends; prefer SLF4J/Logback.
