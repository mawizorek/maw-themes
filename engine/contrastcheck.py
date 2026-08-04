#!/usr/bin/env python3
"""contrastcheck.py - the colour-vector contrast gate for maw-themes.

WHY THIS EXISTS
---------------
`vectors/colors.tsv` carries a standing, unclosed verification obligation from
2026-07-17, in the theming decision log's own words:

    "the 15 hex values were CONVERTED from the prior OKLCH tokens BY HAND and
     should be spot-checked before any theme is treated as final. `mclaren` (the
     reference) was converted most carefully... The `accent-deep` stops are
     first-pass darker values, meant to be eyeballed/tuned per color."

Spot-checked on ONE row, eighteen days ago, and never closed. Every contrast
defect found on 2026-08-03 - the accent invisible on its own opposite-mode
ground, the success-green failing on a light ramp, the categorical data slots
failing on a light ramp - is a direct consequence. This file closes that
obligation by making it arithmetic instead of a promise.

SHAPE (deliberately copied, not invented)
-----------------------------------------
Same shape as the size gate already proven in `maw-agents/uritp-docs`:
**maths in the hook, thresholds in a TSV row with a NOTE column, so every
waiver shows up in a diff.** A threshold buried in code is a threshold nobody
renegotiates in the open.

WHAT IT DOES NOT DO
-------------------
It does not judge taste, hue harmony, or whether a palette is nice. It answers
one falsifiable question per pair: does this foreground reach its required
contrast ratio against this background. `accentBoardRule` (hue collision across
rows, judged in oklch) is a DIFFERENT check and is not implemented here.

Run:  python3 contrastcheck.py [--tsv PATH] [--budget PATH] [--verbose]
Exit: 0 = pass (or all failures waived), 1 = unwaived failure, 2 = bad input.
"""

from __future__ import annotations

import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TSV = os.path.join(HERE, os.pardir, "vectors", "colors.tsv")
DEFAULT_BUDGET = os.path.join(HERE, "contrast-budget.tsv")

# ---------------------------------------------------------------- WCAG 2.x maths
# Relative luminance per WCAG 2.1 dfn-relative-luminance, then the standard
# (L_lighter + 0.05) / (L_darker + 0.05) ratio. No approximations, no shortcuts:
# this is the number an auditor will compute, so it is the number we compute.


def _srgb_channel(value_0_255):
    c = value_0_255 / 255.0
    if c <= 0.03928:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def parse_hex(raw):
    """'#a1b2c3' -> (161, 178, 195). Returns None for anything unparseable."""
    if raw is None:
        return None
    s = raw.strip().lstrip("#")
    if len(s) == 3:
        s = "".join(ch * 2 for ch in s)
    if len(s) != 6:
        return None
    try:
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


def luminance(rgb):
    r, g, b = (_srgb_channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg_hex, bg_hex):
    fg, bg = parse_hex(fg_hex), parse_hex(bg_hex)
    if fg is None or bg is None:
        return None
    lf, lb = luminance(fg), luminance(bg)
    hi, lo = max(lf, lb), min(lf, lb)
    return (hi + 0.05) / (lo + 0.05)


# ---------------------------------------------------------------- TSV loading


def read_tsv(path):
    """-> (header list, [row dict]). Blank lines and #-comments skipped; no
    quoting (tabs appear in none of our values, which is exactly why this is
    TSV and not CSV)."""
    with open(path, encoding="utf-8") as fh:
        lines = [ln.rstrip("\n").rstrip("\r") for ln in fh if ln.strip()]
    if not lines:
        return [], []
    header = lines[0].split("\t")
    rows = []
    for ln in lines[1:]:
        if ln.lstrip().startswith("#"):
            continue
        cells = ln.split("\t")
        cells += [""] * (len(header) - len(cells))
        rows.append(dict(zip(header, cells)))
    return header, rows


def has_opposite_ramp(row):
    """A row carries an opposite-mode ramp only if EVERY alt-* cell it declares
    is filled. A partially-filled ramp is the defect, not a lighter version of
    the feature - and `resolve.js` agrees, falling back to the native ramp
    rather than painting a half-flip. `default-theme` legitimately has none."""
    alt_keys = [k for k in row if k.startswith("alt-")]
    if not alt_keys:
        return False
    return all(row.get(k, "").strip() for k in alt_keys)


# ---------------------------------------------------------------- the check


