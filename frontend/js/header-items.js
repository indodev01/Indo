import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const selectionLabel = document.getElementById('selectionLabel');
const inspector = document.getElementById('inspectorContent');
const pageStatus = document.getElementById('pageStatus');

const STYLE_ID = 'header-items-style';
const MODAL_ID = 'header-items-modal';
const TYPES = [
  ['page', 'Page'],
  ['button', 'Button'],
  ['text', 'Text'],
  ['icon', 'Icon'],
  ['image', 'Image']
];

let activeHeaderId = null;
let cachedProject = null;
let inspectorTimer = null;
let lastInspectorHtml = '';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .header-items-box{margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}
    .header-items-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
    .header-items-title strong{font-size:11px;color:#dce4f1}
    .header-add-item{width:100%;min-height:36px;padding:0 11px;border:1px dashed rgba(124,58,237,.55);border-radius:9px;background:rgba(124,58,237,.09);color:#d9c7ff;font-weight:800;cursor:pointer}
    .header-add-item:hover{background:rgba(124,58,237,.16)}
    .header-custom-item{display:flex;align-items:center;gap:8px;padding:8px 9px;margin-top:6px;border:1px solid rgba(255,255,255,.06);border-radius:8px;background:#0b111d}
    .header-custom-item-main{min-width:0;flex:1}.header-custom-item-name{font-size:10px;color:#e8edf6;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.header-custom-item-type{font-size:9px;color:#77849a;margin-top:2px}
    .header-custom-item button{width:26px;height:26px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.03);color:#aab4c7;cursor:pointer}
    .header-items-empty{font-size:9px;color:#77849a;padding:4px 0}
    #${MODAL_ID}{position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:20px;background:rgba(2,5,12,.78);backdrop-filter:blur(10px)}
    #${MODAL_ID}[hidden]{display:none}
    .him-modal{width:min(540px,100%);max-height:calc(100vh - 40px);overflow:auto;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#111827;color:#fff;box-shadow:0 32px 100px rgba(0,0,0,.6)}
    .him-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08)}
    .him-head h3{margin:0;font-size:17px}.him-head p{margin:4px 0 0;color:#8792a7;font-size:10px}.him-close{width:32px;height:32px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.04);color:#dce4ef;font-size:17px;cursor:pointer}
    .him-body{padding:18px 20px;display:grid;gap:12px}.him-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.him-type{min-height:50px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#0b111d;color:#cfd8e6;font-size:10px;font-weight:800;cursor:pointer}.him-type.selected{border-color:#8b5cf6;box-shadow:0 0 0 2px rgba(139,92,246,.14);color:#fff;background:rgba(124,58,237,.14)}
    .him-field{display:grid;gap:6px}.him-field label{font-size:9px;color:#9aa6ba;font-weight:800}.him-field input,.him-field select,.him-field textarea{width:100%;min-height:38px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#090f1a;color:#eef2f9;outline:none}.him-field textarea{min-height:86px;resize:vertical}
    .him-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid rgba(255,255,255,.08)}.him-foot button{min-height:36px;padding:0 14px;border-radius:9px;font-weight:800;cursor:pointer}.him-cancel{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#b9c3d3}.him-save{border:0;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff}
    @media(max-width:600px){.him-grid{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(style);
}

function modal() {
  injectStyles();
  let el = document.getElementById(MODAL_ID);
  if (el) return el;
  el = document.createElement('div');
  el.id = MODAL_ID;
  el.hidden = true;
  el.innerHTML = `<div class="him-modal" role="dialog" aria-modal="true">
    <div class="him-head"><div><h3 id="himTitle">Add Header Item</h3><p>Choose an item type and configure it for this header.</p></div><button class="him-close" type="button" id="himClose">×</button></div>
    <div class="him-body"><div class="him-grid" id="himTypes"></div><div id="himFields"></div></div>
    <div class="him-foot"><button class="him-cancel" type="button" id="himCancel">Cancel</button><button class="him-save" type="button" id="himSave">Add Item</button></div>
  </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', (event) => { if (event.target === el) closeModal(); });
  el.querySelector('#himClose').onclick = closeModal;
  el.querySelector('#himCancel').onclick = closeModal;
  return el;
}

function closeModal() {
  const el = document.getElementById(MODAL_ID);
  if (el) el.hidden = true;
}

async function getProjectFresh() {
  if (!projectId) return null;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return null;
  const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if (result.error || !result.data) return null;
  cachedProject = result.data;
  return result.data;
}

function currentPageId(definition) {
  const wanted = String(pageStatus?.textContent || '').trim().toLowerCase();
  return Object.entries(definition.pages || {}).find(([id, page]) => id.toLowerCase() === wanted || String(page.name || '').toLowerCase() === wanted)?.[0] || Object.keys(definition.pages || {})[0] || 'home';
}

function currentHeader(definition) {
  const pageId = currentPageId(definition);
  const page = definition.pages?.[pageId];
  if (!page) return null;
  if (activeHeaderId) {
    const direct = (page.components || []).find((item) => item.id === activeHeaderId && item.type === 'Header');
    if (direct) return direct;
  }
  return (page.components || []).find((item) => item.type === 'Header') || null;
}

function makeItem(type, fields) {
  const id = `header-item-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  return {
    id,
    type,
    label: fields.label || (type === 'page' ? 'New Page' : type.charAt(0).toUpperCase() + type.slice(1)),
    icon: fields.icon || '',
    action: fields.action || (type === 'page' ? 'page' : 'none'),
    target: fields.target || '',
    url: fields.url || '',
    color: fields.color || '',
    background: fields.background || ''
  };
}

function renderFields(type, existing = {}) {
  const root = document.getElementById('himFields');
  root.innerHTML = '';
  const field = (label, key, value, opts = {}) => {
    const wrap = document.createElement('div'); wrap.className='him-field';
    const l=document.createElement('label'); l.textContent=label;
    const input=document.createElement(opts.select?'select':'input');
    if(opts.select){ opts.options.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;o.selected=v===value;input.appendChild(o);}); }
    else { input.type=opts.type||'text'; input.value=value??''; input.placeholder=opts.placeholder||''; }
    input.dataset.key=key; wrap.append(l,input); root.appendChild(wrap);
  };
  field('Label / text','label',existing.label||'',{placeholder:'e.g. Music'});
  field('Icon','icon',existing.icon||'',{placeholder:'e.g. ♫'});
  if(type === 'page') field('Target page','target',existing.target||currentFirstPageName(),{select:true,options:getPageOptions()});
  else if(type === 'button') field('Action','action',existing.action||'page',{select:true,options:[['page','Open Page'],['url','Open Website'],['none','No Action']]});
  else if(type === 'text') field('Action','action',existing.action||'none',{select:true,options:[['none','No Action'],['page','Open Page'],['url','Open Website']]});
  else if(type === 'icon') field('Action','action',existing.action||'none',{select:true,options:[['none','No Action'],['page','Open Page'],['url','Open Website']]});
  else if(type === 'image') field('Image URL','url',existing.url||'',{placeholder:'https://...'});
  if(type !== 'page' && existing.action !== 'none' && existing.action !== undefined) {}
  if(type === 'button' || type === 'text' || type === 'icon') field('Target','target',existing.target||currentFirstPageName(),{select:true,options:getPageOptions()});
  if(type === 'image') field('Click action','action',existing.action||'none',{select:true,options:[['none','No Action'],['page','Open Page'],['url','Open Website']]});
  field('Text color','color',existing.color||'',{placeholder:'#ffffff'});
  field('Background','background',existing.background||'',{placeholder:'#7c3aed'});
}

function getPageOptions() {
  const definition = cachedProject ? normalizeDefinition(cachedProject) : null;
  const options = Object.entries(definition?.pages || {}).map(([id,page])=>[id,page.name]);
  return options.length ? options : [['home','Home']];
}
function currentFirstPageName() { return getPageOptions()[0]?.[0] || 'home'; }

async function openAddItem(editItem = null) {
  const project = await getProjectFresh();
  if (!project) return;
  const definition = normalizeDefinition(project);
  const header = currentHeader(definition);
  if (!header) return;
  activeHeaderId = header.id;
  const el = modal();
  const typeWrap = el.querySelector('#himTypes');
  const title = el.querySelector('#himTitle');
  const save = el.querySelector('#himSave');
  let selectedType = editItem?.type || 'page';
  typeWrap.innerHTML='';
  TYPES.forEach(([type,label])=>{
    const b=document.createElement('button'); b.type='button'; b.className='him-type'+(type===selectedType?' selected':''); b.textContent=label;
    b.onclick=()=>{selectedType=type;typeWrap.querySelectorAll('.him-type').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');renderFields(selectedType,editItem||{});};
    typeWrap.appendChild(b);
  });
  title.textContent = editItem ? 'Edit Header Item' : 'Add Header Item';
  save.textContent = editItem ? 'Save Item' : 'Add Item';
  renderFields(selectedType, editItem || {});
  save.onclick = async () => {
    const values={}; el.querySelectorAll('[data-key]').forEach((input)=>values[input.dataset.key]=input.value);
    const fresh=await getProjectFresh(); if(!fresh){closeModal();return;}
    const def=normalizeDefinition(fresh); const pageId=currentPageId(def); const page=def.pages[pageId]; const hdr=(page?.components||[]).find(x=>x.id===activeHeaderId&&x.type==='Header') || (page?.components||[]).find(x=>x.type==='Header');
    if(!hdr) return;
    hdr.props=hdr.props||{}; hdr.props.customItems=Array.isArray(hdr.props.customItems)?hdr.props.customItems:[];
    if(editItem){const index=hdr.props.customItems.findIndex(x=>x.id===editItem.id);if(index>=0)hdr.props.customItems[index]={...hdr.props.customItems[index],...makeItem(selectedType,values),id:editItem.id};}
    else hdr.props.customItems.push(makeItem(selectedType,values));
    await supabase.from('projects').update({pages:def.pages,app_definition:{...fresh.app_definition,pages:def.pages},updated_at:new Date().toISOString()}).eq('id',fresh.id).eq('user_id',fresh.user_id);
    closeModal(); location.reload();
  };
  el.hidden=false;
}

function selectedHeaderFromCanvas() {
  const node=document.querySelector('.canvas-header-component.selected');
  return node?.dataset?.headerComponent || null;
}

function renderCustomItemManager() {
  if (!selectionLabel || selectionLabel.textContent !== 'Header' || !inspector) return;
  const selected=selectedHeaderFromCanvas();
  if (selected) activeHeaderId=selected;
  let existing=inspector.querySelector('.header-items-box');
  if (existing) existing.remove();
  existing=document.createElement('div'); existing.className='header-items-box';
  const title=document.createElement('div'); title.className='header-items-title'; const strong=document.createElement('strong'); strong.textContent='Header Items'; title.appendChild(strong);
  const add=document.createElement('button'); add.type='button'; add.className='header-add-item'; add.textContent='+ Add Item'; add.onclick=()=>openAddItem(); title.appendChild(add); existing.appendChild(title);
  const list=document.createElement('div'); existing.appendChild(list);
  getProjectFresh().then((project)=>{
    if(!project||selectionLabel.textContent!=='Header')return;
    const def=normalizeDefinition(project); const header=currentHeader(def); const items=header?.props?.customItems||[];
    if(!items.length){const empty=document.createElement('div');empty.className='header-items-empty';empty.textContent='No custom items yet. Add anything you need.';list.appendChild(empty);return;}
    items.forEach((item)=>{const row=document.createElement('div');row.className='header-custom-item';const main=document.createElement('div');main.className='header-custom-item-main';const n=document.createElement('div');n.className='header-custom-item-name';n.textContent=(item.icon?' '+item.icon+' ':'')+(item.label||'Untitled');const t=document.createElement('div');t.className='header-custom-item-type';t.textContent=item.type;main.append(n,t);const edit=document.createElement('button');edit.type='button';edit.textContent='✎';edit.title='Edit';edit.onclick=()=>openAddItem(item);const del=document.createElement('button');del.type='button';del.textContent='×';del.title='Remove';del.onclick=()=>removeItem(item.id);row.append(main,edit,del);list.appendChild(row);});
  });
  inspector.appendChild(existing);
}

async function removeItem(itemId){
  const fresh=await getProjectFresh(); if(!fresh)return; const def=normalizeDefinition(fresh); const pageId=currentPageId(def); const page=def.pages[pageId]; const hdr=(page?.components||[]).find(x=>x.id===activeHeaderId&&x.type==='Header') || (page?.components||[]).find(x=>x.type==='Header'); if(!hdr)return; hdr.props=hdr.props||{}; hdr.props.customItems=(hdr.props.customItems||[]).filter(x=>x.id!==itemId); await supabase.from('projects').update({pages:def.pages,app_definition:{...fresh.app_definition,pages:def.pages},updated_at:new Date().toISOString()}).eq('id',fresh.id).eq('user_id',fresh.user_id); location.reload();
}

function injectCustomMenuItems(panel){
  if (!panel || panel.dataset.customInjected === '1') return;
  panel.dataset.customInjected='1';
  getProjectFresh().then((project)=>{
    if(!project)return; const def=normalizeDefinition(project); const header=currentHeader(def); const items=header?.props?.customItems||[]; if(!items.length)return;
    const addButton=panel.querySelector('.header-menu-add');
    items.forEach((item)=>{
      const b=document.createElement('button');b.type='button';b.className='header-menu-item header-custom-menu-entry';b.textContent=(item.icon?item.icon+' ':'')+(item.label||'Item');b.style.color=item.color||'';b.style.background=item.background||'';
      b.onclick=()=>runItemAction(item,def); panel.insertBefore(b,addButton||null);
    });
  });
}

function runItemAction(item,def){
  if(item.action==='page'){
    const target=def.pages?.[item.target]; if(target){const btn=[...document.querySelectorAll('#pageList .page-button')].find(x=>x.textContent===target.name);btn?.click();}
  } else if(item.action==='url' && item.url){window.open(item.url,'_blank','noopener,noreferrer');}
}

function watchMenuPanels(){
  const observer=new MutationObserver((mutations)=>{for(const m of mutations){for(const n of m.addedNodes){if(n.nodeType===1){if(n.classList?.contains('header-menu-panel'))injectCustomMenuItems(n);n.querySelectorAll?.('.header-menu-panel').forEach(injectCustomMenuItems);}}}});
  observer.observe(document.body,{childList:true,subtree:true});
}

function watchInspector(){
  const observer=new MutationObserver(()=>{const html=inspector?.innerHTML||''; if(selectionLabel?.textContent==='Header' && html!==lastInspectorHtml){lastInspectorHtml=html;clearTimeout(inspectorTimer);inspectorTimer=setTimeout(renderCustomItemManager,80);}});
  observer.observe(inspector,{childList:true,subtree:true});
}

injectStyles();
watchMenuPanels();
watchInspector();
setInterval(()=>{if(selectionLabel?.textContent==='Header')renderCustomItemManager();},1400);
