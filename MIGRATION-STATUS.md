# Migration Status

**Source:** `mawizorek/ClickUp_apps` → `shared/themes/` · **Target:** this repo
**Opened:** 2026-08-03 · **Last updated:** 2026-08-04

Nothing in `ClickUp_apps` has been deleted or modified. This migration is
**copy → verify → tombstone**, in that order. `shared/themes/` stays authoritative until this repo
can prove it renders.

Decisions live in the **maw-themes (repo) Decision Log** in ClickUp, never in this repo — a
decision log needs a clickable checkbox, so a repo file cannot be one.

---

## ▶️ NEXT ACTION: dispatch the `port-remaining` workflow

Everything still outstanding is blocked on ONE thing, and it is not a decision. It is a
**transfer path** — and as of 2026-08-04 it has a machine to run on.

**Actions → `port-remaining` → Run workflow → type `PORT` → Run.**

⚠️ **The workflow must be on `main` before it appears in the Actions tab.** Merge this branch
first; `workflow_dispatch` only lists workflows present on the default branch.

It runs `port-remaining.sh` **verbatim** — no reimplementation, because two implementations of one
transfer is strictly worse than one. The script clones both repos, copies the last eight files,
proves each one byte-identical with `git hash-object` on both sides, repoints the Studio's asset
tags, runs the contrast gate, pushes a branch and opens a PR. **It refuses to push if a single hash
mismatches**, so a PR existing at all is the verification.

⭐ **Why this was stuck for sixteen hours on nothing.** The script was written, reviewed and
committed at 07:15Z and then never run, because running it needs git, python3 and network access on
the same machine at the same time. An agent sandbox has the first two and not the third, and nobody
noticed that the blocker had stopped being a decision and become a *venue*. **A task blocked on
"somebody run this" reads exactly like a task blocked on a ruling, right up until you ask which one
it is.**

**Delete both `port-remaining.sh` and `.github/workflows/port-remaining.yml` once it has
succeeded.** They are one-time tools, not infrastructure. Safe to re-run is not the same as safe to
leave lying around.

---

## ✅ Landed, byte-verified

Every file below came back from GitHub with a blob SHA **identical to its source file's SHA** — a
content-addressed proof of a byte-perfect copy, not an eyeball check.

| Landed at | Bytes | SHA |
|---|---|---|
| `vectors/colors.tsv` | 5,710 | `4f391aa` ✅ |
| `vectors/typography.tsv` | 1,148 | `cbf0c9e` ✅ |
| `vectors/forms.tsv` | 1,322 | `9433b6a` ✅ |
| `vectors/spacing.tsv` | 256 | `a355d55` ✅ |
| `registry/_index.json` | 7,111 | `f88f54b` ✅ |
| `registry/_themes.json` | 7,002 | `09e429b` ✅ |
| `registry/_base.json` | 1,312 | `31c055d` ✅ |
| `registry/_template.json` | 2,226 | `03842fc` ✅ |
| `vocabulary/OBJECT-COVERAGE.md` | 10,409 | `30651fe` ✅ |
| `docs/THEME-SYSTEM.md` | 7,591 | `f99f5fc` ✅ |
| `engine/build-themes.mjs` | 3,652 | `c601bf9` ⛔ ported for provenance, DO NOT RUN — see `engine/README.md` |

## ✅ The contrast gate (authored 2026-08-04, PR #1)

| File | What |
|---|---|
| `engine/contrastcheck.py` | WCAG 2.x contrast gate. Maths in the hook. |
| `engine/contrast-budget.tsv` | Thresholds + waivers as DATA, with a note column so every waiver shows in a diff. |
| `engine/contrast-baseline.md` | The stamped 2026-08-04 run. **631 comparisons · 139 waived · 17 unwaived.** |

Shape lifted from the size gate already proven in `maw-agents/uritp-docs`, deliberately rather than
invented. **It has been RUN, not just written**, against a table whose git blob SHA was verified
identical to `colors.tsv` first.

⚠️ **It exits 1 today.** Run non-blocking in CI until the 17 clear, then flip to blocking. *A gate
that has always been red is a gate nobody reads.*

## ✅ The DOCUMENT family + the token bridge (authored 2026-08-04)

| File | What |
|---|---|
| `vocabulary/DOCUMENT-OBJECTS.md` | The third object family (43–53), contract form. Rows land in `_objects.json` after the port. |
| `vocabulary/document-tokens.tsv` | The renderer's ten colour tokens mapped onto canonical roles, as DATA. Nine aliases, one net-new. |

