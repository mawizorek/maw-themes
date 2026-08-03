# engine/

## ⛔ `build-themes.mjs` — PORTED VERBATIM, DO NOT RUN YET

It was copied byte-for-byte out of `mawizorek/ClickUp_apps@shared/themes/` so provenance stays
provable (its blob SHA is identical to the source). It is **not wired for this repo** and it is
**not going to be**, because it is slated for inversion. Two reasons, in order of importance:

### 1. It resolves paths as siblings, and its siblings moved

`const DIR = dirname(fileURLToPath(import.meta.url))` then `join(DIR, '_index.json')` and
`join(DIR, t.file)`. In the old flat folder everything sat next to it. Here `_index.json` is in
`../registry/` and the per-theme JSON does not exist at all. Run it as-is and it throws on the
first read.

**We did not patch the paths.** Rewiring a script that is about to be rewritten is work thrown
away, and a half-fixed script is more dangerous than an obviously broken one — it runs, and then
you trust the output.

### 2. It reads the WRONG canonical surface, and that is the actual bug

This is the finding that justifies the whole migration.

`build-themes.mjs` walks `_index.json` → per-theme JSON files → emits `themes.css`. **It never
reads `colors.tsv`.** But `colors.tsv` is the grid Michael actually edits, in a swatch UI, and he
named it the canonical vector space.

So the authored surface is downstream of nothing, and the derived surface is canonical to the
build. That inversion is not a theoretical smell — it already produced two broken themes:

| Theme (in `registry/_themes.json`) | Status | Color entity it points at | In `colors.tsv`? | In `_index.json`? | Per-theme JSON? |
|---|---|---|---|---|---|
| `sharp-carbon` | **locked** | `carbon` | ✅ | ❌ | ❌ |
| `eos` | **locked** | `eos` | ✅ | ❌ | ❌ |

Two themes marked **locked** in the join table resolve to a color entity the build cannot see.
Michael added them where he works (the TSV) and the generator does not look there. Nothing warned,
because the generator only validates rows it already found.

### The fix (the one real architectural change in this migration)

**Invert it: `vectors/*.tsv` → `dist/themes/<slug>.json` → `dist/themes.css`.**

- One authored surface (the TSVs Michael edits). Everything downstream generated.
- Per-theme JSON stops being hand-authored, so it cannot fork from the table again.
- `tokenKeys` gets derived from the TSV header row instead of being a hardcoded 17-item array
  in two places (`_index.json` and `KEYS` in this file), which is what makes the current
  17-vs-22-vs-36 disagreement possible.
- The `carbon` / `eos` breakage disappears structurally rather than being hand-patched.

Until that lands, `dist/` stays empty and no consumer should point at this repo.
