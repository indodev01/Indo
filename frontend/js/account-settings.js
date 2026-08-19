import { supabase } from './auth/supabase-config.js';

const nameInput=document.getElementById('name');
const emailInput=document.getElementById('email');
const status=document.getElementById('status');
const save=document.getElementById('save');

function setStatus(text){status.textContent=text;}

async function init(){
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError)throw authError;
  if(!user){window.location.replace('auth/sign-in.html');return;}
  const {data:profile,error:profileError}=await supabase.from('users').select('name,email').eq('id',user.id).maybeSingle();
  if(profileError)throw profileError;
  nameInput.value=profile?.name||user.user_metadata?.name||user.email?.split('@')[0]||'';
  emailInput.value=user.email||profile?.email||'';
}

save.addEventListener('click',async()=>{
  const name=nameInput.value.trim();
  if(!name){setStatus('Enter a display name.');return;}
  save.disabled=true;setStatus('Saving...');
  try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)throw authError||new Error('Not signed in');
    const {error:profileError}=await supabase.from('users').update({name}).eq('id',user.id);
    if(profileError)throw profileError;
    const {error:metaError}=await supabase.auth.updateUser({data:{name}});
    if(metaError)throw metaError;
    setStatus('Saved successfully.');
  }catch(error){console.error(error);setStatus(`Save failed: ${error.message||'error'}`)}finally{save.disabled=false}
});

init().catch(error=>{console.error(error);setStatus('Could not load account settings.');});