---
name: start-issue
description: Begin work on a GitHub issue or epic by creating a correctly named branch from dev. Use before making any change that corresponds to an issue.
---

# Start work on an issue or epic

1. Identify the issue number (`<ticket-id>`) and read the issue. For an epic, read its sub-issues and work on one sub-issue at a time unless told otherwise.
2. Make sure the working tree is clean and `dev` is up to date.
3. Pick the branch type from the work:
   - `feature` – new functionality
   - `bugfix` – fix for a defect
   - `hotfix` – urgent fix to released code
   - `chore` – tooling, docs, refactors, dependencies
   - `release` – release preparation
4. Build the name `<type>/<ticket-id>-<description>`:
   - description is 2–5 lowercase words, hyphen-separated, no punctuation
   - example: `feature/2-sealed-product-schema`
5. Create it from `dev`:
   ```bash
   git switch dev
   git switch -c feature/2-sealed-product-schema
   ```
6. Work in small commits (see the `commit` skill) and update `CHANGELOG.md` (see the `changelog` skill).
7. Finish with `npm run lint` and `npx tsc --noEmit`. Do not push or open a pull request unless asked; the PR targets `dev` and should say `Closes #<ticket-id>`.

An epic gets its own branch only if the work spans several sub-issues that must land together; otherwise each sub-issue gets its own branch.
