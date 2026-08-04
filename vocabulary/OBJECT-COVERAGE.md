# Object Coverage Contract

**Every theme must be able to style all 42 canonical objects. That is the theme acceptance test.**

The set is the shared design vocabulary for FileMaker layouts and HTML artifacts: the constrained families that can appear in any layout. A theme isn't "done" until it renders all of them correctly from the theme tokens alone. `preview.html` is the live proof: pick a theme, every object below reskins from the token set; if one looks wrong or a token falls back, that theme fails coverage for that object.

**Single source of truth:** the machine-readable version is [`_objects.json`](./_objects.json). `preview.html` renders that file dynamically (with `preview.data.js` as the first-paint snapshot), and this document is its human-readable contract. **The count must stay identical across all three** (this doc, `_objects.json`, and the snapshot in `preview.data.js`). If you change the set, change it in all three in the same pass.

## Two families

The set splits into two families by role:

- **DISPLAY** — what a viewer/dashboard shows: shells, nav, type, buttons, fields, data rows/tiles/badges, and the viewer/data-viz objects. Covers apps like f1-racetracks and the app-dashboard.
- **INPUT + FEEDBACK** — the tool vocabulary: how you get data IN and how the tool talks back. Covers the apps you build inside — report-normalizer, budget-code-mapper, prism.

## Why this exists

A theme is only real if it can dress the whole object system, not just a hero button. Tying themes to the canonical set guarantees two things: every object has a defined style in every theme, and every theme is forced to define the full token set the objects consume. When Michael builds these natively in FileMaker, each object maps to the same token roles, so the render and the native solution agree.

## Tokens the objects consume

- **Color (22):** bg, surface-1/2/3, border, field, text, text-soft, text-faint, accent, accent-deep, accent-2, accent-soft, on-accent, good, warn, bad, info, **data-1..4** (categorical chart/series slots; shared across light/dark).
- **Typography (3 faces):** font-display, font-body, **font-mono** (the data-app texture: data, labels, code, timestamps).
- **Forms:** radius, radius-lg, radius-pill, border-w, grad-angle, shadow-out, shadow-in, **elev-1/2/3** (elevation scale), **motion-fast/med, ease, lift** (motion set).
- **Spacing:** touch, pad-cell, pad-card, gap-xs/md/lg.

## The 42 canonical objects (grouped)

### DISPLAY family

| # | Object | Group | States | Primary tokens |
|---|--------|-------|--------|-----------------|
| 1 | `cnt_page_shell` | Shells | base | bg, border |
| 2 | `cnt_section_card` | Shells | base | surface-2, border, accent-2 (top rail), elev-1 |
| 3 | `cnt_toolbar` | Shells | base | surface-1, accent, text |
| 4 | `cnt_filter_bar` | Shells | base | surface-1, accent, text-faint |
| 5 | `card_modal_standard` | Shells | base | surface-3, accent-2 (rail), elev-3 |
| 6 | `nav_tab` | Nav | active / inactive | accent, on-accent, text-faint, border |
| 7 | `nav_mode` | Nav | active | accent, on-accent, text-soft |
| 8 | `nav_back` | Nav | base | accent |
| 9 | `tx_page_title` | Type | base | font-display, text, accent-grad (tick) |
| 10 | `tx_section_header` | Type | base | font-display, text |
| 11 | `tx_field_label` | Type | base | text-soft |
| 12 | `tx_body` | Type | base | text |
| 13 | `tx_mono_data` | Type | base | **font-mono**, text |
| 14 | `tx_helper_muted` | Type | base | text-soft, text-faint |
| 15 | `tx_badge` | Type | base | accent-grad, on-accent |
| 16 | `btn_family` | Buttons | normal / pressed | accent (solid), on-accent, accent-2 (secondary), bad |
| 17 | `fd_text_standard` | Fields | editable / focus / readonly | field, border, accent, surface-2 |
| 18 | `fd_dropdown_standard` | Fields | base | field, border, text-faint |
| 19 | `fd_readonly_display` | Fields | base | surface-2, text-soft |
| 20 | `fd_search_filter` | Fields | base | field, text-faint |
| 21 | `row_tile_badge` | Data | rows / tiles / badges | surface-1/2/3, accent, accent-soft, accent-2 (rails), good/warn/bad |
| 22 | `viz_meter` | Viewer | inline / stacked | accent-grad (fill), surface-3 (track), font-mono |
| 23 | `viz_pager` | Viewer | base | surface-2, border, accent (hover), font-mono |
| 24 | `viz_breadcrumb` | Viewer | base | font-mono, text-soft, accent, text |
| 25 | `viz_legend` | Viewer | base | **data-1..4**, accent |
| 40 | `card_ribbon` | Data | base | surface-2, accent-2 (top rail), accent (year), text — horizontal scroll-snap card strip |
| 41 | `stat_hero_departure` | Viewer | up / down | text (number), warn/info (word + side rail), text-faint (sub) — one dominant signed metric; redundant sign+word+rail, never color-only |
| 42 | `viz_range_band` | Viewer | base | surface-3 (track), text-faint (normal tick), accent (today marker), font-mono (scale) — value vs. historical min–max distribution |

### INPUT + FEEDBACK family

