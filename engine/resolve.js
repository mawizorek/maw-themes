/* maw-themes/engine/resolve.js — TSV-sourced resolver for the 4-VECTOR theme system.
   A THEME is a JOIN of four independent vectors, each its own TSV grid:
     - vectors/colors.tsv      : one row per COLOR, hex only. HEX IS CANONICAL.
     - vectors/typography.tsv  : one row per TYPOGRAPHY set (fonts incl. font-mono, fs-* ramp, tracking).
     - vectors/forms.tsv       : one row per FORMS set (radii, border-w, gradient ANGLE, shadows, elev, motion).
     - vectors/spacing.tsv     : one row per SPACING set (touch target, pad-*, gap-*).
     - registry/_themes.json   : the JOIN — { slug, color, alt-color, typography, forms, spacing }.

   HISTORY / THE FIX (2026-07-19): this file previously loaded a single `feelings.tsv` and read a
   `t.feeling` pointer off the join. The system migrated to the 4-vector split (typography/forms/spacing
   as separate grids, a 4-pointer join) but the resolver was never updated — so applyTheme() silently
   dropped every non-color vector and apps hand-baked their structural CSS instead. This rewrite composes
   ALL FOUR from the current grids. `THEMES.applyTheme(slug)` now sets the full token set from one pointer.

   HONESTY FIX (2026-07-25): there is NO SILENT PATH anymore. Previously applyTheme() called every child
   applier with `silent:true`, so a typo'd typography/forms/spacing pointer inside an otherwise-valid join
   applied nothing and ANNOUNCED nothing — the page rendered half-themed and no one was told. Same for an
   unknown color inside a join. That is a silent fallback, which the Fetch Honesty Law exists to ban:
   a fallback that does not announce itself is not graceful degradation, it is a lie. Now every unresolved
   reference goes through fault(): recorded in THEMES.faults, logged to console, and surfaced in ONE
   combined banner. `opts.silent` is accepted and IGNORED (kept only so old callers don't throw).
   Also implemented `_index.json`'s declared `ultimateFallback`. Grid fetch failures fault too, and
   no longer cache the failure. THEMES.validate() reports every broken join reference without applying.

   HARD RULE (locked 2026-07-17): NO runtime color math. Every color is a literal hex from the grid.
   The button/surface gradient is TWO explicit hex stops (accent → accent-2) + the forms angle.

   =========================================================================
   SCHEMA 4 — THE TOGGLE IS A SLOT IN THE JOIN (2026-08-06). READ THIS ONE.
   =========================================================================
   SUPERSEDED, kept so nobody restores it: "BIDIRECTIONAL LIGHT/DARK (2026-07-17): each color row ships a
   DEFAULT ramp (bare 18 tokens; absolute mode = the `mode` column) + an opposite-mode neutral ramp in 11
   alt-* columns... Render rule: ramp = (wantMode === row.mode) ? bare : alt."

   That describes a table that no longer exists. Canonical `vectors/colors.tsv` has NO alt-* band: the
   one-row-per-mode reshape already happened, `alpine` and `alpine-light` are two independent rows, and
   `registry/_themes.json` went to schemaVersion 4 with an explicit `alt-color` pointer.

   🔴 THE COST, AND IT WAS SILENT: hasAlt() looked for `alt-bg` and friends, found nothing on all 39
   rows, so useAlt was permanently false and setMode() COULD NOT CHANGE A PIXEL. It did not throw. It
   resolved, re-applied the ramp already on screen, and returned a row. The one function whose entire job
   is switching schemes was a no-op against canonical data, and the only symptom was a button that did
   nothing. ⚑ A function that reads columns which no longer exist does not fail — it succeeds at
   nothing, which is the same failure mode this file was reopened for in July.

   🚫 THE OBVIOUS FIX IS FORBIDDEN IN WRITING. `docs/HOW-A-THEME-IS-CHOSEN.md` rule 4: "If you find
   yourself writing 'find the row that looks like this one's opposite,' stop — that is the bug this rule
   forbids, and it has been built and reverted twice." Stripping `-light` off a slug would be the third.

   ⭐ SO THE PAIR IS NOT DERIVED, IT IS DECLARED, AND IT WAS ALREADY THERE. A join names two colours by
   explicit slug. The toggle is therefore a SLOT — `primary` or `alt` — and switching means choosing the
   other pointer the author already wrote down. Consequences worth having, all of which a derived pair
   made impossible: two darks is legal, normal-and-party is legal, and `papyrus` (primary LIGHT, alt
   DARK) needs no special case at all.

   ⚠️ `mode` RESOLVES NOTHING. It is descriptive, per the registry's own rule. It is written to
   `data-mode` so CSS and a human can see it, and it is read for a decision in exactly one place:
   setMode(), which has its own note explaining why that is not rule 4 all over again.

   BACKWARD COMPATIBLE: THEMES.apply(colorSlug) still applies a COLOR only (existing apps rely on it).
     THEMES.applyFeeling(slug) is a DEPRECATED alias that now applies a FORMS row.
     THEMES.setMode('light'|'dark') still exists and now maps a mode onto a slot.
   New: applyTheme(joinSlug,{slot}); setSlot/getSlot/toggleSlot.
*/
(function(){
  /* ⭐ `link` ADDED 2026-08-06 AND IT HAD NEVER BEEN EMITTED. It is a real column in canonical
     colors.tsv and this list did not name it, so `--link` has never reached a single app through this
     resolver. It is authored on 2 of 39 rows (eos, eos-light) and doc-render-engine consumes the same
     column already — which is exactly how a token stays live in one consumer and invisible in another
     for weeks. Blank cells are skipped by the emitter below, so the other 37 rows are unaffected. */
  var COLOR_KEYS=["bg","surface-1","surface-2","surface-3","border","field","text","text-soft","text-faint","accent","accent-deep","accent-2","accent-soft","on-accent","link","good","warn","bad","info","data-1","data-2","data-3","data-4"];
  // 🪦 ALT_KEYS is GONE. It listed the 11 alt-* columns; canonical colors.tsv has none of them.
  // Do not reintroduce it: the opposite palette is a POINTER in the join, not a band in the row.
  // the three FEEL vectors, each its own grid + column set.
  var TYPO_KEYS=["font-display","font-body","font-mono","fs-lead","fs-body","fs-sm","fs-xs","track-tight","track-btn"];
  var FORM_KEYS=["radius","radius-lg","radius-pill","border-w","grad-angle","shadow-out","shadow-in","elev-1","elev-2","elev-3","motion-fast","motion-med","ease","lift"];
  var SPACE_KEYS=["touch","pad-cell","pad-card","gap-xs","gap-md","gap-lg"];
  // union, exported for consumers/tools that want the whole feel surface at once.
  var FEEL_KEYS=TYPO_KEYS.concat(FORM_KEYS, SPACE_KEYS);
  var DEFAULT='default-theme';
  // _index.json declares "ultimateFallback": "default-theme". It is honoured here.
  var ULTIMATE='default-theme';
  var SLOT_KEY='themes:slot';
  var MODE_KEY='themes:mode'; // legacy store, read once at boot for migration, never written again
  // hex ultimate fallback (default-theme mid-gray) so a fetch miss never white-screens.
  // NOTE: no `link` here on purpose — there is no honest grey for it, and a key ULT does not carry is
  // skipped rather than invented.
  var ULT={"bg":"#8f8f8f","surface-1":"#a0a0a0","surface-2":"#b0b0b0","surface-3":"#bfbfbf","border":"#565656","field":"#ababab","text":"#1c1c1c","text-soft":"#3f3f3f","text-faint":"#5b5b5b","accent":"#353535","accent-deep":"#222222","accent-2":"#515151","accent-soft":"#cccccc","on-accent":"#f6f6f6","good":"#757575","warn":"#656565","bad":"#3f3f3f","info":"#5b5b5b","data-1":"#4f9fe0","data-2":"#e07bad","data-3":"#46c48a","data-4":"#e0a84f"};

  var base=(function(){ var s=document.currentScript&&document.currentScript.src; if(!s){var e=document.getElementsByTagName('script');s=e[e.length-1].src;} return s.replace(/[^/]*$/,''); })();
  /* REPOINTED 2026-08-06 for maw-themes: in ClickUp_apps the grids, the registry and this file were all
     one flat folder. Here they are three (engine/ vectors/ registry/), which is the point of the split.
     `base` stays exported unchanged - consumers read it. */
  var GRIDS=base+'../vectors/';
  var REG=base+'../registry/';

  /* The active SLOT: 'primary' or 'alt'. Persisted, because a reader who picked one expects it to stick.
     A pre-schema-4 store held a MODE under a different key; it is read once so an existing user is not
     silently bounced, and never written again. A legacy value cannot be mapped to a slot without a join
     in hand, so that migration is deliberately lossy in one direction only: anything unknown -> primary. */
  var _slot=(function(){
    try{
      var s=localStorage.getItem(SLOT_KEY);
      if(s==='primary'||s==='alt') return s;
      if(localStorage.getItem(MODE_KEY)) return 'primary';
    }catch(e){}
    return 'primary';
  })();
  function storeSlot(s){ try{ localStorage.setItem(SLOT_KEY,s); }catch(e){} }

  // the join currently applied, so setSlot/setMode can re-resolve without the caller re-stating it.
  var _join=null;

  /* ---------------------------------------------------------------------------
     THE FAULT LEDGER — the only path for an unresolved reference.
     Rule: a theme reference that cannot be resolved is ALWAYS announced. There is
     no silent fallback and no way to ask for one. `opts.silent` is accepted and
     ignored on purpose, so legacy callers keep working but stop hiding failures.
     `opts.collect` only DEFERS the paint (so a 4-vector join emits one banner
     instead of four); it never suppresses the record or the console.

     ⚠️ SCHEMA 4 RAISED THE STAKES HERE, BY DESIGN. The registry says so itself:
     "Because the pair is a POINTER it can dangle, which a derived pair could not.
     A consumer MUST report an unresolvable slug by name and must never fall back
     silently — that is the whole price of the expressiveness, paid openly."
     This ledger IS that payment. A dangling `alt-color` is reported BY NAME.
  --------------------------------------------------------------------------- */
  var FAULTS=[];

  function paintBanner(){
    if(!FAULTS.length) return;
    // resolve.js is often loaded in <head>; appending to documentElement there was
    // why the banner sometimes never appeared. Wait for a body.
    if(!document.body){ document.addEventListener('DOMContentLoaded',paintBanner,{once:true}); return; }
    var d=document.getElementById('themes-fault-banner');
    if(!d){
      d=document.createElement('div');
      d.id='themes-fault-banner';
      d.setAttribute('role','alert');
      d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#b23a2f;color:#fff;font:600 13px ui-monospace,Menlo,monospace;padding:8px 14px;text-align:center;line-height:1.4';
      document.body.appendChild(d);
    }
    var seen={},lines=[];
    FAULTS.forEach(function(m){ if(!seen[m]){ seen[m]=1; lines.push(m); } });
    d.textContent='themes: '+lines.join('  ·  ');
  }

  function fault(msg,opts){
    opts=opts||{};
    FAULTS.push(msg);
    try{ console.error('[themes] '+msg); }catch(e){}
    if(typeof opts.onError==='function'){ try{ opts.onError(msg); }catch(e){} }
    if(opts.collect){ opts.collect.push(msg); return; } // deferred paint, NOT suppressed
    paintBanner();
  }

  function getText(url){ return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); }); }
  function getJSON(url){ return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
  // parse TSV -> { head, rows:{slug:{col:val}}, order:[slug...] }
  function parseTSV(txt){
    var lines=txt.replace(/\r/g,'').split('\n').filter(function(l){return l.length;});
    var head=lines[0].split('\t'); var rows={}, order=[];
    for(var i=1;i<lines.length;i++){ var c=lines[i].split('\t'); var o={}; for(var j=0;j<head.length;j++){ o[head[j]]=c[j]; } if(o.slug){ rows[o.slug]=o; order.push(o.slug); } }
    return { head:head, rows:rows, order:order };
  }
  var EMPTY={head:[],rows:{},order:[]};

  var _colors=null,_typo=null,_forms=null,_space=null,_themes=null;
  // A failed grid fetch faults loudly and is NOT cached — a transient 404 or an offline
  // first paint used to poison the grid for the whole page lifetime.
  function loadGrid(file,cached,set){
    if(cached) return Promise.resolve(cached);
    return getText(GRIDS+file).then(parseTSV).then(function(d){ set(d); return d; })
      .catch(function(e){ fault('failed to load '+file+' ('+(e&&e.message||'error')+')'); return EMPTY; });
  }
  function loadColors(){ return loadGrid('colors.tsv',_colors,function(d){_colors=d;}); }
  function loadTypography(){ return loadGrid('typography.tsv',_typo,function(d){_typo=d;}); }
  function loadForms(){ return loadGrid('forms.tsv',_forms,function(d){_forms=d;}); }
  function loadSpacing(){ return loadGrid('spacing.tsv',_space,function(d){_space=d;}); }
  function loadThemes(){
    if(_themes) return Promise.resolve(_themes);
    return getJSON(REG+'_themes.json').then(function(j){ _themes=(j&&j.themes)||[]; return _themes; })
      .catch(function(e){ fault('failed to load _themes.json ('+(e&&e.message||'error')+')'); return []; });
  }

  function findJoin(slug){ var l=_themes||[]; for(var i=0;i<l.length;i++){ if(l[i].slug===slug) return l[i]; } return null; }
  /* The two colour pointers a join declares, in slot order. `alt-color` may be ABSENT, which is legal —
     a join with one colour simply has no second state — and is NOT the same thing as a pointer that is
     present and dangling. The two get different messages below, deliberately. */
  function slotColor(t,slot){ if(!t) return null; return (slot==='alt') ? (t['alt-color']||null) : (t.color||null); }

  /* apply a COLOR row (hex) to the root.
     ⚠️ NO MODE ARGUMENT ANY MORE. A canonical colour row is one complete palette; there is nothing to
     flip inside it. Callers that still pass opts.mode are harmless — it is ignored, and setMode() is
     where that intent now lands. */
  function applyColor(slug,opts){
    opts=opts||{}; var root=opts.root||document.documentElement;
    return loadColors().then(function(d){
      var row=d.rows[slug];
      if(!row){
        fault('unknown color "'+slug+'" → gray fallback ramp',opts);
        root.setAttribute('data-theme','!'+slug);
        COLOR_KEYS.forEach(function(k){ if(ULT[k]) root.style.setProperty('--'+k,ULT[k]); });
        return null;
      }
      COLOR_KEYS.forEach(function(k){
        var val=row[k];
        /* A BLANK CELL IS SKIPPED, NOT ZEROED. `link` is blank on 37 of 39 rows and a consumer's
           var(--link, var(--accent)) fallback is the documented migration path — writing an empty
           string here would defeat it by making the property exist and be worthless. */
        if(val!=null && val!==''){ root.style.setProperty('--'+k,val); }
      });
      if(row.mode){ root.setAttribute('data-mode',row.mode); }
      root.setAttribute('data-theme',slug);
      return row;
    });
  }

  // generic FEEL-vector applier: set the vector's columns from its grid row.
  function applyVector(loader,keys,attr,slug,opts){
    opts=opts||{}; var root=opts.root||document.documentElement;
    return loader().then(function(d){
      var row=d.rows[slug];
      if(!row){
        // THE BUG THIS FILE WAS OPENED FOR: this branch used to be reachable in total silence.
        fault('unknown '+attr+' "'+slug+'" → this vector is NOT applied',opts);
        root.setAttribute('data-'+attr,'!'+slug); // the DOM states the failure too, not just a banner
        return null;
      }
      keys.forEach(function(k){ if(row[k]!=null && row[k]!==''){ root.style.setProperty('--'+k,row[k]); } });
      root.setAttribute('data-'+attr,slug);
      return row;
    });
  }
  function applyTypography(slug,opts){ return applyVector(loadTypography,TYPO_KEYS,'typography',slug,opts); }
  function applyForms(slug,opts){ return applyVector(loadForms,FORM_KEYS,'forms',slug,opts).then(function(r){ setGrad((opts&&opts.root)||document.documentElement); return r; }); }
  function applySpacing(slug,opts){ return applyVector(loadSpacing,SPACE_KEYS,'spacing',slug,opts); }
  // DEPRECATED alias: old callers said applyFeeling(slug) meaning the tactile vector -> now FORMS.
  function applyFeeling(slug,opts){ return applyForms(slug,opts); }

  // gradient = TWO explicit hex stops (accent → accent-2, a two-HUE sweep) + the forms angle. No color math.
  function setGrad(root){
    root=root||document.documentElement;
    root.style.setProperty('--accent-grad','linear-gradient(var(--grad-angle,135deg), var(--accent), var(--accent-2))');
    root.style.setProperty('--surface-grad','var(--surface-2)');
  }

  /* apply a THEME (the JOIN) = one of its two colours + typography + forms + spacing.
     opts.slot = 'primary' | 'alt'. Defaults to the persisted slot.
     Every vector reports into ONE shared bucket, so a broken join emits a single combined banner
     instead of four separate ones — or, as it used to, none at all. */
  function applyTheme(slug,opts){
    opts=opts||{}; var root=opts.root||document.documentElement;
    var bucket=[];
    var slot=(opts.slot==='alt'||opts.slot==='primary')?opts.slot:_slot;
    return Promise.all([loadThemes(),loadColors()]).then(function(both){
      var cols=both[1];
      var t=findJoin(slug);
      if(!t){
        /* ⭐ THE AMBIGUITY REPORT. `eos`, `papyrus` and `database` each exist as BOTH a join and an
           entity, and the contract names that as the reason a bug hid for a day: "eos appeared to work
           because a join and a colour happen to share the name and point at each other." So a name that
           is not a join but IS a colour gets its own message rather than the generic one — the caller
           almost certainly wanted applyColor(), and saying so beats a grey ramp. */
        if(cols && cols.rows[slug]){
          fault('"'+slug+'" is a COLOUR, not a theme → applied the colour only; no typography/forms/spacing',{collect:bucket,onError:opts.onError});
          root.setAttribute('data-theme-join','!'+slug);
          return applyColor(slug,{root:root,collect:bucket}).then(function(){ setGrad(root); paintBanner(); return null; });
        }
        fault('unknown theme "'+slug+'" → fell back to '+ULTIMATE,{collect:bucket,onError:opts.onError});
        root.setAttribute('data-theme-join','!'+slug);
        return applyColor(ULTIMATE,{root:root,collect:bucket}).then(function(){
          setGrad(root); paintBanner(); return null;
        });
      }

      /* SLOT RESOLUTION. Absent alt-color and dangling alt-color are different problems and get
         different sentences: one is a join that only has one state, the other is the pointer-can-dangle
         price the registry warns about, and it is reported BY NAME. */
      var want=slotColor(t,slot);
      if(slot==='alt'){
        if(!want){
          fault('theme "'+slug+'" declares no alt-color → staying on its primary colour',{collect:bucket});
          slot='primary'; want=slotColor(t,'primary');
        } else if(cols && !cols.rows[want]){
          fault('theme "'+slug+'" alt-color "'+want+'" does not exist in colors.tsv → staying on its primary colour',{collect:bucket});
          slot='primary'; want=slotColor(t,'primary');
        }
      }

      var jobs=[];
      // a 4-pointer join is the contract: a MISSING pointer is a fault, not a shrug.
      if(want) jobs.push(applyColor(want,{root:root,collect:bucket}));
      else { fault('theme "'+slug+'" declares no color → fell back to '+ULTIMATE,{collect:bucket}); jobs.push(applyColor(ULTIMATE,{root:root,collect:bucket})); }
      if(t.typography) jobs.push(applyTypography(t.typography,{root:root,collect:bucket}));
      else fault('theme "'+slug+'" declares no typography vector',{collect:bucket});
      if(t.forms) jobs.push(applyForms(t.forms,{root:root,collect:bucket}));
      else fault('theme "'+slug+'" declares no forms vector',{collect:bucket});
      if(t.spacing) jobs.push(applySpacing(t.spacing,{root:root,collect:bucket}));
      else fault('theme "'+slug+'" declares no spacing vector',{collect:bucket});
      return Promise.all(jobs).then(function(){
        setGrad(root);
        _join=t; _slot=slot;
        root.setAttribute('data-theme-join',slug);
        root.setAttribute('data-slot',slot);
        if(bucket.length){ root.setAttribute('data-theme-faults',String(bucket.length)); paintBanner(); }
        return t;
      });
    });
  }

  // ---- pre-flight ----
  // Report every broken vector reference across every join WITHOUT applying anything.
  // For the Studio, for a build check, and for "did I typo that new row" before shipping.
  function validate(){
    return ready.then(function(){
      var out=[];
      function chk(t,vec,ref,grid,optional){
        if(!ref){ if(!optional) out.push({theme:t.slug,vector:vec,ref:null,problem:'missing pointer'}); return; }
        if(!grid || !grid.rows[ref]){ out.push({theme:t.slug,vector:vec,ref:ref,problem:'no such row'}); }
      }
      (_themes||[]).forEach(function(t){
        chk(t,'color',t.color,_colors);
        // `alt-color` is OPTIONAL-BUT-CHECKED: absent is legal, present-and-dangling is not.
        chk(t,'alt-color',t['alt-color'],_colors,true);
        chk(t,'typography',t.typography,_typo);
        chk(t,'forms',t.forms,_forms);
        chk(t,'spacing',t.spacing,_space);
        /* ⚠️ THE MODE SANITY WARNING THE REGISTRY ASKED FOR, and it is a WARNING not an error:
           "`mode` resolves nothing any more. It is descriptive, and it exists so a consumer can warn
           when a dark palette lands in a light slot." Two colours sharing a mode is explicitly legal
           (two darks, normal-and-party), so this reports and never blocks. */
        var a=_colors&&_colors.rows[t.color], b=_colors&&_colors.rows[t['alt-color']];
        if(a&&b&&a.mode&&b.mode&&a.mode===b.mode){
          out.push({theme:t.slug,vector:'mode',ref:a.mode,problem:'both colours declare mode "'+a.mode+'" — legal, but a light/dark toggle will not visibly change'});
        }
      });
      // name collisions across namespaces — the documented reason a bug hid for a day.
      (_themes||[]).forEach(function(t){
        var also=[];
        if(_colors&&_colors.rows[t.slug]) also.push('color');
        if(_typo&&_typo.rows[t.slug]) also.push('typography');
        if(_forms&&_forms.rows[t.slug]) also.push('forms');
        if(_space&&_space.rows[t.slug]) also.push('spacing');
        if(also.length) out.push({theme:t.slug,vector:'slug',ref:also.join('+'),problem:'join slug also names an entity — resolve a bare name as a JOIN first'});
      });
      return out;
    });
  }

  // ---- the toggle ----
  function setSlot(slot,opts){
    opts=opts||{};
    if(slot!=='primary'&&slot!=='alt'){ fault('unknown slot "'+slot+'" → expected "primary" or "alt"'); return Promise.resolve(null); }
    _slot=slot;
    if(opts.persist!==false) storeSlot(slot);
    var root=opts.root||document.documentElement;
    if(_join) return applyTheme(_join.slug,{root:root,slot:slot});
    // No join applied: a bare colour is on screen and has no declared partner. Say so rather than guess.
    fault('setSlot("'+slot+'") with no theme applied → a colour on its own has no second state; call applyTheme() first');
    return Promise.resolve(null);
  }
  function getSlot(){ return _slot; }
  function toggleSlot(opts){ return setSlot(_slot==='alt'?'primary':'alt',opts); }

  /* setMode('light'|'dark') — COMPAT SHIM, and the one place `mode` is read for a decision.

     ⚠️ THIS IS NOT RULE 4 ALL OVER AGAIN, AND THE DISTINCTION IS THE WHOLE POINT. Rule 4 bans using the
     colour table to FIND a partner. This does not search: the join has already named exactly two rows,
     and this asks which of those two GIVEN rows calls itself 'light'. Deriving a pair is forbidden;
     disambiguating a declared pair is what `mode` was explicitly kept for.

     If that is not exactly one row — neither says 'light', or both do — it reports BY NAME and changes
     nothing. Guessing there would resurrect the bug rule 4 exists to prevent. */
  function setMode(mode,opts){
    opts=opts||{};
    if(!_join){ fault('setMode("'+mode+'") with no theme applied → call applyTheme() first, or use setSlot()'); return Promise.resolve(null); }
    return loadColors().then(function(d){
      var t=_join, hits=[];
      ['primary','alt'].forEach(function(s){
        var slug=slotColor(t,s); if(!slug) return;
        var row=d.rows[slug]; if(row && row.mode===mode) hits.push(s);
      });
      if(hits.length!==1){
        fault('theme "'+t.slug+'" has '+(hits.length===0?'no':'more than one')+' colour declaring mode "'+mode+'" ('+(t.color||'-')+' / '+(t['alt-color']||'-')+') → slot unchanged. Use setSlot("primary"|"alt").');
        return null;
      }
      return setSlot(hits[0],opts);
    });
  }
  /* getMode reports the mode of what is ACTUALLY on screen, read back off the root. Descriptive, like
     the column: it answers "what am I looking at", never "what did somebody ask for". */
  function getMode(){ return document.documentElement.getAttribute('data-mode')||null; }
  /* supportsMode(themeSlug, mode) — asks the JOIN, not a colour row. A colour row is one palette in one
     mode and can never "support" another, so the old colour-level version could only ever have been
     answering for the alt-* band that no longer exists. */
  function supportsMode(slug,mode){
    return Promise.all([loadThemes(),loadColors()]).then(function(both){
      var t=findJoin(slug); if(!t) return false;
      var d=both[1], ok=false;
      ['primary','alt'].forEach(function(s){ var c=slotColor(t,s); var row=c&&d.rows[c]; if(row&&row.mode===mode) ok=true; });
      return ok;
    });
  }

  // legacy alias: apply(colorSlug) applies a COLOR (kept for existing consumers)
  function apply(slug,opts){ return applyColor(slug,opts); }
  // legacy resolve(slug): returns {slug,tokens} for a COLOR row. No mode argument: a row is one palette.
  function resolve(slug){
    return loadColors().then(function(d){
      var row=d.rows[slug]||null;
      if(!row){ fault('resolve("'+slug+'") → no such colour; returning the grey fallback'); }
      var out={};
      COLOR_KEYS.forEach(function(k){ var v=row?row[k]:null; if(v==null||v===''){ v=ULT[k]||null; } if(v) out[k]=v; });
      return {slug:slug,mode:(row&&row.mode)||null,tokens:out,found:!!row};
    });
  }
  function listColors(){ return loadColors().then(function(d){ return d.order.map(function(s){ var row=d.rows[s]; return {slug:s,mode:row.mode,accent:row.accent}; }); }); }
  function listTypography(){ return loadTypography().then(function(d){ return d.order.map(function(s){ return {slug:s}; }); }); }
  function listForms(){ return loadForms().then(function(d){ return d.order.map(function(s){ return {slug:s}; }); }); }
  function listSpacing(){ return loadSpacing().then(function(d){ return d.order.map(function(s){ return {slug:s}; }); }); }
  function listThemes(){ return loadThemes(); }
  // legacy alias kept so old callers of listFeelings() don't break; now lists FORMS.
  function listFeelings(){ return listForms(); }

  var ready=Promise.all([loadColors(),loadTypography(),loadForms(),loadSpacing(),loadThemes()]).then(function(){
    window.THEMES.colors=(_colors&&_colors.rows)||{};
    window.THEMES.typography=(_typo&&_typo.rows)||{};
    window.THEMES.forms=(_forms&&_forms.rows)||{};
    window.THEMES.spacing=(_space&&_space.rows)||{};
    window.THEMES.themes=_themes||[];
    return true;
  });

  window.THEMES={
    apply:apply, applyColor:applyColor,
    applyTypography:applyTypography, applyForms:applyForms, applySpacing:applySpacing,
    applyFeeling:applyFeeling, applyTheme:applyTheme,
    setSlot:setSlot, getSlot:getSlot, toggleSlot:toggleSlot,
    setMode:setMode, getMode:getMode, supportsMode:supportsMode,
    resolve:resolve, validate:validate,
    listColors:listColors, listTypography:listTypography, listForms:listForms, listSpacing:listSpacing,
    listThemes:listThemes, listFeelings:listFeelings,
    COLOR_KEYS:COLOR_KEYS, TYPO_KEYS:TYPO_KEYS, FORM_KEYS:FORM_KEYS, SPACE_KEYS:SPACE_KEYS, FEEL_KEYS:FEEL_KEYS,
    DEFAULT:DEFAULT, ULTIMATE:ULTIMATE, base:base, ready:ready,
    faults:FAULTS,
    colors:{}, typography:{}, forms:{}, spacing:{}, themes:[]
  };
})();
