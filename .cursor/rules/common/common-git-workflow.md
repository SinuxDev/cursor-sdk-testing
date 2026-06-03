---
description: "Git workflow: conventional commits, auto push when clean, PR process"
alwaysApply: true
---
# Git Workflow

## Automatic commit and push (all agents)

When a coding task finishes **without remaining problems**—for example type-check (and any lint/tests the agent ran) passes, requirements are met, and there is nothing left to fix—**automatically commit and push** the current branch so work is not left only locally.

1. `git status` — if there are changes, stage them.
2. Commit with a **conventional** message summarizing the change.
3. **Push** to `origin` (`git push -u origin HEAD` if the branch has no upstream).

**Do not** auto-commit or auto-push when:

- The user asked **not** to commit/push, or the task was **read-only / exploratory only** with no intended code changes.
- Tests, build, or type-check **failed**, or errors remain unresolved.
- There is **nothing to commit** (clean working tree).
- No **remote** / not a git repo / **merge conflicts** unresolved.

This applies consistently across agents and sessions unless the user overrides for that task.

## Commit Message Format
```
<type>: <description>

<optional body>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

Note: Attribution disabled globally via ~/.claude/settings.json.

## Pull Request Workflow

When creating PRs:
1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

> For the full development process (planning, TDD, code review) before git operations,
> see the development workflow rule.
