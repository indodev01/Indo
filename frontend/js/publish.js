import { supabase } from './auth/supabase-config.js';

function slugify(value){return String(value||'app').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'app'}

export function makePublishSlug(name,requested){return slugify(requested||name)}

export async function publishProject(projectId,requestedSlug){
  const userResult=await supabase.auth.getUser();
  if(userResult.error)throw userResult.error;
  if(!userResult.data.user)throw new Error('You must be signed in to publish.');
  const projectResult=await supabase.from('projects').select('id,name,description,app_definition').eq('id',projectId).eq('user_id',userResult.data.user.id).maybeSingle();
  if(projectResult.error)throw projectResult.error;
  if(!projectResult.data)throw new Error('Project not found.');
  const slug=makePublishSlug(projectResult.data.name,requestedSlug);
  const definition=projectResult.data.app_definition||{};
  const publishedAt=new Date().toISOString();
  const next={...definition,publishing:{slug,published:true,publishedAt}};
  const update=await supabase.from('projects').update({app_definition:next}).eq('id',projectId).eq('user_id',userResult.data.user.id);
  if(update.error)throw update.error;
  return {slug,publishedAt,url:`/app/${encodeURIComponent(slug)}`,definition:next};
}

export async function unpublishProject(projectId){
  const userResult=await supabase.auth.getUser();
  if(userResult.error)throw userResult.error;
  if(!userResult.data.user)throw new Error('You must be signed in.');
  const result=await supabase.from('projects').select('app_definition').eq('id',projectId).eq('user_id',userResult.data.user.id).maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)throw new Error('Project not found.');
  const definition={...(result.data.app_definition||{})};
  definition.publishing={...(definition.publishing||{}),published:false};
  const update=await supabase.from('projects').update({app_definition:definition}).eq('id',projectId).eq('user_id',userResult.data.user.id);
  if(update.error)throw update.error;
  return definition.publishing;
}

export function publishedUrl(slug){return `/app/${encodeURIComponent(makePublishSlug(slug))}`}

window.IndoPublish={publishProject,unpublishProject,makePublishSlug,publishedUrl};
