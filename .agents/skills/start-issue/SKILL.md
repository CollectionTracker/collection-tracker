---
name: start-issue
description: Begin work on a GitHub issue or epic. First claims the issue (checks it is free, sets it In Progress on the project board) so only one agent works on it, then creates a correctly named branch from dev. Use before making any change that corresponds to an issue.
---

# Start work on an issue or epic

Several agents may run at once. The project board **Status** field is the lock: an issue that is `In Progress` belongs to someone else. Claim before doing anything else (no branch, no edits, no research) and stop if the claim fails.

Constants: repo `JakeDeFord/collection-tracker`, project `3` (owner `JakeDeFord`, id `PVT_kwHOAp_v9c4BoHNx`), Status field id `PVTSSF_lAHOAp_v9c4BoHNxzhmoxqw`, options `Todo` = `f75ad846`, `In Progress` = `47fc9ee4`, `Done` = `98236657`. If a command fails because an id changed, re-read them with `gh project field-list 3 --owner JakeDeFord --format json`.

## 1. Claim the issue

1. Pick an agent id for this run (e.g. `agent-<random 6 chars>`) and reuse it in every claim and release comment.
2. Check the current state:
   ```bash
   gh issue view <n> --json state,assignees,comments,labels
   gh project item-list 3 --owner JakeDeFord --limit 200 --format json \
     | jq '.items[] | select(.content.number == <n>) | {id, status}'
   ```
3. The issue is **free** only if all hold: it is open, its board Status is `Todo` (or unset), it has no open blocker that has no branch yet (see "Blocked issues" below), and it has no unreleased claim comment (a `🤖 claimed by …` comment with no later `🤖 released by …`). Otherwise it is **taken**: do not touch it, tell the user who holds it, and pick a different free issue or stop. Never override someone else's claim; if it looks stale, ask the user.
4. For an epic, also check its sub-issues and claim only the sub-issue you will work on (check that one the same way). Do not claim a parent epic just to work on one child.
5. Claim it, in this order:
   ```bash
   gh issue comment <n> --body "🤖 claimed by <agent-id>"
   gh issue edit <n> --add-assignee @me
   gh project item-edit --id <item-id> --project-id PVT_kwHOAp_v9c4BoHNx \
     --field-id PVTSSF_lAHOAp_v9c4BoHNxzhmoxqw --single-select-option-id 47fc9ee4
   ```
   If the issue is not on the board yet, add it first with `gh project item-add 3 --owner JakeDeFord --url <issue-url>` and use the returned item id.
6. Verify you won any race: re-read the issue comments. If another `claimed by` comment (different agent id) with no release exists **earlier** than yours, you lost: post `🤖 released by <agent-id>`, leave the Status as it is, and stop or pick another issue. Otherwise you hold the claim.

## Blocked issues

Dependencies between issues are recorded with GitHub's "blocked by" relationship. Check it before claiming:

```bash
gh api repos/JakeDeFord/collection-tracker/issues/<n>/dependencies/blocked_by \
  --jq '.[] | {number, state, title}'
```

For each blocker:
- **Closed / its PR merged into `dev`:** ignore it and branch from `dev`.
- **Open, with a branch or open PR:** branch from the blocker's branch (chain) and open the PR against that branch; retarget it to `dev` once the blocker merges. Rebase after the blocker changes.
- **Open, with no branch yet:** the issue is not free. Work on the blocker first or pick another issue.
- Several blockers: only chain when they are all on one branch line, otherwise wait for them to merge.
- No blockers: always branch from `dev`.

When you find a dependency that is not recorded, add the link rather than relying on memory:
`gh api -X POST repos/JakeDeFord/collection-tracker/issues/<n>/dependencies/blocked_by -F issue_id=<blocker database id>` (database id from `gh api repos/JakeDeFord/collection-tracker/issues/<blocker> --jq .id`). Migration files are the usual conflict point, so chain rather than parallelise issues that both add migrations.

## 2. Set up the work

1. Read the issue. For an epic, read its sub-issues and work on one sub-issue at a time unless told otherwise.
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
5. Create it from `dev`, or from the blocker's branch when chaining (see "Blocked issues"):
   ```bash
   git switch dev
   git switch -c feature/2-sealed-product-schema
   ```
6. Work in small commits (see the `commit` skill) and update `CHANGELOG.md` (see the `changelog` skill).
7. Finish with `npm run lint` and `npx tsc --noEmit`. Do not push or open a pull request unless asked; the PR targets `dev` and should say `Closes #<ticket-id>`.

An epic gets its own branch only if the work spans several sub-issues that must land together; otherwise each sub-issue gets its own branch.

## 3. Release the claim

- Work finished and the PR merged: GitHub closes the issue and the board moves it to `Done`; if it does not, set Status to `Done` (`98236657`).
- Abandoning or pausing the issue without finishing: set Status back to `Todo` (`f75ad846`), remove yourself with `gh issue edit <n> --remove-assignee @me`, and comment `🤖 released by <agent-id>` with a line on what is left, so the next agent can pick it up.
- Leave the claim in place while the PR is open and unmerged.
