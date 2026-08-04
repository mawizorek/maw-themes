# DOCUMENT Objects — the third family

**Status: PROPOSED family, ratified in chat by Michael 2026-08-04** (*"expand the library where we need it, put things into the canonical, and let's reference them by the renderer"*). The rows below are the contract. The machine-readable rows land in `_objects.json` **after the port**, because that file has not arrived in this repo yet.

---

## Why a third family, and why this is not a shortfall

[`OBJECT-COVERAGE.md`](./OBJECT-COVERAGE.md) defines 42 canonical objects in two families:

- **DISPLAY** — shells, nav, type, buttons, fields, data rows/tiles/badges, viewer objects.
- **INPUT + FEEDBACK** — dropzones, steppers, toggles, chips, banners, toasts.

Both are **application widget** families. They describe a thing a person clicks in a tool.

`mawizorek/doc-render-engine` renders **documents**: MkDocs sites built from markdown and TSV, published to Pages, read far more often on a phone than at a desk. Its objects are page types, inline markers, admonition blocks and data sheets. **Not one of the 42 is a document object, and not one of the renderer's objects is among the 42.** The overlap is zero.

**So the renderer is not asking for more of what we have. It is asking for a family we never built** — which is a better problem to have, because the two sets do not compete for names, numbers or token roles.

### The rule this closes

`OBJECT-COVERAGE.md` already ruled on exactly this situation, twice. Both rulings are being honoured here rather than reinvented:

> **"The set is the shared design vocabulary, not a ceiling.** If a design genuinely needs an object that isn't here, add it — that is a normal, welcome move. The only rule is: add it AND document it, in the same pass."

> **"If a new object needs a token role that doesn't exist yet, that's a design-system decision — raise it, don't silently invent a one-off token."**

⭐ **The renderer silently invented a token.** `dead` — a reference to a page nobody has written yet — lives only in the renderer's private nine-token stand-in table. It is a *good* token, and it was invented in the dark precisely because there was no third family and no forum to raise it in. **That is the failure this file exists to end, and it is the argument for graduating the library rather than merely copying it.** See [`document-tokens.tsv`](./document-tokens.tsv).

---

## What a DOCUMENT object is

Same contract as the other two families. No exceptions carved:

1. It styles **from token roles only** — `var(--accent)`, `var(--surface-2)`, `var(--font-mono)`. Never a hard-coded colour. Every theme reskins it for free.
2. It is **countable**. The renderer's build report already groups markers by class; a document object that cannot appear in a report is a highlighter, not an object.
3. It renders in the **Studio**, so a theme that breaks it fails coverage. *A theme is only real if it can dress the whole object system.*
4. Themes never add states. They reskin the states that exist.

### One difference from the other families, stated now rather than discovered later

**A DOCUMENT object has no hover, no focus and no pressed state** — most of them are not interactive, and the ones that are belong to MkDocs Material, not to us. The state matrix for this family is *epistemic*: confirmed vs unconfirmed, written vs unwritten, sealed vs revealed. That is a genuinely different axis from the DISPLAY and INPUT families, and it is the reason these could never have been folded into either.

---

## The objects

Numbered from 43 in append order, per the existing convention (*"numbered in append order to avoid renumbering the existing set"*). **Prefixes are reused from the canonical vocabulary deliberately — no new prefix is introduced**, because a prefix is an identifier that binds to a real parse, and `cnt_` / `nav_` / `tx_` / `data_` already mean the right things.

**Every row is grounded in something the renderer ships today.** Nothing here is speculative decoration; the Evidence column says where it lives.

