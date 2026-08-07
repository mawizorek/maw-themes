/* shared/themes/resolve.js — TSV-sourced resolver for the 4-VECTOR theme system.
   A THEME is a JOIN of four independent vectors, each its own TSV grid:
     - colors.tsv      : one row per COLOR, hex values + 11 alt-* cols + data-1..4. HEX IS CANONICAL.
     - typography.tsv  : one row per TYPOGRAPHY set (fonts incl. font-mono, fs-* ramp, tracking).
     - forms.tsv       : one row per FORMS set (radii, border-w, gradient ANGLE, shadows, elev-1/2/3, motion).
     - spacing.tsv     : one row per SPACING set (touch target, pad-*, gap-*).
     - _themes.json    : the JOIN — { slug, color, typography, forms, spacing }. Apps reference a THEME slug.

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
   Also implemented `_index.json`'s declared `ultimateFallback` — an unknown THEME slug used to banner and
   then apply nothing at all, which was harsher than the color path. Grid fetch failures fault too, and
   no longer cache the failure. New THEMES.validate() reports every broken join reference without applying.

   HARD RULE (locked 2026-07-17): NO runtime color math. Every color is a literal hex from the grid.
   The button/surface gradient is TWO explicit hex stops (accent → accent-2) + the forms angle.

   BIDIRECTIONAL LIGHT/DARK (2026-07-17): each color row ships a DEFAULT ramp (bare 18 tokens; absolute
     mode = the `mode` column) + an opposite-mode neutral ramp in 11 alt-* columns. Brand, semantics, and
     data-1..4 are SHARED across modes. Render rule: ramp = (wantMode === row.mode) ? bare : alt.

   BACKWARD COMPATIBLE: THEMES.apply(colorSlug) still applies a COLOR only (existing apps rely on it).
     THEMES.applyFeeling(slug) is a DEPRECATED alias that now applies a FORMS row (feelings ≈ forms
     historically) so any legacy caller degrades gracefully rather than erroring.
   New/fixed: applyTheme(joinSlug) composes 4 vectors; applyTypography/applyForms/applySpacing(slug);
     listTypography/listForms/listSpacing/listThemes; setMode/getMode/supportsMode; THEMES.ready;
     THEMES.faults; THEMES.validate().
*/
(function(){
  var COLOR_KEYS=["bg","surface-1","surface-2","surface-3","border","field","text","text-soft","text-faint","accent","accent-deep","accent-2","accent-soft","on-accent","good","warn","bad","info","data-1","data-2","data-3","data-4"];
  // the 11 tokens that flip between modes (have alt-* columns). Everything else is shared identity.
  var ALT_KEYS=["bg","surface-1","surface-2","surface-3","border","field","text","text-soft","text-faint","accent-soft","on-accent"];
  // the three FEEL vectors, each its own grid + column set.
  var TYPO_KEYS=["font-display","font-body","font-mono","fs-lead","fs-body","fs-sm","fs-xs","track-tight","track-btn"];
  var FORM_KEYS=["radius","radius-lg","radius-pill","border-w","grad-angle","shadow-out","shadow-in","elev-1","elev-2","elev-3","motion-fast","motion-med","ease","lift"];
  var SPACE_KEYS=["touch","pad-cell","pad-card","gap-xs","gap-md","gap-lg"];
  // union, exported for consumers/tools that want the whole feel surface at once.
  var FEEL_KEYS=TYPO_KEYS.concat(FORM_KEYS, SPACE_KEYS);
  var DEFAULT='default-theme';
  // _index.json declares "ultimateFallback": "default-theme". It is honoured here now; it wasn't before.
  var ULTIMATE='default-theme';
  var MODE_KEY='themes:mode';
  // hex ultimate fallback (default-theme mid-gray) so a fetch miss never white-screens
  var ULT={"bg":"#8f8f8f","surface-1":"#a0a0a0","surface-2":"#b0b0b0","surface-3":"#bfbfbf","border":"#565656","field":"#ababab","text":"#1c1c1c","text-soft":"#3f3f3f","text-faint":"#5b5b5b","accent":"#353535","accent-deep":"#222222","accent-2":"#515151","accent-soft":"#cccccc","on-accent":"#f6f6f6","good":"#757575","warn":"#656565","bad":"#3f3f3f","info":"#5b5b5b","data-1":"#4f9fe0","data-2":"#e07bad","data-3":"#46c48a","data-4":"#e0a84f"};

  var base=(function(){ var s=document.currentScript&&document.currentScript.src; if(!s){var e=document.getElementsByTagName('script');s=e[e.length-1].src;} return s.replace(/[^/]*$/,''); })();
  /* REPOINTED 2026-08-06 for maw-themes: in ClickUp_apps the grids, the
     registry and this file were all one flat folder. Here they are three
     (engine/ vectors/ registry/), which is the whole point of the split.
     `base` stays exported unchanged - consumers read it. */
  var GRIDS=base+'../vectors/';
  var REG=base+'../registry/';

  // global absolute mode: null = follow each theme's own default landing mode (backward compatible).
  var _mode=(function(){ try{ return localStorage.getItem(MODE_KEY)||null; }catch(e){ return null; } })();
  function storeMode(m){ try{ if(m==null) localStorage.removeItem(MODE_KEY); else localStorage.setItem(MODE_KEY,m); }catch(e){} }

  /* ---------------------------------------------------------------------------
     THE FAULT LEDGER — the only path for an unresolved reference.
     Rule: a theme reference that cannot be resolved is ALWAYS announced. There is
     no silent fallback and no way to ask for one. `opts.silent` is accepted and
     ignored on purpose, so legacy callers keep working but stop hiding failures.
     `opts.collect` only DEFERS the paint (so a 4-vector join emits one banner
     instead of four); it never suppresses the record or the console.
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

  // does a color row carry a complete opposite-mode (alt-*) ramp?
  function hasAlt(row){ if(!row) return false; for(var i=0;i<ALT_KEYS.length;i++){ var v=row['alt-'+ALT_KEYS[i]]; if(v==null||v==='') return false; } return true; }

  // apply a COLOR row (hex) to the root. opts.mode = requested ABSOLUTE mode (light|dark).
  function applyColor(slug,opts){
    opts=opts||{}; var root=opts.root||document.documentElement;
    return loadColors().then(function(d){
      var row=d.rows[slug];
      if(!row){
        // was: banner-unless-silent, then quietly use ULT. Now it always announces.
        fault('unknown color "'+slug+'" → gray fallback ramp',opts);
        root.setAttribute('data-theme','!'+slug);
        COLOR_KEYS.forEach(function(k){ root.style.setProperty('--'+k,ULT[k]); });
        return null;
      }
      var landing=row.mode||'mid';
      var want=opts.mode||_mode||landing;
      var useAlt=(want!==landing);
      if(useAlt && !hasAlt(row)){ useAlt=false; } // graceful: alt requested but not authored -> bare ramp
      var effMode=useAlt?want:landing;
      COLOR_KEYS.forEach(function(k){
        var val=(useAlt && ALT_KEYS.indexOf(k)>=0) ? row['alt-'+k] : row[k];
        root.style.setProperty('--'+k,(val||row[k]||ULT[k]));
      });
      if(effMode){ root.setAttribute('data-mode',effMode); }
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

  // apply a THEME (the JOIN) = its color + typography + forms + spacing. opts.mode threads to the color.
  // Every vector reports into ONE shared bucket, so a broken join emits a single combined banner
  // instead of four separate ones — or, as it used to, none at all.
  function applyTheme(slug,opts){
    opts=opts||{}; var root=opts.root||document.documentElement;
    var bucket=[];
    return loadThemes().then(function(list){
      var t=null; for(var i=0;i<list.length;i++){ if(list[i].slug===slug){ t=list[i]; break; } }
      if(!t){
        // was: banner + apply NOTHING, leaving the page on whatever themes.css had painted.
        // _index.json promised an ultimateFallback; deliver it, and still be loud.
        fault('unknown theme "'+slug+'" → fell back to '+ULTIMATE,{collect:bucket,onError:opts.onError});
        root.setAttribute('data-theme-join','!'+slug);
        return applyColor(ULTIMATE,{root:root,collect:bucket,mode:opts.mode}).then(function(){
          setGrad(root); paintBanner(); return null;
        });
      }
      var jobs=[];
      // a 4-pointer join is the contract: a MISSING pointer is a fault, not a shrug.
      if(t.color) jobs.push(applyColor(t.color,{root:root,collect:bucket,mode:opts.mode}));
      else { fault('theme "'+slug+'" declares no color → fell back to '+ULTIMATE,{collect:bucket}); jobs.push(applyColor(ULTIMATE,{root:root,collect:bucket,mode:opts.mode})); }
      if(t.typography) jobs.push(applyTypography(t.typography,{root:root,collect:bucket}));
      else fault('theme "'+slug+'" declares no typography vector',{collect:bucket});
      if(t.forms) jobs.push(applyForms(t.forms,{root:root,collect:bucket}));
      else fault('theme "'+slug+'" declares no forms vector',{collect:bucket});
      if(t.spacing) jobs.push(applySpacing(t.spacing,{root:root,collect:bucket}));
      else fault('theme "'+slug+'" declares no spacing vector',{collect:bucket});
      return Promise.all(jobs).then(function(){
        setGrad(root);
        root.setAttribute('data-theme-join',slug);
        if(bucket.length){ root.setAttribute('data-theme-faults',String(bucket.length)); paintBanner(); }
        return t;
      });
    });
  }

  // ---- pre-flight ----
  // Report every broken vector reference across every join row WITHOUT applying anything.
  // For the theme lab, for a build check, and for "did I typo that new row" before shipping.
  function validate(){
    return ready.then(function(){
      var out=[];
      function chk(t,vec,ref,grid){
        if(!ref){ out.push({theme:t.slug,vector:vec,ref:null,problem:'missing pointer'}); return; }
        if(!grid || !grid.rows[ref]){ out.push({theme:t.slug,vector:vec,ref:ref,problem:'no such row'}); }
      }
      (_themes||[]).forEach(function(t){
        chk(t,'color',t.color,_colors);
        chk(t,'typography',t.typography,_typo);
        chk(t,'forms',t.forms,_forms);
        chk(t,'spacing',t.spacing,_space);
      });
      return out;
    });
  }

  // ---- global light/dark mode ----
  function setMode(mode,opts){
    opts=opts||{}; _mode=mode; if(opts.persist!==false) storeMode(mode);
    var root=opts.root||document.documentElement;
    var slug=root.getAttribute('data-theme');
    if(slug && slug.charAt(0)!=='!') return applyColor(slug,{root:root,mode:mode||undefined});
    return Promise.resolve(null);
  }
  function getMode(){ return _mode; }
  function supportsMode(slug,mode){ return loadColors().then(function(d){ var row=d.rows[slug]; if(!row) return false; var landing=row.mode||'mid'; return (mode===landing) || hasAlt(row); }); }

  // legacy alias: apply(colorSlug) applies a COLOR (kept for existing consumers)
  function apply(slug,opts){ return applyColor(slug,opts); }
  // legacy resolve(slug): returns {slug,tokens} for a color (honors the active global mode)
  function resolve(slug){ return loadColors().then(function(d){ var row=d.rows[slug]||ULT; var landing=row.mode||'mid'; var want=_mode||landing; var useAlt=(want!==landing)&&hasAlt(row); var out={}; COLOR_KEYS.forEach(function(k){ var v=(useAlt&&ALT_KEYS.indexOf(k)>=0)?row['alt-'+k]:row[k]; out[k]=v||row[k]||ULT[k]; }); return {slug:slug,name:(row.name||slug),mode:(useAlt?want:landing),tokens:out}; }); }
  function listColors(){ return loadColors().then(function(d){ return d.order.map(function(s){ var row=d.rows[s]; return {slug:s,name:row.name,mode:row.mode,accent:row.accent,alt:hasAlt(row)}; }); }); }
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
    setMode:setMode, getMode:getMode, supportsMode:supportsMode,
    resolve:resolve, validate:validate,
    listColors:listColors, listTypography:listTypography, listForms:listForms, listSpacing:listSpacing,
    listThemes:listThemes, listFeelings:listFeelings,
    COLOR_KEYS:COLOR_KEYS, ALT_KEYS:ALT_KEYS, TYPO_KEYS:TYPO_KEYS, FORM_KEYS:FORM_KEYS, SPACE_KEYS:SPACE_KEYS, FEEL_KEYS:FEEL_KEYS,
    DEFAULT:DEFAULT, ULTIMATE:ULTIMATE, base:base, ready:ready,
    faults:FAULTS,
    colors:{}, typography:{}, forms:{}, spacing:{}, themes:[]
  };
})();
