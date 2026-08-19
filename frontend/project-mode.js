import { supabase } from './auth/supabase-config.js';

const projectId=new URLSearchParams(location.search).get('projectId');
let mode='app';

function normalize(value){return String(value||'app').toLowerCase()==='website'?'website':'app'}
function readProjectMode(project){return normalize(project?.app_definition?.metadata?.projectType||project?.project_type||project?.type)}

export async function loadProjectMode(){
  if(!projectId)return mode;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return mode;
  const result=await supabase.from('projects').select('project_type,app_definition').eq('id',projectId).eq('user_id',user.id).maybeSingle();
  if(result.error)throw result.error;
  mode=readProjectMode(result.data);
  window.dispatchEvent(new CustomEvent('indo:project-mode-ready',{detail:{mode}}));
  return mode;
}

export function getProjectMode(){return mode}

export async function setProjectMode(nextMode){
  if(!projectId)throw new Error('Missing project ID');
  const next=normalize(nextMode);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('Not signed in');
  const result=await supabase.from('projects').select('app_definition').eq('id',projectId).eq('user_id',user.id).maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)throw new Error('Project not found');
  const definition={...(result.data.app_definition||{}),metadata:{...(result.data.app_definition?.metadata||{}),projectType:next}};
  const update=await supabase.from('projects').update({project_type:next,app_definition:definition,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',user.id);
  if(update.error)throw update.error;
  mode=next;
  window.dispatchEvent(new CustomEvent('indo:project-mode-change',{detail:{mode:next}}));
  return next;
}

window.IndoProjectMode={get:getProjectMode,set:setProjectMode,load:loadProjectMode};
loadProjectMode().catch(console.error);
