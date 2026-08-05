# maw-themes

**The canonical design vector space for everything MAW builds.**

One set of themes. Every consumer points at a slug. Nothing redefines tokens locally, ever.

> Michael, 2026-08-03: *"this is the canonical vector space I want to be using, not re-defining per repo."*

---

## Start here, before you touch a table

Read **[`docs/HOW-A-THEME-IS-CHOSEN.md`](./docs/HOW-A-THEME-IS-CHOSEN.md)**. It is the
contract between an app and this repo, and it is short on purpose.

The four rules it exists to enforce, so that skipping it still costs you something:

1. **An app names a theme, not a colour.** One slug from `registry/_themes.json` supplies
   all four vectors. That slug carries both toggle states, so one line is a complete app.
2. **A second theme, if declared, replaces the alt colour only.** The app owns which slot
   is which. Two lines is the ceiling.
3. **Pairing lives in the join and nowhere else.** `color` and `alt-color` are explicit
   slugs. There is no theme family, no `-light` suffix convention, and nothing anywhere
   infers a partner from a name.
4. **`vectors/colors.tsv` is clueless by design.** A row is one complete palette that
   knows nothing about any other row. If you find yourself adding a column to express a
   relationship, the relationship belongs in the join.

> Michael, 2026-08-05: *"the color tab needs to be totally clueless as to its joins to any
> other state. it's a canonical object vector. any joining must happen externally in a
> join table."*

---

Scaffold in progress — see [`MIGRATION-STATUS.md`](./MIGRATION-STATUS.md) for exactly what
has landed and what has not.
