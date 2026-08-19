import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, normalizeComponents } from './app-definition.js';
import DataBinding from './data-binding.js';
import { mountWorkflowRuntime } from './workflow-runtime.js';
import { applyPreviewMode } from './preview-mode.js';

const canvas=document.getElementById('previewCanvas');
const info=document.getElementById('previewInfo');
const back=document.getElementById('backButton');
const home=document.getElementById('homeButton');
const q=new URLSearchParams(location.search);
const projectId=q.get('projectId');
let definition;
let project;
let currentPageId=q.get('page')||'home';
let stopWorkflowRuntime=()=>{};
let lastApiResponse=null;

const pageId=value=>{
  if(definition?.pages?.[value])return value;
  const x=String(value||'').toLowerCase();
  return Object.entries(definition?.pages||{}).find(([id,page])=>id.toLowerCase()===x||String(page.name||'').toLowerCase()===x||String(page.slug||'').toLowerCase()===x)?.[0]||null;
};

function go(value){
  const id=pageId(value);
  if(!id)return false;
  currentPageId=id;
  const url=new URL(location.href);
  url.searchParams.set('page',id);
  history.pushState({},'',url);
  render();
  return true;
}

function btn(label,fn){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.onclick=fn;
  button.style.cssText='padding:9px 13px;border:0;border-radius:9px;background:#5b45f4;color:white;font-weight:700;cursor:pointer';
  return button;
}

function renderHeader(component){
  const props=component.props||{};
  const root=document.createElement('header');
  root.style.cssText=`position:relative;display:flex;align-items:center;justify-content:space-between;min-height:64px;padding:0 16px;background:${props.menuBackground||'#fff'};color:${props.titleColor||'#111827'};border-radius:12px 12px 0 0;border-bottom:1px solid rgba(0,0,0,.08)`;
  const title=document.createElement('strong');
  title.textContent=props.title||project?.name||'My App';
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.textContent=props.menuIcon||'☰';
  const menu=document.createElement('div');
  menu.style.cssText='display:none;position:absolute;top:70px;right:10px;z-index:20;width:220px;padding:8px;border-radius:12px;background:#0f172a';
  toggle.onclick=()=>{menu.style.display=menu.style.display==='none'?'block':'none'};
  (props.items||Object.keys(definition.pages)).forEach(id=>{
    const page=definition.pages[id];
    if(!page)return;
    const item=btn(page.name,()=>{menu.style.display='none';go(id)});
    item.style.width='100%';
    menu.append(item);
  });
  root.append(title,toggle,menu);
  return root;
}

function renderComponent(component){
  const props=component.props||{};
  const wrapper=document.createElement('section');
  wrapper.className='preview-item';
  let element;
  if(component.type==='Header')wrapper.append(renderHeader(component));
  else if(component.type==='Navigation'){
    element=document.createElement('nav');
    element.style.cssText='display:flex;gap:14px;flex-wrap:wrap';
    (props.items||[]).forEach(item=>element.append(btn(item,()=>go(item))));
    wrapper.append(element);
  }else if(component.type==='Hero Section'){
    element=document.createElement('div');
    element.style.cssText='padding:36px 20px;border-radius:14px;background:#111827;color:#fff';
    const heading=document.createElement('h2');heading.textContent=props.title||'';
    const text=document.createElement('p');text.textContent=props.text||'';
    element.append(heading,text,btn(props.button||'Get Started',()=>{}));
    wrapper.append(element);
  }else if(component.type==='Buttons'){
    element=btn(props.label||'Get Started',()=>props.link&&go(props.link));
    wrapper.append(element);
  }else if(component.type==='Cards'){
    element=document.createElement('div');
    element.style.cssText='padding:18px;border:1px solid #e5e7eb;border-radius:14px';
    const heading=document.createElement('h3');heading.textContent=props.title||'Card title';
    const text=document.createElement('p');text.textContent=props.text||'Card content';
    element.append(heading,text);wrapper.append(element);
  }else if(component.type==='Images'||component.type==='Image'){
    if(props.url){element=document.createElement('img');element.src=props.url;element.alt=props.alt||'Image';element.style.maxWidth='100%';wrapper.append(element)}
  }else if(component.type==='Videos'){
    element=document.createElement('video');element.controls=props.controls!==false;element.autoplay=!!props.autoplay;element.src=props.url||'';element.style.width='100%';wrapper.append(element);
  }else if(component.type==='Music Player'){
    const heading=document.createElement('strong');heading.textContent=props.title||'Now Playing';
    element=document.createElement('audio');element.controls=true;element.src=props.src||'';wrapper.append(heading,element);
  }else if(component.type==='Forms'){
    element=document.createElement('form');
    const heading=document.createElement('h3');heading.textContent=props.title||'Contact us';
    element.append(heading);
    (props.fields||[]).forEach(fieldName=>{const input=document.createElement('input');input.name=fieldName;input.placeholder=fieldName;input.style.cssText='display:block;width:100%;margin:7px 0;padding:10px;border:1px solid #d1d5db;border-radius:8px';element.append(input)});
    element.append(btn('Submit',()=>{}));wrapper.append(element);
  }else if(component.type==='Input'){
    element=document.createElement('input');element.name=props.name||props.label||'value';element.placeholder=props.placeholder||props.label||'';element.type=props.inputType||'text';element.required=!!props.required;element.style.cssText='width:100%;padding:11px;border:1px solid #d6d9e4;border-radius:9px';wrapper.append(element);
  }else if(component.type==='Text'){element=document.createElement('p');element.textContent=props.text||'';wrapper.append(element)}
  else if(component.type==='Heading'){element=document.createElement('h1');element.textContent=props.text||'';wrapper.append(element)}
  else if(component.type==='Container'){element=document.createElement('div');element.textContent='Container';element.style.cssText=`padding:${Number(props.padding)||16}px;background:${props.background||'#fff'};border-radius:${Number(props.radius)||12}px`;wrapper.append(element)}
  else if(component.type==='Icon'){element=document.createElement('span');element.textContent=props.name||'★';element.style.fontSize=`${Number(props.size)||28}px`;wrapper.append(element)}
  else if(component.type==='List'){element=document.createElement('ul');(props.items||[]).forEach(item=>{const li=document.createElement('li');li.textContent=item;element.append(li)});wrapper.append(element)}
  else if(component.type==='Divider')wrapper.append(document.createElement('hr'));
  else if(component.type==='Spacer'){element=document.createElement('div');element.style.height=`${Number(props.height)||24}px`;wrapper.append(element)}
  else{element=document.createElement('div');element.textContent=props.text||component.type;wrapper.append(element)}
  return wrapper;
}

