# Write E2E Tests

## Overview

Create Playwright end-to-end tests for the current feature or flow, following the project QA rules (`rules/common/QA.md`) and keeping tests stable, maintainable, and reflective of real user behavior.

## Steps

1. **Identify scope**
    - Determine the user flow or feature to cover (from conversation, open files, or user request)
    - Identify the entry URL and critical steps (login, navigation, form submit, etc.)
2. **Align with QA rules**
    - Read `rules/common/QA.md` and apply: role-based locators (`page.getByRole`, `page.getByLabel`, `page.getByText`, `page.getByTitle`), `page.getByTestId` when `data-testid` exists
    - Use Playwright fixtures (`test`, `page`, `expect`); `test.beforeEach` / `test.afterEach` for setup/teardown
    - Prefer web-first assertions (`toBeVisible`, `toHaveText`, etc.) and `expect` matchers; avoid hardcoded timeouts and `page.locator` for complex selectors
3. **Implement tests**
    - Use descriptive test names that describe expected behavior
    - Keep tests DRY; extract reusable logic into helper functions with JSDoc
    - Ensure tests can run in parallel without shared state conflicts
    - Use `playwright.config.ts` for global config and environment; use `devices` where applicable
4. **Place output**
    - Create or append to the project’s existing E2E test file(s) (e.g. under `*-fe` or shared `e2e/` as per project layout)
    - Follow existing naming and folder conventions in the repo

## Template

- File: place in project’s E2E test directory; name by feature or flow (e.g. `auth.spec.ts`, `checkout.spec.ts`)
- Structure: describe block for feature → test blocks for scenarios; beforeEach for common setup (e.g. goto base URL, login if needed)

## Rules

- Do not use `page.locator` with long CSS/XPath strings; use role-based or test-id locators
- Do not add comments to the resulting code; use clear test and function names plus JSDoc for helpers
- Avoid hardcoded timeouts; use `page.waitFor` or web-first assertions
- Follow https://playwright.dev/docs/writing-tests for best practices

## Write E2E Tests Checklist

- [ ] Tests use role-based or getByTestId locators per QA.md
- [ ] Playwright fixtures and beforeEach/afterEach used for isolation
- [ ] Test names are descriptive; helpers have JSDoc
- [ ] No shared state between tests; parallel-safe
- [ ] Critical user path covered with stable, maintainable assertions
