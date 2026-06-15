---
name: update-changelog
description: Reads git commit log, groups by date, and updates CHANGELOG.md at the project root. Use before any merge to main to keep the changelog current.
---

# Update Changelog

## When to Use

Before merging a branch into `main`, run this skill to update `CHANGELOG.md`.

## What It Does

1. Reads the existing `CHANGELOG.md` (if any) to find already-documented commits
2. Scans `git log` grouped by date
3. Appends new dates and bullet points to `CHANGELOG.md`
4. If no `CHANGELOG.md` exists, creates one from the full git history

## Instructions

Run the helper script from the project root:

```bash
bash .pi/skills/update-changelog/scripts/update-changelog.sh
```

Then review `CHANGELOG.md` and include it in your commit.
