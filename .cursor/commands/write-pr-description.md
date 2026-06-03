# Write PR Description

## Overview

Generate a pull request description from the current branch and commits, including issue key, type/scope summary, and checklists aligned with security, integration, and component rules.

## Steps

1. **Gather context**
    - Inspect branch name for issue key (Linear, Jira, GitHub issue, e.g. POW-123, PROJ-456, #123)
    - Run `git log origin/main..HEAD --oneline` (or `origin/develop` if that is the base) to list commits
    - Optionally run `git diff origin/main..HEAD --stat` to summarize changed files
2. **Draft description**
    - **Title:** One line summarizing the change; include issue key if present (e.g. `PROJ-123: Add password reset flow`)
    - **Summary:** 2–4 sentences on what changed and why
    - **Type/scope:** Derive from commits (e.g. fix(auth), feat(api), chore(deps))
3. **Add checklists**
    - **Security:** Note that changes were reviewed against `rules/common/security.mdc` (or confirm reviewer will do so)
    - **QA:** Note unit/e2e impact; reference `rules/common/QA.md` if frontend/e2e touched
    - **Integration:** If APIs or message queues changed, note alignment with `rules/common/integration-standards.mdc`
    - **Component:** If backend/DB/architecture touched, note alignment with `rules/common/component-technical-standards.mdc`
4. **Output**
    - Emit the PR description in a copy-paste-ready block (Markdown)
    - Suggest any labels or reviewers only if the user has indicated conventions

## Template

```markdown
## Summary
<2–4 sentences>

## Type / scope
<e.g. fix(auth), feat(api)>

## Checklist
- [ ] Security: Reviewed against project security rules (or will be in review)
- [ ] QA: Unit/e2e impact considered
- [ ] Integration: API/contract changes align with integration standards (if applicable)
- [ ] Component: Backend/DB/arch changes align with component standards (if applicable)

## Refs
<issue key and link if available>
```

## Rules

- Base the summary on actual commits and diff; do not invent changes
- Keep title under 72 characters; imperative mood
- Reference rules by path (`rules/common/...`) so reviewers know which standards apply
- Do not add Co-authored-by or other trailers to the description

## Write PR Description Checklist

- [ ] Issue key included if present in branch or context
- [ ] Summary reflects real commits and scope
- [ ] Security, QA, integration, and component checklists included as applicable
- [ ] Refs section has issue link when available
