# Review Security Checklist

## Overview

Run through the project security rules (`rules/common/security.mdc`) on changed or in-scope files and output an explicit checklist result for review.

## Steps

1. **Determine scope**
    - If the user specifies files or a path, use that
    - Otherwise use changed files: `git diff --name-only origin/main..HEAD` (or `origin/develop` as base)
    - If no branch context, use the files currently open or under discussion
2. **Load security rule**
    - Read `rules/common/security.mdc` and extract the main requirement sections
3. **Map files to security areas**
    - For each changed file, identify which security areas apply (e.g. auth code → Authentication and Token Management; API routes → Input Validation, Authorization; HTML/frontend → XSS, CSP; file upload handlers → File Upload and Handling)
4. **Produce checklist**
    - For each applicable section, output a checklist item with Pass / Fail / N/A and a one-line reason
    - Cite the rule section (e.g. "Input Validation and Output Handling", "Secrets Management")
5. **Summarize**
    - List any Fail items first; then N/A; then Pass
    - Suggest concrete fixes only for Fail items; do not change code unless the user asks

## Security sections (from security.mdc)

- Input Validation and Output Handling
- Authentication and Password Management
- OAuth 2.1 / OpenID Connect and Token Management
- Session Management
- CSRF Protection
- Authorization and Access Control
- Secrets Management
- Web Application Security Headers
- Cryptography
- File Upload and Handling
- Error Handling and Logging
- Data Protection
- Dependency and Configuration Management

## Template

```markdown
## Security review: <scope>

| Section | Result | Note |
|---------|--------|------|
| Input Validation and Output Handling | Pass / Fail / N/A | … |
| … | … | … |

### Summary
- Fails: <count> — <brief list>
- N/A: <count>
- Pass: <count>
```

## Rules

- Only mark Pass when the code clearly satisfies the rule; otherwise use Fail or N/A
- N/A when the change does not touch that area (e.g. no file upload code → File Upload N/A)
- Do not mark Pass for files you did not read; state "Not reviewed" or omit
- Keep notes short and actionable

## Review Security Checklist Checklist

- [ ] Scope of files is clearly stated
- [ ] Each applicable security section has a result and note
- [ ] Fail items are listed in the summary with brief remediation hint
- [ ] No code changes unless user requested
