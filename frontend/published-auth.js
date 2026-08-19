import { signUp, signIn, signOut, currentUser, onAuthChange } from './app-auth.js';

export function mountPublishedAuth(root,{onStateChange=()=>{},onError=()=>{}}={}){
  if(!root)return()=>{};
  const cleanups=[];
  root.querySelectorAll('[data-auth="login"],[data-auth="signup"],[data-auth="logout"],[data-auth="user"]').forEach(node=>{
    const mode=node.dataset.auth;
    if(mode==='login'||mode==='signup'){
      const form=node.tagName==='FORM'?node:node.closest('form');
      if(!form)return;
      const submit=async e=>{e.preventDefault();const email=form.querySelector('[name="email"]')?.value?.trim();const password=form.querySelector('[name="password"]')?.value||'';try{const result=mode==='signup'?await signUp(email,password):await signIn(email,password);onStateChange(result?.user||null)}catch(error){onError(error)}};
      form.addEventListener('submit',submit);cleanups.push(()=>form.removeEventListener('submit',submit));
    }else if(mode==='logout'){
      const handler=async()=>{try{await signOut();onStateChange(null)}catch(error){onError(error)}};node.addEventListener('click',handler);cleanups.push(()=>node.removeEventListener('click',handler));
    }
  });
  currentUser().then(onStateChange).catch(()=>onStateChange(null));
  const subscription=onAuthChange(onStateChange);cleanups.push(()=>subscription?.data?.subscription?.unsubscribe?.());
  return()=>cleanups.forEach(fn=>fn());
}
