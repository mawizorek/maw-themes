# THEME SYSTEM — 4-Vector Matrix

<banner background-color="blue" icon="🎨"><p><span>The canonical FileMaker and HTML artifact theme system. A <strong>Theme</strong> is no longer just Color × Feeling. It is a 4-vector matrix: <strong>Color</strong> × <strong>Typography</strong> × <strong>Forms</strong> × <strong>Spacing</strong>.</span></p></banner>

## The 4 Vectors (TSV Grids)

Instead of a mega-table of feelings, we isolate the four axes of UI that vary independently. This allows for mobile vs. desktop padding, or flat vs. soft shadows, without duplicating font settings.

1.  **`colors.tsv`**: The hue/paint. Backgrounds, surfaces, borders, and the explicit 2-stop gradient hex codes (`accent` → `accent-2`, a two-hue sweep).
2.  **`typography.tsv`**: The voice. Font families (display/body/mono), size ramps (lead, body, sm, xs), and letter tracking.
3.  **`forms.tsv`**: The tactility + depth + motion. Border radii, border widths, the 2-stop gradient ANGLE, the shadow maps, a 3-step **elevation scale** (`elev-1` resting / `elev-2` raised+hover / `elev-3` floating+modal), and a **motion set** (`motion-fast`, `motion-med`, `ease` curve, `lift` = hover translate).
4.  **`spacing.tsv`**: The density. Padding (cells, cards), gap sizes, and touch target minimums.

*Note: The old `feelings.tsv` was dropped. It has been replaced by the Typography, Forms, and Spacing grids.*

### The three Forms presets (2026-07-18 retune)

Forms ships **three genuinely distinct presets** — not degrees of the same look. Each sets its own radius, border weight, elevation tier, and motion feel:

- **`sharp`** — crisp/technical. Small radius (4/6px), squared chips (pill 6px, NOT a full bubble), heavier 1.5px border, tight fast motion. The dense data look.
- **`soft`** — balanced/professional. Moderate rounding (8/12px), rounded-rect chips (pill 8px), 1px border, medium layered elevation, smooth motion. The everyday usable default.
- **`grounded`** — spacious/editorial. Generous radius (12/18px), 1px border, the deepest elevation tier, roomy motion. The confident, high-air look.

**Why elevation + motion live in Forms (not a 5th vector):** motion and elevation are Forms' job — it already owns tactility (radius, border weight, press shadows). Depth (an elevation scale) and touch response (motion timing + hover lift) are the same "how physical does this feel" axis, so they fold in as columns rather than a new TSV. A 4th "sleek" preset was trialed and cut: it was just squared corners rounded into toy bubbles (999px pills) with slimmer padding — no real new direction. The lesson: distinctness comes from tiering radius + elevation + border together, not from removing borders. Consumers read `var(--elev-2)`, `var(--motion-med)`, `var(--ease)`, `var(--lift)` directly; the resolver + studio apply every Forms column automatically, so objects reskin for free. All motion is wrapped by a `prefers-reduced-motion` guard.

## The Join Table (`_themes.json`)

Apps **do not** reference colors or forms directly. An app requests a **Theme Slug** (e.g., `sharp-utility`).

`_themes.json` is the join table. It declares the named themes and maps them to exactly one token from each of the 4 vectors.

```json
{
  "slug": "sharp-utility",
  "name": "Sharp Utility",
  "status": "locked",
  "color": "maw-dark-utility",
  "typography": "sharp-racing",
  "forms": "sharp",
  "spacing": "tight"
}
```

## App integration — the four theme pointers (LOCKED 2026-07-19)

**Every app we build points at a composed 4-vector theme and CONSUMES its tokens. Nothing structural is hand-baked per app.** This is the whole point of building the vectors + join: swap one pointer, the whole app reskins.

### The contract

