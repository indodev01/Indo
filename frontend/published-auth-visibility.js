import { supabase } from './auth/supabase-config.js';

export async function applyPublishedAuthVisibility(root=document){
  const {data}=await supabase.auth.getUser();
  const loggedIn=Boolean(data?.user);
  root.querySelectorAll('[data-auth-visible]').forEach((el)=>{
    const rule=String(el.dataset.authVisible||'').toLowerCase();
    const visible=rule==='signed-in'?loggedIn:rule==='signed-out'?!loggedIn:true;
    el.style.display=visible?'':'none';
  });
  root.querySelectorAll('[data-auth-email]').forEach((el)=>{el.textContent=data?.user?.email||'';});
  return loggedIn;
}

export function observePublishedAuthVisibility(root=document){
  const handler=()=>applyPublishedAuthVisibility(root).catch(console.error);
  const {data}=supabase.auth.onAuthStateChange(()=>handler());
  handler();
  return ()=>data?.subscription?.unsubscribe?.();
}
