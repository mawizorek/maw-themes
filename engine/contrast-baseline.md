# Contrast Baseline — 2026-08-04

**The first time `vectors/colors.tsv` has ever been checked.** Run against the table at blob
`4f391aa4590036890131ea3819f5c805d703db5c` (verified byte-identical to
`mawizorek/ClickUp_apps@shared/themes/colors.tsv`).

```
contrastcheck -- 19 theme rows x 34 pairs = 631 comparisons
  skipped: 15 (no opposite-mode ramp)
  WAIVED (139)
  FAIL (17)
```

This is a **stamped snapshot, not the truth.** Re-run the gate; do not quote this file.

---

## Why a baseline exists at all

The theming decision log, 2026-07-17, in its own words:

> *"the 15 hex values were **CONVERTED from the prior OKLCH tokens BY HAND** and should be
> spot-checked before any theme is treated as final. `mclaren` (the reference) was converted most
> carefully… The `accent-deep` stops are **first-pass darker values, meant to be eyeballed/tuned
> per color.**"*

A verification obligation, opened 18 days ago, never closed. Nineteen rows shipped; one was
spot-checked. This file is that obligation being closed with arithmetic.

---

## 🔴 The 17 unwaived failures — every one of these is NEW

None of these were known before this run. None involve a mode toggle. **All are live right now,
in each theme's own declared mode.**

### The pattern that matters: `on-accent/accent` fails on SEVEN themes

That pair is the label sitting on an accent fill — **the most-clicked text in any app we ship.**
It needs 4.5:1 because it is text.

| Theme | on-accent on accent | Ratio |
|---|---|---|
| `alpine` | `#fef1f5` on `#ff3d9e` | **2.98 : 1** |
| `aston-martin` | `#ecfaf6` on `#2e9d61` | **3.20 : 1** |
| `paddock` | `#fdf2f1` on `#f14442` | **3.39 : 1** |
| `eos` | `#ffffff` on `#e0459b` | **3.82 : 1** |
| `ferrari` | `#fcecea` on `#d83f38` | **3.91 : 1** |
| `williams` | `#fcfdfe` on `#4a7ac8` | **4.20 : 1** |
| `papyrus` | `#faf4e6` on `#97663a` | **4.48 : 1** |

⚠️ **`paddock` is the `f1-racetracks` app identity and `eos` is the lighting-tools identity.** Two
of the seven are shipped app themes, not spare palettes.

⚠️ `papyrus` at **4.48** misses by 0.02. It is still a fail and it is still listed: a threshold that
bends for near-misses is not a threshold. It is also the cheapest fix on this page.

### `default-theme` fails SIX pairs in its own mode

**This is the theme every new app points at by default,** and the standing `ultimateFallback`.

| Pair | Ratio | Needs |
|---|---|---|
| `text-soft/bg` `#3f3f3f` on `#8f8f8f` | 3.26 : 1 | 4.5 |
| `accent-2/bg` `#515151` on `#8f8f8f` | 2.45 : 1 | 3.0 |
| `info/bg` + `text-faint/bg` `#5b5b5b` on `#8f8f8f` | 2.10 : 1 | 3.0 / 3.0 |
| `warn/bg` `#656565` on `#8f8f8f` | 1.80 : 1 | 3.0 |
| `good/bg` `#757575` on `#8f8f8f` | 1.42 : 1 | 3.0 |

⚠️ **This one deserves an argument before a fix.** `default-theme` is deliberately an unskinned
grey placeholder — *"if it's still grey, it hasn't been themed yet"* — and its decision entry
(2026-07-16) says it was tuned FOR higher contrast than the slick dark themes. It measures lower.
**Either the intent or the values are wrong, and only Michael can say which.** A zero-chroma ramp
at `bg` L≈0.62 has very little room above and below it, which may be the real finding: a mid-grey
canvas cannot carry a full 18-token ramp at AA.

### Three genuine near-misses

| Theme | Pair | Ratio | Needs |
|---|---|---|---|
| `mclaren` | `alt text-soft/bg` `#2c8593` on `#faf6f1` | 4.00 : 1 | 4.5 |
| `papyrus` | `text-soft/surface-2` `#75604a` on `#e4d5bd` | 4.12 : 1 | 4.5 |
| `papyrus` | `text-faint/bg` `#9a8468` on `#f0e6d2` | 2.89 : 1 | 3.0 |
| `williams` | `accent-2/bg` `#52a0d8` on `#f6f7fa` | 2.66 : 1 | 3.0 |

---

## 🟡 The 139 waived — known, ruled, tracked, and each one deletable

**~115 are `cross`-scope**: a brand or semantic token with no opposite-mode variant, painted on a
flipped ground. This is the defect the per-mode authoring decision fixes. **Those budget rows get
DELETED when it lands, not re-waived** — the situation they describe becomes unrepresentable.

Worst of them, for scale: `paper-mono` `accent-deep` `#1f1f1f` on `alt-bg` `#1a1a1a` = **1.06 : 1**.
Black on black. `haas` `accent-2` = **1.22 : 1**. `red-bull` `accent` = **1.34 : 1**.

**24 are `data-*/bg` on the light themes, and these are NOT cross-scope — they fail natively.**
The four categorical slots (`#4f9fe0` `#e07bad` `#46c48a` `#e0a84f`) are **byte-identical in all 19
rows** and were chosen against dark grounds. On every light theme they are 1.7–2.7:1 **in that
theme's own mode, with no toggle involved.** `default-theme` is worst at **1.13 : 1**.

⚠️ **This is a separate open question and it is deliberately not folded into the per-mode work.**
The data slots are documented as *"shared across light/dark,"* which is a design position, not an
oversight — and it is a position that measurably fails. Options are per-theme slots, one light set
and one dark set, or accepting that charts carry their own contrast rules. **Unruled.**

---

## ⚙️ What was deliberately NOT checked, and why

**`border/bg` and `alt-border/bg` are not in the budget.** The first run included them at 3:1 and
**all 19 rows failed** (1.33–2.65:1). That was the threshold being wrong, not the table: WCAG 1.4.11
does not require contrast for decorative dividers, our `border` token is documented as serving
dividers *and* grid lines *and* field borders at once, and a blanket 3:1 would force harsh chrome on
every theme we own. A field's identifiability rides on its `field` fill, which **is** checked.

⭐ **Worth keeping: the gate's first output was 193 failures, and 96 of them were the gate's own
fault.** A check that fails everything teaches nothing and gets switched off. The reason is
recorded in the budget file itself so nobody re-adds the rows without reading it.

---

## Using it

```
python3 engine/contrastcheck.py
python3 engine/contrastcheck.py --verbose
```

Exit `0` = pass or all-waived · `1` = unwaived failure · `2` = bad input.

**Waiving:** add the slug to that pair's `waived` column **with a reason in `note`.** `*` waives
every row. Waivers show up in a diff on purpose — that is the whole design, lifted from the size
gate in `maw-agents/uritp-docs`: maths in the hook, thresholds in a TSV row with a note column.

⚠️ **It exits 1 today, so it cannot be a merge-blocking gate yet.** Run it non-blocking until the
17 are cleared or waived with reasons, then flip it to blocking. **A gate that has always been red
is a gate nobody reads.**

## What it does not do

It does not judge hue harmony. `accentBoardRule` — accent collisions ACROSS rows, judged in oklch,
written 2026-08-01 after four F1 teams landed within 1.1 hue degrees of each other — is a different
check and is **not implemented.** Worth building next; the two together would cover both failure
modes this table has actually produced.
