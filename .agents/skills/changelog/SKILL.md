---
name: changelog
description: Record a change in CHANGELOG.md using the Keep a Changelog 1.1.0 format. Use for every change made to this repository.
---

# Update the changelog

Every change must be recorded in `CHANGELOG.md` in the same commit or pull request that makes it. The format is [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).

1. Add the entry under `## [Unreleased]`, in the matching subsection (create it if missing, keeping this order):
   - `### Added` – new features
   - `### Changed` – changes to existing behaviour
   - `### Deprecated` – soon-to-be removed features
   - `### Removed` – removed features
   - `### Fixed` – bug fixes
   - `### Security` – vulnerabilities
2. Write one line per change for a human reader, not a commit message. Say what changed and why it matters. Add the issue reference at the end, e.g. `(#2)`.
3. Do not edit released sections. On release, rename `[Unreleased]` to `[x.y.z] - YYYY-MM-DD` and add a fresh empty `[Unreleased]` above it.
4. Documentation-only and tooling changes also get an entry (usually under `Changed` or `Added`).

Example:

```markdown
## [Unreleased]

### Added
- Sealed products table and migration so sealed inventory can be stored (#2).
```
