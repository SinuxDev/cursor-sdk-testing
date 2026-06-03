# Git Generate Branch

## Overview

Create and checkout a new branch from the chosen base, with a consistent naming convention (prefix, optional issue key, short slug). Aligns with commit types and PR description conventions.

## Steps

1. **Choose base branch**
   - Default to `origin/develop` (or `origin/main` if the repo standard is main).
   - Optionally run `git fetch origin` first so the base is up to date.
   - If the user prefers to branch from current HEAD, use current branch as base.

2. **Propose branch name**
   - **Prefix:** `feat/`, `fix/`, `chore/`, or similar (match the commit types used in git-commit).
   - **Optional issue key:** If the user provides an issue key (Linear, Jira, GitHub, e.g. POW-123, PROJ-456, #123) or it is in context, include it (e.g. `feat/PROJ-123-short-description` or `PROJ-123/feat/short-description`).
   - **Suffix:** Short, lowercase, hyphenated slug describing the work (e.g. `kafka-consumer`, `login-validation`).
   - Use only letters, numbers, and hyphens; no spaces.

3. **Create and checkout**
   - Ensure you are on the intended base (e.g. `git checkout develop` then create, or create from current HEAD if the user prefers).
   - Run: `git checkout -b <branch-name>` or `git switch -c <branch-name>`.

## Rules

- **Naming:** Align with [git-commit](git-commit.md) (type/scope) and [write-pr-description](write-pr-description.md) (issue key in branch name when used).
- **Uncommitted changes:** If there are uncommitted changes, note that the new branch will include them. Optionally ask whether to stash or commit on the previous branch first.

## Notes

- Prefer creating from an up-to-date base so the branch is clean for later push and PR.