See **D11** below. ⚠️ **The canonical object count is still 42** and stays 42 until `_objects.json`
carries rows 43–53. A contract is not a count.

---

## ⏳ Outstanding — 8 files, all on the script

| Source | Bytes | Destination |
|---|---|---|
| `resolve.js` | 18,658 | `engine/resolve.js` |
| `_objects.json` | 23,415 | `vocabulary/_objects.json` |
| `preview.html` | 9,848 | `studio/index.html` |
| `preview.css` | 26,322 | `studio/studio.css` |
| `preview.objects.css` | 17,231 | `studio/studio.objects.css` |
| `preview.core.js` | 16,260 | `studio/studio.core.js` |
| `preview.data.js` | 27,419 | `studio/studio.data.js` ⚠️ see reversal below |
| `FILEMAKER-CAPABILITIES.md` | 9,981 | `docs/FILEMAKER-CAPABILITIES.md` |

⭐ **Why a script and not an agent — the finding worth keeping.** Transcribing a file through an
agent's output is **not a byte-safe transfer path.** It held for `colors.tsv` (5.7KB, SHA-verified)
and for the eleven scaffold files. `resolve.js` was attempted on 2026-08-04, abandoned at **3,270 of
18,658 bytes**, and discarded rather than half-committed — it is the live engine every consumer
calls. The repo's own rule (*never rewrite a file from a read you cannot prove is whole*) applies to
the **write** side too. `git checkout` + `cp` cannot mis-transcribe.

⚠️ **Do NOT route these through the raw branch URL** — it is cache-unreliable and flattens markup,
and `_objects.json` + `preview.css` are exactly the files that would corrupt silently.

### ⚠️ REVERSED: `preview.data.js` IS ported after all

This file previously called it do-not-port: a ~27KB hand-synced mirror of the four grids that the
generator deletes. That reasoning is still correct **and the call was still wrong**, because
`THEME-SYSTEM.md` makes it the Studio's first-paint snapshot — **without it the Studio cannot paint,
and a Studio that cannot paint proves nothing.** The Studio is the acceptance test; shipping it
doomed is worse than shipping it with a file marked for deletion. It lands as
`studio/studio.data.js` with `studio/PORTED.md` recording its expiry. **Delete it the moment the
generator emits `dist/themes.json`.**

## 🚫 Deliberately NOT ported

- **`themes.css`** (10,725 B) — GENERATED. Regenerated into `dist/`, never copied. ⚠️ Also **stale
  since 2026-07-16 and nothing noticed** — the argument for running the generator in CI. *A
  generated artifact regenerated by hand is a hand-maintained artifact.*
- **`decision-log.md`** (21,295 B) — a decision log is a ClickUp doc page, never a repo file (LOCKED
  2026-07-26). Content becomes DL entries; the repo keeps a pointer. ⚠️ Its own header evangelises
  the opposite convention, so it is an active trap, not merely misfiled.
- **`_template.json`** — already `Status: superseded` in that log. Under hex-canonical a theme is a ROW.
- **`README.md`** (8,672 B) — superseded, and carries the D3 object-count rot.
- **`feelings/`** — retired vector, dead since the 4-vector rework.

---

## 🎨 The Studio ships INSIDE this repo (ruled 2026-08-03, Michael)

`OBJECT-COVERAGE.md` defines the Studio as the theme acceptance test — *a theme is only real if it
can style all 42 canonical objects.* A proof surface living in a different repo from the data it
proves goes stale the instant either side moves, and Pages will serve a stale studio against a fresh
table with no error anywhere.

⚠️ **Byte-identical is not the same as working.** After the workflow runs, someone must OPEN
`studio/index.html` and confirm 42/42. Until that has been seen, the Studio is ported, not proven.

---

## Findings

### D1 — `carbon` and `eos`: real, but SMALLER than first recorded

Both are rows in all four grids and both are referenced by `status: "locked"` entries in
`registry/_themes.json`. Neither is in `registry/_index.json`; neither has a per-theme JSON.
⚠️ **DOWNGRADED:** `resolve.js` reads **only the TSVs**, never a per-colour JSON — so both **work at
runtime today.** D1 is a stale *static* artifact (`themes.css`, the Studio menu, the generator), not
a broken theme. Corollary: the per-theme JSONs are PROJECTIONS.

### D2 — one stale list, not a three-way disagreement

