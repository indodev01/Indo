import { supabase } from './auth/supabase-config.js';
import { projectTypeLabel } from './project-type.js';

const projectId=new URLSearchParams(location.search).get('projectId');
const title=document.getElementById('builderTitle');
const status=document.getElementById('projectStatus');

async function mount(){
  if(!projectId||!title)return;
  const auth=await supabase.auth.getUser();
  if(auth.error||!auth.data.user)return;
  const result=await supabase.from('projects').select('app_definition').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if(result.error||!result.data)return;
  const type=projectTypeLabel(result.data.app_definition?.metadata?.projectType);
  title.textContent=`${type} Builder`;
  if(status){status.dataset.projectType=type.toLowerCase();status.title=`Project type: ${type}`;}
}
mount();
