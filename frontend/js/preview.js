import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, normalizeComponents, syncLegacyFields } from './app-definition.js';
import DataBinding from './data-binding.js';
import { mountWorkflowRuntime } from './workflow-runtime.js';
import { applyPreviewMode } from './preview-mode.js';

const canvas = document.getElementById('previewCanvas');
const info = document.getElementById('previewInfo');
const back = document.getElementById('backButton');
const home = document.getElementById('homeButton');
const query = new URLSearchParams(location.search);
const projectId = query.get('projectId');
let project = null;
let definition = null;
let currentPageId = query.get('page') || 'home';
let stopWorkflowRuntime = () => {};
let lastApiResponse = null;

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const pageId = (value) => {
  if (definition?.pages?.[value]) return value;
  const wanted = String(value || '').toLowerCase();
  return Object.entries(definition?.pages || {}).find(([id, page]) =>
    id.toLowerCase() === wanted ||
    String(page.name || '').toLowerCase() === wanted ||
    String(page.slug || '').toLowerCase() === wanted
  )?.[0] || null;
};

function injectPreviewStyles() {
  if (document.getElementById('indo-preview-core-style')) return;
  const style = document.createElement('style');
  style.id = 'indo-preview-core-style';
  style.textContent = `
    .preview-item{display:block;width:100%;max-width:100%;margin:0 0 14px;box-sizing:border-box}
    .preview-item>header.app-preview-header{display:flex;width:100%;min-height:64px;box-sizing:border-box;align-items:center;justify-content:space-between;gap:16px;padding:0 16px;border-radius:12px;border-bottom:1px solid rgba(0,0,0,.08)}
    .app-preview-title{min-width:0;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .app-preview-menu-toggle{flex:0 0 auto;border:0;border-radius:8px;padding:8px 10px;cursor:pointer}
    .app-preview-menu{display:none;position:absolute;right:10px;top:70px;z-index:50;width:220px;padding:8px;border-radius:12px;background:#0f172a;box-shadow:0 16px 40px rgba(0,0,0,.35)}
    .app-preview-menu.open{display:grid;gap:6px}
    .app-preview-menu button{width:100%;padding:9px 10px;border:0;border-radius:8px;background:#172033;color:#fff;text-align:left;cursor:pointer}
    .preview-item img,.preview-item video{display:block;max-width:100%}
    .preview-item audio{max-width:100%}
    .preview-generic-form input{display:block;width:100%;box-sizing:border-box;margin:7px 0;padding:10px;border:1px solid #d1d5db;border-radius:8px}
  `;
  document.head.appendChild(style);
}

function btn(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  button.style.cssText = 'padding:9px 13px;border:0;border-radius:9px;background:#5b45f4;color:#fff;font-weight:700;cursor:pointer';
  return button;
}

function cleanHeaders() {
  let changed = false;
  for (const page of Object.values(definition?.pages || {})) {
    const components = normalizeComponents(page.components || []);
    let found = false;
    const next = components.filter((component) => {
      if (component.type !== 'Header') return true;
      if (found) return false;
      found = true;
      return true;
    });
    if (next.length !== components.length) changed = true;
    page.components = next;
  }
  return changed;
}

async function persistDefinition() {
  const synced = syncLegacyFields(definition);
  const { error } = await supabase.from('projects').update({
    pages: clone(synced.pages),
    app_definition: clone(synced.appDefinition),
    updated_at: new Date().toISOString()
  }).eq('id', projectId).eq('user_id', project.user_id);
  if (error) throw error;
  project.pages = clone(synced.pages);
  project.app_definition = clone(synced.appDefinition);
}

function go(value) {
  const id = pageId(value);
  if (!id) return;
  currentPageId = id;
  const url = new URL(location.href);
  url.searchParams.set('page', id);
  history.pushState({}, '', url);
  render();
}

function renderHeader(component) {
  const props = component.props || {};
  const root = document.createElement('header');
  root.className = 'app-preview-header';
  root.style.position = 'relative';
  root.style.background = props.menuBackground || props.bg || '#fff';
  root.style.color = props.titleColor || props.color || '#111827';

  const title = document.createElement('strong');
  title.className = 'app-preview-title';
  title.textContent = props.title || project?.name || 'My App';
  title.style.fontFamily = props.fontFamily || 'Inter, system-ui, sans-serif';
  title.style.fontSize = `${Number(props.fontSize) || 20}px`;
  title.style.fontWeight = props.fontWeight || '800';
  title.style.color = props.titleColor || props.color || '#111827';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'app-preview-menu-toggle';
  toggle.textContent = props.menuIcon || '☰';
  toggle.style.color = props.menuIconColor || props.color || '#111827';
  toggle.style.background = props.menuBackground || 'rgba(16,24,40,.04)';
  toggle.style.fontSize = `${Number(props.menuIconSize) || 22}px`;

  const menu = document.createElement('div');
  menu.className = 'app-preview-menu';
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    menu.classList.toggle('open');
  });

  const ids = Array.isArray(props.items) ? props.items : Object.keys(definition.pages || {});
  ids.forEach((id) => {
    const page = definition.pages[id];
    if (!page) return;
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = page.name;
    item.addEventListener('click', () => { menu.classList.remove('open'); go(id); });
    menu.appendChild(item);
  });

  root.append(title, toggle, menu);
  return root;
}

