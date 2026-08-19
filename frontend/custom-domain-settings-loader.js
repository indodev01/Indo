import { supabase } from './auth/supabase-config.js';

const projectId=new URLSearchParams(location.search).get('projectId');
const root=document.querySelector('[data-custom-domain-root]');
if(root&&projectId){
  root.dataset.projectId=projectId;
  window.dispatchEvent(new CustomEvent('indo:custom-domain-ready',{detail:{projectId,root}}));
}
