# How a theme is chosen

**The contract, 2026-08-05.** Five rules. Read them before writing a `theme:`
line anywhere, and before changing anything in `vectors/` or `registry/`.

---

## 1. An app names a THEME, never a palette

```yaml
theme: sharp-mclaren        # one line. This is the normal case.
```

That resolves in `registry/_themes.json`, which is **the only entry point**. A
theme binds five pointers: two colours, one typography, one forms, one spacing.

🔴 **A colour slug is not a theme.** `mclaren` is a palette; the themes using it
are `sharp-mclaren` and `mclaren-mobile`. Naming a palette gets you colour and
nothing else -- no type, no radii, no density.

Several slugs (`eos`, `papyrus`, `database`) exist as BOTH a join and an entity,
which is exactly how this went unnoticed for a day: `eos` appeared to work
because a join and a colour happen to share the name and point at each other.
**A consumer must resolve a bare name as a JOIN first and report the ambiguity.**

## 2. One theme supplies BOTH toggle states

Every join declares two colours:

```json
"color":     "mclaren",
"alt-color": "mclaren-light",
```

So one line in an app is enough. `color` paints the app's default state,
`alt-color` paints the other.

## 3. A second theme REPLACES the alt

```yaml
theme:
  dark: sharp-mclaren       # its `color`
  light: papyrus            # its `color` -- not its alt-color
```

**The app always owns which slot is which.** Declaring a second theme overrides
whatever the first theme's `alt-color` would have supplied, and the second theme
contributes its PRIMARY colour -- naming it is a deliberate choice, so nothing
may quietly substitute for it.

⚠️ Typography, forms and spacing do **not** split. Type is scheme-independent by
design (two type systems that drift is the failure that rule prevents), and a
radius or a cell padding has no business changing when a reader flips a switch.
**The default-state theme supplies all three**, and a build must name what it
dropped from the other.

## 4. 🔴 `vectors/colors.tsv` KNOWS NOTHING ABOUT PAIRING

It is a canonical object vector. One row is one complete palette. It carries **no
`identity`, no `alt-` band, and no relationship of any kind.**

**There is no such thing as a theme family, and nothing may ever infer a pair
from the colour table.** If you find yourself writing *"find the row that looks
like this one's opposite,"* stop -- that is the bug this rule forbids, and it has
been built and reverted twice.

Consequences worth having:

- **A pair need not be dark+light.** Two darks, two lights, normal-and-party. A
  derived pair could only ever find the opposite mode.
- `mode` is **descriptive only**. It resolves nothing. It exists so a consumer
  can warn *"you put a dark palette in the light slot"* -- keep it honest.
- ⚠️ **A pointer can dangle**, which derivation could not. That is the price. A
  consumer must report an unresolvable slug **by name**, never fall back quietly.

## 5. Editing

| You want to | Edit |
|---|---|
| change a colour | one cell in `vectors/colors.tsv` |
| repaint every theme using a density | one row in `vectors/spacing.tsv` -- ⚠️ `tight` serves five joins |
| pair two palettes | `alt-color` in `registry/_themes.json` |
| add a palette | a row in `colors.tsv`, then a join that points at it |

⚠️ **typography / forms / spacing are SHARED entities joined by pointer.** A
theme does not own its type, it points at it -- so editing `sharp-racing` moves
every theme pointing at it, on purpose.

---

## Scoped, not built

**Page-level themes.** A markdown page carrying `theme:` in its frontmatter
should resolve against this same registry and apply all four vectors over that
page. Needs scoped custom properties on a page wrapper rather than `:root`, so it
is real work rather than a config line.

**Single-vector replacement.** Michael floated `theme::color: <slug>` for
overriding one vector without restating a whole theme. **The syntax is unruled**
-- it binds to a real parse and the Naming Proposal Guard applies -- and it is
recorded here so the idea is not lost, not because it is decided.

---

## For a cold session

Two sentences, if you read nothing else:

1. **A colour slug is not a theme.** Resolve names against
   `registry/_themes.json` first.
2. **The colour table is clueless by design.** Any pairing you need is in the
   join, or it does not exist.

Everything else is recoverable. Those two are the mistakes that have actually
been made here, each more than once.