36 columns = 3 metadata + **18 base** + **11 alt** + **4 data** = 33 tokens.
`OBJECT-COVERAGE.md`'s *"Color (22)"* = 18 + 4 and is **correct** (the per-mode contract).
`_index.json` → `tokenKeys` = **17**, short by exactly five: `accent-deep`, `data-1..4`.
`build-themes.mjs` → `KEYS` hardcodes the same stale 17. **Two hand-typed copies of one wrong list.**
**Fix: derive it from the TSV header row.**

⚠️ **Deliberately not hand-patched on 2026-08-04**, when a renderer role map wanted to land beside
`fmpRoleMap` in the same file. Correcting 17 → 33 by hand buys a right number and keeps the wrong
mechanism, and this repo's own definition of done says D1 and D2 go *structurally*. **One pass
touches the registry.** The role map waits in `vocabulary/document-tokens.tsv` until that pass.

### D3 — the source README rotted on the object count

Says *"20 canonical FileMaker objects"* in four places; the real count is **42**. ⚠️ **Root cause:**
the theming decision log's newest entry is 2026-07-17 and describes a **two-axis** Color × Feeling
system. The 4-vector split and the 20→39→42 expansion were **never logged**, so 20 was the last
number any record carried.

### D4 — two colour spaces: RULED hex, and the risk was OVERSTATED

**Michael ruled hex canonical, 2026-08-03.** ⚠️ **CORRECTED:** this file once called deleting the
OKLCH JSONs *"the single highest-risk item."* It is not — the 2026-07-17 entry declares them, plus
`themes.css` and `build-themes.mjs`, **SUPERSEDED**, *"retire in a dedicated cleanup."* Retired
legacy awaiting a cleanup that never happened, and the hex was converted FROM them. Still
**archived, not deleted** (hex→OKLCH does not round-trip) — as caution, not rescue.
**And `resolve.js` line 1 already said `HEX IS CANONICAL`.** The ruling ratifies the engine.

⚠️ **The renderer authors in OKLCH.** That is not a conflict — it converts one way at build time and
stores nothing back. Recorded in `vocabulary/document-tokens.tsv` so the refit does not reopen it.

### D5 — brand + semantics get authored PER MODE (ruled 2026-08-03)

The 11-column alt band re-specifies ground and text only; `accent`, `accent-deep`, `accent-2` and
the four semantics are **shared across modes** — a deliberate 2026-07-17 design (`resolve.js`
header) that produces measured illegibility. **Ruled: same HUE, re-authored lightness per mode.**
A **reversal of a documented decision**, recorded as such so nobody "restores" the old behaviour on
finding the 07-17 text. Cost: **~198 hex values**, Michael's to author. Not machine-derivable —
auto-darkening by formula is the transform that produced the four-teams-one-red collision.

### D6 — ⭐ the table has NEVER been verified, by its own admission

> *"the 15 hex values were **CONVERTED from the prior OKLCH tokens BY HAND** and should be
> spot-checked before any theme is treated as final… The `accent-deep` stops are **first-pass darker
> values, meant to be eyeballed/tuned per color.**"* — theming decision log, 2026-07-17

Nineteen rows shipped. One was spot-checked. **Every contrast defect found since is a direct
consequence.** The gate closes this.

### D7 — 🔴 `on-accent/accent` fails on SEVEN themes, live, today

The label on an accent fill — the most-clicked text we ship — misses 4.5:1 on `alpine` (2.98),
`aston-martin` (3.20), `paddock` (3.39), `eos` (3.82), `ferrari` (3.91), `williams` (4.20) and
`papyrus` (4.48). **No toggle involved; each theme's own declared mode.** `paddock` is the
`f1-racetracks` identity and `eos` is the lighting-tools identity. **A larger live defect than the
entire `alt-*` story** — that needs someone to call `setMode()` (two callers repo-wide); this paints
every primary button.

### D8 — 🔴 the 4 data slots fail NATIVELY on every light theme

`#4f9fe0 #e07bad #46c48a #e0a84f`, **byte-identical in all 19 rows**, chosen against dark grounds.
1.7–2.7:1 on light canvases **in that theme's own mode**; `default-theme` worst at **1.13:1**.
Documented as *"shared across light/dark"* — a design position that measurably fails. **Unruled:**
per-theme slots, a light/dark data pair, or charts carry their own rules.

