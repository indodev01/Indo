import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, syncLegacyFields } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');

const MENU_DESIGNS = [
  {id:'classic',name:'Classic Dark',bg:'#0f172a',color:'#f8fafc',border:'rgba(255,255,255,.08)',radius:12,width:220,shadow:'0 20px 55px rgba(0,0,0,.4)',layout:'list',accent:'#8b5cf6'},
  {id:'glass',name:'Glass Effect',bg:'rgba(15,23,42,.76)',color:'#fff',border:'rgba(255,255,255,.16)',radius:16,width:230,shadow:'0 24px 70px rgba(0,0,0,.38)',blur:18,layout:'list',accent:'#93c5fd'},
  {id:'light',name:'Light Clean',bg:'#fff',color:'#111827',border:'rgba(15,23,42,.1)',radius:12,width:220,shadow:'0 20px 45px rgba(15,23,42,.16)',layout:'list',accent:'#ef4444'},
  {id:'gradient',name:'Gradient Slide',bg:'linear-gradient(135deg,#7c3aed,#ec4899)',color:'#fff',border:'rgba(255,255,255,.15)',radius:16,width:230,shadow:'0 24px 70px rgba(124,58,237,.3)',layout:'list',accent:'#fff'},
  {id:'pill',name:'Rounded Pills',bg:'#111827',color:'#fff',border:'rgba(255,255,255,.08)',radius:18,width:240,shadow:'0 20px 50px rgba(0,0,0,.34)',layout:'pill',accent:'#a78bfa'},
  {id:'compact',name:'Compact',bg:'#090d14',color:'#e5e7eb',border:'rgba(255,255,255,.06)',radius:8,width:190,shadow:'0 16px 36px rgba(0,0,0,.32)',layout:'compact',accent:'#fbbf24'},
  {id:'accent',name:'Accent Border',bg:'#101827',color:'#fff',border:'#8b5cf6',radius:12,width:225,shadow:'0 18px 45px rgba(139,92,246,.2)',layout:'list',accent:'#ec4899'},
  {id:'cards',name:'Cards Style',bg:'#0b1220',color:'#fff',border:'rgba(255,255,255,.08)',radius:16,width:245,shadow:'0 22px 55px rgba(0,0,0,.36)',layout:'cards',accent:'#06b6d4'},
  {id:'split',name:'Split Style',bg:'linear-gradient(135deg,#5b21b6 0%,#5b21b6 48%,#fff 48%,#fff 100%)',color:'#111827',border:'rgba(15,23,42,.1)',radius:15,width:250,shadow:'0 24px 70px rgba(91,33,182,.25)',layout:'split',accent:'#5b21b6'},
  {id:'floating',name:'Floating Menu',bg:'#fff',color:'#111827',border:'rgba(15,23,42,.1)',radius:22,width:220,shadow:'0 28px 70px rgba(15,23,42,.22)',layout:'floating',accent:'#f97316'}
];

let definition = null;
let activePageId = null;

function activePage(def) {
  const wanted = String(pageStatus?.textContent || '').trim().toLowerCase();
  activePageId = Object.entries(def.pages || {}).find(([id,p]) => id.toLowerCase() === wanted || String(p.name || '').trim().toLowerCase() === wanted)?.[0]
    || (def.pages?.home ? 'home' : Object.keys(def.pages || {})[0]);
  return activePageId ? def.pages[activePageId] : null;
}

function headerComponent(node, def) {
  const id = node.closest('.canvas-header-component')?.dataset.headerComponent;
  return activePage(def)?.components?.find(c => c.id === id && c.type === 'Header') || null;
}

async function loadDefinition() {
  if (!projectId) return null;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return null;
  const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if (result.error || !result.data) return null;
  const def = normalizeDefinition(result.data);
  activePage(def);
  return def;
}

