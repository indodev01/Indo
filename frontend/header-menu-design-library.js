import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, syncLegacyFields } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');

const MENU_DESIGNS = [
  { id:'classic', name:'Classic List', bg:'#0f172a', color:'#f8fafc', border:'rgba(255,255,255,.08)', radius:12, width:165, shadow:'0 18px 40px rgba(0,0,0,.35)', layout:'list' },
  { id:'glass', name:'Glass', bg:'rgba(15,23,42,.78)', color:'#fff', border:'rgba(255,255,255,.16)', radius:16, width:175, shadow:'0 20px 45px rgba(0,0,0,.3)', blur:16, layout:'list' },
  { id:'light', name:'Light', bg:'#fff', color:'#111827', border:'rgba(15,23,42,.1)', radius:12, width:165, shadow:'0 18px 38px rgba(15,23,42,.16)', layout:'list' },
  { id:'gradient', name:'Gradient', bg:'linear-gradient(135deg,#7c3aed,#ec4899)', color:'#fff', border:'rgba(255,255,255,.15)', radius:16, width:175, shadow:'0 20px 50px rgba(124,58,237,.28)', layout:'list' },
  { id:'pill', name:'Pills', bg:'#111827', color:'#fff', border:'rgba(255,255,255,.08)', radius:18, width:185, shadow:'0 18px 42px rgba(0,0,0,.32)', layout:'pill' },
  { id:'compact', name:'Compact', bg:'#090d14', color:'#e5e7eb', border:'rgba(255,255,255,.06)', radius:8, width:145, shadow:'0 16px 30px rgba(0,0,0,.3)', layout:'compact' },
  { id:'accent', name:'Accent Border', bg:'#101827', color:'#fff', border:'#8b5cf6', radius:12, width:170, shadow:'0 18px 40px rgba(139,92,246,.18)', layout:'list' },
  { id:'cards', name:'Cards', bg:'#0b1220', color:'#fff', border:'rgba(255,255,255,.08)', radius:16, width:205, shadow:'0 22px 50px rgba(0,0,0,.34)', layout:'cards' },
  { id:'split', name:'Split', bg:'#fff', color:'#111827', border:'rgba(15,23,42,.1)', radius:14, width:210, shadow:'0 18px 38px rgba(15,23,42,.16)', layout:'split' },
  { id:'floating', name:'Floating', bg:'rgba(17,24,39,.96)', color:'#fff', border:'rgba(255,255,255,.1)', radius:22, width:190, shadow:'0 25px 60px rgba(0,0,0,.42)', layout:'floating' }
];

function activePageId(definition) {
  const name = String(pageStatus?.textContent || '').trim().toLowerCase();
  return Object.entries(definition.pages || {}).find(([id,p]) => id.toLowerCase() === name || String(p.name || '').trim().toLowerCase() === name)?.[0]
    || Object.keys(definition.pages || {})[0] || null;
}

function headerComponent(node, definition) {
  const id = node.dataset.headerComponent || node.closest('.canvas-item')?.querySelector('.app-header')?.dataset.headerComponent;
  const page = definition?.pages?.[activePageId(definition)];
  return page?.components?.find(c => c.id === id && c.type === 'Header') || null;
}

async function loadDefinition() {
  if (!projectId) return null;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return null;
  const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if (result.error || !result.data) return null;
  return normalizeDefinition(result.data);
}