function renderComponent(component) {
  const props = component.props || {};
  const wrapper = document.createElement('section');
  wrapper.className = 'preview-item';
  wrapper.dataset.componentId = component.id || '';

  if (component.type === 'Header') {
    wrapper.appendChild(renderHeader(component));
    return wrapper;
  }

  if (component.type === 'Navigation') {
    const nav = document.createElement('nav');
    nav.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap';
    (Array.isArray(props.items) ? props.items : []).forEach((label) => nav.appendChild(btn(label, () => go(label))));
    wrapper.appendChild(nav);
    return wrapper;
  }

  if (component.type === 'Hero Section') {
    const box = document.createElement('div');
    box.style.cssText = 'padding:36px 20px;border-radius:14px;background:#111827;color:#fff';
    const heading = document.createElement('h2'); heading.textContent = props.title || '';
    const text = document.createElement('p'); text.textContent = props.text || '';
    box.append(heading, text, btn(props.button || 'Get Started', () => {}));
    wrapper.appendChild(box);
    return wrapper;
  }

  if (component.type === 'Buttons') {
    const button = btn(props.label || 'Get Started', () => props.link && go(props.link));
    button.style.background = props.background || '#7c3aed';
    button.style.color = props.color || '#fff';
    button.style.borderRadius = `${Number(props.radius) || 10}px`;
    wrapper.appendChild(button);
    return wrapper;
  }

  if (component.type === 'Cards') {
    const card = document.createElement('article');
    card.style.cssText = `padding:18px;border:1px solid #e5e7eb;border-radius:${Number(props.radius)||14}px;background:${props.background||'#fff'};color:${props.color||'#111827'}`;
    const heading = document.createElement('h3'); heading.textContent = props.title || 'Card title';
    const text = document.createElement('p'); text.textContent = props.text || 'Card content';
    card.append(heading, text);
    wrapper.appendChild(card);
    return wrapper;
  }

  if (component.type === 'Images' || component.type === 'Image') {
    if (props.url) {
      const image = document.createElement('img'); image.src = props.url; image.alt = props.alt || 'Image'; image.style.width = props.width || 'auto'; image.style.borderRadius = `${Number(props.radius)||0}px`; wrapper.appendChild(image);
    }
    return wrapper;
  }

  if (component.type === 'Videos') {
    const video = document.createElement('video'); video.controls = props.controls !== false; video.autoplay = Boolean(props.autoplay); video.loop = Boolean(props.loop); video.muted = Boolean(props.muted); video.src = props.url || ''; video.style.width='100%'; wrapper.appendChild(video); return wrapper;
  }

  if (component.type === 'Music Player') {
    const title = document.createElement('strong'); title.textContent = props.title || 'Now Playing';
    const audio = document.createElement('audio'); audio.controls = true; audio.src = props.src || '';
    wrapper.append(title, audio); return wrapper;
  }

  if (component.type === 'Forms') {
    const form = document.createElement('form'); form.className='preview-generic-form'; form.addEventListener('submit',(event)=>event.preventDefault());
    const heading = document.createElement('h3'); heading.textContent = props.title || 'Contact us'; form.appendChild(heading);
    (Array.isArray(props.fields) ? props.fields : []).forEach((name)=>{ const input=document.createElement('input'); input.name=name; input.placeholder=name; form.appendChild(input); });
    form.appendChild(btn('Submit',()=>{})); wrapper.appendChild(form); return wrapper;
  }

  if (component.type === 'Input') {
    const input=document.createElement('input'); input.name=props.name||props.label||'value'; input.placeholder=props.placeholder||props.label||''; input.type=props.inputType||'text'; input.required=Boolean(props.required); input.style.cssText='width:100%;padding:11px;border:1px solid #d6d9e4;border-radius:9px'; wrapper.appendChild(input); return wrapper;
  }

  if (component.type === 'Text') { const el=document.createElement('p'); el.textContent=props.text||''; wrapper.appendChild(el); return wrapper; }
  if (component.type === 'Heading') { const el=document.createElement('h1'); el.textContent=props.text||''; wrapper.appendChild(el); return wrapper; }
  if (component.type === 'Icon') { const el=document.createElement('span'); el.textContent=props.name||'★'; el.style.fontSize=`${Number(props.size)||28}px`; wrapper.appendChild(el); return wrapper; }
  if (component.type === 'List') { const ul=document.createElement('ul'); (Array.isArray(props.items)?props.items:[]).forEach((item)=>{const li=document.createElement('li');li.textContent=item;ul.appendChild(li)}); wrapper.appendChild(ul); return wrapper; }
  if (component.type === 'Divider') { wrapper.appendChild(document.createElement('hr')); return wrapper; }
  if (component.type === 'Spacer') { const el=document.createElement('div'); el.style.height=`${Number(props.height)||24}px`; wrapper.appendChild(el); return wrapper; }

  const fallback=document.createElement('div'); fallback.textContent=props.text||component.type; wrapper.appendChild(fallback); return wrapper;
}