async function saveDefinition(def) {
  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;
  if (!user) return;
  const synced = syncLegacyFields(def);
  const result = await supabase.from('projects').update({pages:synced.pages,app_definition:synced.appDefinition,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',user.id);
  if (result.error) throw result.error;
}

function designFor(component) {
  return MENU_DESIGNS.find(d => d.id === component?.props?.menuDesignId) || MENU_DESIGNS[0];
}

function pageList(component, def) {
  const ids = Array.isArray(component.props?.items) ? component.props.items : Object.keys(def.pages || {});
  return ids.map(id => def.pages[id]).filter(Boolean);
}

function applyPanel(panel, design) {
  Object.assign(panel.style,{background:design.bg,color:design.color,border:`1px solid ${design.border}`,borderRadius:`${design.radius}px`,width:`${design.width}px`,boxShadow:design.shadow,backdropFilter:design.blur?`blur(${design.blur}px)`:'none',position:'absolute',zIndex:'3000',padding:'9px',display:'flex',flexDirection:design.layout==='split'?'row':'column',gap:design.layout==='cards'?'7px':'4px'});
}

function renderMenu(wrap, component, def) {
  wrap.querySelector('.header-menu-panel')?.remove();
  const design = designFor(component);
  const panel = document.createElement('div');
  panel.className='header-menu-panel header-menu-design-panel';
  applyPanel(panel,design);
  pageList(component,def).forEach(page=>{
    const item=document.createElement('button'); item.type='button'; item.className='header-menu-item'; item.textContent=page.name;
    item.style.color=design.color; item.style.background=design.layout==='cards'?'rgba(255,255,255,.06)':'transparent'; item.style.border=design.layout==='cards'?'1px solid rgba(255,255,255,.08)':'0'; item.style.borderRadius=design.layout==='pill'?'999px':design.layout==='cards'?'10px':'8px'; item.style.padding=design.layout==='compact'?'6px 8px':'9px 10px'; item.style.textAlign=design.layout==='split'?'center':'left'; item.style.fontWeight='750'; item.style.width=design.layout==='split'?'calc(50% - 4px)':'100%';
    item.onmouseenter=()=>item.style.background=design.layout==='cards'?'rgba(255,255,255,.12)':`${design.accent}22`;
    item.onmouseleave=()=>item.style.background=design.layout==='cards'?'rgba(255,255,255,.06)':'transparent';
    item.onclick=()=>{panel.remove();document.querySelectorAll('.page-button').forEach(btn=>{if(btn.textContent?.trim()===page.name)btn.click();});};
    panel.appendChild(item);
  });
  const add=document.createElement('button'); add.type='button'; add.className='header-menu-add'; add.textContent='+ Add Page'; add.style.cssText=`color:${design.color};background:transparent;border:1px dashed ${design.border};border-radius:${design.layout==='pill'?'999px':'8px'};padding:8px;margin-top:3px;font-weight:800`; add.onclick=()=>{panel.remove();document.getElementById('addPageButton')?.click();}; panel.appendChild(add);
  wrap.appendChild(panel);
}

function makeDesignPreview(design) {
  const stage=document.createElement('div'); Object.assign(stage.style,{height:'145px',position:'relative',overflow:'hidden',borderRadius:'10px',background:'linear-gradient(135deg,#19263d,#0b1220)',padding:'12px',display:'flex',justifyContent:'flex-end',alignItems:'flex-start'});
  const panel=document.createElement('div'); applyPanel(panel,design); panel.style.position='relative'; panel.style.width=`${Math.min(210,design.width)}px`; panel.style.maxWidth='85%';
  ['Home','About','Services','Contact'].forEach(name=>{const item=document.createElement('div');item.textContent=name;item.style.cssText=`padding:8px 10px;margin:2px 0;border-radius:${design.layout==='pill'?'999px':design.layout==='cards'?'10px':'8px'};color:${design.color};background:${design.layout==='cards'?'rgba(255,255,255,.07)':'transparent'};font-size:10px;font-weight:800`;panel.appendChild(item);}); stage.appendChild(panel); return stage;
}

function openDesignPicker(def, component, updateSelected) {
  const picker=document.createElement('div'); picker.style.cssText='position:fixed;inset:0;z-index:13000;display:flex;align-items:flex-start;justify-content:center;padding:22px;background:rgba(2,5,12,.82);backdrop-filter:blur(10px);overflow:auto';
  const modal=document.createElement('div'); modal.style.cssText='width:min(1040px,100%);background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden;box-shadow:0 30px 100px rgba(0,0,0,.55)';
  modal.innerHTML='<div style="padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:start"><div><div style="font-size:9px;font-weight:900;letter-spacing:.12em;color:#a78bfa">SELECT MENU DESIGN</div><h3 style="margin:5px 0 4px;font-size:20px">Choose a menu style</h3><p style="margin:0;color:#94a3b8;font-size:11px">Pick one design for the 3-line menu panel.</p></div><button data-close type="button" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;font-size:18px">×</button></div><div data-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px"></div>';
  const grid=modal.querySelector('[data-grid]'); let selectedId=component.props?.menuDesignId||'classic';
  MENU_DESIGNS.forEach(design=>{
    const card=document.createElement('button'); card.type='button'; card.style.cssText='text-align:left;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#0b1220;color:#fff;cursor:pointer'; card.append(makeDesignPreview(design)); const name=document.createElement('div');name.textContent=design.name;name.style.cssText='font-size:11px;font-weight:900;margin-top:8px';card.appendChild(name); if(design.id===selectedId)card.style.borderColor='#8b5cf6'; card.onclick=()=>{selectedId=design.id;grid.querySelectorAll('button').forEach(b=>b.style.borderColor='rgba(255,255,255,.08)');card.style.borderColor='#8b5cf6';}; grid.appendChild(card);
  });
  const footer=document.createElement('div');footer.style.cssText='display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid rgba(255,255,255,.08)'; const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.type='button';cancel.style.cssText='min-height:38px;padding:0 13px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#cbd5e1';const apply=document.createElement('button');apply.textContent='Use This Design';apply.type='button';apply.style.cssText='min-height:38px;padding:0 15px;border:0;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900';footer.append(cancel,apply);modal.appendChild(footer);picker.appendChild(modal);document.body.appendChild(picker);
  const close=()=>picker.remove(); cancel.onclick=close; modal.querySelector('[data-close]').onclick=close; picker.onclick=e=>{if(e.target===picker)close();}; apply.onclick=()=>{component.props={...(component.props||{}),menuDesignId:selectedId}; updateSelected(selectedId); close();};
}

function openMenuEditor(node, def, component) {
  const selected=designFor(component);
  const backdrop=document.createElement('div'); backdrop.style.cssText='position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:20px;background:rgba(2,5,12,.82);backdrop-filter:blur(10px)';
  const modal=document.createElement('div'); modal.style.cssText='width:min(520px,100%);padding:22px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#111827;color:#fff;box-shadow:0 30px 90px rgba(0,0,0,.55)';
  modal.innerHTML='<div style="display:flex;justify-content:space-between;align-items:start"><div><div style="font-size:9px;font-weight:900;letter-spacing:.12em;color:#a78bfa">EDIT MENU</div><h3 style="margin:5px 0 4px;font-size:20px">Menu settings</h3><p style="margin:0;color:#94a3b8;font-size:11px">Customize the menu button and choose how the page panel opens.</p></div><button data-close type="button" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;font-size:18px">×</button></div><div data-fields style="display:grid;gap:12px;margin-top:18px"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button data-cancel type="button" style="min-height:38px;padding:0 13px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#cbd5e1">Cancel</button><button data-apply type="button" style="min-height:38px;padding:0 14px;border:0;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900">Apply</button></div>';
  const fields=modal.querySelector('[data-fields]');
  const makeField=(label,value,type='text')=>{const wrap=document.createElement('label');wrap.style.cssText='display:grid;gap:6px;color:#9ba7bb;font-size:10px;font-weight:800';wrap.appendChild(document.createTextNode(label));const input=document.createElement('input');input.type=type;input.value=value??'';input.style.cssText='min-height:38px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9';wrap.appendChild(input);fields.appendChild(wrap);return input;};
  const icon=makeField('Menu icon',component.props?.menuIcon||'☰'); const iconColor=makeField('Icon color',component.props?.menuIconColor||component.props?.color||'#111827'); const iconSize=makeField('Icon size',component.props?.menuIconSize||22,'number');
  const designBox=document.createElement('div'); designBox.style.cssText='padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)';
  const label=document.createElement('div');label.textContent='Menu panel design';label.style.cssText='font-size:10px;font-weight:900;color:#9ba7bb;margin-bottom:8px';
  const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px';
  const name=document.createElement('strong');name.textContent=selected.name;name.style.fontSize='13px';
  const choose=document.createElement('button');choose.type='button';choose.textContent='Select Design';choose.style.cssText='min-height:36px;padding:0 12px;border-radius:9px;border:1px solid rgba(181,76,255,.35);background:rgba(124,58,237,.1);color:#d8c5ff;font-weight:900';
  row.append(name,choose);designBox.append(label,row);fields.appendChild(designBox);
  const hint=document.createElement('p');hint.textContent='Click “Select Design” to choose from Classic, Glass, Light, Gradient, Pills, Cards, Split, Floating and more.';hint.style.cssText='margin:0;color:#6f7b90;font-size:10px;line-height:1.5';fields.appendChild(hint);
  choose.onclick=()=>openDesignPicker(def,component,(id)=>{const d=MENU_DESIGNS.find(x=>x.id===id)||MENU_DESIGNS[0];name.textContent=d.name;component.props={...(component.props||{}),menuDesignId:id};});
  const close=()=>backdrop.remove(); modal.querySelector('[data-close]').onclick=close;modal.querySelector('[data-cancel]').onclick=close;
  modal.querySelector('[data-apply]').onclick=async()=>{component.props={...(component.props||{}),menuIcon:icon.value||'☰',menuIconColor:iconColor.value||'#111827',menuIconSize:Number(iconSize.value)||22};try{await saveDefinition(def);close();location.reload();}catch(error){console.error('Menu editor save failed',error);window.alert(`Could not save menu settings. ${error.message||'Please try again.'}`);}};
  backdrop.appendChild(modal);document.body.appendChild(backdrop);backdrop.onclick=e=>{if(e.target===backdrop)close();};
}

document.addEventListener('click',async(event)=>{
  const menu=event.target.closest?.('.canvas-header-component .header-menu-toggle'); if(!menu)return; event.preventDefault();event.stopPropagation();event.stopImmediatePropagation(); const node=menu.closest('.canvas-header-component'); const def=await loadDefinition(); if(!def)return;definition=def;const c=headerComponent(node,def);if(c)renderMenu(node.querySelector('.app-header')||node,c,def);
},true);

document.addEventListener('dblclick',async(event)=>{
  const menu=event.target.closest?.('.canvas-header-component .header-menu-toggle'); if(!menu)return; event.preventDefault();event.stopPropagation();event.stopImmediatePropagation(); const node=menu.closest('.canvas-header-component'); const def=await loadDefinition(); if(!def)return;definition=def;const c=headerComponent(node,def);if(c)openMenuEditor(node,def,c);
},true);
