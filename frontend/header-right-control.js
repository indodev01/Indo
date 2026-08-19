import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, syncLegacyFields } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
let definition = null;
let activePageId = null;

async function loadDefinition(){
  if(!projectId) return false;
  const auth = await supabase.auth.getUser();
  if(auth.error || !auth.data.user) return false;
  const result = await supabase.from('projects')
    .select('id,user_id,name,description,app_definition,pages,updated_at')
    .eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if(result.error || !result.data) return false;
  definition = normalizeDefinition(result.data);
  const pageName = String(document.getElementById('pageStatus')?.textContent || '').trim().toLowerCase();
  activePageId = Object.entries(definition.pages).find(([id,p]) => String(p.name||'').trim().toLowerCase() === pageName)?.[0]
    || (definition.pages.home ? 'home' : Object.keys(definition.pages)[0]);
  return true;
}

function headerComponent(node){
  const id = node.dataset.headerComponent;
  const page = definition?.pages?.[activePageId];
  return page?.components?.find(c => c.id === id && c.type === 'Header') || null;
}

function ensureControl(node){
  const header = node.querySelector('.app-header');
  const component = headerComponent(node);
  if(!header || !component || header.querySelector('.header-right-control')) return;
  const p = component.props || {};
  const btn = document.createElement('button');
  btn.type='button';
  btn.className='header-right-control';
  btn.textContent = p.rightControlIcon || '⌕';
  btn.title='Double-click to edit right-side control';
  btn.style.color = p.rightControlColor || p.color || '#111827';
  btn.style.background = p.rightControlBackground || 'transparent';
  btn.style.borderColor = p.rightControlBorder || 'rgba(16,24,40,.12)';
  btn.style.fontSize = `${Number(p.rightControlSize)||18}px`;
  btn.style.display = (p.rightControlEnabled === false ? 'none' : 'grid');
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); });
  btn.addEventListener('dblclick', (e)=>{ e.stopPropagation(); openEditor(component, btn); });

  const menu = header.querySelector('.header-menu-toggle');
  if(menu) header.insertBefore(btn, menu);
  else header.appendChild(btn);
}

async function saveComponent(component){
  if(!definition || !activePageId || !projectId) return;
  const synced = syncLegacyFields(definition);
  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;
  if(!user) return;
  const result = await supabase.from('projects').update({
    pages:synced.pages,
    app_definition:synced.appDefinition,
    updated_at:new Date().toISOString()
  }).eq('id',projectId).eq('user_id',user.id);
  if(result.error) throw result.error;
}

function makeField(container,label,value,onInput,type='text'){
  const wrap=document.createElement('label');
  wrap.style.cssText='display:grid;gap:6px;color:#9ba7bb;font-size:10px;font-weight:800';
  wrap.textContent=label;
  const input=document.createElement('input');
  input.type=type; input.value=value ?? '';
  input.style.cssText='min-height:38px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9';
  input.addEventListener('input',()=>onInput(input.value));
  wrap.appendChild(input); container.appendChild(wrap);
}

function openEditor(component, button){
  const p=component.props||{};
  const state={
    enabled:p.rightControlEnabled!==false,
    icon:p.rightControlIcon||'⌕',
    label:p.rightControlLabel||'Search',
    color:p.rightControlColor||p.color||'#111827',
    background:p.rightControlBackground||'transparent',
    border:p.rightControlBorder||'rgba(16,24,40,.12)',
    size:p.rightControlSize||18
  };
  const backdrop=document.createElement('div');
  backdrop.style.cssText='position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:20px;background:rgba(2,5,12,.78);backdrop-filter:blur(8px)';
  const modal=document.createElement('div');
  modal.style.cssText='width:min(430px,100%);padding:22px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#111827;color:#fff;box-shadow:0 28px 90px rgba(0,0,0,.55)';
  modal.innerHTML='<h3 style="margin:0 0 15px;font-size:18px">Edit Right Side</h3><div id="hrFields" style="display:grid;gap:12px"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button id="hrCancel" type="button" style="min-height:36px;padding:0 13px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#c5cedb">Cancel</button><button id="hrApply" type="button" style="min-height:36px;padding:0 13px;border-radius:9px;border:0;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:800">Apply</button></div>';
  const fields=modal.querySelector('#hrFields');
  makeField(fields,'Label',state.label,v=>state.label=v);
  makeField(fields,'Icon',state.icon,v=>state.icon=v);
  makeField(fields,'Color',state.color,v=>state.color=v);
  makeField(fields,'Background',state.background,v=>state.background=v);
  makeField(fields,'Border',state.border,v=>state.border=v);
  makeField(fields,'Size',state.size,v=>state.size=Number(v)||18,'number');
  const toggle=document.createElement('label');
  toggle.style.cssText='display:flex;align-items:center;gap:8px;color:#dce4f1;font-size:11px;font-weight:700';
  const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=state.enabled; cb.onchange=()=>state.enabled=cb.checked;
  toggle.append(cb,document.createTextNode('Show on the right side')); fields.appendChild(toggle);
  modal.querySelector('#hrCancel').onclick=()=>backdrop.remove();
  modal.querySelector('#hrApply').onclick=async()=>{
    component.props={...(component.props||{}),rightControlEnabled:state.enabled,rightControlIcon:state.icon,rightControlLabel:state.label,rightControlColor:state.color,rightControlBackground:state.background,rightControlBorder:state.border,rightControlSize:state.size};
    try{await saveComponent(component);backdrop.remove();window.location.reload();}catch(error){console.error(error);window.alert(`Could not save right-side control. ${error.message||'Please try again.'}`);}
  };
  backdrop.appendChild(modal); document.body.appendChild(backdrop);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)backdrop.remove();});
}

async function init(){
  if(!await loadDefinition()) return;
  const apply=()=>canvas?.querySelectorAll('.canvas-header-component').forEach(ensureControl);
  apply();
  const observer=new MutationObserver(()=>window.requestAnimationFrame(apply));
  if(canvas) observer.observe(canvas,{childList:true,subtree:true});
}
init().catch(error=>console.error('Header right control init failed',error));