def resolve_token(row, token, scope):
    """Map a budget row's token name to a cell, honouring scope.

    native   -> the bare column                      (theme in its own mode)
    opposite -> the alt-* column                     (theme flipped)
    cross    -> bare FOREGROUND on alt BACKGROUND    (the shared-brand defect)

    `cross` is the scope that measures what happens when a token WITHOUT an
    alt variant is painted on a ground that HAS one. It is temporary by design:
    once every brand and semantic token is authored per mode, cross-scope rows
    describe a situation that can no longer occur and should be DELETED rather
    than waived forever.
    """
    if scope == "opposite":
        return row.get("alt-" + token, "").strip() or None
    return row.get(token, "").strip() or None


def resolve_bg(row, token, scope):
    if scope in ("opposite", "cross"):
        return row.get("alt-" + token, "").strip() or None
    return row.get(token, "").strip() or None


def waived_for(budget_row, slug):
    raw = budget_row.get("waived", "").strip()
    if not raw:
        return False
    if raw == "*":
        return True
    return slug in {s.strip() for s in raw.split(",") if s.strip()}


def run(tsv_path, budget_path, verbose=False):
    try:
        _, themes = read_tsv(tsv_path)
        _, budget = read_tsv(budget_path)
    except OSError as exc:
        print("contrastcheck: cannot read input -- %s" % exc, file=sys.stderr)
        return 2

    if not themes:
        print("contrastcheck: no theme rows found", file=sys.stderr)
        return 2
    if not budget:
        print("contrastcheck: no budget rows found", file=sys.stderr)
        return 2

    failures, waived, skipped, checked = [], [], [], 0

    for row in themes:
        slug = row.get("slug", "").strip()
        if not slug:
            continue
        mode = row.get("mode", "").strip() or "?"
        opposite = has_opposite_ramp(row)

        for b in budget:
            scope = b.get("scope", "native").strip() or "native"
            if scope in ("opposite", "cross") and not opposite:
                skipped.append((slug, b.get("pair", "?"),
                                "no opposite-mode ramp authored"))
                continue

            try:
                minimum = float(b.get("min", "0") or 0)
            except ValueError:
                print("contrastcheck: bad min on budget row %r"
                      % b.get("pair"), file=sys.stderr)
                return 2

            fg_hex = resolve_token(row, b.get("fg", "").strip(), scope)
            bg_hex = resolve_bg(row, b.get("bg", "").strip(), scope)
            if fg_hex is None or bg_hex is None:
                skipped.append((slug, b.get("pair", "?"), "token not in table"))
                continue

            ratio = contrast(fg_hex, bg_hex)
            if ratio is None:
                skipped.append((slug, b.get("pair", "?"),
                                "unparseable hex"))
                continue

            checked += 1
            rec = (slug, mode, b.get("pair", "?"), fg_hex, bg_hex,
                   ratio, minimum, b.get("note", ""))

            if ratio + 1e-9 < minimum:
                (waived if waived_for(b, slug) else failures).append(rec)
            elif verbose:
                print("  ok    %-18s %-26s %5.2f:1 >= %s"
                      % (slug, b.get("pair", ""), ratio, minimum))

    # ------------------------------------------------------------ the report
    print("contrastcheck -- %d theme rows x %d pairs = %d comparisons"
          % (len(themes), len(budget), checked))

    if skipped:
        no_ramp = sum(1 for s in skipped if "no opposite" in s[2])
        other = len(skipped) - no_ramp
        msg = "  skipped: %d (no opposite-mode ramp)" % no_ramp
        if other:
            msg += ", %d (token/hex missing)" % other
        print(msg)

    if waived:
        print("\n  WAIVED (%d) -- known, ruled, and tracked:" % len(waived))
        for slug, mode, pair, fg, bg, ratio, minimum, note in sorted(waived):
            print("    ~ %-18s %-26s %5.2f:1 (needs %s) %s on %s"
                  % (slug, pair, ratio, minimum, fg, bg))

    if failures:
        print("\n  FAIL (%d):" % len(failures))
        for slug, mode, pair, fg, bg, ratio, minimum, note in sorted(failures):
            print("    x %-18s [%-5s] %-26s %5.2f:1 (needs %s) %s on %s"
                  % (slug, mode, pair, ratio, minimum, fg, bg))
        print("\n%d unwaived contrast failure(s). Fix the TOKENS, not the "
              "object -- the object is canonical and the theme bends to it. "
              "To accept one deliberately, add the slug to that pair's "
              "`waived` column WITH a reason in `note`." % len(failures))
        return 1

    tail = " (%d waived)" % len(waived) if waived else ""
    print("\nPASS -- no unwaived contrast failures." + tail)
    return 0


def main():
    ap = argparse.ArgumentParser(description="Contrast gate for colors.tsv")
    ap.add_argument("--tsv", default=DEFAULT_TSV)
    ap.add_argument("--budget", default=DEFAULT_BUDGET)
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()
    return run(args.tsv, args.budget, args.verbose)


if __name__ == "__main__":
    sys.exit(main())
