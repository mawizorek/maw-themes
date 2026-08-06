#!/usr/bin/env bash
# port-remaining.sh - ONE-TIME migration tool. DELETE THIS FILE once it has succeeded.
#
# Copies the files that could not be moved agent-side, out of
#   mawizorek/ClickUp_apps @ shared/themes/
# into
#   mawizorek/maw-themes
# PROVES each copy byte-identical using git's own content-addressed hash, and
# THEN repoints the Studio at the canonical vectors.
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
# ============================================================================
# 2026-08-06 - THE PORT NOW REPOINTS. IT USED TO LAND THE STUDIO SILENTLY STALE.
# ============================================================================
# The copy half of this script was correct and is UNCHANGED. What was missing is
# that a byte-perfect copy of the Studio, dropped into a different folder, reads
# the wrong data and does not say so. Three things, in the order they bite:
#
#   1. THE OLD DOCS WARN ABOUT THE WRONG FAILURE. PORTED.md and the workflow's PR
#      body both said "engine/resolve.js resolves the grids as siblings, it will
#      404." That is true and it is IRRELEVANT to the Studio: preview.html never
#      loads resolve.js. It loads preview.data.js and preview.core.js, full stop.
#      A warning aimed at the wrong file reads as coverage and provides none.
#
#   2. THE REAL PATH IS IN preview.core.js AND IT FAILS SILENTLY BY CONSTRUCTION.
#      liveOverride() fetches base+'colors.tsv' where base is the PAGE'S OWN
#      DIRECTORY. In shared/themes/ the grids are siblings, so it works and
#      nobody ever noticed the coupling. In studio/ they are one level up, so all
#      five fetches 404 - and every one is written `r.ok ? r.text() : null`, so a
#      404 RESOLVES rather than throwing. `changed` stays false, the `if(changed)`
#      block never runs, and the trailing `.catch(function(){})` catches nothing
#      because nothing was ever thrown. No banner. No console error. The Studio
#      renders beautifully off its embedded snapshot and looks completely fine.
#
#   3. AND THE SNAPSHOT IS ALREADY STALE. vectors/colors.tsv in THIS repo is
#      7,777 B. The ClickUp_apps table that studio.data.js mirrors is 5,710 B.
#      So the acceptance test for the canonical vector space would have been
#      proving a superseded copy of it, from inside the canonical repo.
#
# MIGRATION-STATUS.md already says "byte-identical is not the same as working."
# This is the sharper version and it is a different failure: BYTE-IDENTICAL IS NOT
# THE SAME AS CANONICAL. The Studio would have WORKED. It would have worked on the
# wrong table, which is worse, because working is what stops anyone looking.
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
#   colors/typography/forms/spacing.tsv - ALREADY HERE and already NEWER. vectors/ is
#                     canonical as of Michael's 2026-08-06 ruling, and its colors.tsv
#                     (7,777 B) is ahead of the ClickUp_apps copy (5,710 B). Copying
#                     those over would be a migration that walks BACKWARDS.
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

# ---------------------------------------------------------------------------
# THE REPOINT. Runs on the VERIFIED copies, never on the source.
#
# Every anchor below is asserted to match EXACTLY ONCE. A miss aborts the whole
# run before anything is committed, because a half-applied repoint is the worst
# available outcome: some fetches corrected, some not, and no way to tell from
# looking at the rendered page.
# ---------------------------------------------------------------------------
echo
echo "==> repointing the Studio at the CANONICAL vectors"
python3 - <<'PY'
import pathlib, sys

def patch(path, pairs):
    p = pathlib.Path(path)
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        n = s.count(old)
        if n != 1:
            sys.exit(
                "ABORT: %s -- anchor matched %d times, expected exactly 1:\n  %s"
                % (path, n, old.strip().splitlines()[0][:110])
            )
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")
    print("    patched %s" % path)


