# FileMaker Capability Handbook — the styling allowlist

**This is the toolbox. If a design needs something that is NOT in the "Allowed" tables below, STOP and treat it as out of scope, not as a thing to invent a workaround for.**

This doc is a **passive gate**. Both agents (rendering a theme mockup or an app meant to be FileMaker-replicable) AND Michael (rebuilding a render as a native FileMaker layout) work from this same list. The point: every visual choice we bake into a theme must map to a real FileMaker layout-object property, so the ClickUp render and the native FileMaker solution stay in lockstep. If it can't be built in FileMaker's Inspector, it doesn't belong in a theme.

Read this alongside:
- **`OBJECT-COVERAGE.md`** — the 20 canonical objects a theme must style (the WHAT).
- **`README.md`** — the 17-token color contract + how consumers reference a theme (the color axis).
- **`decision-log.md`** — why the calls here were made.

<p></p>

---

## How FileMaker styling actually works (the model)

Everything below is done in **Layout mode → Inspector → Appearance tab**, in two areas:

- **Graphic area** — fill, line (border), corner radius.
- **Advanced Graphic area** — shadows (outer + inner) and padding.

Two more mechanisms make this a system, not one-off formatting:

- **Object state list** (top of the Appearance tab) — style an object per state: **Normal / Hover / Pressed / In Focus**. This is FileMaker's native equivalent of CSS `:hover` / `:active` / `:focus`. Every state we render in a theme must be one of these.
- **Styles + Themes** — a **Style** is a named, saved bundle of Appearance settings for an object; a **Theme** is a collection of Styles. This is the native equivalent of our token system: define the look once as a Style, apply it everywhere, change it in one place. **When Michael rebuilds a theme natively, each of our tokens/objects becomes a FileMaker Style inside a FileMaker Theme.**

> The mapping is deliberate: our token JSON → FileMaker Theme; each canonical object's resolved look → a FileMaker Style; each rendered state → a FileMaker object state. Nothing in a theme should require a capability outside this model.

<p></p>

---

## ✅ ALLOWED — the toolbox (every property maps to a native FileMaker control)

### Fill

| We use | FileMaker equivalent | Notes / limits |
|---|---|---|
| Solid background color | Graphic → Fill → **Solid** | Any color + opacity. Maps to any surface/fill token. |
| **Gradient fill** | Graphic → Fill → **Gradient** | 2+ color stops (click the bar to add stops, drag to reposition), plus a **direction/angle** control. **This is our button/surface gradient.** |
| Transparent | Graphic → Fill → **Transparent** | For layered objects; lets the object/part/background behind show through. |
| Image fill | Graphic → Fill → **Image** | Allowed but avoid for themeable surfaces (not token-driven). Use for fixed brand art only. |

### Line (border)

| We use | FileMaker equivalent | Notes / limits |
|---|---|---|
| Border color | Graphic → Line → color | Maps to `border` token. |
| Border width | Graphic → Line → width (pt) | Our `--border-w` (line weight) maps here directly. |
| Border style | Graphic → Line → **solid / dash / dot** | Solid is the default; dash/dot exist if ever needed. |
| Per-side borders | Graphic → Line → any combination of top/right/bottom/left | Table row separators, toolbar underlines, etc. |

### Corners

| We use | FileMaker equivalent | Notes / limits |
|---|---|---|
| Corner radius | Graphic → **Corner radius**, per corner | You pick **which corners** round (each corner independently). Our `--radius` / `--radius-lg` map here. |
| Pill / full-round | Corner radius set to half the object height | The `999px` pill effect = radius ≥ half-height. **Button-bar segments** round cleanly using the transparent-line trick (set segment dividers to transparent line). |

### Shadows (the correction — these ARE native)

| We use | FileMaker equivalent | Notes / limits |
|---|---|---|
| **Outer shadow** (raised look) | Advanced Graphic → **Outer shadow** | Color, opacity, blur, spread, offset (x/y). The "lifted button/card" look. |
| **Inner shadow** (inset look) | Advanced Graphic → **Inner shadow** | Same knobs. The **"infill rounded-rectangle shadow"** = inner shadow on a rounded rect: the pressed / recessed-field look. |
| Object support | Fields, buttons, popover buttons, popovers, slide controls, portals | **Tab controls: outer shadow only** (no inner). Confirm per object before relying on inner shadow. |

### Spacing + text

| We use | FileMaker equivalent | Notes / limits |
|---|---|---|
| Padding | Advanced Graphic → **Padding** | Space between an object's edge and its contents (fields, buttons, popovers, panels). |
| Font family | Text formatting | Must be a **font installed on the machine**. Pick theme fonts from what's actually installed (see the caution below). |
| Font size (pt) | Text formatting | Our explicit `--fs-*` sizes map to point sizes. |
| Weight / style / align | Text formatting | Bold, italic, alignment, line spacing all native. |
| Per-state styling | Object state list: Normal / Hover / Pressed / In Focus | The only four states a theme may render. |

