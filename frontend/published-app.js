import { supabase } from './auth/supabase-config.js';
import { renderPublishedComponent } from './published-component-renderer.js';
import { mountPublishedWorkflows } from './published-workflow-runtime.js';
import { mountPublishedAuth } from './published-auth.js';
import { observePublishedAuthVisibility } from './published-auth-visibility.js';
import { mountWebsiteMode, isWebsiteProject } from './website-mode.js';
import { applyPublishedResponsive } from './published-responsive.js';
import { normalizePublishedLayout } from './published-visual-parity.js';

const root=document.getElementById('app');
const slug=decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()||'');
let currentDefinition=null;let projectName='';let renderedComponents=[];
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(definition,name,pageId){
 currentDefinition=definition;projectName=name;
 const page=definition?.pages?.[pageId]||definition?.pages?.home||Object.values(definition?.pages||{})[0];
 const components=page?.components||definition?.componentsList||[];renderedComponents=components;const theme=definition?.metadata?.theme||{};
 root.innerHTML=`<div class="published-shell" style="--primary:${esc(theme.primaryColor||'#5b45f4')};font-family:${esc(theme.fontFamily||'Inter,system-ui,sans-serif')}"><header class="published-header"><h1>${esc(definition?.metadata?.title||name||'Published App')}</h1><p>${esc(definition?.metadata?.description||'')}</p></header><section id="published-components"></section></div>`;
 const host=document.getElementById('published-components');
 components.forEach((component,index)=>{const el=document.createElement('div');el.className='published-component';el.dataset.index=String(index);el.style.marginBottom='16px';el.innerHTML=renderPublishedComponent(component);host.appendChild(el);});
 normalizePublishedLayout(root);
 applyPublishedResponsive(root,components);
 mountPublishedAuth(host,{onStateChange:user=>{host.querySelectorAll('[data-auth="user"]').forEach(node=>{node.textContent=user?.email||'Not signed in'});},onError:error=>{host.querySelectorAll('.pub-form-message').forEach(node=>{if(!node.textContent)node.textContent=error?.message||'Authentication failed';});}});
 mountPublishedWorkflows(definition);
 observePublishedAuthVisibility(root);
 if(isWebsiteProject(definition?.project||definition))mountWebsiteMode({project:definition?.project||definition,definition,switchPage:(next)=>render(definition,name,next),root});
}
async function load(){
 if(!slug){root.innerHTML='<p style="padding:32px">Missing app slug.</p>';return;}
 root.innerHTML='<p style="padding:32px">Loading app…</p>';
 const result=await supabase.from('projects').select('name,project_type,app_definition,status').eq('status','published').eq('app_definition->publishing->>slug',slug).limit(1).maybeSingle();
 if(result.error){console.error(result.error);root.innerHTML='<p style="padding:32px">Unable to load this app.</p>';return;}
 if(!result.data){root.innerHTML='<p style="padding:32px">Published app not found.</p>';return;}
 const definition={...(result.data.app_definition||{}),project:{...(result.data.app_definition?.project||{}),project_type:result.data.project_type||result.data.app_definition?.project?.project_type||'app'}};
 const hashPage=new URLSearchParams(location.hash.replace(/^#/,'')).get('page')||'home';
 render(definition,result.data.name,hashPage);
}
window.addEventListener('resize',()=>currentDefinition&&applyPublishedResponsive(root,renderedComponents));
window.addEventListener('hashchange',()=>{if(currentDefinition){const page=new URLSearchParams(location.hash.replace(/^#/,'')).get('page')||'home';render(currentDefinition,projectName,page);}});
load();
