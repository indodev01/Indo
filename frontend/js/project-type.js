import { supabase } from './auth/supabase-config.js';

export function normalizeProjectType(value){
  const type=String(value||'app').toLowerCase();
  return type==='website'?'website':'app';
}

export async function getProjectType(projectId,userId){
  const result=await supabase.from('projects').select('app_definition').eq('id',projectId).eq('user_id',userId).maybeSingle();
  if(result.error)throw result.error;
  return normalizeProjectType(result.data?.app_definition?.metadata?.projectType);
}

export function projectTypeLabel(type){return normalizeProjectType(type)==='website'?'Website':'App';}

window.IndoProjectType={normalizeProjectType,getProjectType,projectTypeLabel};