| # | Object | Group | States | Primary tokens |
|---|--------|-------|--------|-----------------|
| 26 | `fd_dropzone` | Input | base | surface-1, border (dashed), accent (hover), font-mono |
| 27 | `wf_stepper` | Input | base | good (done), accent (active), accent-soft, text-faint |
| 28 | `map_row` | Input | base | font-mono, accent (op on), field, border |
| 29 | `ctl_toggle` | Input | off / on | surface-3, text-faint, accent-soft, accent |
| 30 | `ctl_chip` | Input | base | accent, accent-soft, text-faint |
| 31 | `ctl_segmented` | Input | base | accent, on-accent, text-soft, border |
| 32 | `btn_icon` | Input | base | surface-2, text-soft, accent (hover) |
| 33 | `panel_drawer` | Input | base | surface-1, border, elev-3 |
| 34 | `fb_banner` | Feedback | match / warn / bad | good, warn, bad (+ tint) |
| 35 | `fb_flag` | Feedback | base | warn, good, text, text-soft |
| 36 | `data_kv_panel` | Feedback | base | surface-1, text-soft, font-mono, elev-1 |
| 37 | `data_typed_table` | Feedback | base | surface-2, font-mono, **data-1** (num), **data-2** (bool), text-faint |
| 38 | `fb_toast` | Feedback | base | surface-3, good, elev-2 |
| 39 | `fb_empty` | Feedback | empty / error | surface-2, text, text-soft, bad |

> The three T4 additions (40–42) are numbered in append order to avoid renumbering the existing set; by family they belong with the DISPLAY group (Data / Viewer). Families 16, 21 render multiple members/states in one card, so the gallery shows more than 42 rendered pieces; the 42 rows above are the canonical objects and are the count of record.

## The state matrix

- **Buttons** — normal / pressed (hover lifts one elevation step)
- **Nav / steps / chips / segments** — idle / active
- **Fields** — editable / focus / readonly
- **Toggles** — off / on
- **Portal rows** — standard / alt / selected (accent-2 rail)
- **Banners / states** — match / warn / bad (or empty / error)
- **Departure hero** — up / down (warmer / cooler; sign + word + rail carry it together)
- **Containers / cards / shells** — base (elevation carries depth)

Themes never add states; they only reskin the existing ones.

## Adding a new object (not a cap)

**The set is the shared design vocabulary, not a ceiling.** If a design genuinely needs an object that isn't here, add it — that is a normal, welcome move. The only rule is: **add it AND document it, in the same pass.**

1. **Append it to [`_objects.json`](./_objects.json)** under the right group (or a new group), with an `id`, `name`, `rowLayout`, and one or more `states` (each `html` + a `props` map of label → token role).
2. **Mirror it into the `preview.data.js` snapshot** so first-paint stays current.
3. **Add a row to the table above.**
4. If the object needs new CSS, put it in `preview.objects.css` (tool/viewer object styles live there; the canonical display objects are in `preview.css`). `preview.html` already links both.

`preview.html` renders the registry dynamically, so a new object appears in the studio with **no engine change**, and the coverage count updates itself. Keep new objects theme-driven: style them from token roles (`var(--accent)`, `var(--surface-2)`, `var(--font-mono)`, `var(--elev-2)`, etc.), never hard-coded colors, so every theme reskins them for free. If a new object needs a token role that doesn't exist yet, that's a design-system decision — raise it, don't silently invent a one-off token.

## Acceptance test for a new theme

1. Add the theme (color row in `colors.tsv` with all tokens incl. data-1..4; it inherits the shared type/forms/spacing vectors).
2. Open `preview.html`, select the theme.
3. Confirm every object renders with no token falling back to a placeholder.
4. Eyeball each family: shells read as distinct elevation, nav active vs inactive is obvious, buttons show clear hierarchy, fields distinguish editable/focus/readonly, the selected portal row stands out, the tool objects (dropzone/stepper/mapping-row/toggle) read as interactive, feedback banners carry the right semantic color, and the mono/data objects use font-mono + data-1..4.
5. If any object reads wrong, fix the theme's tokens — not the object. The object is canonical; the theme bends to it.

This contract is the bridge to the native build: when the FileMaker theme gets built, each object maps to the same token roles via `fmpRoleMap` in `_index.json`, so the mockup and the solution stay in lockstep.

## History

- **2026-07-18** — Expanded 20 → 39 from a real-app audit. T1: added `font-mono` type role + `data-1..4` categorical colors + the neutral **Carbon** theme. T2: added the INPUT + FEEDBACK family (14 tool objects: dropzone, stepper, mapping row, toggle, chip, segmented, icon button, side drawer, banner, flag, KV panel, typed table, toast, empty/error). T3: added the Viewer group (meter, pager, breadcrumb, legend) + `tx_mono_data`. Tool/viewer styles split into `preview.objects.css` to keep files under the 30KB read cap.
- **2026-07-19** — T4: expanded 39 → 42 from the retrocast build. Added `stat_hero_departure` (one dominant signed metric with redundant sign+word+rail encoding), `viz_range_band` (value vs. historical min–max distribution), and `card_ribbon` (horizontal scroll-snap card strip). Studio styles appended to `preview.objects.css`; `_objects.json` + the `preview.data.js` first-paint snapshot both updated in the same pass — all three surfaces in lockstep.
