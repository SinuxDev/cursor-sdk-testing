# Git Branch, Commit, and Push

## Overview

Create a new branch, commit staged (or unstaged) changes with a conventional message, and push to origin in one flow. Follows [git-branch](git-branch.md), [git-commit](git-commit.md), and [git-push](git-push.md) conventions.

## Steps

1. **Branch**
   - Follow [git-branch](git-branch.md): choose base (e.g. `origin/develop`), propose branch name (prefix + optional issue key + slug), then `git checkout -b <branch-name>` (or `git switch -c <branch-name>`).
   - If there are uncommitted changes, either stash/commit on the previous branch first (ask the user) or carry them onto the new branch and include them in the upcoming commit.

2. **Commit**
   - Follow [git-commit](git-commit.md): review diff (`git diff --cached` or `git diff`), optionally ask for issue key if not in branch/context, stage if needed (`git add -A`), then `git commit -m "<message>"` with a short, conventional subject only.

3. **Push**
   - Follow [git-push](git-push.md): optionally `git fetch origin` and rebase onto latest base (e.g. `git rebase origin/develop`), then `git push -u origin HEAD`. If push is rejected, `git pull --rebase && git push`; only suggest `git push --force-with-lease` after asking the user.

## Rules

- **Order:** Always branch → commit → push. Do not push without a commit; do not commit on the wrong branch.
- **Naming:** Branch name and commit message must align (same type/scope and issue key when used). See [write-pr-description](write-pr-description.md) for PR context.
- **Single commit:** This flow produces one commit on the new branch. For multiple logical commits, run git-commit (and optionally git-push) separately after the first run.

## Notes

- Useful for small, focused changes: new branch, one commit, then push for a quick PR.
- If the user only wants to push an existing branch with existing commits, use [git-push](git-push.md) alone.