⚠️ **Now has a second waiting consumer.** The renderer's TSV tables gained column TYPES on
2026-08-04 (`id`/`num`/`money`/`text`/`prose`) and have nothing to colour them with. **Do not wire
the renderer to `data-1..4` before D8 is ruled** — it would ship the defect to a new surface.

### D9 — 🔴 `default-theme` fails six pairs in its own mode

The theme **every new app points at** and the standing `ultimateFallback`. Its 2026-07-16 entry says
it was tuned FOR higher contrast than the slick dark themes; it measures lower. **Either the intent
or the values are wrong.** A zero-chroma canvas at L≈0.62 has very little room above or below it,
which may be the real finding.

### D10 — tag-pinning is not achievable over GitHub Pages

The locked rule is *pin by TAG, never by branch.* **Pages serves a branch and cannot serve a tag.**
jsDelivr serves gh tags:
`https://cdn.jsdelivr.net/gh/mawizorek/maw-themes@v1.0.0/dist/themes.css`
Pages stays for the Studio, where always-latest is correct for a proof surface. **Settle before the
first consumer wires up.**

### D11 — ⭐ the renderer needs a THIRD object family and exactly ONE new token

**Ratified by Michael in chat, 2026-08-04.** Asked whether `doc-render-engine` was requesting more
than the library holds, the answer split, and the split is the finding:

**Colour — canonical is a near-superset.** Nine of the renderer's ten tokens are canonical roles
under different names (`surface`→`bg`, `surface-raised`→`surface-2`, `ink`→`text`,
`ink-muted`→`text-soft`, `rule`→`border`, `danger`→`bad`, `ok`→`good`, plus `accent` and `warn`
direct). **Exactly one is net-new: `dead`** — a reference to a page not yet written, deliberately
*not* `danger`, because shared with danger it read as an alarm on a list where most items were
simply unwritten. NOT-YET-WRITTEN is not FAILED, and canonical has no slot for it.

**Objects — a total gap, not a shortfall.** All 42 canonical objects are app widgets in two
families. The renderer's are DOCUMENT objects: page types, markers, admonition blocks, data sheets.
**Zero overlap in either direction.** So this is a missing family, which is the better problem: the
sets do not compete for names, numbers or token roles.

⭐ **`OBJECT-COVERAGE.md` pre-answered the governance and caught its own violation.** It says *"the
set is the shared design vocabulary, not a ceiling"* and *"if a new object needs a token role that
doesn't exist yet, that's a design-system decision — raise it, don't silently invent a one-off
token."* **The renderer silently invented `dead`** — and it did so because there was no third family
and no forum to raise it in. **The rule was not ignored; the venue did not exist.** That is the
strongest argument yet for graduating this library out of an app repo rather than merely copying
it, and it generalises: *a rule with no place to be obeyed gets broken by people who agree with it.*

⚠️ **`dead` is NOT authored and must not be bolted on as a half-filled column.** Nineteen hex
values, Michael's, and the wide shape is being retired toward one-row-per-mode. **Author it in the
same pass as D5's ~198 values.** Until then the renderer keeps its local value and reports honestly.

---

## Definition of done

1. ~~The last eight files landed byte-verified~~ → dispatch the `port-remaining` workflow, then
   confirm the PR.
2. **Someone opens `studio/index.html` and sees 42/42 objects render.** Ported ≠ proven.
3. D6/D7/D9 fixed or waived with reasons; gate green and flipped to blocking in CI.
4. `build-themes.mjs` inverted → `vectors/*.tsv` the only authored surface, `dist/` fully generated,
   `tokenKeys` derived from the header. **Invert against today's 36-column shape first** and
   byte-match the current `themes.css` as a free regression test.
5. D1 and D2 gone structurally, not hand-patched. **`document-tokens.tsv` folds into the registry's
   role-map mechanism in this same pass and retires to a stub.**
6. **D11 landed:** `dead` authored across all rows, DOCUMENT objects 43–53 in `_objects.json` and in
   the Studio snapshot, `OBJECT-COVERAGE.md`'s count updated in the same pass — all three surfaces
   in lockstep, as that file requires.
7. The generator emits a renderer-shaped export and `doc-render-engine/theme/colors.tsv` is deleted.
   **That table is the migration's actual finish line** — until it is gone, the same colours are
   still defined twice.
8. `v1.0.0` tagged; consumers cut over to a tagged jsDelivr path.
9. Only then: `ClickUp_apps@shared/themes/` → tombstone stub.

**Until every one of those is true, `shared/themes/` remains the source of truth and nothing should
consume this repo.**
