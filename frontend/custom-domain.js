import { supabase } from './auth/supabase-config.js';

const DOMAIN_RE=/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeDomain(value){
  return String(value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/:\d+$/,'');
}

export function isValidDomain(value){return DOMAIN_RE.test(normalizeDomain(value));}

export async function requestCustomDomain(projectId,domain){
  const normalized=normalizeDomain(domain);
  if(!projectId)throw new Error('Missing project.');
  if(!isValidDomain(normalized))throw new Error('Enter a valid domain, for example example.com.');
  const userResult=await supabase.auth.getUser();
  if(userResult.error)throw userResult.error;
  if(!userResult.data.user)throw new Error('You must be signed in.');
  const project=await supabase.from('projects').select('id,user_id,app_definition').eq('id',projectId).eq('user_id',userResult.data.user.id).maybeSingle();
  if(project.error)throw project.error;
  if(!project.data)throw new Error('Project not found.');
  const definition={...(project.data.app_definition||{}),publishing:{...(project.data.app_definition?.publishing||{}),customDomain:{domain:normalized,status:'pending'}}};
  const update=await supabase.from('projects').update({app_definition:definition}).eq('id',projectId).eq('user_id',userResult.data.user.id);
  if(update.error)throw update.error;
  return definition.publishing.customDomain;
}

export function domainInstructions(domain){
 const d=normalizeDomain(domain);
 return {domain:d,recordType:'CNAME',host:'www',target:'YOUR_INDO_HOST',note:'DNS provider configuration is required before the domain can become live.'};
}

window.IndoCustomDomain={normalizeDomain,isValidDomain,requestCustomDomain,domainInstructions};