async function saveComponent(component, definition) {
  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;
  if (!user) return;
  const synced = syncLegacyFields(definition);
  const result = await supabase.from('projects').update({pages:synced.pages, app_definition:synced.appDefinition, updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',user.id);
  if (result.error) throw result.error;
}

function designFor(component) {
  return MENU_DESIGNS.find(d => d.id === component?.props?.menuDesignId) || MENU_DESIGNS[0];
}

function pageButtons(component, definition, panel) {
  const ids = Array.isArray(component.props?.items) ? component.props.items : Object.keys(definition.pages);
  return ids.map(id => definition.pages[id]).filter(Boolean);
}

function applyPanel(panel, design) {
  panel.style.background = design.bg;
  panel.style.color = design.color;
  panel.style.border = `1px solid ${design.border}`;
  panel.style.borderRadius = `${design.radius}px`;
  panel.style.width = `${design.width}px`;
  panel.style.boxShadow = design.shadow;
  panel.style.backdropFilter = design.blur ? `blur(${design.blur}px)` : 'none';
  panel.style.position = 'absolute';
  panel.style.zIndex = '2000';
  panel.style.padding = design.layout === 'cards' ? '9px' : '8px';
  panel.style.display = 'flex';
  panel.style.flexDirection = design.layout === 'split' ? 'row' : 'column';
  panel.style.gap = design.layout === 'cards' ? '7px' : '4px';
}

function renderMenu(wrap, component, definition) {
  wrap.querySelector('.header-menu-panel')?.remove();
  const design = designFor(component);
  const panel = document.createElement('div');
  panel.className = 'header-menu-panel header-menu-design-panel';
  applyPanel(panel, design);

  const pages = pageButtons(component, definition, panel);
  if (design.layout === 'split') {
    panel.style.flexWrap = 'wrap';
    panel.style.padding = '10px';
  }

  pages.forEach((page, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'header-menu-item header-menu-design-item';
    item.textContent = page.name;
    item.style.color = design.color;
    item.style.background = design.layout === 'cards' ? 'rgba(255,255,255,.06)' : 'transparent';
    item.style.border = design.layout === 'cards' ? '1px solid rgba(255,255,255,.08)' : '0';
    item.style.borderRadius = design.layout === 'pill' ? '999px' : design.layout === 'cards' ? '10px' : '8px';
    item.style.padding = design.layout === 'compact' ? '6px 8px' : '9px 10px';
    item.style.textAlign = design.layout === 'split' ? 'center' : 'left';
    item.style.fontWeight = '750';
    item.style.width = design.layout === 'split' ? 'calc(50% - 4px)' : '100%';
    item.style.transition = 'background .14s ease, transform .14s ease';
    item.addEventListener('mouseenter', () => { item.style.background = design.layout === 'cards' ? 'rgba(255,255,255,.12)' : 'rgba(139,92,246,.18)'; });
    item.addEventListener('mouseleave', () => { item.style.background = design.layout === 'cards' ? 'rgba(255,255,255,.06)' : 'transparent'; });
    item.addEventListener('click', () => { panel.remove(); document.querySelectorAll('.page-button').forEach(btn => { if(btn.textContent?.trim()===page.name) btn.click(); }); });
    panel.appendChild(item);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'header-menu-add';
  add.textContent = '+ Add Page';
  add.style.color = design.color;
  add.style.background = 'transparent';
  add.style.border = `1px dashed ${design.border}`;
  add.style.borderRadius = design.layout === 'pill' ? '999px' : '8px';
  add.style.padding = '8px';
  add.addEventListener('click', () => { panel.remove(); document.getElementById('addPageButton')?.click(); });
  panel.appendChild(add);
  wrap.appendChild(panel);
}

function openDesignEditor(component, definition, wrap) {
  const selected = designFor(component);
  const backdrop = document.createElement('div');
  backdrop.style.cssText='position:fixed;inset:0;z-index:12000;display:flex;justify-content:center;align-items:flex-start;padding:22px;background:rgba(2,5,12,.82);backdrop-filter:blur(10px);overflow:auto';
  const modal = document.createElement('div');
  modal.style.cssText='width:min(1000px,100%);border:1px solid rgba(255,255,255,.1);border-radius:20px;background:#0f172a;color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.55);overflow:hidden';
  modal.innerHTML=`<div style="padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:15px;align-items:start"><div><div style="font-size:9px;font-weight:900;letter-spacing:.12em;color:#a78bfa">MENU DESIGN LIBRARY</div><h2 style="margin:5px 0 4px;font-size:21px">Choose your menu panel design</h2><p style="margin:0;color:#94a3b8;font-size:11px">The 3-line button can open your pages in different visual styles.</p></div><button data-close type="button" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;font-size:18px">×</button></div><div data-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px"></div><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-top:1px solid rgba(255,255,255,.08)"><span data-label style="color:#a5b4fc;font-size:10px;font-weight:800"></span><button data-apply type="button" style="min-height:38px;padding:0 15px;border:0;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900">Apply</button></div>`;
  const grid = modal.querySelector('[data-grid]');
  let chosen = selected.id;
  const updateLabel = () => { const d = MENU_DESIGNS.find(x=>x.id===chosen)||MENU_DESIGNS[0]; modal.querySelector('[data-label]').textContent = `${d.name} selected`; };
  MENU_DESIGNS.forEach((design) => {
    const card=document.createElement('button'); card.type='button'; card.style.cssText='text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#0b1220;padding:9px;color:#fff;cursor:pointer';
    const preview=document.createElement('div'); preview.style.cssText='min-height:125px;padding:14px;display:flex;justify-content:flex-end;align-items:flex-start;position:relative;border-radius:11px;background:#090d14;overflow:hidden';
    const mini=document.createElement('div'); applyPanel(mini,design); mini.style.position='relative'; mini.style.zIndex='1'; mini.style.transform='scale(.82)'; mini.style.transformOrigin='top right';
    ['Home','About','Contact'].forEach(name=>{const s=document.createElement('div');s.textContent=name;s.style.cssText=`padding:7px 9px;margin-bottom:3px;border-radius:${design.layout==='pill'?'999px':'7px'};color:${design.color};background:${design.layout==='cards'?'rgba(255,255,255,.06)':'transparent'};font-size:10px;font-weight:800`;mini.appendChild(s);});
    preview.appendChild(mini); card.append(preview,Object.assign(document.createElement('div'),{textContent:design.name}));
    card.querySelector('div:last-child').style.cssText='font-size:11px;font-weight:800;color:#dbe4f0;margin-top:8px';
    card.onclick=()=>{chosen=design.id;grid.querySelectorAll('button').forEach(b=>b.style.borderColor='rgba(255,255,255,.08)');card.style.borderColor='#8b5cf6';updateLabel();};
    if(design.id===chosen) card.style.borderColor='#8b5cf6';
    grid.appendChild(card);
  });
  updateLabel();
  const close=()=>backdrop.remove();
  modal.querySelector('[data-close]').onclick=close;
  modal.querySelector('[data-apply]').onclick=async()=>{
    component.props={...(component.props||{}),menuDesignId:chosen};
    renderMenu(wrap,component,definition);
    try { await saveComponent(component,definition); close(); } catch(error) { console.error('Menu design save failed',error); window.alert(`Could not save menu design. ${error.message||'Please try again.'}`); }
  };
  backdrop.appendChild(modal); document.body.appendChild(backdrop);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)close();});
}

async function handleClick(event) {
  const button = event.target.closest?.('.canvas-header-component .header-menu-toggle');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const node = button.closest('.canvas-header-component');
  const definition = await loadDefinition();
  if (!node || !definition) return;
  const component = headerComponent(node, definition);
  if (!component) return;
  renderMenu(node.querySelector('.app-header') || node, component, definition);
}

async function handleDoubleClick(event) {
  const button = event.target.closest?.('.canvas-header-component .header-menu-toggle');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const node = button.closest('.canvas-header-component');
  const definition = await loadDefinition();
  if (!node || !definition) return;
  const component = headerComponent(node, definition);
  if (!component) return;
  openDesignEditor(component, definition, node.querySelector('.app-header') || node);
}

document.addEventListener('click', handleClick, true);
document.addEventListener('dblclick', handleDoubleClick, true);
