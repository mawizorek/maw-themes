# studio/ — the Theme Studio

**Ruled by Michael, 2026-08-03: the Studio ships INSIDE `maw-themes`.**

## Why it lives here and not in ClickUp_apps

`vocabulary/OBJECT-COVERAGE.md` calls it the acceptance test: *"`preview.html` is the live proof: pick a
theme, every object below reskins from the token set."* A proof surface in a different repo from the
data it proves rots the moment either side moves, and Pages will happily serve a stale studio against
a fresh table with no error. Same class of failure as a version ledger drifting from HEAD.

The Studio is not a demo. It is how you find out a theme is broken.

## Not landed yet

| Source (`shared/themes/`) | Lands as | Bytes | Status |
|---|---|---|---|
| `preview.html` | `studio/index.html` | 9,848 | readable, next pass |
| `preview.core.js` | `studio/studio.core.js` | 16,260 | readable, next pass |
| `preview.objects.css` | `studio/studio.objects.css` | 17,231 | readable, next pass |
| `preview.css` | `studio/studio.css` | 26,322 | ⛔ over the read cap — hand-move |
| `preview.data.js` | `studio/studio.data.js` | 27,419 | ⛔ over the read cap — hand-move |

See [`../MIGRATION-STATUS.md`](../MIGRATION-STATUS.md) for the byte-safe transfer path.

## Two things to fix on arrival, not after

**1. It is 97KB across 5 files and two of them are over the ~22KB read ceiling.** `preview.css`
(26.3KB) and `preview.data.js` (27.4KB) cannot be read back whole, which means they cannot be safely
edited by an agent. They get split on arrival, by concern, not later. A file that can't be read whole
can't be safely edited.

**2. `preview.data.js` is a hand-mirrored snapshot of the TSVs, and it has a standing sync
obligation.** `docs/THEME-SYSTEM.md` says it outright: *"Mandatory: Update the embedded snapshot
variables inside `preview.data.js` so it stays current with the TSVs."*

That is a hand-maintained mirror of a canonical source, which is the exact pattern that produced D1.
When `engine/` is inverted, **the first-paint snapshot should be GENERATED into `dist/` and imported**,
not hand-mirrored. The resilience feature is worth keeping; the manual sync obligation is not.

## Renaming note

`preview.*` → `studio.*`, and `preview.html` → `index.html` so the folder is a real Pages entry point
(`/studio/`). The docs still say `preview.html` everywhere — **that rename is a documentation pass, and
it does not happen until the files actually land.** Renaming in prose before the file moves is how
pointers rot.
