import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, syncLegacyFields } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const pageStatus = document.getElementById('pageStatus');
let lastMenu = null;
let lastClickAt = 0;

const DESIGNS = [
  {id:'classic',name:'Classic Dark',bg:'#0f172a',color:'#f8fafc',border:'rgba(255,255,255,.08)',radius:12,width:220},
  {id:'glass',name:'Glass Effect',bg:'rgba(15,23,42,.76)',color:'#fff',border:'rgba(255,255,255,.16)',radius:16,width:230,blur:18},
  {id:'light',name:'Light Clean',bg:'#fff',color:'#111827',border:'rgba(15,23,42,.1)',radius:12,width:220},
  {id:'gradient',name:'Gradient Slide',bg:'linear-gradient(135deg,#7c3aed,#ec4899)',color:'#fff',border:'rgba(255,255,255,.15)',radius:16,width:230},
  {id:'pill',name:'Rounded Pills',bg:'#111827',color:'#fff',border:'rgba(255,255,255,.08)',radius:18,width:240,layout:'pill'},
  {id:'compact',name:'Compact',bg:'#090d14',color:'#e5e7eb',border:'rgba(255,255,255,.06)',radius:8,width:190},
  {id:'accent',name:'Accent Border',bg:'#101827',color:'#fff',border:'#8b5cf6',radius:12,width:225},
  {id:'cards',name:'Cards Style',bg:'#0b1220',color:'#fff',border:'rgba(255,255,255,.08)',radius:16,width:245,layout:'cards'},
  {id:'split',name:'Split Style',bg:'#fff',color:'#111827',border:'rgba(15,23,42,.1)',radius:15,width:250,layout:'split'},
  {id:'floating',name:'Floating Menu',bg:'#fff',color:'#111827',border:'rgba(15,23,42,.1)',radius:22,width:220,layout:'floating'}
];

function activePage(def){
  const wanted=String(pageStatus?.textContent||'').trim().toLowerCase();
  const id=Object.entries(def.pages||{}).find(([id,p])=>id.toLowerCase()===wanted||String(p.name||'').trim().toLowerCase()===wanted)?.[0] || Object.keys(def.pages||{})[0];
  return id?def.pages[id]:null;
}
function getHeader(node,def){
  const id=node?.dataset?.headerComponent || node?.closest('.canvas-header-component')?.dataset?.index;
  const page=activePage(def);
  if(!page) return null;
  return page.components?.find(c=>c.type==='Header' && (c.id===id || c.id===node?.dataset?.headerComponent)) || null;
}
async function load(){
  const auth=await supabase.auth.getUser(); if(auth.error||!auth.data.user) return null;
  const r=await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if(r.error||!r.data) return null; return normalizeDefinition(r.data);
}
async function save(def){
  const auth=await supabase.auth.getUser(); const user=auth.data?.user; if(!user) return;
  const synced=syncLegacyFields(def);
  const r=await supabase.from('projects').update({pages:synced.pages,app_definition:synced.appDefinition,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',user.id);
  if(r.error) throw r.error;
}
function openEditor(node,def,c){
  const current=c.props?.menuDesignId||'classic';
  const back=document.createElement('div');
  back.style.cssText='position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:20px;background:rgba(2,5,12,.84);backdrop-filter:blur(10px)';
  const modal=document.createElement('div');
  modal.style.cssText='width:min(920px,100%);max-height:90vh;overflow:auto;padding:22px;border:1px solid rgba(255,255,255,.1);border-radius:20px;background:#0f172a;color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.55)';
  modal.innerHTML='<div style="display:flex;justify-content:space-between;align-items:start;gap:15px"><div><div style="font-size:9px;font-weight:900;letter-spacing:.12em;color:#a78bfa">EDIT 3-LINE MENU</div><h2 style="margin:5px 0 4px;font-size:21px">Choose Menu Design</h2><p style="margin:0;color:#94a3b8;font-size:11px">Pick the page-menu style used after the three-line button is clicked.</p></div><button data-close type="button" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;font-size:18px">×</button></div><div data-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button data-cancel type="button" style="min-height:38px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#cbd5e1">Cancel</button><button data-apply type="button" style="min-height:38px;padding:0 15px;border:0;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900">Use This Design</button></div>';
  const grid=modal.querySelector('[data-grid]'); let chosen=current;
  DESIGNS.forEach(d=>{
    const card=document.createElement('button'); card.type='button'; card.style.cssText='text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#0b1220;padding:9px;color:#fff;cursor:pointer';
    const preview=document.createElement('div'); preview.style.cssText='height:125px;border-radius:10px;background:linear-gradient(135deg,#1b2b45,#0b1220);padding:12px;display:flex;justify-content:flex-end;align-items:flex-start;overflow:hidden';
    const panel=document.createElement('div'); panel.style.cssText=`width:${Math.min(210,d.width)}px;background:${d.bg};color:${d.color};border:1px solid ${d.border};border-radius:${d.radius}px;padding:9px;box-shadow:${d.shadow||'0 18px 40px rgba(0,0,0,.3)'};backdrop-filter:${d.blur?`blur(${d.blur}px)`:'none'};`;
    ['Home','About','Services','Contact'].forEach(name=>{const x=document.createElement('div');x.textContent=name;x.style.cssText=`padding:8px 9px;margin:2px 0;border-radius:${d.layout==='pill'?'999px':d.layout==='cards'?'10px':'8px'};background:${d.layout==='cards'?'rgba(255,255,255,.07)':'transparent'};color:${d.color};font:800 10px Inter,system-ui`;panel.appendChild(x);});
    preview.appendChild(panel); const label=document.createElement('div');label.textContent=d.name;label.style.cssText='margin-top:8px;font-size:11px;font-weight:900'; card.append(preview,label); if(d.id===chosen) card.style.borderColor='#8b5cf6';
    card.onclick=()=>{chosen=d.id;grid.querySelectorAll('button').forEach(b=>b.style.borderColor='rgba(255,255,255,.08)');card.style.borderColor='#8b5cf6'}; grid.appendChild(card);
  });
  const close=()=>back.remove(); modal.querySelector('[data-close]').onclick=close; modal.querySelector('[data-cancel]').onclick=close; modal.querySelector('[data-apply]').onclick=async()=>{c.props={...(c.props||{}),menuDesignId:chosen};try{await save(def);close();location.reload()}catch(e){window.alert(`Could not save menu design. ${e.message||'Please try again.'}`)}}; back.appendChild(modal); document.body.appendChild(back);
}

document.addEventListener('click',async event=>{
  const menu=event.target.closest?.('.canvas-header-component .header-menu-toggle'); if(!menu) return;
  const now=Date.now(); const same=lastMenu===menu && now-lastClickAt<650; lastMenu=menu; lastClickAt=now;
  if(!same) return;
  event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
  const node=menu.closest('.canvas-header-component'); const def=await load(); if(!node||!def) return; const c=getHeader(node,def); if(c) openEditor(node,def,c);
},true);

document.addEventListener('dblclick',async event=>{
  const menu=event.target.closest?.('.canvas-header-component .header-menu-toggle'); if(!menu)return;
  event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
  const node=menu.closest('.canvas-header-component'); const def=await load(); if(!node||!def)return; const c=getHeader(node,def); if(c)openEditor(node,def,c);
},true);
