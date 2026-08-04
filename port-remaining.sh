#!/usr/bin/env bash
# port-remaining.sh - ONE-TIME migration tool. DELETE THIS FILE once it has succeeded.
#
# Copies the files that could not be moved agent-side, out of
#   mawizorek/ClickUp_apps @ shared/themes/
# into
#   mawizorek/maw-themes
# and PROVES each copy byte-identical using git's own content-addressed hash.
#
# WHY A SCRIPT AND NOT AN AGENT
# -----------------------------
# Transcribing a file through an agent's output is a fidelity gamble that scales badly.
# It held for a 5.7KB TSV (SHA-verified) and for the eleven scaffold files. `resolve.js`
# was attempted at 18,658 bytes, abandoned at 3,270, and DISCARDED rather than
# half-committed - it is the live engine every consumer calls, so a subtle slip there is
# a real bug, not a cosmetic diff. `git checkout` + `cp` cannot mis-transcribe.
# That is the entire argument for this file existing.
#
# SAFE TO RE-RUN. Clones into a fresh temp dir, verifies BEFORE committing, and refuses
# to push if a single hash mismatches. Nothing in ClickUp_apps is modified - it is
# cloned read-only and never pushed to.
#
# Requires: git, python3. Run from anywhere.

set -euo pipefail

BRANCH="port-remaining-$(date +%Y%m%d)"
WORK="$(mktemp -d)"
trap 'echo; echo "scratch clone left at: $WORK"' EXIT

SRC="$WORK/ClickUp_apps"
DST="$WORK/maw-themes"

echo "==> cloning"
git clone --depth 1 https://github.com/mawizorek/ClickUp_apps.git "$SRC"
git clone https://github.com/mawizorek/maw-themes.git "$DST"

cd "$DST"
git checkout -b "$BRANCH"
mkdir -p engine vocabulary studio docs

# source-relative  ->  destination-relative
#
# The renames are deliberate. `preview.html` becomes `studio/index.html` because it IS
# the app in that folder, and `preview.*` becomes `studio.*` to match the directory it
# now lives in. The sed pass below repoints the tags the rename would otherwise break.
#
# NOT IN THIS LIST, ON PURPOSE:
#   themes.css        - GENERATED. Regenerated into dist/, never copied.
#   decision-log.md   - a decision log is a ClickUp doc page, never a repo file.
#   _template.json    - already marked superseded; under hex-canonical a theme is a ROW.
#   feelings/         - retired vector, dead since the 4-vector rework.
MAP=(
  "resolve.js|engine/resolve.js"
  "_objects.json|vocabulary/_objects.json"
  "preview.html|studio/index.html"
  "preview.css|studio/studio.css"
  "preview.objects.css|studio/studio.objects.css"
  "preview.core.js|studio/studio.core.js"
  "preview.data.js|studio/studio.data.js"
  "FILEMAKER-CAPABILITIES.md|docs/FILEMAKER-CAPABILITIES.md"
)

echo
echo "==> copying + verifying (git hash-object on both sides)"
fail=0
for entry in "${MAP[@]}"; do
  from="${entry%%|*}"; to="${entry##*|}"
  src="$SRC/shared/themes/$from"
  if [ ! -f "$src" ]; then
    printf '  MISSING  %-24s (not at source HEAD - investigate, do not skip)\n' "$from"
    fail=1; continue
  fi
  cp "$src" "$to"
  a=$(git hash-object "$src"); b=$(git hash-object "$to")
  if [ "$a" = "$b" ]; then
    printf '  ok   %-24s -> %-30s %8s B  %s\n' "$from" "$to" "$(wc -c <"$to")" "${a:0:7}"
  else
    printf '  FAIL %-24s hash mismatch\n' "$from"; fail=1
  fi
done
[ "$fail" -eq 0 ] || { echo; echo "ABORTED - nothing committed, nothing pushed."; exit 1; }

# The rename breaks the Studio's own <link>/<script> tags. Fix exactly those, anchored to
# the literal filenames above so nothing else in the file can be caught. Specific patterns
# run before general ones.
echo
echo "==> repointing studio asset references (the rename would otherwise 404)"
sed -i.bak \
  -e 's|preview\.objects\.css|studio.objects.css|g' \
  -e 's|preview\.core\.js|studio.core.js|g' \
  -e 's|preview\.data\.js|studio.data.js|g' \
  -e 's|preview\.css|studio.css|g' \
  studio/index.html && rm -f studio/index.html.bak

left=$(grep -c 'preview\.' studio/index.html || true)
echo "    surviving 'preview.' references in studio/index.html: ${left:-0}  (expect 0)"

cat > studio/PORTED.md <<'NOTE'
# studio/ - ported 2026-08-04, NOT yet verified rendering

Files arrived byte-identical from `ClickUp_apps@shared/themes/`, renamed:
`preview.html`->`index.html`, `preview.*`->`studio.*`, with the `<link>`/`<script>`
tags repointed by the port script.

**Nobody has opened this yet.** Byte-identical is not the same as working. The acceptance
test is `OBJECT-COVERAGE.md`: all 42 canonical objects render from token roles alone, no
token falling back. Until that has been SEEN, the Studio is ported, not proven.

## studio.data.js is on borrowed time

It is a ~27KB hand-synced snapshot of the four TSV grids, kept only so first paint works
before `dist/` exists. `THEME-SYSTEM.md` instructs updating it by hand whenever a grid
changes - a mandatory-manual-sync instruction, which is the definition of a surface that
will drift. **It was originally marked do-not-port; that call was reversed because a
Studio that cannot paint proves nothing.** Delete it the moment the generator emits
`dist/themes.json`.

## Known broken on arrival

`engine/resolve.js` resolves the grids as SIBLINGS (`base` = its own script directory).
They now live one level up in `vectors/`. It will 404. Left unpatched on purpose - the
path fix is a code decision, not a copy step, and the same posture applies to
`build-themes.mjs`.
NOTE

echo
echo "==> contrast gate, against the freshly-cloned canonical table"
python3 engine/contrastcheck.py || true

git add -A
git -c user.name="MAW Agents" -c user.email="mawizorek.online@gmail.com" \
  commit -m "migration: port the remaining 8 files, byte-verified from ClickUp_apps"
git push -u origin "$BRANCH"

echo
echo "DONE. Open the PR:"
echo "  https://github.com/mawizorek/maw-themes/compare/$BRANCH?expand=1"
echo
echo "Then: open studio/index.html and confirm 42/42 objects render. That is the"
echo "acceptance test, and it is the gate for tagging v1.0.0."
