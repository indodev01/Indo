import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const projectStatus = document.getElementById('projectStatus');
const storeKey = projectId ? `indo:header-inner-layout:${projectId}` : '';

let layouts = {};
let definition = null;
let active = null;
let mergeTimer = 0;

function readStore(){ try { layouts = JSON.parse(localStorage.getItem(storeKey) || '{}') || {}; } catch { layouts = {}; } }
function writeStore(){ try { localStorage.setItem(storeKey, JSON.stringify(layouts)); } catch {} }
function isHome(){ const name = String(pageStatus?.textContent || '').trim().toLowerCase(); return name === '' || name === 'home'; }
function headerNode(){ return canvas?.querySelector('.canvas-header-component .app-header') || null; }
function headerComponent(){
  const root = headerNode();
  const item = root?.closest('.canvas-item');
  const index = Number(item?.dataset.index);
  if (!Number.isInteger(index)) return null;
  return definition?.pages?.home?.components?.[index] || definition?.pages?.[Object.keys(definition?.pages || {})[0]]?.components?.[index] || null;
}
function keyFor(kind){ return `${kind}`; }
function readLayout(kind, component){
  const saved = component?.props?.[`${kind}Position`];
  if (saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) return {x:Number(saved.x),y:Number(saved.y)};
  const cached = layouts[keyFor(kind)];
  if (cached) return {x:Number(cached.x)||0,y:Number(cached.y)||0};
  return {x:0,y:0};
}
function apply(kind, el, pos){
  if (!el) return;
  el.style.transform = `translate(${Math.round(pos.x)}px,${Math.round(pos.y)}px)`;
  el.style.position = 'relative';
  el.style.zIndex = '3';
  el.dataset.innerMoveReady = '1';
}
function targetFor(kind, header){
  return kind === 'title' ? header?.querySelector('.header-title-wrap') : header?.querySelector('.header-menu-toggle');
}
function start(kind, el, event){
  if (!isHome() || event.button !== 0) return;
  if (event.target.closest?.('.header-menu-panel')) return;
  const pos = readLayout(kind, headerComponent());
  active = {kind,el,startX:event.clientX,startY:event.clientY,base:pos,moved:false};
  el.classList.add('inner-moving');
  event.preventDefault();
  event.stopPropagation();
}
function move(event){
  if (!active) return;
  const dx=event.clientX-active.startX;
  const dy=event.clientY-active.startY;
  if (Math.abs(dx)>3 || Math.abs(dy)>3) active.moved=true;
  const next={x:active.base.x+dx,y:active.base.y+dy};
  apply(active.kind,active.el,next);
  layouts[keyFor(active.kind)] = next;
  writeStore();
  event.preventDefault();
}
async function persist(){
  if (!projectId || !definition || !isHome()) return;
  try{
    const auth=await supabase.auth.getUser();
    const user=auth.data?.user;
    if(!user) return;
    const result=await supabase.from('projects').select('id,user_id,app_definition,pages').eq('id',projectId).eq('user_id',user.id).maybeSingle();
    if(result.error || !result.data) return;
    const latest=normalizeDefinition(result.data);
    const pageId=Object.keys(latest.pages).find(id=>String(latest.pages[id].name||'').toLowerCase()==='home')||Object.keys(latest.pages)[0];
    const page=latest.pages[pageId];
    const header=page?.components?.find(c=>c.type==='Header');
    if(!header) return;
    if(layouts.title) header.props={...(header.props||{}),titlePosition:{...layouts.title}};
    if(layouts.menu) header.props={...(header.props||{}),menuPosition:{...layouts.menu}};
    const pages=latest.pages;
    const appDefinition={...(result.data.app_definition||{}),pages};
    await supabase.from('projects').update({pages,app_definition:appDefinition,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',user.id);
    definition=latest;
  }catch(error){ console.warn('Header inner position save failed',error); }
}
function finish(){
  if(!active) return;
  const wasMoved=active.moved;
  active.el.classList.remove('inner-moving');
  active=null;
  if(wasMoved){ window.clearTimeout(mergeTimer); mergeTimer=window.setTimeout(persist,200); }
}
function enhance(){
  if(!canvas || !isHome()) return;
  const header=headerNode();
  if(!header) return;
  const component=headerComponent();
  const title=targetFor('title',header);
  const menu=targetFor('menu',header);
  if(title){ apply('title',title,readLayout('title',component)); if(title.dataset.innerMoveBound!=='1'){title.dataset.innerMoveBound='1';title.addEventListener('pointerdown',e=>start('title',title,e),{passive:false});title.style.touchAction='none';} }
  if(menu){ apply('menu',menu,readLayout('menu',component)); if(menu.dataset.innerMoveBound!=='1'){menu.dataset.innerMoveBound='1';menu.addEventListener('pointerdown',e=>start('menu',menu,e),{passive:false});menu.style.touchAction='none';} }
}
async function load(){
  readStore();
  if(!projectId) return;
  try{
    const auth=await supabase.auth.getUser();
    if(!auth.data?.user) return;
    const result=await supabase.from('projects').select('id,user_id,app_definition,pages').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
    if(result.error || !result.data) return;
    definition=normalizeDefinition(result.data);
    enhance();
  }catch(error){ console.warn('Header inner move load failed',error); }
}

window.addEventListener('pointermove',move,{passive:false});
window.addEventListener('pointerup',finish,{passive:true});
window.addEventListener('pointercancel',finish,{passive:true});
const observer=new MutationObserver(()=>window.requestAnimationFrame(enhance));
observer.observe(canvas||document.body,{childList:true,subtree:true});
new MutationObserver(()=>window.requestAnimationFrame(enhance)).observe(pageStatus||document.body,{childList:true,characterData:true,subtree:true});
setTimeout(load,300);
setTimeout(enhance,800);