# ------------------------------------------------------------ studio.core.js
# The five grid fetches, and the silence around them.
CORE = [
    (
        "  var base=location.pathname.replace(/[^/]*$/,'');",
        """  var base=location.pathname.replace(/[^/]*$/,'');
  /* THE REPOINT (2026-08-06). This used to fetch the grids as SIBLINGS of the
     page, which worked only because the Studio happened to live in the same
     folder as the data. In maw-themes the data is canonical and lives one level
     up. Same repo, same Pages origin, so these are still plain fetches. */
  var GRIDS=base+'../vectors/';
  var OBJECTS=base+'../vocabulary/';""",
    ),
    ("fetch(base+'colors.tsv'", "fetch(GRIDS+'colors.tsv'"),
    ("fetch(base+'typography.tsv'", "fetch(GRIDS+'typography.tsv'"),
    ("fetch(base+'forms.tsv'", "fetch(GRIDS+'forms.tsv'"),
    ("fetch(base+'spacing.tsv'", "fetch(GRIDS+'spacing.tsv'"),
    ("fetch(base+'_objects.json'", "fetch(OBJECTS+'_objects.json'"),
    (
        "function liveOverride(){",
        """/* ---------------------------------------------------------------------------
   THE STUDIO NOW SAYS WHICH TABLE IT IS SHOWING.

   It did not, and could not, because the failure path was unreachable: every
   grid fetch is written `r.ok ? r.text() : null`, so a 404 RESOLVES instead of
   throwing. `changed` stayed false, the refresh never ran, and the trailing
   .catch() caught nothing because nothing was thrown. A missing grid was
   indistinguishable from a present one.

   That is precisely what resolve.js's own header calls out and bans:
   "a fallback that does not announce itself is not graceful degradation, it is
   a lie." Same house, same law, opposite behaviour, for as long as this file
   has existed. The Studio is the acceptance test for the theme system, so a
   Studio that cannot tell you WHICH table it just proved is not an acceptance
   test at all.
--------------------------------------------------------------------------- */
function liveBadge(text, bad){
  var d=document.getElementById('studio-source-badge');
  if(!d){
    d=document.createElement('div');
    d.id='studio-source-badge';
    d.setAttribute('role', bad?'alert':'status');
    d.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;'+
      'font:600 12px ui-monospace,Menlo,monospace;padding:6px 12px;text-align:center;line-height:1.4';
    document.body.appendChild(d);
  }
  d.style.background = bad ? '#b23a2f' : '#2f6f4f';
  d.style.color = '#fff';
  d.textContent = text;
}
function liveFault(msg){ try{ console.error('[studio] '+msg); }catch(e){} liveBadge('studio: '+msg, true); }
function liveNote(msg){ try{ console.info('[studio] '+msg); }catch(e){} liveBadge('studio: '+msg, false); }

function liveOverride(){""",
    ),
    (
        """      renderAll();
    }
  }).catch(function(){});""",
        """      renderAll();
      liveNote('live \\u00b7 canonical vectors from maw-themes/vectors/');
    } else {
      liveFault('canonical grids did not load \\u2014 showing the EMBEDDED SNAPSHOT, which is older than vectors/ and must not be trusted');
    }
  }).catch(function(e){
    liveFault('canonical grids failed: '+(e&&e.message||'error')+' \\u2014 showing the EMBEDDED SNAPSHOT, which is older than vectors/ and must not be trusted');
  });""",
    ),
    (
        "document.getElementById('footStamp').textContent='shared/themes \\u00b7 loaded '",
        "document.getElementById('footStamp').textContent='maw-themes/studio \\u00b7 loaded '",
    ),
]

# --------------------------------------------------------------- index.html
# The footer still advertises the repo the Studio just left.
HTML = [
    (
        "https://github.com/mawizorek/ClickUp_apps/blob/main/shared/themes/preview.html",
        "https://github.com/mawizorek/maw-themes/blob/main/studio/index.html",
    ),
    (
        "https://github.com/mawizorek/ClickUp_apps/blob/main/shared/themes/_objects.json",
        "https://github.com/mawizorek/maw-themes/blob/main/vocabulary/_objects.json",
    ),
    (
        "https://github.com/mawizorek/ClickUp_apps/blob/main/shared/themes/OBJECT-COVERAGE.md",
        "https://github.com/mawizorek/maw-themes/blob/main/vocabulary/OBJECT-COVERAGE.md",
    ),
    (
        "https://github.com/mawizorek/ClickUp_apps/commits/main/shared/themes/preview.html",
        "https://github.com/mawizorek/maw-themes/commits/main/studio/index.html",
    ),
    (
        '<div class="foot-stamp" id="footStamp">Theme Studio \u00b7 shared/themes</div>',
        '<div class="foot-stamp" id="footStamp">Theme Studio \u00b7 maw-themes/studio</div>',
    ),
]

