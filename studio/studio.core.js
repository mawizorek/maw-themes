/* maw-themes/studio/studio.core.js — Theme Studio render engine + shell chrome + live TSV override.
   Extracted verbatim from the former monolithic preview.html (2026-07-17 modular split), ported
   out of ClickUp_apps@shared/themes/ and repointed at the canonical vectors (2026-08-06).
   Depends on the globals declared in studio.data.js (COLORS/TYPES/FORMS/SPACES/REGISTRY/GROUPS/
   ROLES/SW_ORDER/CHROME), which MUST load first. Runs at end of body, so the DOM already exists. */

var root=document.getElementById('stageRoot');
var curColor="mclaren", curType="sharp-racing", curForm="sharp", curSpace="tight", curView="studio";

function applyChrome(mode){ var set=CHROME[mode]||CHROME.light; for(var k in set){ document.documentElement.style.setProperty(k,set[k]); } }
function r(k,v){return '<div class="r"><span class="rk">'+k+'</span><span class="rv">'+v+'</span></div>';}

/* ---------------------------------------------------------------------------
   DISPLAY LABELS ARE DERIVED. THEY ARE NOT A COLUMN, AND THAT IS DELIBERATE.

   The canonical vectors/colors.tsv carries 25 columns and `name` is not one of
   them. Neither is `group`. Both existed in the old ClickUp_apps table, this
   file read both, and the first time it was pointed at canonical data every
   row in the picker rendered as `undefined` under a heading of `OTHER` while
   its swatches painted perfectly from real hex. Nothing was broken; the file
   was asking for columns that no longer exist.

   ⚠️ GROUPING BY FAMILY IS THE OBVIOUS FIX AND IT IS BANNED IN WRITING. From
   the repo README: "Pairing lives in the join and nowhere else... there is no
   theme family, no -light suffix convention, and nothing anywhere infers a
   partner from a name." Stripping `-light` to sit `eos-light` beside `eos` is
   precisely inferring a partner from a name, so the picker groups by `mode` --
   a real column, present on every row, stating a property OF the row rather
   than a relationship BETWEEN rows.

   `mclaren` therefore reads as "Mclaren", not "McLaren". That is honest: no
   canonical column claims otherwise, and a casing map here would be a second
   store of names, which is the defect this whole repo exists to end. If the
   display name matters, `name` is legal per-row metadata and belongs in the
   TSV -- a data decision, not a patch to this file.
--------------------------------------------------------------------------- */
function label(slug){
  return String(slug||'').split('-').map(function(w){
    return w ? w.charAt(0).toUpperCase()+w.slice(1) : w;
  }).join(' ');
}
function modeGroup(mode){
  if(mode==='dark') return 'Dark';
  if(mode==='light') return 'Light';
  if(mode) return label(mode);
  return 'Unspecified mode';
}
function colorName(slug){ var c=COLORS[slug]||{}; return c.name||label(slug); }
function colorGroup(slug){ var c=COLORS[slug]||{}; return c.group||GROUPS[slug]||modeGroup(c.mode); }

function resolvePropValue(val) {
  var c=COLORS[curColor]||{}, f=FORMS[curForm]||{}, t=TYPES[curType]||{}, s=SPACES[curSpace]||{};
  var res = val, swatch = '';
  if(val === 'accent-grad') {
    swatch = '<span class="r-swatch" style="background:linear-gradient('+(f['grad-angle']||'135deg')+', '+(c.accent||'#888')+', '+(c['accent-2']||'#555')+')"></span>';
    res = swatch + 'var(--accent-grad)';
  } else if (c[val]) {
    swatch = '<span class="r-swatch" style="background:'+c[val]+'"></span>';
    res = swatch + 'var(--'+val+') <b>' + c[val] + '</b>';
  } else if (f[val] || t[val] || s[val]) {
    res = 'var(--'+val+') <b>' + (f[val]||t[val]||s[val]) + '</b>';
  } else {
    res = '<b>' + val + '</b>';
  }
  return res;
}

