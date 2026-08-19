import { supabase } from './auth/supabase-config.js';

const projectId=new URLSearchParams(location.search).get('projectId');
const saveButton=document.getElementById('saveButton');
let pendingTimer=0;
let dirty=false;

function snapshot(){
 const canvas=document.getElementById('canvas');
 if(!canvas)return null;
 const device=document.querySelector('.device-button.active')?.dataset?.device||'desktop';
 const items=[...canvas.querySelectorAll('.canvas-item')].map((node,index)=>({
  index,
  device,
  position:node.__responsiveLayout?{...node.__responsiveLayout}:null
 })).filter(item=>item.position);
 return {device,items,savedAt:new Date().toISOString()};
}

export function markResponsiveDirty(){dirty=true;clearTimeout(pendingTimer);pendingTimer=setTimeout(()=>{dirty=false;},1200);window.dispatchEvent(new CustomEvent('indo:responsive-dirty'));}
export function getResponsiveSnapshot(){return snapshot();}

async function persistSnapshot(){
 if(!projectId||!dirty)return;
 const snap=snapshot();if(!snap)return;
 const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)return;
 const {data,error}=await supabase.from('projects').select('app_definition').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
 if(error||!data)return;
 const definition={...(data.app_definition||{})};
 definition.responsive=definition.responsive||{};
 definition.responsive[snap.device]=snap.items;
 definition.responsive.updatedAt=snap.savedAt;
 await supabase.from('projects').update({app_definition:definition,updated_at:snap.savedAt}).eq('id',projectId).eq('user_id',auth.data.user.id);
 dirty=false;
}

window.addEventListener('indo:responsive-dirty',()=>{dirty=true;});
window.addEventListener('indo:responsive-save-request',()=>persistSnapshot().catch(()=>{}));
saveButton?.addEventListener('click',()=>setTimeout(()=>persistSnapshot().catch(()=>{}),0));
window.IndoResponsiveSave={markResponsiveDirty,persistSnapshot,getResponsiveSnapshot};
