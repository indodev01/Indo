import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const saveButton = document.getElementById('saveButton');
const deviceButtons = [...document.querySelectorAll('.device-button')];

const DEVICE = { desktop: 760, tablet: 680, mobile: 362 };
const MIN_W = 80;
const MIN_H = 36;

let definition = null;
let activeDevice = document.querySelector('.device-button.active')?.dataset.device || 'desktop';
let loaded = false;
let pointer = null;
let saveTimer = 0;
let enhancing = false;

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function status(text) { const el = document.getElementById('projectStatus'); if (el) el.textContent = text; }

function pageId() {
  const wanted = String(pageStatus?.textContent || '').trim().toLowerCase();
  const entries = Object.entries(definition?.pages || {});
  return entries.find(([id, page]) => id.toLowerCase() === wanted || String(page.name || '').toLowerCase() === wanted)?.[0] || entries[0]?.[0] || null;
}
function page() { const id = pageId(); return id ? definition?.pages?.[id] : null; }
function component(node) { const i = Number(node.dataset.index); return Number.isInteger(i) ? page()?.components?.[i] || null : null; }

function styles(c, create = false) {
  if (!c) return null;
  c.props = c.props || {};
  if (create) c.props.deviceStyles = c.props.deviceStyles || {};
  return c.props.deviceStyles || null;
}
function bucket(c, device = activeDevice, create = false) {
  const s = styles(c, create);
  if (!s) return null;
  if (create) s[device] = s[device] || {};
  return s[device] || null;
}
function explicit(c, device) {
  const p = bucket(c, device)?.position;
  if (!p || !Number.isFinite(Number(p.width)) || !Number.isFinite(Number(p.height))) return null;
  return { x:Number(p.x)||0, y:Number(p.y)||0, width:Math.max(MIN_W,Number(p.width)), height:Math.max(MIN_H,Number(p.height)) };
}

function desktopBase(node, c) {
  const stored = c?.props?._desktopBase;
  if (stored?.width >= MIN_W && stored?.height >= MIN_H) return clone(stored);
  const p = explicit(c, 'desktop') || c?.props?.position;
  if (p?.width > 0 && p?.height > 0) return { x:Number(p.x)||0, y:Number(p.y)||0, width:Math.max(MIN_W,Number(p.width)), height:Math.max(MIN_H,Number(p.height)) };
  const r = node.getBoundingClientRect();
  const cr = canvas.getBoundingClientRect();
  return { x:Math.max(0,Math.round(r.left-cr.left+canvas.scrollLeft)), y:Math.max(0,Math.round(r.top-cr.top+canvas.scrollTop)), width:Math.max(MIN_W,Math.round(r.width||160)), height:Math.max(MIN_H,Math.round(r.height||48)) };
}

function availableWidth(device) {
  const cs = getComputedStyle(canvas);
  const pad = (parseFloat(cs.paddingLeft)||0) + (parseFloat(cs.paddingRight)||0);
  return Math.max(120, Math.min(DEVICE[device], canvas.clientWidth - pad));
}

function inherited(node, c, device) {
  const base = desktopBase(node, c);
  if (device === 'desktop') return base;
  const target = availableWidth(device);
  const scale = Math.min(1, target / DEVICE.desktop);
  const full = base.width >= DEVICE.desktop * 0.82;
  const width = full ? Math.max(MIN_W, target - 2) : Math.max(MIN_W, Math.min(target - 4, base.width * scale));
  const height = Math.max(MIN_H, base.height * (c?.type === 'Header' ? Math.max(scale, .72) : scale));
  const x = Math.max(0, Math.min(target - width, base.x * scale));
  const y = Math.max(0, base.y * scale);
  return { x:Math.round(x), y:Math.round(y), width:Math.round(width), height:Math.round(height) };
}
function effective(node, c) { return explicit(c, activeDevice) || inherited(node, c, activeDevice); }