window.switchCardTab = function(cardId, stateName) {
  var obj;
  for(var group in REGISTRY.groups) {
    var found = REGISTRY.groups[group].objects.find(function(o){ return o.id === cardId; });
    if(found) { obj = found; break; }
  }
  if(!obj) return;
  var state = obj.states[stateName];
  if(!state) return;

  var stageEl = document.getElementById('stage_'+cardId);
  if(stageEl) stageEl.innerHTML = state.html;

  var rcpEl = document.getElementById('rcp_'+cardId);
  if(rcpEl) {
    var rHtml = '';
    for(var k in state.props) {
      rHtml += r(k, resolvePropValue(state.props[k]));
    }
    rcpEl.innerHTML = rHtml;
  }

  var tabs = document.querySelectorAll('.card-tab[data-card="'+cardId+'"]');
  for(var i=0; i<tabs.length; i++) {
    if(tabs[i].getAttribute('data-state') === stateName) tabs[i].classList.add('active');
    else tabs[i].classList.remove('active');
  }
};

function buildCard(obj) {
  var stateKeys = Object.keys(obj.states);
  var tabsHtml = '';
  if(stateKeys.length > 1) {
    tabsHtml = '<div class="card-tabs">';
    stateKeys.forEach(function(sk) {
      tabsHtml += '<button class="card-tab" data-card="'+obj.id+'" data-state="'+sk+'">'+sk+'</button>';
    });
    tabsHtml += '</div>';
  }
  var res = '<div class="spec" id="card_'+obj.id+'">';
  res += '<div class="spec-h"><span class="nm">'+obj.name+'</span><span class="id">'+obj.id+'</span></div>';
  res += tabsHtml;
  res += '<div class="stage '+(obj.rowLayout?'row':'')+'" id="stage_'+obj.id+'"></div>';
  res += '<div class="recipe" id="rcp_'+obj.id+'"></div>';
  res += '</div>';
  return res;
}

function applyTokens(){
  var c=COLORS[curColor]||{};
  var t=TYPES[curType]||{};
  var f=FORMS[curForm]||{};
  var s=SPACES[curSpace]||{};

  SW_ORDER.forEach(function(k){ if(c[k]) root.style.setProperty('--'+k,c[k]); });
  for(var tk in t) root.style.setProperty('--'+tk, t[tk]);
  for(var fk in f) root.style.setProperty('--'+fk, f[fk]);
  for(var sk in s) root.style.setProperty('--'+sk, s[sk]);

  root.style.setProperty('--accent-grad','linear-gradient('+(f['grad-angle']||'135deg')+', '+(c.accent||'#888')+', '+(c['accent-2']||'#555')+')');
  applyChrome(c.mode||'light');

  if(REGISTRY.groups) {
    for(var grp in REGISTRY.groups) {
      REGISTRY.groups[grp].objects.forEach(function(obj) {
        var activeTab = document.querySelector('.card-tab.active[data-card="'+obj.id+'"]');
        var stateToRender = activeTab ? activeTab.getAttribute('data-state') : Object.keys(obj.states)[0];
        switchCardTab(obj.id, stateToRender);
      });
    }
  }
}

