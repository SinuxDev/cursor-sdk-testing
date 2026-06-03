# Agent Instructions (Cursor)

High-level guidance for using Cursor agents in this repo. Details: [rules/common/agents.md](rules/common/agents.md), [rules/common/common-agents-ecc.md](rules/common/common-agents-ecc.md), and [docs/](docs/).

## Core Principles

1. **Agent-First** — Delegate to specialized agents for domain tasks
2. **Test-Driven** — Write tests before implementation, 80%+ coverage required
3. **Security-First** — Never compromise on security; validate all inputs
4. **Immutability** — Always create new objects, never mutate existing ones
5. **Plan Before Execute** — Plan complex features before writing code

## Available Agents

See **rules/common/agents.md** and **rules/common/common-agents-ecc.md** for the full list. Summary:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits |
| build-error-resolver | Fix build errors | When build fails |
| e2e-runner | E2E testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |

## Agent Orchestration

Use agents proactively:
- Complex feature requests → **planner**
- Code just written/modified → **code-reviewer**
- Bug fix or new feature → **tdd-guide**
- Architectural decision → **architect**
- Security-sensitive code → **security-reviewer**

Use **parallel** execution for independent operations.

## Security Guidelines

**Before ANY commit:** No hardcoded secrets, validate inputs, parameterized queries, sanitized output, auth verified, rate limiting, no sensitive data in errors.

See [rules/common/security.mdc](rules/common/security.mdc) and [docs/the-security-guide.md](docs/the-security-guide.md).

## Development Workflow

1. **Plan** — Use planner agent for dependencies and phases
2. **TDD** — Write tests first, implement, refactor (80%+ coverage)
3. **Review** — Use code-reviewer; address CRITICAL/HIGH issues
4. **Commit & push** — Conventional commits; when the task completes cleanly, push to `origin` (see [rules/common/common-git-workflow.md](rules/common/common-git-workflow.md)); comprehensive PR summaries when opening PRs

## Project Structure (this repo as .cursor)

- **agents/** — Specialized agent definitions
- **commands/** — Slash commands
- **rules/** — Common + per-language rules
- **skills/** — Workflow and domain skills
- **contexts/** — Dev / research / review context files
- **docs/** — Long-form guides (security, shortform, longform)
- **hooks/** — Trigger-based automations (optional)
- **scripts/** — Utilities for hooks (optional)

## Success Metrics

- All tests pass with 80%+ coverage
- No security vulnerabilities
- Code readable and maintainable
- User requirements met
