<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Collection Tracker – agent guide

Next.js dashboard for tracking a Pokémon card collection and its value. Read `README.md` for setup and `.renders/` for the target design (`.renders/executive_collectible_intelligence/DESIGN.md` defines the design tokens). Planned work lives in GitHub issues and epics (an epic is a parent issue with sub-issues), tracked on the project board linked from the README.

## Rules

1. **Every change goes in the changelog.** Add an entry under `## [Unreleased]` in `CHANGELOG.md` (Keep a Changelog 1.1.0 format) in the same change that makes it. See `.agents/skills/changelog/SKILL.md`.
2. **One branch per issue or epic.** Create a new branch before starting, named `<type>/<ticket-id>-<description>`, where `<ticket-id>` is the GitHub issue number. See `.agents/skills/start-issue/SKILL.md`.
3. **Use Conventional Commits 1.0.0** for commit messages and **Conventional Branches** for branch names. See `.agents/skills/commit/SKILL.md`.
4. Do not commit directly to `main` or `dev`. Open a pull request into `dev`.
5. Before starting any issue, claim it (check it is not already In Progress, then set it In Progress on the project board) so only one agent works on it. See `start-issue`.
6. Do not push, create issues, or open pull requests unless asked.

## Conventions

- Branch types: `feature`, `bugfix`, `hotfix`, `release`, `chore`. Lowercase, hyphen-separated, e.g. `feature/2-sealed-product-schema`.
- Commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Reference the issue in the footer (`Refs #2`, or `Closes #2` on the final commit).
- Before finishing: run `npm run lint` and `npx tsc --noEmit`.

## Skills

Task playbooks live in `.agents/skills/<name>/SKILL.md`:

- `start-issue` – claim an issue (lock it via board status), then begin work on it
- `commit` – write a conventional commit
- `changelog` – record a change in `CHANGELOG.md`
