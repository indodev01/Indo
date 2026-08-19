import { supabase } from './auth/supabase-config.js';

const projectId=new URLSearchParams(location.search).get('projectId');

export async function getProjectType(){
  if(!projectId)return 'app';
  const {data,error}=await supabase.from('projects').select('start_mode,app_definition').eq('id',projectId).maybeSingle();
  if(error)throw error;
  const type=String(data?.app_definition?.metadata?.projectType||data?.start_mode||'app').toLowerCase();
  return type==='website'?'website':'app';
}

export async function saveProjectType(type){
  if(!projectId)return;
  const normalized=String(type||'app').toLowerCase()==='website'?'website':'app';
  const {data,error}=await supabase.from('projects').select('app_definition').eq('id',projectId).maybeSingle();
  if(error)throw error;
  const definition={...(data?.app_definition||{}),metadata:{...(data?.app_definition?.metadata||{}),projectType:normalized}};
  const result=await supabase.from('projects').update({start_mode:normalized,app_definition:definition,updated_at:new Date().toISOString()}).eq('id',projectId);
  if(result.error)throw result.error;
  return normalized;
}

window.IndoProjectType={getProjectType,saveProjectType};
