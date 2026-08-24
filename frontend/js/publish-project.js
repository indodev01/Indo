import { supabase } from '../auth/supabase-config.js';
import { entitlementState } from './entitlement.js';
import { showPublishResult } from './publish-result-ui.js';

const publishButton=document.getElementById('publishButton');
const saveButton=document.getElementById('saveButton');
const status=document.getElementById('projectStatus');
const projectId=new URLSearchParams(window.location.search).get('projectId');

function setStatus(text){if(status)status.textContent=text}
function slugify(value){return String(value||'app').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'app'}
function liveUrl(slug){return new URL(`./live-app.html?slug=${encodeURIComponent(slug)}`,window.location.href).href}

async function uniqueSlug(baseSlug){
  const base=slugify(baseSlug);
  for(let attempt=0;attempt<100;attempt+=1){
    const candidate=attempt===0?base:`${base}-${attempt+1}`;
    const query=await supabase.from('projects').select('id').eq('status','published').eq('app_definition->publishing->>slug',candidate).neq('id',projectId).limit(1);
    if(query.error)throw query.error;
    if(!query.data?.length)return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-6)}`;
}

async function publishProject(){
  if(!projectId||!publishButton)return;
  publishButton.disabled=true;setStatus('Checking entitlement...');
  try{
    const before=await supabase.from('projects').select('updated_at,name,app_definition').eq('id',projectId).maybeSingle();
    if(before.error)throw before.error;
    if(!before.data)throw new Error('Project not found');
    const access=entitlementState(before.data.app_definition?.entitlement);
    if(!access.canUse)throw new Error('Your 24-hour trial has expired. Activate the app to publish again.');
    setStatus('Saving changes...');
    const beforeUpdated=before.data.updated_at||'';
    const builderSave=window.__indoBuilderState?.save;
    if(typeof builderSave==='function')await builderSave();
    else{
      saveButton?.click();
      let saved=false;
      for(let i=0;i<12&&!saved;i+=1){
        await new Promise(r=>setTimeout(r,300));
        const check=await supabase.from('projects').select('updated_at').eq('id',projectId).maybeSingle();
        if(check.error)throw check.error;
        saved=!!(check.data?.updated_at&&check.data.updated_at!==beforeUpdated);
      }
      if(!saved)throw new Error('Could not confirm the latest changes were saved. Please click Save and try Publish again.');
    }
    const latest=await supabase.from('projects').select('name,app_definition').eq('id',projectId).maybeSingle();
    if(latest.error||!latest.data)throw latest.error||new Error('Project not found');
    const latestAccess=entitlementState(latest.data.app_definition?.entitlement);
    if(!latestAccess.canUse)throw new Error('Your 24-hour trial has expired. Activate the app to publish again.');
    setStatus('Checking live URL...');
    const requested=latest.data.app_definition?.publishing?.slug||latest.data.name;
    const existing=latest.data.app_definition?.publishing?.slug;
    const slug=existing||await uniqueSlug(requested);
    setStatus('Publishing...');
    const definition={...(latest.data.app_definition||{}),publishing:{...(latest.data.app_definition?.publishing||{}),slug,published:true,publishedAt:new Date().toISOString()}};
    const {error}=await supabase.from('projects').update({status:'published',app_definition:definition,updated_at:new Date().toISOString()}).eq('id',projectId);
    if(error)throw error;
    const url=liveUrl(slug);
    if(navigator.clipboard)navigator.clipboard.writeText(url).catch(()=>{});
    showPublishResult(url);
    setStatus('Published');
  }catch(error){
    console.error(error);
    setStatus(error.message||'Publish failed');
  }finally{
    publishButton.disabled=false;
  }
}

publishButton?.addEventListener('click',publishProject);
