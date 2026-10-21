---
name: commit
description: Write a Conventional Commits message and commit staged changes. Use whenever creating a git commit in this repository.
---

# Commit with Conventional Commits

Format (Conventional Commits 1.0.0):

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

- **type:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- **scope:** optional area in parentheses, e.g. `feat(sealed):`, `fix(import):`
- **description:** imperative, lowercase start, no trailing period, about 72 characters or fewer
- **body:** explain what and why, not how; wrap at about 72 characters
- **breaking change:** add `!` after the type/scope and a `BREAKING CHANGE:` footer
- **issue link:** footer `Refs #<issue>`; use `Closes #<issue>` on the commit that completes it

Steps:

1. Review `git status` and `git diff --staged`. Stage related changes only.
2. Split unrelated changes into separate commits.
3. Confirm the change is recorded in `CHANGELOG.md` (see the `changelog` skill) and included in the commit.
4. Commit. Never skip hooks or amend commits that were already pushed.

Example:

```
feat(sealed): add sealed products table

Store SKU, product type, quantity and a price_source column so a
pricing API can be added later without a migration.

Refs #2
```
