# Create ONBOARDING.md

## Overview

Create or replace `ONBOARDING.md` in the repository root with a comprehensive project overview, setup, structure, conventions, and first steps. Use existing rules and repo layout as the source of truth.

## Steps

1. **Gather context**
    - Read `rules/folder-structure.md` to capture the *-fe / *-be convention and folder intent
    - List all files in `commands/` and `rules/` to know current commands and rules
    - Do not invent tools, repo structure, or rules that are not present
2. **Target file**
    - Create or replace **`ONBOARDING.md`** in the **repository root** (same level as `commands/` and `rules/`)
3. **Required sections** (include in this order)
    - **Project overview** – What this repo is (Cursor rules and commands for Lomtech BRD projects) and who it is for
    - **Prerequisites** – Cursor (or compatible editor), Git; link to any external tooling the repo assumes
    - **Repo structure** – Brief description of `commands/`, `rules/`, and the *-fe / *-be convention from folder-structure (do not duplicate the full rule)
    - **Using commands** – How to run Cursor commands (e.g. Command Palette, @-mention) and that command definitions live in `commands/`
    - **Using rules** – That project rules live in `rules/` and apply automatically; mention key rules by name (e.g. folder-structure, qa)
    - **First steps** – Clone repo, open in Cursor, skim onboarding and rules, run a sample command if applicable
    - **Getting help** – Where to look (rules, commands, this file) and any team or docs links if available
4. **Content rules**
    - Write in clear, concise Markdown
    - Use bullet lists and short paragraphs
    - Do not invent tools or repo structure not present in the repo
    - Cross-reference existing rules and commands by path or name

## Create ONBOARDING.md Checklist

- [ ] All required sections present and in order
- [ ] Paths and rule/command names match the current repo
- [ ] No placeholder TODOs unless explicitly requested by the user
- [ ] `ONBOARDING.md` is in the repository root