function apply(node, p) {
  node.classList.add('responsive-position-item');
  node.draggable = false;
  node.style.position = 'absolute';
  node.style.left = '0px';
  node.style.top = '0px';
  node.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px)`;
  node.style.width = `${Math.max(MIN_W,Math.round(p.width))}px`;
  node.style.height = `${Math.max(MIN_H,Math.round(p.height))}px`;
  node.style.maxWidth = 'none';
  node.style.boxSizing = 'border-box';
  node.style.touchAction = 'none';
  node.style.userSelect = 'none';
  node.style.cursor = 'grab';
  node.__responsiveLayout = clone(p);
  node.__responsiveDevice = activeDevice;
  canvas.style.minHeight = `${Math.max(activeDevice==='mobile'?620:660, p.y+p.height+100)}px`;
}

function handles(node) {
  if (node.querySelector('.responsive-size-handle')) return;
  for (const corner of ['top-left','top-right','bottom-left','bottom-right']) {
    const h = document.createElement('div');
    h.className = `responsive-size-handle responsive-size-handle-${corner}`;
    h.dataset.responsiveHandle = corner;
    node.appendChild(h);
  }
}

function point(e) { const r=canvas.getBoundingClientRect(); return { x:e.clientX-r.left+canvas.scrollLeft, y:e.clientY-r.top+canvas.scrollTop }; }
function saveLayout(node,p) { const c=component(node); if(!c)return; bucket(c,activeDevice,true).position={x:Math.round(p.x),y:Math.round(p.y),width:Math.round(p.width),height:Math.round(p.height)}; }

function innerBase(c, kind) {
  const s = styles(c,false);
  return s?.desktop?.[kind] || c?.props?.[kind] || {x:0,y:0};
}
function applyInner(node,c) {
  if (!node.classList.contains('canvas-header-component')) return;
  const title=node.querySelector('.header-title-wrap');
  const menu=node.querySelector('.header-menu-toggle');
  const b=bucket(c,activeDevice,false);
  const scale=activeDevice==='desktop'?1:Math.min(1,availableWidth(activeDevice)/DEVICE.desktop);
  if(title){ const p=b?.titlePosition || innerBase(c,'titlePosition'); const x=b?.titlePosition ? Number(p.x)||0 : Math.round((Number(p.x)||0)*scale); const y=b?.titlePosition ? Number(p.y)||0 : Math.round((Number(p.y)||0)*scale); title.style.transform=`translate(${x}px,${y}px)`; title.style.touchAction='none'; }
  if(menu){ const p=b?.menuPosition || innerBase(c,'menuPosition'); const x=b?.menuPosition ? Number(p.x)||0 : Math.round((Number(p.x)||0)*scale); const y=b?.menuPosition ? Number(p.y)||0 : Math.round((Number(p.y)||0)*scale); menu.style.transform=`translate(${x}px,${y}px)`; menu.style.touchAction='none'; }
}
function saveInner(node,kind,p){ const c=component(node); if(!c)return; bucket(c,activeDevice,true)[kind]={x:Math.round(p.x),y:Math.round(p.y)}; }

function start(node,e) {
  if (!loaded || e.button !== 0) return;
  const handle=e.target.closest?.('[data-responsive-handle]');
  if(handle){ const base=effective(node,component(node)); const p=point(e); pointer={kind:'resize',node,corner:handle.dataset.responsiveHandle,base,startX:p.x,startY:p.y,pointerId:e.pointerId,moved:false}; }
  else {
    const inner=node.classList.contains('canvas-header-component') ? e.target.closest?.('.header-title-wrap,.header-title-edit,.header-menu-toggle') : null;
    if(inner){ const c=component(node); const kind=inner.classList.contains('header-menu-toggle')?'menuPosition':'titlePosition'; const b=bucket(c,activeDevice,false); const baseP=b?.[kind] || innerBase(c,kind); const inheritedP=b?.[kind] ? baseP : {x:Number(baseP.x)||0,y:Number(baseP.y)||0}; if(!b?.[kind] && activeDevice!=='desktop'){ const s=Math.min(1,availableWidth(activeDevice)/DEVICE.desktop); inheritedP.x*=s; inheritedP.y*=s; } pointer={kind:'inner',node,element:inner,innerKind:kind,base:{x:Number(inheritedP.x)||0,y:Number(inheritedP.y)||0},startX:e.clientX,startY:e.clientY,pointerId:e.pointerId,moved:false}; }
    else { const base=effective(node,component(node)); const p=point(e); pointer={kind:'move',node,base,startX:p.x,startY:p.y,pointerId:e.pointerId,moved:false}; }
  }
  const target=pointer.kind==='inner'?pointer.element:pointer.node; target.setPointerCapture?.(e.pointerId); e.preventDefault(); e.stopPropagation();
}

function move(e){
  if(!pointer)return;
  if(pointer.kind==='inner'){
    const dx=e.clientX-pointer.startX,dy=e.clientY-pointer.startY; if(Math.abs(dx)>3||Math.abs(dy)>3)pointer.moved=true;
    const p={x:pointer.base.x+dx,y:pointer.base.y+dy}; pointer.element.style.transform=`translate(${Math.round(p.x)}px,${Math.round(p.y)}px)`; saveInner(pointer.node,pointer.innerKind,p); e.preventDefault(); return;
  }
  const q=point(e),dx=q.x-pointer.startX,dy=q.y-pointer.startY,base=pointer.base,next={...base};
  if(pointer.kind==='move'){next.x=Math.max(0,base.x+dx);next.y=Math.max(0,base.y+dy);}else{const h=pointer.corner;if(h.includes('right'))next.width=base.width+dx;if(h.includes('left')){next.width=base.width-dx;next.x=base.x+dx;}if(h.includes('bottom'))next.height=base.height+dy;if(h.includes('top')){next.height=base.height-dy;next.y=base.y+dy;}next.width=Math.max(MIN_W,next.width);next.height=Math.max(MIN_H,next.height);next.x=Math.max(0,next.x);next.y=Math.max(0,next.y);} if(Math.abs(dx)>3||Math.abs(dy)>3)pointer.moved=true; apply(pointer.node,next); saveLayout(pointer.node,next); e.preventDefault();
}
function end(){ if(!pointer)return; try{pointer.node?.releasePointerCapture?.(pointer.pointerId)}catch{} try{pointer.element?.releasePointerCapture?.(pointer.pointerId)}catch{} const moved=pointer.moved; pointer=null; if(moved)queuePersist(); }

function enhance(){
  if(!canvas||!definition||enhancing)return;
  enhancing=true;
  try{
    const p=page();
    [...canvas.querySelectorAll('.canvas-item')].forEach((node,index)=>{
      const c=p?.components?.[index]; if(!c)return;
      apply(node,effective(node,c)); handles(node); applyInner(node,c);
      if(node.dataset.responsiveBound==='1')return;
      node.dataset.responsiveBound='1'; node.addEventListener('pointerdown',e=>start(node,e),{passive:false});
    });
  }finally{enhancing=false;}
}

function queuePersist(){ clearTimeout(saveTimer); saveTimer=setTimeout(persist,250); }
async function persist(){
  if(!projectId||!definition||!loaded)return;
  try{
    const auth=await supabase.auth.getUser(); const user=auth.data?.user; if(!user)return;
    const latestResult=await supabase.from('projects').select('id,user_id,app_definition,pages').eq('id',projectId).eq('user_id',user.id).maybeSingle(); if(latestResult.error||!latestResult.data)return;
    const latest=normalizeDefinition(latestResult.data); const pid=pageId(); const local=definition.pages?.[pid]; const targetPage=latest.pages?.[pid]; if(!local||!targetPage)return;
    local.components.forEach((lc,i)=>{const b=lc.props?.deviceStyles?.[activeDevice];if(!b)return;const tc=targetPage.components?.[i];if(!tc)return;tc.props={...(tc.props||{}),deviceStyles:{...(tc.props?.deviceStyles||{}),[activeDevice]:clone(b)}};});
    await supabase.from('projects').update({pages:latest.pages,app_definition:{...(latestResult.data.app_definition||{}),pages:latest.pages},updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',user.id);
    status(`${activeDevice[0].toUpperCase()+activeDevice.slice(1)} layout saved`);
  }catch(e){console.warn('Responsive layout save failed',e);}
}

function setDevice(device){
  if(!['desktop','tablet','mobile'].includes(device))return;
  activeDevice=device; window.__indoBuilderDevice=device; document.documentElement.dataset.indoDevice=device;
  deviceButtons.forEach(b=>b.classList.toggle('active',b.dataset.device===device));
  canvas?.classList.toggle('canvas-mobile',device==='mobile'); canvas?.classList.toggle('canvas-tablet',device==='tablet'); canvas?.classList.toggle('canvas-desktop',device==='desktop');
  requestAnimationFrame(()=>{enhance();status(`Editing ${device}`);});
}
async function load(){
  if(!projectId)return; const auth=await supabase.auth.getUser(); if(auth.error||!auth.data.user)return;
  const r=await supabase.from('projects').select('id,user_id,name,description,app_definition,pages').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle(); if(r.error||!r.data)return;
  definition=normalizeDefinition(r.data); loaded=true; setDevice(activeDevice); enhance();
}

deviceButtons.forEach(b=>b.addEventListener('click',()=>setDevice(b.dataset.device),{capture:true}));
canvas?.addEventListener('pointermove',move,{passive:false}); window.addEventListener('pointerup',end,{passive:true}); window.addEventListener('pointercancel',end,{passive:true}); saveButton?.addEventListener('click',queuePersist);
window.addEventListener('resize',()=>requestAnimationFrame(enhance)); const observer=new MutationObserver(()=>requestAnimationFrame(enhance)); if(canvas)observer.observe(canvas,{childList:true,subtree:true});
window.__indoResponsive={getDevice:()=>activeDevice,setDevice}; setTimeout(load,350);