| # | Object | Group | States | Primary tokens | Evidence |
|---|--------|-------|--------|----------------|----------|
| 43 | `cnt_doc_page` | Doc shells | base | bg, text, font-body | the rendered page canvas |
| 44 | `nav_doc_tree` | Doc nav | current / ancestor / idle | surface-1, border, accent, text-soft | Material primary nav + our accent position indicator |
| 45 | `nav_doc_sealed` | Doc nav | sealed / revealed | text-faint, border, accent | routed section collapsed to its index (DL J16 / J19) |
| 46 | `cnt_doc_curtain` | Doc shells | checking / open | surface-2, accent, on-accent, text-soft | the router gate before content (DL J17) |
| 47 | `tx_mark_confidence` | Markers | box | **warn**, text | `marker-classes.tsv` row 1 — how much to trust the value beside it |
| 48 | `tx_mark_terminology` | Markers | plain | **accent-soft**, text | `marker-classes.tsv` row 2 — a defined term |
| 49 | `tx_term_link` | Markers | live / broken | **accent-soft** (underlined), **dead** (broken) | `.dr-term`, DL J15 |
| 50 | `tx_dead_ref` | Markers | base | **dead** | a reference to a page not yet written. ⚠️ **the object that needs the new token** |
| 51 | `cnt_admonition` | Doc blocks | open / collapsed | surface-2, border, class colour, accent | ⚠️ **PENDING** — vocabulary unruled, see doc-render-engine Q13 + Q14 |
| 52 | `data_sheet` | Doc data | flat / sectioned | surface-2, border, font-mono, accent (section band), data-1..4 | `!!! data` TSV tables, PR #54 / #55 |
| 53 | `data_sheet_detail` | Doc data | collapsed / expanded | surface-1, text-soft, font-mono | mobile row detail, container-queried, PR #55 |

**Eleven objects. The canonical total becomes 53** — *once rows 43–53 exist in `_objects.json`, and not before.* The count of record is `_objects.json`, this document and the Studio snapshot **in lockstep**, exactly as the two existing families require. 🚫 **Until the port lands, this file is a contract and the count is 42. Do not quote 53 anywhere as a live number.**

### Two rows carry warnings that must not be lost

- **51 `cnt_admonition` is deliberately unfinished.** doc-render-engine DL J20 measured it: `!!!` blocks are defined **NOWHERE** — two lines in `mkdocs.yml` turn the syntax on and that is the entire vocabulary. No table, no class, no default, and the engine already emits hardcoded admonition strings from Python with nothing behind them. **Q14 (where blocks get defined) and Q13 (what a block does by default) are open on that log.** This row binds the object to the family; it does not pre-decide those questions, and it must not be built against until they are answered.
- **50 `tx_dead_ref` cannot render correctly until `dead` is authored.** Nineteen hex values, Michael's to author, not machine-derivable. Until then it falls back and reports once — the honest behaviour the renderer already implements for an unknown token.

---

## Adding a DOCUMENT object

Identical to the existing procedure, and **pointed at rather than copied**: [`OBJECT-COVERAGE.md` → *Adding a new object*](./OBJECT-COVERAGE.md) is the steps. Two additions specific to this family:

5. **A marker or block family is a ROW, not a file.** `markers.tsv` and `marker-classes.tsv` in the renderer are the authoring surface; adding a family is a data edit and must stay one. Never a code change, never a CSS change.
6. **Name the colour in exactly ONE cell.** This is a live, load-bearing promise (maw-themes DL J11): the `terminology` class names `accent-soft` in one cell of one TSV row, so swapping it to `accent-2` later is a data edit touching no code anywhere. **The instant a second surface hardcodes that token, the promise is dead and the swap becomes a hunt.** If an indirection like `--dr-term-color` is ever introduced, it must be GENERATED from that cell, never authored.

---

## What this family unblocks, and why it is the point

The renderer, the ClickUp HTML apps and the FileMaker builds have been defining the same colours three times. `_index.json` states the ambition already — *"One vocabulary, one source of truth. Change a theme file once and every consumer that references its slug reskins."* — and it was true for two consumers out of three.

**With this family and the token bridge in place, the chain closes.** The colour a `{.tbc}` marker paints in a rendered document, the colour a warning banner paints in a ClickUp app, and the colour a FileMaker layout paints in a native solution become **the same cell in the same table**, resolved three ways by three generators.

That is the whole reason the theme library is being graduated out of an app repo and into one everybody can share.