<p></p>

---

## 🚫 NOT ALLOWED — off the table (CSS can, FileMaker can't)

Do not design a theme around any of these. If a mockup uses one, it will not survive the native rebuild, so it fails the gate.

| Off-limits | Why | What to do instead |
|---|---|---|
| **Motion** — transitions, animations, transforms, hover-grow | FileMaker layout objects don't animate. | Design the *static* look of each state (Normal/Hover/Pressed/Focus). Motion is app-only polish the FMP render simply omits; never make meaning depend on it. |
| **Gradient text** (`background-clip: text`) | No native equivalent, and it's on the DESIGN-UI ban list anyway. | Solid text color. Emphasis via weight/size. |
| **Glassmorphism / backdrop blur** | No backdrop-filter in FileMaker. | Solid or gradient fills + a real border. |
| **Multiple stacked shadows** on one object | FileMaker gives **one outer + one inner** per object, not an arbitrary stack. | One outer OR one inner (or one of each). Design depth with that budget. |
| **Runtime color math** (`color-mix`, live `oklch()` blends) | The native layout has no runtime; colors must be concrete values. | **Bake it.** Resolve the gradient's two stops to fixed colors at build time and use those literal values in FileMaker. |
| **Pseudo-elements / generated content** (`::before`, `::after`) | No equivalent. | Use a real object. |
| **Sub-pixel / fractional-heavy layouts, CSS grid tricks** | FileMaker layout is object placement, not flow/grid. | Lay out with real positioned objects. |

<p></p>

---

## Button-look recipes (Michael's ask, spelled out)

Three native ways to get a "nice button," all inside the allowlist:

1. **Gradient button (default).** Fill → Gradient, two stops derived from the accent color (lighter top, darker bottom), angle from the feeling. Corner radius from the feeling. This is our primary button.
2. **Raised button.** Solid or gradient fill + **outer shadow** (small blur, small y-offset, low opacity). Reads as lifted off the surface.
3. **Pressed / inset look.** **Inner shadow** on the rounded rectangle ("infill rounded-rectangle shadow"). Use it for the Pressed state, or for recessed fields. This is the state you get by styling the object's **Pressed** entry in the state list.

A complete button in the theme = fill + corner radius + (optional) one shadow + text style, defined for **Normal** and **Pressed** (Hover/Focus optional). Save it as a FileMaker **Style** so every button reuses it.

<p></p>

---

## Which theme axis owns which FileMaker property

The theme system has two axes. This is how they split across the FileMaker toolbox:

| Axis | Owns (FileMaker properties) |
|---|---|
| **Color axis** (the 17 tokens) | All fill colors, border color, text colors, the gradient's two stop **colors**, shadow **color**. |
| **Feeling axis** (form) | Font family + sizes, corner radius (incl. pill), line **weight**, gradient **angle + intensity**, shadow **spec** (blur/spread/offset/opacity), padding. |

So a composed skin = pick colors (which hues fill the objects) + pick a feeling (what shape/type/depth the objects take). Both resolve to concrete FileMaker Style settings.

<p></p>

---

## The replication workflow (what Michael does at rebuild time)

When sitting down to rebuild a render as a native FileMaker Theme:

1. Open the render/mockup and its resolved token values (color axis) + feeling values.
2. For each of the **20 canonical objects** (`OBJECT-COVERAGE.md`), create a FileMaker **Style**:
   - Set **Fill** (solid or the baked 2-stop gradient + angle).
   - Set **Line** (color + the feeling's weight).
   - Set **Corner radius** (the feeling's radius; pill = half-height).
   - Set **Shadow** if the object calls for one (one outer or one inner).
   - Set **Padding** + **Text** style.
   - Repeat for each rendered **state** (Normal / Pressed / etc.) via the state list.
3. Save all Styles into one FileMaker **Theme**. That Theme is the native twin of the token JSON.
4. Anything the mockup shows that isn't on the allowlist → it was a bug in the mockup, not a thing to reproduce. Flag it back.

<p></p>

---

## Gate summary (the one-line rule)

**A theme may only use: solid/gradient/transparent fill · colored line (weight, style, per-side) · per-corner radius · one outer + one inner shadow · padding · installed fonts at set sizes · the four object states.** Everything else is out of scope. When in doubt, it's not in the toolbox.

*Sourced from Claris/FileMaker Pro Help: Inspector Appearance tab — fill/line/borders, gradient fill, corner radius, Advanced Graphic shadows + padding, object state list, and Styles/Themes. Verified 2026-07-17.*
