import { supabase } from './auth/supabase-config.js';

const appTitle = document.getElementById('appTitle');
const message = document.getElementById('message');
const grid = document.getElementById('templateGrid');
const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');
const requestedAppName = params.get('appName')?.trim() || '';
const requestedDescription = params.get('description')?.trim() || '';

function setMessage(text) { if (message) message.textContent = text; }
function esc(value) { const div=document.createElement('div'); div.textContent=value??''; return div.innerHTML; }

function renderMiniComponent(component) {
  const type=component?.type, p=component?.props||{};
  if(type==='Heading') return `<div class="mini-heading" style="color:${esc(p.color||'#fff')};font-size:${Math.min(Number(p.size)||18,22)}px">${esc(p.text||'Heading')}</div>`;
  if(type==='Text') return `<div class="mini-text" style="color:${esc(p.color||'#9aa4b2')}">${esc(p.text||'Text')}</div>`;
  if(type==='Image') return p.url?`<img class="mini-image" src="${esc(p.url)}" alt="${esc(p.alt||'')}">`:'';
  if(type==='Video'){const poster=p.posterUrl||'';return `<div class="mini-video" style="background-image:url('${esc(poster)}')"><span class="mini-play">▶</span><span class="mini-video-title">${esc(p.title||'Video')}</span></div>`;}
  if(type==='Button') return `<div class="mini-button" style="background:${esc(p.background||'#ff2b55')};color:${esc(p.color||'#fff')}">${esc(p.label||'Button')}</div>`;
  if(type==='Card') return `<div class="mini-card-large"><strong>${esc(p.title||'Card')}</strong><span>${esc(p.text||'')}</span></div>`;
  if(type==='Input') return `<div class="mini-input"><small>${esc(p.label||'Input')}</small><div>${esc(p.placeholder||'')}</div></div>`;
  if(type==='List') return `<div class="mini-list"><strong>${esc(p.title||'List')}</strong>${(p.items||[]).slice(0,4).map(item=>`<span>${esc(item)}</span>`).join('')}</div>`;
  if(type==='Menu') return `<div class="mini-menu">${(p.items||[]).slice(0,4).map(item=>`<span>${esc(item)}</span>`).join('')}</div>`;
  return '';
}

function renderTemplate(template){
  const article=document.createElement('article');article.className='template-card';
  const definition=template.definition||{},home=definition.pages?.home||Object.values(definition.pages||{})[0]||{components:[]};
  const components=Array.isArray(home.components)?home.components:[],visible=components.filter(c=>!c?.demoOnly||c?.props?.demoOnly).slice(0,7);
  const previewHtml=visible.map(renderMiniComponent).join(''),previewImage=definition.assets?.previewImage||'';
  const preview=previewImage?`<img class="template-artwork" src="${esc(previewImage)}" alt="${esc(template.name)} preview" loading="lazy">`:`<div class="mini-phone real-phone"><div class="mini-status"><span>9:41</span><span>● ◔ ▰</span></div><div class="mini-appbar"><strong>${esc(definition.metadata?.title||template.name)}</strong><span>⌕</span></div><div class="mini-screen">${previewHtml||'<div class="mini-text">Preview</div>'}</div><div class="mini-bottom-nav">${(definition.navigation?.items||[]).slice(0,4).map(item=>`<span>${esc(item.label)}</span>`).join('')}</div></div>`;
  article.innerHTML=`<div class="template-preview real-preview">${preview}</div><div class="template-body"><h2></h2><p></p><div class="template-actions"><button class="template-preview-button" type="button">Preview App</button><button class="template-button" type="button">Use Template</button></div></div>`;
  article.querySelector('h2').textContent=template.name;article.querySelector('p').textContent=template.description;
  article.querySelector('.template-button').addEventListener('click',()=>useTemplate(template,article.querySelector('.template-button')));
  article.querySelector('.template-preview-button').addEventListener('click',()=>openTemplatePreview(template));grid.appendChild(article);
}

function openTemplatePreview(template){sessionStorage.setItem('indoTemplatePreview',JSON.stringify({name:template.name,description:template.description,definition:template.definition}));window.location.assign(`template-preview.html?slug=${encodeURIComponent(template.slug)}`);}
async function currentUser(){const {data,error}=await supabase.auth.getUser();if(error)throw error;if(!data.user){window.location.assign(new URL('auth/sign-in.html',window.location.href).href);return null;}return data.user;}

async function useTemplate(template,button){
  if(button)button.disabled=true;setMessage(`Applying ${template.name}...`);
  try{
    const user=await currentUser();if(!user)return;
    const definition=structuredClone(template.definition||{});
    if(projectId){
      const {data:project,error:projectError}=await supabase.from('projects').select('id,name').eq('id',projectId).eq('user_id',user.id).maybeSingle();
      if(projectError)throw projectError;if(!project)throw new Error('Project not found or access denied');
      const next={...definition,metadata:{...(definition.metadata||{}),title:project.name,description:template.description}};
      const {error}=await supabase.from('projects').update({pages:next.pages||{},app_definition:next,start_mode:'template',updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',user.id);
      if(error)throw error;window.location.assign(`builder-v2.html?projectId=${encodeURIComponent(projectId)}`);return;
    }
    const name=requestedAppName||`${template.name} App`,description=requestedDescription||template.description;
    const next={...definition,metadata:{...(definition.metadata||{}),title:name,description}};
    const {data:project,error}=await supabase.from('projects').insert({user_id:user.id,name,description,start_mode:'template',status:'draft',pages:next.pages||{},app_definition:next}).select('id').single();
    if(error)throw error;window.location.assign(`builder-v2.html?projectId=${encodeURIComponent(project.id)}`);
  }catch(error){console.error(error);setMessage(`Could not use template: ${error.message||'Please try again.'}`);if(button)button.disabled=false;}
}

async function loadTemplates(){
  const user=await currentUser();if(!user)return;
  if(projectId){const {data:project,error}=await supabase.from('projects').select('id,user_id,name').eq('id',projectId).eq('user_id',user.id).maybeSingle();if(error)throw error;if(!project)throw new Error('Project not found or access denied');appTitle.textContent=`Select a template for: ${project.name}`;}
  else if(requestedAppName)appTitle.textContent=`Choose a template for: ${requestedAppName}`;
  const {data:templates,error}=await supabase.from('templates').select('id,slug,name,description,definition').eq('is_active',true).order('created_at',{ascending:true});
  if(error)throw error;grid.innerHTML='';if(!templates?.length){grid.innerHTML='<p class="message">No templates are available yet.</p>';return;}templates.forEach(renderTemplate);
}
loadTemplates().catch(error=>{console.error(error);setMessage(`Could not load templates: ${error.message||'error'}`);});
