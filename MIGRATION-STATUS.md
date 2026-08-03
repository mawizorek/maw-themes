# Migration Status

**Source:** `mawizorek/ClickUp_apps` → `shared/themes/` (30 files, ~250KB)
**Target:** this repo
**Opened:** 2026-08-03 · **Scaffold PR:** `scaffold-v1`

Nothing in `ClickUp_apps` has been deleted or modified. This migration is **copy-then-verify-then-tombstone**, in that order. `shared/themes/` stays authoritative until this repo can prove it renders.

---

## ✅ Landed, byte-verified

Every file below was written from a blob-API read pinned to source commit `eae28c45`, and **every one came back from GitHub with a blob SHA identical to its source file's SHA.** That is a content-addressed proof of a byte-perfect copy, not an eyeball check.

| Landed at | From | Bytes | SHA verified |
|---|---|---|---|
| `vectors/colors.tsv` | `colors.tsv` | 5,710 | `4f391aa` ✅ |
| `vectors/typography.tsv` | `typography.tsv` | 1,148 | `cbf0c9e` ✅ |
| `vectors/forms.tsv` | `forms.tsv` | 1,322 | `9433b6a` ✅ |
| `vectors/spacing.tsv` | `spacing.tsv` | 256 | `a355d55` ✅ |
| `registry/_index.json` | `_index.json` | 7,111 | `f88f54b` ✅ |
| `registry/_themes.json` | `_themes.json` | 7,002 | `09e429b` ✅ |
| `registry/_base.json` | `_base.json` | 1,312 | `31c055d` ✅ |
| `registry/_template.json` | `_template.json` | 2,226 | `03842fc` ✅ |
| `vocabulary/OBJECT-COVERAGE.md` | `OBJECT-COVERAGE.md` | 10,409 | `30651fe` ✅ |
| `docs/THEME-SYSTEM.md` | `THEME-SYSTEM.md` | 7,591 | `f99f5fc` ✅ |
| `engine/build-themes.mjs` | `build-themes.mjs` | 3,652 | `c601bf9` ✅ |

Plus authored-new: `README.md`, this file, `CHANGELOG.md`, `.nojekyll`, `engine/README.md`, `studio/README.md`.

---

## ⛔ NOT landed — blocked by the read cap

The blob API base64-encodes, inflating 4/3 against a ~30KB return cap. **Anything over ~22KB on disk cannot be read back whole.** House rule: *never rewrite a file from a truncated read.* These four were not attempted, rather than half-copied:

| File | Bytes | Destination | Why blocked |
|---|---|---|---|
| `_objects.json` | 23,415 | `vocabulary/_objects.json` | 23.4KB → ~31KB base64. Over cap. |
| `preview.data.js` | 27,419 | `studio/studio.data.js` | 27.4KB → ~37KB base64. Well over. |
| `preview.css` | 26,322 | `studio/studio.css` | 26.3KB → ~35KB base64. Well over. |
| `decision-log.md` | 21,295 | `docs/decision-log.md` | 21.3KB → ~28KB. Inside the cap but on the edge; not worth risking a silent clip on the one file that holds the reasoning. |

**Transfer path:** GitHub web UI upload, or a local `git clone` + `cp` + push. Both are byte-safe. Do NOT route these through the raw branch URL — it is cache-unreliable and flattens markup, and `_objects.json` + `preview.css` are exactly the files that would corrupt silently.

## 🕐 NOT landed — readable, simply not carried this pass

No blocker. Next scaffold pass picks these up.

| File | Bytes | Destination |
|---|---|---|
| `resolve.js` | 18,658 | `engine/resolve.js` |
| `preview.objects.css` | 17,231 | `studio/studio.objects.css` |
| `preview.core.js` | 16,260 | `studio/studio.core.js` |
| `preview.html` | 9,848 | `studio/index.html` |
| `FILEMAKER-CAPABILITIES.md` | 9,981 | `docs/FILEMAKER-CAPABILITIES.md` |

## 🚫 Deliberately NOT ported

- **`themes.css`** (10,725 B) — GENERATED. It gets regenerated into `dist/`, never copied. Copying a generated artifact is how you get a second source of truth.
- **`feelings/`** — retired vector. Dead since the 4-vector rework.

---

## 🔴 The four findings (all pre-existing; none introduced by this migration)

### D1 — two LOCKED themes point at color entities the build cannot see

`registry/_themes.json` declares `sharp-carbon` (color `carbon`) and `eos` (color `eos`), both **status: locked**. Both color entities exist in `vectors/colors.tsv`. **Neither is registered in `registry/_index.json`, and neither has a per-theme JSON file.** `build-themes.mjs` walks `_index.json`, so neither ever reaches `themes.css` or the Studio menu.

Not a menu cosmetic — a broken reference in a locked theme.

### D2 — three surfaces disagree on the color contract

| Surface | Says |
|---|---|
| `registry/_index.json` → `tokenKeys` | **17** keys |
| `engine/build-themes.mjs` → `KEYS` | **17** keys (hardcoded again, second copy) |
| `vocabulary/OBJECT-COVERAGE.md` | "Color (**22**)" |
| `vectors/colors.tsv` header | **36** columns |

`accent-deep` and `data-1..4` are live in the TSV and consumed by real objects, and absent from both 17-key lists. The generator would flag them as `extra keys`. (The handoff said 35 columns; the header is **36** — counted, not assumed.)

### D3 — the source README rotted on the object count

`shared/themes/README.md` says "all 20 canonical FileMaker objects" in four places. `OBJECT-COVERAGE.md` says **42** (20→39 on 07-18, 39→42 on 07-19). The README never got the pass. **Not ported forward** — this repo's `README.md` is authored fresh and says 42.

### D4 — the two layers are in DIFFERENT COLOR SPACES ⚠️ read before deleting anything

This one was found while writing this file, and it changes the plan.

- **`colors.tsv` is HEX.** `#2a2d33`, `#eef0f3`, every cell.
- **The per-theme JSON files are OKLCH.** `_base.json` and `_template.json` prove the shape: `oklch(0.20 0.010 260)`. The source README instructs "fill it in… **all 17 tokens in OKLCH**."

So the TSV layer and the JSON layer are **not the same values in different containers.** They are two different authored datasets in two different color spaces, and the 17 per-theme JSON files (6 at root + 11 in `f1/`) hold OKLCH values **that exist nowhere else.**

**Consequences:**

1. **Do not delete `shared/themes/` until those 17 files are preserved.** Tombstoning it now destroys the OKLCH source. This is the single highest-risk item in the migration.
2. **"Generate the per-theme JSON from the TSV" is not a lossless refactor.** It is a decision to make hex canonical and either drop or machine-convert the OKLCH. Hex→OKLCH round-trips are lossy at the edges and OKLCH is the wider gamut — converting the wrong direction quietly flattens color.
3. **The open question for Michael:** which space is canonical? He edits the TSV (hex) in a swatch UI and called it the canonical vector space. The docs say author in OKLCH. Both cannot be true, and this is why the two layers drifted apart in the first place — D1 is the symptom, D4 is the disease.

---

## Definition of done

1. All remaining files landed (byte-verified).
2. D4 ruled on: hex or OKLCH is canonical.
3. `build-themes.mjs` inverted → `vectors/*.tsv` is the only authored surface, `dist/` fully generated.
4. D1 and D2 gone structurally, not hand-patched.
5. Studio renders 42/42 objects against every theme in the registry — **the acceptance test, and the gate for tagging `v1.0.0`.**
6. Consumers cut over to a tagged jsDelivr path.
7. Only then: `shared/themes/` → tombstone stub.