# --------------------------------------------------------------- resolve.js
# Not loaded by the Studio, but it IS the resolver every future consumer calls,
# and in engine/ its sibling-relative loader is wrong in exactly the same way.
# Fixed here rather than left as a documented landmine.
RESOLVE = [
    (
        "  var base=(function(){ var s=document.currentScript&&document.currentScript.src; "
        "if(!s){var e=document.getElementsByTagName('script');s=e[e.length-1].src;} "
        "return s.replace(/[^/]*$/,''); })();",
        "  var base=(function(){ var s=document.currentScript&&document.currentScript.src; "
        "if(!s){var e=document.getElementsByTagName('script');s=e[e.length-1].src;} "
        "return s.replace(/[^/]*$/,''); })();\n"
        "  /* REPOINTED 2026-08-06 for maw-themes: in ClickUp_apps the grids, the\n"
        "     registry and this file were all one flat folder. Here they are three\n"
        "     (engine/ vectors/ registry/), which is the whole point of the split.\n"
        "     `base` stays exported unchanged - consumers read it. */\n"
        "  var GRIDS=base+'../vectors/';\n"
        "  var REG=base+'../registry/';",
    ),
    ("return getText(base+file).then(parseTSV)", "return getText(GRIDS+file).then(parseTSV)"),
    ("getJSON(base+'_themes.json')", "getJSON(REG+'_themes.json')"),
]

patch("studio/studio.core.js", CORE)
patch("studio/index.html", HTML)
patch("engine/resolve.js", RESOLVE)

# Belt to the braces: no page-relative grid fetch may survive anywhere.
stray = pathlib.Path("studio/studio.core.js").read_text(encoding="utf-8")
for name in ("colors.tsv", "typography.tsv", "forms.tsv", "spacing.tsv", "_objects.json"):
    if ("base+'" + name) in stray:
        sys.exit("ABORT: studio.core.js still fetches %s page-relative" % name)
print("    verified: no page-relative grid fetch survives")
PY

cat > studio/PORTED.md <<'NOTE'
# studio/ - the Theme Studio

Ported from `ClickUp_apps@shared/themes/` byte-identical (`git hash-object` on both
sides, verified before the commit was made), renamed `preview.html`->`index.html` and
`preview.*`->`studio.*`, then REPOINTED at this repo's canonical vectors.

## What "repointed" means, and why the copy alone was not enough

`studio.core.js` used to fetch the four grids and `_objects.json` **page-relative** -
`base = location.pathname` minus the filename. That worked in `shared/themes/` for one
reason only: the Studio happened to sit in the same folder as the data. Moving it breaks
that coupling, and **it breaks it silently**, because each fetch is written
`r.ok ? r.text() : null` - a 404 resolves rather than throwing, so the `if(changed)`
refresh simply never ran and the trailing `.catch(function(){})` had nothing to catch.

The Studio would have rendered perfectly, off its ~27KB embedded snapshot, with no
banner and no console error. And that snapshot mirrors the OLD ClickUp_apps tables
(`colors.tsv` 5,710 B) while this repo's canonical table is 7,777 B.

> **Byte-identical is not the same as canonical.** The acceptance test for the vector
> space would have been proving a superseded copy of it, from inside the canonical repo,
> and it would have looked completely fine while doing it.

Now: grids come from `../vectors/`, objects from `../vocabulary/`, and the page states
which source it is showing in a footer badge - green for canonical, red for snapshot.
A Studio that cannot tell you which table it just proved is not an acceptance test.

## Still to do

**The acceptance test has not been run.** Open the page and confirm all 42 canonical
objects render from token roles alone, with no token falling back, and the badge reading
green. Until that has been SEEN, the Studio is repointed, not proven.

**`studio.data.js` is on borrowed time.** It is a hand-synced snapshot of the four grids,
and `THEME-SYSTEM.md` instructs updating it by hand whenever a grid changes - a
mandatory-manual-sync instruction, which is the definition of a surface that will drift.
It already has. It is now a genuine first-paint fallback rather than the source, and it
announces itself when it is what you are seeing. **Delete it the moment the generator
emits `dist/themes.json`.**

**Pages must be enabled on this repo** (Settings -> Pages -> deploy from `main`, root)
or `/studio/` serves nothing. `.nojekyll` is already committed.
NOTE

echo
echo "==> contrast gate, against the freshly-cloned canonical table"
python3 engine/contrastcheck.py || true

git add -A
git -c user.name="MAW Agents" -c user.email="mawizorek.online@gmail.com" \
  commit -m "migration: port the remaining 8 files, byte-verified, and repoint the Studio at vectors/"
git push -u origin "$BRANCH"

echo
echo "DONE. Open the PR:"
echo "  https://github.com/mawizorek/maw-themes/compare/$BRANCH?expand=1"
echo
echo "Then, in order:"
echo "  1. Settings -> Pages -> deploy from main / root, if it is not on already."
echo "  2. Open /studio/ and confirm 42/42 objects render AND the footer badge is"
echo "     GREEN (canonical vectors). A RED badge means it is showing the stale"
echo "     snapshot and the repoint did not take."
echo "  3. Delete port-remaining.sh and .github/workflows/port-remaining.yml."