function loadBindings() { try { return JSON.parse(localStorage.getItem(`indo-data-bindings-${projectId}`)||'{}'); } catch { return {}; } }
function responseValue(data,path){ return String(path||'').replace(/^response\.?/,'').split('.').filter(Boolean).reduce((value,key)=>value?.[key],data); }

async function applyDatabaseBindings() {
  const bindings=loadBindings(); const items=[...canvas.querySelectorAll('.preview-item')];
  for(let i=0;i<items.length;i+=1){ const binding=bindings[String(i)]; if(!binding?.tableId) continue; try { const rows=await DataBinding.records(binding.tableId,50); const host=document.createElement('div'); host.style.cssText='display:grid;gap:10px;margin-top:12px'; rows.forEach((row)=>{const card=document.createElement('article');card.style.cssText='padding:12px;border:1px solid #e5e7eb;border-radius:10px';const data=row.data||{};const title=data.title??data.name??data.text??data.label??'Record';const desc=data.description??data.value??'';const h=document.createElement('strong');h.textContent=String(title);card.appendChild(h);if(desc){const p=document.createElement('p');p.textContent=String(desc);card.appendChild(p)}host.appendChild(card)});if(!rows.length)host.textContent='No records yet';items[i].appendChild(host);}catch{}}
}

function applyResponseBindings(){ if(!lastApiResponse)return; const bindings=loadBindings(); canvas.querySelectorAll('.preview-item').forEach((item,i)=>{const binding=bindings[String(i)]?.responseBinding;if(!binding?.path)return;const value=responseValue(lastApiResponse.data,binding.path);if(value==null)return;const target=item.querySelector('h1,h2,h3,p,span,img,input,textarea,button');if(!target)return;if(target instanceof HTMLImageElement)target.src=String(value);else if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement)target.value=String(value);else target.textContent=String(value);}); }

function render(){
  const page=definition?.pages?.[currentPageId];
  if(!page){canvas.textContent='Page not found';return;}
  info.textContent=`${project.name||'Untitled App'} • ${page.name}`;
  canvas.innerHTML='';
  canvas.style.background=page.styles?.background||'#fff';
  canvas.style.padding=page.styles?.padding||'24px';
  normalizeComponents(page.components||[]).forEach((component)=>canvas.appendChild(renderComponent(component)));
  applyDatabaseBindings().then(applyResponseBindings);
}

async function load(){
  if(!projectId) throw new Error('Missing project');
  const auth=await supabase.auth.getUser(); if(auth.error) throw auth.error;
  if(!auth.data.user){location.replace('../auth/sign-in.html');return;}
  const result=await supabase.from('projects').select('id,user_id,name,description,start_mode,app_definition,pages,project_type').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if(result.error) throw result.error; if(!result.data) throw new Error('Project not found');
  project=result.data; definition=normalizeDefinition(project);
  if(cleanHeaders()) await persistDefinition();
  applyPreviewMode(project,definition);
  currentPageId=pageId(currentPageId)||Object.keys(definition.pages)[0]||'home';
  injectPreviewStyles();
  render();
  stopWorkflowRuntime(); stopWorkflowRuntime=mountWorkflowRuntime(projectId);
}

window.addEventListener('indo:api-result',(event)=>{lastApiResponse=event.detail;applyResponseBindings()});
back?.addEventListener('click',()=>{location.href=`builder-v2.html?projectId=${encodeURIComponent(projectId||'')}`});
home?.addEventListener('click',()=>{location.href='index.html'});
window.addEventListener('popstate',render);
load().catch((error)=>{if(info)info.textContent='Preview failed';if(canvas)canvas.textContent=error.message||'Could not load preview'});