function responseValue(data,path){
  return String(path||'').replace(/^response\.?/,'').split('.').filter(Boolean).reduce((value,key)=>value?.[key],data);
}

function loadBindings(){
  try{return JSON.parse(localStorage.getItem(`indo-data-bindings-${projectId}`)||'{}')}catch{return{}}
}

async function applyDatabaseBindings(){
  const bindings=loadBindings();
  const items=[...canvas.querySelectorAll('.preview-item')];
  for(let index=0;index<items.length;index+=1){
    const binding=bindings[String(index)];
    if(!binding?.tableId)continue;
    const item=items[index];
    try{
      const rows=await DataBinding.records(binding.tableId,50);
      const host=document.createElement('div');
      host.className='preview-data-list';
      host.style.cssText='display:grid;gap:10px;margin-top:12px';
      rows.forEach(row=>{
        const card=document.createElement('article');
        card.style.cssText='padding:12px;border:1px solid #e5e7eb;border-radius:10px';
        const data=row.data||{};
        const title=data.title??data.name??data.text??data.label??'Record';
        const desc=data.description??data.value??'';
        const image=data.image??data.image_url??data.url;
        if(image){const img=document.createElement('img');img.src=String(image);img.alt=String(title);img.style.cssText='width:100%;max-height:180px;object-fit:cover;border-radius:8px';card.append(img)}
        const heading=document.createElement('strong');heading.textContent=String(title);card.append(heading);
        if(desc){const p=document.createElement('p');p.textContent=String(desc);card.append(p)}
        host.append(card);
      });
      if(!rows.length)host.textContent='No records yet';
      item.append(host);
    }catch{
      const error=document.createElement('p');
      error.textContent='Could not load database records';
      error.style.opacity='.6';
      item.append(error);
    }
  }
}

function applyResponseBindings(){
  if(!lastApiResponse)return;
  const bindings=loadBindings();
  canvas.querySelectorAll('.preview-item').forEach((item,index)=>{
    const binding=bindings[String(index)]?.responseBinding;
    if(!binding?.path)return;
    const value=responseValue(lastApiResponse.data,binding.path);
    if(value==null)return;
    const target=item.querySelector('h1,h2,h3,p,span,img,input,textarea,button');
    if(!target)return;
    if(target instanceof HTMLImageElement)target.src=String(value);
    else if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement)target.value=String(value);
    else target.textContent=String(value);
  });
}

function render(){
  const page=definition?.pages?.[currentPageId];
  if(!page){canvas.textContent='Page not found';return}
  info.textContent=`${project.name||'Untitled App'} • ${page.name}`;
  canvas.innerHTML='';
  canvas.style.background=page.styles?.background||'#fff';
  canvas.style.padding=page.styles?.padding||'24px';
  normalizeComponents(page.components||[]).forEach(component=>canvas.append(renderComponent(component)));
  applyDatabaseBindings().then(applyResponseBindings);
}

async function load(){
  if(!projectId)throw new Error('Missing project');
  const auth=await supabase.auth.getUser();
  if(auth.error)throw auth.error;
  if(!auth.data.user){location.replace('../auth/sign-in.html');return}
  const result=await supabase.from('projects').select('id,user_id,name,description,start_mode,app_definition,pages').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)throw new Error('Project not found');
  project=result.data;
  definition=normalizeDefinition(project);
  applyPreviewMode(project,definition);
  currentPageId=pageId(currentPageId)||Object.keys(definition.pages)[0]||'home';
  render();
  stopWorkflowRuntime();
  stopWorkflowRuntime=mountWorkflowRuntime(projectId);
}

window.addEventListener('indo:api-result',event=>{lastApiResponse=event.detail;applyResponseBindings()});
back?.addEventListener('click',()=>{location.href=`builder-v2.html?projectId=${encodeURIComponent(projectId||'')}`});
home?.addEventListener('click',()=>{location.href='index.html'});
window.addEventListener('popstate',()=>render());
load().catch(error=>{if(info)info.textContent='Preview failed';if(canvas)canvas.textContent=error.message||'Could not load preview'});
