/* maw-themes/engine/resolve.js — TSV-sourced resolver for the 4-VECTOR theme system.

   A THEME is a JOIN of four independent vectors, each its own grid:
     vectors/colors.tsv      one row per COLOR, hex only. HEX IS CANONICAL.
     vectors/typography.tsv  fonts, fs-* ramp, tracking
     vectors/forms.tsv       radii, border-w, gradient ANGLE, shadows, elevation, motion
     vectors/spacing.tsv     touch target, pad-*, gap-*
     registry/_themes.json   the JOIN: { slug, color, alt-color, typography, forms, spacing }

   WHY lives in the maw-themes Decision Log (a ClickUp doc). This header is the WHAT plus the
   warnings that must travel with the code. Keep it that way: this file hit 28KB against a ~22KB
   read ceiling once, purely on commentary, and a file that cannot be read whole cannot be safely
   edited.

   HARD RULE (locked 2026-07-17): NO runtime color math. Every colour is a literal hex from the
   grid. The gradient is TWO explicit hex stops (accent → accent-2) + the forms angle.

   NO SILENT PATH (2026-07-25): every unresolved reference goes through fault() — recorded in
   THEMES.faults, logged, and surfaced in ONE banner. `opts.silent` is accepted and IGNORED, so
   legacy callers keep working but stop hiding failures. A fallback that does not announce itself
   is not graceful degradation, it is a lie.

   =========================================================================
   SCHEMA 4 — THE TOGGLE IS A SLOT IN THE JOIN (2026-08-06)
   =========================================================================
   🪦 SUPERSEDED, kept so nobody restores it: colour rows used to ship an 11-column `alt-*` band and
   this file flipped between the bare ramp and that band. Canonical colors.tsv has NO alt-* columns
   — `alpine` and `alpine-light` are separate rows, and the join declares an explicit `alt-color`.

   🔴 THE OLD CODE FAILED SILENTLY: hasAlt() found no alt-* on any of the 39 rows, so setMode()
   could not change a pixel. It did not throw — it re-applied the ramp already on screen. ⚑ A
   function reading columns that no longer exist does not fail, it succeeds at nothing.

   🚫 NEVER DERIVE THE PARTNER FROM THE SLUG. HOW-A-THEME-IS-CHOSEN rule 4: "if you find yourself
   writing 'find the row that looks like this one's opposite,' stop — that is the bug this rule
   forbids, and it has been built and reverted twice."

   ⭐ The pair is DECLARED, not derived. The toggle is a SLOT — `primary` or `alt` — choosing
   between two pointers the author wrote down. So two darks is legal, and `papyrus` (primary LIGHT,
   alt DARK) needs no special case.

   ⚠️ `mode` RESOLVES NOTHING. Descriptive only. Written to `data-mode`; read for a decision in
   exactly one place, setMode(), which explains itself there.

   BACKWARD COMPATIBLE: apply(colorSlug) applies a COLOR only. applyFeeling(slug) is a DEPRECATED
   alias for FORMS. setMode('light'|'dark') maps a mode onto a slot.
   New: applyTheme(joinSlug,{slot}) · setSlot/getSlot/toggleSlot · validate().
*/
(function(){
  /* ⭐ `link` was added 2026-08-06 and had NEVER been emitted: it is a real canonical column and this
     list did not name it, so --link never reached an app through this resolver while doc-render-engine
     consumed the same column all along. Authored on 2 of 39 rows; blank cells are skipped below, so the
     other 37 keep working through their var(--link, var(--accent)) fallback. */
  var COLOR_KEYS=["bg","surface-1","surface-2","surface-3","border","field","text","text-soft","text-faint","accent","accent-deep","accent-2","accent-soft","on-accent","link","good","warn","bad","info","data-1","data-2","data-3","data-4"];
  // 🪦 ALT_KEYS is GONE. Do not reintroduce it: the opposite palette is a POINTER in the join,
  // never a band in the row.
  var TYPO_KEYS=["font-display","font-body","font-mono","fs-lead","fs-body","fs-sm","fs-xs","track-tight","track-btn"];
  var FORM_KEYS=["radius","radius-lg","radius-pill","border-w","grad-angle","shadow-out","shadow-in","elev-1","elev-2","elev-3","motion-fast","motion-med","ease","lift"];
  var SPACE_KEYS=["touch","pad-cell","pad-card","gap-xs","gap-md","gap-lg"];
  var FEEL_KEYS=TYPO_KEYS.concat(FORM_KEYS, SPACE_KEYS);
  var DEFAULT='default-theme';
  var ULTIMATE='default-theme';   // _index.json's declared ultimateFallback, honoured here
  var SLOT_KEY='themes:slot';
  var MODE_KEY='themes:mode';     // pre-schema-4 store: read once for migration, never written again
  // Grey fallback so a fetch miss never white-screens. No `link` on purpose: there is no honest grey
  // for it, and a key ULT does not carry is skipped rather than invented.
  var ULT={"bg":"#8f8f8f","surface-1":"#a0a0a0","surface-2":"#b0b0b0","surface-3":"#bfbfbf","border":"#565656","field":"#ababab","text":"#1c1c1c","text-soft":"#3f3f3f","text-faint":"#5b5b5b","accent":"#353535","accent-deep":"#222222","accent-2":"#515151","accent-soft":"#cccccc","on-accent":"#f6f6f6","good":"#757575","warn":"#656565","bad":"#3f3f3f","info":"#5b5b5b","data-1":"#4f9fe0","data-2":"#e07bad","data-3":"#46c48a","data-4":"#e0a84f"};

  var base=(function(){ var s=document.currentScript&&document.currentScript.src; if(!s){var e=document.getElementsByTagName('script');s=e[e.length-1].src;} return s.replace(/[^/]*$/,''); })();
  // REPOINTED 2026-08-06: in ClickUp_apps these were one flat folder; here they are three.
  // `base` stays exported unchanged — consumers read it.
  var GRIDS=base+'../vectors/';
  var REG=base+'../registry/';

  /* Active SLOT, persisted so a reader's choice sticks. A pre-schema-4 stored MODE cannot be mapped to
     a slot without a join in hand, so it migrates to 'primary' rather than being silently ignored. */
  var _slot=(function(){
    try{
      var s=localStorage.getItem(SLOT_KEY);
      if(s==='primary'||s==='alt') return s;
      if(localStorage.getItem(MODE_KEY)) return 'primary';
    }catch(e){}
    return 'primary';
  })();
  function storeSlot(s){ try{ localStorage.setItem(SLOT_KEY,s); }catch(e){} }

  var _join=null;   // the join currently applied, so setSlot/setMode can re-resolve on their own

  /* THE FAULT LEDGER — the only path for an unresolved reference. `opts.collect` DEFERS the paint so a
     4-vector join emits one banner instead of four; it never suppresses the record or the console.
     ⚠️ Schema 4 raised the stakes here by design: the registry warns that "because the pair is a
     POINTER it can dangle, which a derived pair could not... a consumer MUST report an unresolvable
     slug by name and must never fall back silently." This ledger is that payment. */
  var FAULTS=[];

  function paintBanner(){
    if(!FAULTS.length) return;
    // often loaded in <head>; appending to documentElement there is why the banner used to vanish.
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
    if(opts.collect){ opts.collect.push(msg); return; }
    paintBanner();
  }

  function getText(url){ return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); }); }
  function getJSON(url){ return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
  function parseTSV(txt){
    var lines=txt.replace(/\r/g,'').split('\n').filter(function(l){return l.length;});
    var head=lines[0].split('\t'); var rows={}, order=[];
    for(var i=1;i<lines.length;i++){ var c=lines[i].split('\t'); var o={}; for(var j=0;j<head.length;j++){ o[head[j]]=c[j]; } if(o.slug){ rows[o.slug]=o; order.push(o.slug); } }
    return { head:head, rows:rows, order:order };
  }
  var EMPTY={head:[],rows:{},order:[]};

  var _colors=null,_typo=null,_forms=null,_space=null,_themes=null;
  // A failed grid fetch faults loudly and is NOT cached — a transient 404 used to poison the grid for
  // the whole page lifetime.
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
  // `alt-color` may be ABSENT (legal — the join has one state) which is NOT the same as present and
  // dangling. They get different messages below, deliberately.
  function slotColor(t,slot){ if(!t) return null; return (slot==='alt') ? (t['alt-color']||null) : (t.color||null); }

  // ⚠️ NO MODE ARGUMENT. A canonical colour row is one complete palette; nothing flips inside it.
  // Callers still passing opts.mode are harmless — it is ignored, and setMode() is where that lands.
  function applyColor(slug,opts){
    opts=opts||{}; var root=opts.root||document.documentElement;
    return loadColors().then(function(d){
      var row=d.rows[slug];
      if(!row){
        fault('unknown color "'+slug+'" → grey fallback ramp',opts);
        root.setAttribute('data-theme','!'+slug);
        COLOR_KEYS.forEach(function(k){ if(ULT[k]) root.style.setProperty('--'+k,ULT[k]); });
        return null;
      }
      // A BLANK CELL IS SKIPPED, NOT ZEROED — writing '' would make the property exist and be
      // worthless, defeating a consumer's var(--link, var(--accent)) fallback.
      COLOR_KEYS.forEach(function(k){
        var val=row[k];
        if(val!=null && val!==''){ root.style.setProperty('--'+k,val); }
      });
      if(row.mode){ root.setAttribute('data-mode',row.mode); }
      root.setAttribute('data-theme',slug);
      return row;
    });
  }

  function applyVector(loader,keys,attr,slug,opts){
    opts=opts||{}; var root=opts.root||document.documentElement;
    return loader().then(function(d){
      var row=d.rows[slug];
      if(!row){
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
  function applyFeeling(slug,opts){ return applyForms(slug,opts); }  // DEPRECATED alias -> FORMS

  function setGrad(root){
    root=root||document.documentElement;
    root.style.setProperty('--accent-grad','linear-gradient(var(--grad-angle,135deg), var(--accent), var(--accent-2))');
    root.style.setProperty('--surface-grad','var(--surface-2)');
  }

  /* apply a THEME (the JOIN) = one of its two colours + typography + forms + spacing.
     opts.slot = 'primary' | 'alt', defaulting to the persisted slot. */
  function applyTheme(slug,opts){
    opts=opts||{}; var root=opts.root||document.documentElement;
    var bucket=[];
    var slot=(opts.slot==='alt'||opts.slot==='primary')?opts.slot:_slot;
    return Promise.all([loadThemes(),loadColors()]).then(function(both){
      var cols=both[1];
      var t=findJoin(slug);
      if(!t){
        /* ⭐ AMBIGUITY REPORT. `eos`, `papyrus` and `database` each exist as BOTH a join and an entity,
           which the contract names as the reason a bug hid for a day. A name that is a COLOUR but not a
           theme gets its own message — the caller almost certainly wanted applyColor(). */
        if(cols && cols.rows[slug]){
          fault('"'+slug+'" is a COLOUR, not a theme → applied the colour only; no typography/forms/spacing',{collect:bucket,onError:opts.onError});
          root.setAttribute('data-theme-join','!'+slug);
          return applyColor(slug,{root:root,collect:bucket}).then(function(){ setGrad(root); paintBanner(); return null; });
        }
        fault('unknown theme "'+slug+'" → fell back to '+ULTIMATE,{collect:bucket,onError:opts.onError});
        root.setAttribute('data-theme-join','!'+slug);
        return applyColor(ULTIMATE,{root:root,collect:bucket}).then(function(){ setGrad(root); paintBanner(); return null; });
      }

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

  // ---- pre-flight: report every broken reference WITHOUT applying anything ----
  function validate(){
    return ready.then(function(){
      var out=[];
      function chk(t,vec,ref,grid,optional){
        if(!ref){ if(!optional) out.push({theme:t.slug,vector:vec,ref:null,problem:'missing pointer'}); return; }
        if(!grid || !grid.rows[ref]){ out.push({theme:t.slug,vector:vec,ref:ref,problem:'no such row'}); }
      }
      (_themes||[]).forEach(function(t){
        chk(t,'color',t.color,_colors);
        chk(t,'alt-color',t['alt-color'],_colors,true);  // absent is legal; dangling is not
        chk(t,'typography',t.typography,_typo);
        chk(t,'forms',t.forms,_forms);
        chk(t,'spacing',t.spacing,_space);
        /* ⚠️ WARNING, never an error. Two colours sharing a mode is explicitly legal (two darks,
           normal-and-party) — this is the "you put a dark palette in the light slot" warning that
           `mode` was kept alive for. */
        var a=_colors&&_colors.rows[t.color], b=_colors&&_colors.rows[t['alt-color']];
        if(a&&b&&a.mode&&b.mode&&a.mode===b.mode){
          out.push({theme:t.slug,vector:'mode',ref:a.mode,problem:'both colours declare mode "'+a.mode+'" — legal, but a light/dark toggle will not visibly change'});
        }
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
    fault('setSlot("'+slot+'") with no theme applied → a colour on its own has no second state; call applyTheme() first');
    return Promise.resolve(null);
  }
  function getSlot(){ return _slot; }
  function toggleSlot(opts){ return setSlot(_slot==='alt'?'primary':'alt',opts); }

  /* setMode('light'|'dark') — COMPAT SHIM, and the one place `mode` is read for a decision.
     ⚠️ NOT rule 4 again: rule 4 bans using the colour table to FIND a partner. This does not search —
     the join already named exactly two rows, and this asks which of those two GIVEN rows calls itself
     'light'. If that is not exactly one row it reports BY NAME and changes nothing, because guessing
     there is the banned thing. */
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
  // Descriptive, like the column: answers "what am I looking at", never "what did somebody ask for".
  function getMode(){ return document.documentElement.getAttribute('data-mode')||null; }
  // Asks the JOIN, not a colour row: a colour row is one palette in one mode and can never support
  // another, so the old colour-level version could only ever have answered for the dead alt-* band.
  function supportsMode(slug,mode){
    return Promise.all([loadThemes(),loadColors()]).then(function(both){
      var t=findJoin(slug); if(!t) return false;
      var d=both[1], ok=false;
      ['primary','alt'].forEach(function(s){ var c=slotColor(t,s); var row=c&&d.rows[c]; if(row&&row.mode===mode) ok=true; });
      return ok;
    });
  }

  function apply(slug,opts){ return applyColor(slug,opts); }   // legacy: applies a COLOR
  // legacy resolve(slug): tokens for a COLOR row. No mode argument — a row is one palette.
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
  function listFeelings(){ return listForms(); }   // legacy alias -> FORMS

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