function refreshTriggers(){
  var c=COLORS[curColor]||{};
  var f=FORMS[curForm]||{};
  document.getElementById('colorNm').textContent=colorName(curColor);
  document.getElementById('colorSub').textContent=curColor+(c.mode?' · '+c.mode:'');
  document.getElementById('colorTrigSw').style.background='linear-gradient('+(f['grad-angle']||'135deg')+', '+(c.accent||'#888')+', '+(c['accent-2']||'#555')+')';

  document.getElementById('typeNm').textContent=curType;
  document.getElementById('typeSub').textContent=curType;

  document.getElementById('formsNm').textContent=curForm;
  document.getElementById('formsSub').textContent=curForm;

  document.getElementById('spaceNm').textContent=curSpace;
  document.getElementById('spaceSub').textContent=curSpace;

  var fontName=(TYPES[curType] && TYPES[curType]['font-display']||'').split(',')[0].replace(/'/g,'');
  document.getElementById('cTheme').textContent='manual-mix';
  document.getElementById('cFont').textContent=fontName;
  document.getElementById('cGrad').textContent=(c.accent||'')+' → '+(c['accent-2']||'')+' @ '+(f['grad-angle']||'');
  document.getElementById('swName').textContent=colorName(curColor);

  /* live header readout */
  document.getElementById('hdThemeName').textContent=colorName(curColor);
  document.getElementById('hdThemeFont').textContent=fontName;
  document.getElementById('hdDot').style.background='linear-gradient(135deg, '+(c.accent||'#888')+' 50%, '+(c['accent-2']||'#555')+' 50%)';
}

function renderSections(){
  if(!REGISTRY.groups) return;
  var host=document.getElementById('studioSections');
  var html='';
  var count=0;
  for(var grp in REGISTRY.groups){
    var g=REGISTRY.groups[grp];
    var n=g.objects.length; count+=n;
    html+='<section class="sec"><h2>'+g.name+'<span class="cnt">'+n+'</span></h2>'+(g.desc?'<p class="subt">'+g.desc+'</p>':'')+'<div class="grid">'+g.objects.map(buildCard).join('')+'</div></section>';
  }
  host.innerHTML=html;
  for(var grp2 in REGISTRY.groups){ REGISTRY.groups[grp2].objects.forEach(function(o){ switchCardTab(o.id, Object.keys(o.states)[0]); }); }
  var cov=document.getElementById('covLine');
  if(cov) cov.innerHTML='<b>'+count+'</b> canonical objects, every one reskins live from the active theme. This set is the shared design vocabulary, not a cap: to add one, drop it into <code>_objects.json</code> and list it in <code>OBJECT-COVERAGE.md</code> and it renders here automatically.';
}

function renderSwatches(){
  var c=COLORS[curColor]||{};
  document.getElementById('swGrid').innerHTML=SW_ORDER.map(function(k){ return '<button class="sw" data-hex="'+(c[k]||'')+'"><div class="chip" style="background:'+(c[k]||'#888')+'"></div><div class="m"><div class="k">'+k+'</div><div class="hex">'+(c[k]||'')+'</div><div class="role">'+(ROLES[k]||'')+'</div></div></button>'; }).join('');
  Array.prototype.forEach.call(document.querySelectorAll('.sw'),function(b){ b.onclick=function(){ copyHex(b.getAttribute('data-hex')); }; });
}
var toastT;
function copyHex(hex){ if(!hex) return; var done=function(){ var t=document.getElementById('toast'); t.textContent='Copied '+hex; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('show'); },1400); };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(hex).then(done).catch(done); } else { var ta=document.createElement('textarea'); ta.value=hex; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} ta.remove(); done(); } }

function renderAll(){ renderSections(); applyTokens(); refreshTriggers(); renderSwatches(); syncSel(); }

function pickColor(slug){ curColor=slug; ddCloseAll(); applyTokens(); refreshTriggers(); renderSwatches(); syncSel(); }
function pickType(slug){ curType=slug; ddCloseAll(); applyTokens(); refreshTriggers(); syncSel(); }
function pickForm(slug){ curForm=slug; ddCloseAll(); applyTokens(); refreshTriggers(); syncSel(); }
function pickSpace(slug){ curSpace=slug; ddCloseAll(); applyTokens(); refreshTriggers(); syncSel(); }

function setView(v){
  curView=v;
  document.getElementById('studioWrap').style.display=(v==='studio')?'block':'none';
  document.getElementById('appWrap').style.display=(v==='app')?'block':'none';
  var links=document.querySelectorAll('.nav-link');
  for(var i=0;i<links.length;i++){ links[i].classList.toggle('is-active',links[i].getAttribute('data-view')===v); }
}

function buildPop(id, data, pickFn) {
  var pop = document.getElementById(id); pop.innerHTML='';
  Object.keys(data).forEach(function(slug){
    var o=document.createElement('button'); o.className='dd-opt'; o.setAttribute('data-slug',slug); o.setAttribute('role','option');
    o.innerHTML='<span class="onm">'+slug+'</span>';
    o.onclick=function(){ pickFn(slug); }; pop.appendChild(o);
  });
}

function buildColorPop(){ var pop=document.getElementById('colorPop'); pop.innerHTML=''; var groups={};
  Object.keys(COLORS).forEach(function(s){ var g=colorGroup(s); (groups[g]=groups[g]||[]).push(s); });
  Object.keys(groups).forEach(function(g){ var gl=document.createElement('div'); gl.className='dd-grouplabel'; gl.textContent=g+' ('+groups[g].length+')'; pop.appendChild(gl);
    groups[g].forEach(function(slug){ var c=COLORS[slug]; var o=document.createElement('button'); o.className='dd-opt'; o.setAttribute('data-slug',slug); o.setAttribute('role','option');
      o.innerHTML='<span class="osw" style="background:linear-gradient(135deg, '+(c.accent||'#888')+' 50%, '+(c['accent-2']||'#555')+' 50%)"></span><span class="onm">'+colorName(slug)+'</span><span class="otag">'+(c.mode||'')+'</span>';
      o.onclick=function(){ pickColor(slug); }; pop.appendChild(o); }); }); }