1. **Boot via `THEMES.applyTheme(APP_THEME)`**, where `APP_THEME` is a slug from `_themes.json`. The resolver (`resolve.js`) composes all four vectors and sets every token as an inline custom property on `:root`. The old `THEMES.apply(colorSlug)` applies COLOR only — use it just for the settings picker's hue swap, never as the boot.
   ```js
   var APP_THEME = "sharp-utility";        // color × typography × forms × spacing
   THEMES.applyTheme(APP_THEME).then(function () {
     var saved = localStorage.getItem("app_theme");   // picker saves a COLOR slug
     if (saved) THEMES.apply(saved, { silent: true }); // hue swap, keep the feel
   });
   ```
2. **The app's CSS consumes the vector tokens**, never fixed structural values: `var(--radius)`, `var(--radius-lg)`, `var(--border-w)` (forms); `var(--font-display/body/mono)`, `var(--fs-*)`, `var(--track-tight)` (typography); `var(--touch)`, `var(--pad-card)`, `var(--pad-cell)`, `var(--gap-xs/md/lg)` (spacing). If the app keeps a local spacing ramp (`--s1..--s8`), DERIVE it from the spacing vector (`--s4: var(--pad-card)`) so tight/standard/loose actually flows.
3. **The `:root` block in the app's CSS is a FIRST-PAINT FALLBACK FLOOR ONLY** — label it as such. Mirror the chosen theme's values so first paint == themed (no flash) and the app still renders if the resolver is slow/offline. `resolve.js` overrides every one inline after load. The 4-vector theme is the SOURCE OF TRUTH; the floor is a mirror, never the design. (Same philosophy as `themes.css` being the color first-paint spine.)
4. **The settings-drawer picker swaps COLOR only** — it calls `THEMES.apply(colorSlug)`, keeping the app's typography/forms/spacing. So users reskin hue without breaking the app's identity.

### Reference implementations

- **`template-app/`** — the gold standard. New apps copy it and only change `APP_THEME`. Defaults to `soft-utility`.
- **`retrocast/`** — points at `sharp-utility` (the tight instrument look). Proof that swapping structural feel = one pointer, zero CSS edits.

### Anti-pattern (the trap this replaced)

Before 2026-07-19, `resolve.js` still loaded the retired `feelings.tsv` and read a `t.feeling` pointer, so `applyTheme` silently dropped typography/forms/spacing — and apps hand-baked their structural CSS to compensate (radii, borders, spacing frozen per app, un-swappable). That is the trap. Hand-baking structural values instead of pointing at a theme is now the explicit anti-pattern.

## The Theme Studio (`preview.html`)

[**Launch the Theme Studio →**](https://mawizorek.github.io/ClickUp_apps/shared/themes/preview.html)

The Theme Studio allows you to mix the 4 vectors live. It renders all 42 canonical FileMaker objects, plus a composed "Full App" view. Switch the Forms vector between `sharp` / `soft` / `grounded` to see each preset's radius, elevation depth, and motion.

**Resilience rule:** The studio HTML *embeds* a snapshot of the 4 grids for a safe, instant first paint (especially on mobile), and then does a best-effort `fetch()` of the live TSV grids to override the snapshot if they have changed.

## Adding a New Value

1.  Add the row to the appropriate TSV (e.g., add `pill-heavy` to `forms.tsv`).
2.  Add a new Theme entry in `_themes.json` that references it.
3.  **Mandatory:** Update the embedded snapshot variables inside `preview.data.js` (the first-paint fallback) so it stays current with the TSVs.

### Adding a new Forms COLUMN (not just a row)

If you add a whole new form token (like the elevation/motion columns), also add it to `FORM_KEYS` in `resolve.js` so real apps (not just the studio) apply it. The studio applies every Forms column generically, so it needs no engine change — but `resolve.js` has explicit per-vector key lists (`COLOR_KEYS` / `TYPO_KEYS` / `FORM_KEYS` / `SPACE_KEYS`) that must be extended.
