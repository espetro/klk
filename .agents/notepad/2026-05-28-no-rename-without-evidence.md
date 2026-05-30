# Do NOT rename identifiers or routes without evidence + sign-off

**Date:** 2026-05-28

## What happened

The rename `Group → Circle` touched 40+ files across 4 packages, generated 20+
formatter/import-fix follow-up commits, and left stale references in tests and
seed scripts that caused confusion for weeks afterward. The rename was triggered
by a product preference, not a code smell — the ripple cost was entirely avoidable.

## Rule

Before any repo-wide rename:

1. **Evidence threshold:** 3+ confirmed live usages of the old name in user-facing
   strings, route paths, or API contracts. Internal code names do not qualify.
2. **User sign-off required.** Tag the user and get an explicit "yes" before executing.
3. **Hard freeze:** during M1 (until 2026-06-04), ALL renames are banned regardless
   of evidence threshold. See `docs/roadmap.md`.

## How to spot the trap

If you find yourself about to `grep -r 'oldName' . | wc -l` and then `sed -i`,
stop. Raise it with the user first. If there are more than 10 files affected,
treat it as a separate PR with its own validation cycle — never bundle a rename
with feature work.

## Current canonical names

- Private groups: **Circles** (not Groups, not Rooms, not Channels)
- Route: `/circle/[id]` (not `/group/[id]`)
- Nostr entities: **Events** and **Circles** (nothing else)