function ddToggle(which){ var t=document.getElementById(which+'Trigger'),p=document.getElementById(which+'Pop'); var isOpen=p.classList.contains('open'); ddCloseAll(); if(!isOpen){ t.classList.add('open'); t.setAttribute('aria-expanded','true'); p.classList.add('open'); } }
function ddCloseAll(){ ['color','type','forms','space'].forEach(function(w){ document.getElementById(w+'Trigger').classList.remove('open'); document.getElementById(w+'Trigger').setAttribute('aria-expanded','false'); document.getElementById(w+'Pop').classList.remove('open'); }); }
function syncSel(){
  ['color','type','forms','space'].forEach(function(w){
    var cur = (w==='color')?curColor:(w==='type')?curType:(w==='forms')?curForm:curSpace;
    Array.prototype.forEach.call(document.querySelectorAll('#'+w+'Pop .dd-opt'),function(o){ o.setAttribute('aria-selected',o.getAttribute('data-slug')===cur); });
  });
}

document.getElementById('colorTrigger').onclick=function(e){ e.stopPropagation(); ddToggle('color'); };
document.getElementById('typeTrigger').onclick=function(e){ e.stopPropagation(); ddToggle('type'); };
document.getElementById('formsTrigger').onclick=function(e){ e.stopPropagation(); ddToggle('forms'); };
document.getElementById('spaceTrigger').onclick=function(e){ e.stopPropagation(); ddToggle('space'); };

/* ---- card tab switching via delegation (no inline handlers) ---- */
document.addEventListener('click',function(e){
  var tab=e.target.closest && e.target.closest('.card-tab');
  if(tab){ switchCardTab(tab.getAttribute('data-card'), tab.getAttribute('data-state')); return; }
  if(!e.target.closest('.dd')) ddCloseAll();
});

/* ================= CHROME: drawers (left view / right settings) ================= */
var drawerOpen={nav:false,settings:false};
var lastTrigger=null;
function scrimEl(){ return document.getElementById('chromeScrim'); }
function setDrawer(which,v){
  var id=which==='nav'?'navDrawer':'settingsDrawer';
  var btn=which==='nav'?'navBtn':'gearBtn';
  var d=document.getElementById(id);
  drawerOpen[which]=v;
  d.classList.toggle('is-open',v);
  d.setAttribute('aria-hidden',String(!v));
  document.getElementById(btn).setAttribute('aria-expanded',String(v));
  if(v){ var x=d.querySelector('.drawer-x'); if(x) setTimeout(function(){ x.focus(); },60); }
}
function drawerToggle(which,trigger){
  var willOpen=!drawerOpen[which];
  if(willOpen&&trigger) lastTrigger=trigger;
  setDrawer('nav',which==='nav'?willOpen:false);
  setDrawer('settings',which==='settings'?willOpen:false);
  scrimEl().hidden=!(drawerOpen.nav||drawerOpen.settings);
  if(!drawerOpen.nav&&!drawerOpen.settings) restoreFocus();
}
function restoreFocus(){ if(lastTrigger){ try{ lastTrigger.focus(); }catch(e){} lastTrigger=null; } }
function drawerCloseAll(){ setDrawer('nav',false); setDrawer('settings',false); ddCloseAll(); scrimEl().hidden=true; restoreFocus(); }

(function buildScrim(){ var s=document.createElement('div'); s.id='chromeScrim'; s.className='chrome-scrim'; s.hidden=true; s.addEventListener('click',drawerCloseAll); document.body.appendChild(s); })();
document.getElementById('navBtn').addEventListener('click',function(){ drawerToggle('nav',this); });
document.getElementById('gearBtn').addEventListener('click',function(){ drawerToggle('settings',this); });
document.getElementById('navX').addEventListener('click',drawerCloseAll);
document.getElementById('setX').addEventListener('click',drawerCloseAll);
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ if(drawerOpen.nav||drawerOpen.settings) drawerCloseAll(); else ddCloseAll(); } });

