import DataBinding from './data-binding.js';
import { renderResponseBindingPanel } from './response-binding-panel.js';

const projectId=new URLSearchParams(location.search).get('projectId');
const canvas=document.getElementById('canvas');
const inspector=document.getElementById('inspectorContent');
if(!projectId||!canvas||!inspector)throw new Error('Data binding integration requires a builder project.');

const key=`indo-data-bindings-${projectId}`;
let applying=false;

function builderDefinition(){
  return window.__indoBuilderState?.getDefinition?.() || null;
}

function loadBindings(){
  const definition=builderDefinition();
  if(definition?.dataBindings&&typeof definition.dataBindings==='object')return definition.dataBindings;
  try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}
}

let bindings=loadBindings();

function persistBindings(){
  try{localStorage.setItem(key,JSON.stringify(bindings))}catch{}
  const definition=builderDefinition();
  if(definition){
    definition.dataBindings=JSON.parse(JSON.stringify(bindings));
    window.__indoBuilderState?.markDirty?.('Data binding changed');
  }
}

const componentKey=item=>String(item.dataset.index);

function ensurePanel(){
  let p=document.getElementById('dataBindingPanel');
  if(!p){p=document.createElement('div');p.id='dataBindingPanel';p.className='inspector-field data-binding-panel';inspector.appendChild(p)}
  return p;
}

function ensureResponsePanel(){
  let p=document.getElementById('responseBindingPanel');
  if(!p){p=document.createElement('div');p.id='responseBindingPanel';p.className='inspector-field data-binding-panel';inspector.appendChild(p)}
  return p;
}

async function renderPanel(item){
  const p=ensurePanel();
  p.innerHTML='<label>Data</label><select id="dataBindingTable"><option value="">No database binding</option></select><div class="binding-help">Connect this component to app data.</div>';
  const s=p.querySelector('#dataBindingTable');
  try{
    const tables=await DataBinding.tables();
    tables.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.name;s.appendChild(o)});
    s.value=bindings[componentKey(item)]?.tableId||'';
  }catch{
    p.querySelector('.binding-help').textContent='Could not load app tables.';
    return;
  }
  s.onchange=async()=>{
    const k=componentKey(item);
    if(!s.value){delete bindings[k];persistBindings();return}
    bindings[k]={...(bindings[k]||{}),tableId:s.value,mode:'list'};
    persistBindings();
    await applyBinding(item,bindings[k]);
  };
}

function renderResponsePanel(item){
  const p=ensureResponsePanel();
  const b=bindings[componentKey(item)]?.responseBinding||{};
  renderResponseBindingPanel(p,{responseBinding:b},next=>{
    const k=componentKey(item);
    bindings[k]={...(bindings[k]||{}),responseBinding:next};
    persistBindings();
    applyResponseBinding(item,next);
  });
}

function path(data,path){
  return String(path||'').replace(/^response\.?/,'').split('.').filter(Boolean).reduce((v,k)=>v?.[k],data);
}

function applyResponseBinding(item,binding,result=window.__indoLastApiResponse){
  if(!item||!binding?.path||!result)return;
  const value=path(result.data,binding.path);
  if(value==null)return;
  const target=item.querySelector('h1,h2,h3,p,span,img,input,textarea,button');
  if(!target)return;
  if(target instanceof HTMLImageElement)target.src=String(value);
  else if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement)target.value=String(value);
  else target.textContent=String(value);
}

function textValue(data){
  if(!data||typeof data!=='object')return String(data??'');
  for(const k of ['title','name','text','label','description','value'])if(data[k]!=null)return String(data[k]);
  const v=Object.values(data).find(x=>['string','number','boolean'].includes(typeof x));
  return v==null?'':String(v);
}

async function applyBinding(item,binding){
  if(applying||!binding?.tableId)return;
  applying=true;
  try{
    const rows=await DataBinding.records(binding.tableId,50);
    const host=item.querySelector('.data-bound-preview')||document.createElement('div');
    host.className='data-bound-preview';
    host.innerHTML='';
    host.style.cssText='margin-top:10px;display:grid;gap:8px;width:100%;';
    rows.forEach(row=>{
      const card=document.createElement('div');
      card.style.cssText='padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.04);';
      card.textContent=textValue(row.data);
      host.appendChild(card);
    });
    if(!item.contains(host))item.appendChild(host);
    if(!rows.length)host.textContent='No records yet';
  }finally{applying=false}
}

canvas.addEventListener('click',event=>{
  const item=event.target.closest('.canvas-item');
  if(!item)return;
  setTimeout(async()=>{
    await renderPanel(item);
    renderResponsePanel(item);
    const b=bindings[componentKey(item)];
    if(b)await applyBinding(item,b);
  },0);
});

window.addEventListener('indo:api-result',event=>{
  window.__indoLastApiResponse=event.detail;
  const item=document.querySelector('.canvas-item.selected');
  if(item)applyResponseBinding(item,bindings[componentKey(item)]?.responseBinding,event.detail);
});

new MutationObserver(()=>document.querySelectorAll('.canvas-item').forEach(item=>{
  const b=bindings[componentKey(item)];
  if(b&&!item.querySelector('.data-bound-preview'))applyBinding(item,b);
})).observe(canvas,{childList:true,subtree:true});

window.addEventListener('beforeunload',()=>{
  try{localStorage.setItem(key,JSON.stringify(bindings))}catch{}
  const definition=builderDefinition();
  if(definition)definition.dataBindings=JSON.parse(JSON.stringify(bindings));
});
