import { supabase } from './auth/supabase-config.js';

export async function applyPublishedAuthVisibility(root=document,userOverride=undefined){
  const user=userOverride===undefined?(await supabase.auth.getUser()).data?.user:userOverride;
  const loggedIn=Boolean(user);
  root.querySelectorAll('[data-auth-visible]').forEach((el)=>{
    const rule=String(el.dataset.authVisible||'').toLowerCase();
    const visible=rule==='signed-in'?loggedIn:rule==='signed-out'?!loggedIn:true;
    el.hidden=!visible;el.setAttribute('aria-hidden',String(!visible));el.style.display=visible?'':'none';
  });
  root.querySelectorAll('[data-auth-email]').forEach(el=>{el.textContent=user?.email||'';});
  return loggedIn;
}

export function observePublishedAuthVisibility(root=document){
  const handler=()=>applyPublishedAuthVisibility(root).catch(console.error);
  const {data}=supabase.auth.onAuthStateChange((_event,session)=>handler(session?.user||null));
  handler();
  return ()=>data?.subscription?.unsubscribe?.();
}
