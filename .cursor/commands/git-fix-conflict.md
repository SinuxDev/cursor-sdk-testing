# Git Fix Conflict

## Overview

Resolve merge or rebase conflicts non-interactively: identify conflicted files, resolve conflict markers by choosing or combining the correct code, stage resolved files, then complete the merge or rebase. Validate build and tests before finalizing.

## Steps

1. **Confirm conflict state**
   - Run `git status` to see if you are in a merge or rebase (e.g. "You have unmerged paths", "rebase in progress").
   - List conflicted files: `git diff --name-only --diff-filter=U` or check `git status` for "both modified" / "Unmerged paths".

2. **Resolve each conflicted file**
   - Open each file and find conflict markers: `<<<<<<<`, `=======`, `>>>>>>>` (and optionally `|||||||` for merge-base).
   - For each conflict block, decide:
     - Keep "ours" (current branch): delete the other side and the markers.
     - Keep "theirs" (incoming): delete our side and the markers.
     - Combine: keep the correct logic from both sides, remove all markers and duplicate/conflicting lines.
   - Ensure the file has no remaining `<<<<<<<`, `=======`, `>>>>>>>` (or `|||||||`).
   - Do not leave conflict markers in the file.

3. **Stage resolved files**
   - Run `git add <path>` for each resolved file (or `git add -u` to stage all resolved unmerged paths).
   - Confirm with `git status` that there are no remaining "Unmerged paths".

4. **Complete the operation**
   - **If merging:** Run `git commit` (no `-m` needed; the merge message is usually pre-filled). Do not run `git commit -m "..."` unless the user wants a custom message.
   - **If rebasing:** Run `git rebase --continue`. If you hit conflicts again, repeat from step 1.

5. **Validate**
   - Run the project’s build and test commands (e.g. `npm run build`, `npm test`, or project-specific commands). If something fails, fix the resolution and re-run until build and tests pass.

## Rules

- **No markers left:** Never leave `<<<<<<<`, `=======`, `>>>>>>>` (or `|||||||`) in any file. A file is only resolved when it has no conflict markers and expresses the intended result.
- **Intent over literal:** Prefer resolving by understanding the intent of both sides (e.g. keep a feature from one branch and fix from the other) rather than blindly choosing "ours" or "theirs" for the whole file.
- **Abort only when asked:** Use `git merge --abort` or `git rebase --abort` only if the user explicitly asks to cancel the merge/rebase.
- **Single operation:** Complete one merge or one rebase per run. If the user has multiple branches to merge, run the command once per merge/rebase.

## Notes

- Useful after `git pull`, `git merge`, `git rebase`, or when CI fails due to merge conflicts.
- If the repo uses a conflict-resolution skill (e.g. fix-merge-conflicts), you may follow its workflow in addition to this command.
