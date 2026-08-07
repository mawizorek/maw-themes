# studio/ - the Theme Studio

Ported from `ClickUp_apps@shared/themes/` byte-identical (`git hash-object` on both
sides, verified before the commit was made), renamed `preview.html`->`index.html` and
`preview.*`->`studio.*`, then REPOINTED at this repo's canonical vectors.

**Ported and repointed 2026-08-06. Rendering NOT yet verified by a human.**

## What "repointed" means, and why the copy alone was not enough

`studio.core.js` used to fetch the four grids and `_objects.json` **page-relative** -
`base = location.pathname` minus the filename. That worked in `shared/themes/` for one
reason only: the Studio happened to sit in the same folder as the data. Moving it breaks
that coupling, and **it breaks it silently**, because each fetch is written
`r.ok ? r.text() : null` - a 404 resolves rather than throwing, so the `if(changed)`
refresh simply never ran and the trailing `.catch(function(){})` had nothing to catch.

The Studio would have rendered perfectly, off its ~27KB embedded snapshot, with no
banner and no console error. And that snapshot mirrors the OLD ClickUp_apps tables
(`colors.tsv` 5,710 B) while this repo's canonical table is 7,777 B.

> **Byte-identical is not the same as canonical.** The acceptance test for the vector
> space would have been proving a superseded copy of it, from inside the canonical repo,
> and it would have looked completely fine while doing it.

Now: grids come from `../vectors/`, objects from `../vocabulary/`, and the page states
which source it is showing in a footer badge - **green** for canonical, **red** for
snapshot. A Studio that cannot tell you which table it just proved is not an acceptance
test.

## What is verified, and what is not

**Verified at HEAD on this branch:** all eight files copied byte-identical (hash-object
both sides) - the five grid fetches now read `GRIDS+`/`OBJECTS+` - `index.html`'s four
footer links point at `maw-themes` - both foot stamps read `maw-themes/studio` - and the
script's own assertion that no page-relative grid fetch survives anywhere in
`studio.core.js` passed.

**NOT verified: that any of it renders.** Nobody has opened the page. The acceptance test
is `OBJECT-COVERAGE.md`: all 42 canonical objects render from token roles alone, with no
token falling back, **and the badge reads green**. Until that has been SEEN, the Studio
is repointed, not proven.

## Known issues, flagged rather than fixed

**`studio.core.js` line 1 still says `shared/themes/preview.core.js`.** Cosmetic doc rot
from the rename, deliberately not corrected: the transfer's whole guarantee is that these
files arrive byte-identical and are then changed only by asserted anchors. Hand-editing an
18KB file to fix a comment would trade a real guarantee for a cosmetic one. Fix it in a
deliberate pass, not in the port.

**`studio.data.js` is on borrowed time.** A hand-synced snapshot of the four grids;
`THEME-SYSTEM.md` instructs updating it by hand whenever a grid changes - a
mandatory-manual-sync instruction, which is the definition of a surface that will drift.
It already has. It is now a genuine first-paint fallback rather than the source, and it
announces itself when it is what you are seeing. **Delete it the moment the generator
emits `dist/themes.json`.**

**Pages must be enabled on this repo** (Settings -> Pages -> deploy from `main`, root) or
`/studio/` serves nothing. `.nojekyll` is already committed.

## After this merges

1. Enable Pages if it is not on.
2. Open `/studio/`. Confirm 42/42 and a green badge.
3. Delete `port-remaining.sh` and `.github/workflows/port-remaining.yml`. They are
   one-time tools, and safe-to-re-run is not the same as safe to leave lying around.
4. `MIGRATION-STATUS.md` needs a structural pass - its "Landed, byte-verified" table is
   stale on three of four vector rows.
