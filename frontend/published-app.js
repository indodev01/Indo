import { supabase } from './auth/supabase-config.js';
import { renderPublishedComponent } from './published-component-renderer.js';

const root=document.getElementById('app');
const slug=decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()||'');

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(definition,name){
 const page=definition?.pages?.home||Object.values(definition?.pages||{})[0];
 const components=page?.components||definition?.componentsList||[];
 const theme=definition?.metadata?.theme||{};
 root.innerHTML=`<div style="--primary:${esc(theme.primaryColor||'#5b45f4')};font-family:${esc(theme.fontFamily||'Inter,system-ui,sans-serif')};max-width:1100px;margin:0 auto;padding:32px"><header style="margin-bottom:28px"><h1 style="margin:0 0 8px">${esc(definition?.metadata?.title||name||'Published App')}</h1><p style="margin:0;color:#64748b">${esc(definition?.metadata?.description||'')}</p></header><section id="published-components"></section></div>`;
 const host=document.getElementById('published-components');
 components.forEach(component=>{const el=document.createElement('div');el.className='published-component';el.style.marginBottom='16px';el.innerHTML=renderPublishedComponent(component);host.appendChild(el);});
}
async function load(){
 if(!slug){root.innerHTML='<p style="padding:32px">Missing app slug.</p>';return;}
 root.innerHTML='<p style="padding:32px">Loading app…</p>';
 const result=await supabase.from('projects').select('name,app_definition,status').eq('status','published').eq('app_definition->publishing->>slug',slug).limit(1).maybeSingle();
 if(result.error){console.error(result.error);root.innerHTML='<p style="padding:32px">Unable to load this app.</p>';return;}
 if(!result.data){root.innerHTML='<p style="padding:32px">Published app not found.</p>';return;}
 render(result.data.app_definition||{},result.data.name);
}
load();