/* left-drawer nav links = view switch */
Array.prototype.forEach.call(document.querySelectorAll('.nav-link'),function(lnk){
  lnk.addEventListener('click',function(){ setView(this.getAttribute('data-view')); drawerCloseAll(); });
});

/* ---- FIRST PAINT from embedded snapshot ---- */
buildColorPop(); buildPop('typePop', TYPES, pickType); buildPop('formsPop', FORMS, pickForm); buildPop('spacePop', SPACES, pickSpace);
renderAll(); setView('studio');

/* ---- footer build stamp ---- */
(function(){ try{ var d=new Date(); var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; document.getElementById('footStamp').textContent='maw-themes/studio · loaded '+mo+' '+d.getDate(); }catch(e){} })();

/* ---- best-effort live override from the canonical TSV grids and JSON registry ---- */
function parseTSV(txt){ var lines=txt.replace(/\r/g,'').split('\n').filter(function(l){return l.length;}); if(!lines.length) return null; var head=lines[0].split('\t'); var rows={}; for(var i=1;i<lines.length;i++){ var cells=lines[i].split('\t'); if(cells.length<2) continue; var o={}; for(var j=0;j<head.length;j++){ o[head[j]]=cells[j]; } if(o.slug) rows[o.slug]=o; } return rows; }
/* ---------------------------------------------------------------------------
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

function liveOverride(){
  var base=location.pathname.replace(/[^/]*$/,'');
  /* THE REPOINT (2026-08-06). This used to fetch the grids as SIBLINGS of the
     page, which worked only because the Studio happened to live in the same
     folder as the data. In maw-themes the data is canonical and lives one level
     up. Same repo, same Pages origin, so these are still plain fetches. */
  var GRIDS=base+'../vectors/';
  var OBJECTS=base+'../vocabulary/';
  Promise.all([
    fetch(GRIDS+'colors.tsv',{cache:'no-store'}).then(function(r){return r.ok?r.text():null;}),
    fetch(GRIDS+'typography.tsv',{cache:'no-store'}).then(function(r){return r.ok?r.text():null;}),
    fetch(GRIDS+'forms.tsv',{cache:'no-store'}).then(function(r){return r.ok?r.text():null;}),
    fetch(GRIDS+'spacing.tsv',{cache:'no-store'}).then(function(r){return r.ok?r.text():null;}),
    fetch(OBJECTS+'_objects.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;})
  ]).then(function(res){
    var changed=false;
    if(res[0]){ var cr=parseTSV(res[0]); if(cr&&Object.keys(cr).length){ var nc={}; Object.keys(cr).forEach(function(s){ var row=cr[s]; row.group=GROUPS[s]||''; nc[s]=row; }); COLORS=nc; changed=true; } }
    if(res[1]){ var tr=parseTSV(res[1]); if(tr&&Object.keys(tr).length){ TYPES=tr; changed=true; } }
    if(res[2]){ var fr=parseTSV(res[2]); if(fr&&Object.keys(fr).length){ FORMS=fr; changed=true; } }
    if(res[3]){ var sr=parseTSV(res[3]); if(sr&&Object.keys(sr).length){ SPACES=sr; changed=true; } }
    if(res[4] && res[4].groups){ REGISTRY = res[4]; changed=true; }

    if(changed){
      if(!COLORS[curColor]) curColor=Object.keys(COLORS)[0];
      if(!TYPES[curType]) curType=Object.keys(TYPES)[0];
      if(!FORMS[curForm]) curForm=Object.keys(FORMS)[0];
      if(!SPACES[curSpace]) curSpace=Object.keys(SPACES)[0];

      buildColorPop(); buildPop('typePop', TYPES, pickType); buildPop('formsPop', FORMS, pickForm); buildPop('spacePop', SPACES, pickSpace);
      renderAll();
      liveNote('LIVE, reading canonical vectors from maw-themes/vectors/ \u00b7 '+Object.keys(COLORS).length+' colours');
    } else {
      liveFault('canonical grids did not load. Showing the EMBEDDED SNAPSHOT, which is older than vectors/ and must not be trusted.');
    }
  }).catch(function(e){
    liveFault('canonical grids failed: '+(e&&e.message||'error')+'. Showing the EMBEDDED SNAPSHOT, which is older than vectors/ and must not be trusted.');
  });
}
try{ liveOverride(); }catch(e){}
