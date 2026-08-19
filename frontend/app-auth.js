import { supabase } from './auth/supabase-config.js';

export async function signUp(email,password,redirectTo=location.origin){
  const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});
  if(error)throw error;return data;
}
export async function signIn(email,password){
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)throw error;return data;
}
export async function signOut(){const {error}=await supabase.auth.signOut();if(error)throw error;}
export async function currentUser(){const {data,error}=await supabase.auth.getUser();if(error)throw error;return data.user;}
export function onAuthChange(callback){return supabase.auth.onAuthStateChange((_event,session)=>callback(session?.user||null));}
export function mountAuthForm(form,{mode='signin',onSuccess=()=>{},onError=()=>{}}={}){
  if(!form)return()=>{};
  const submit=async e=>{e.preventDefault();const email=form.querySelector('[name="email"]')?.value?.trim();const password=form.querySelector('[name="password"]')?.value||'';try{const result=mode==='signup'?await signUp(email,password):await signIn(email,password);onSuccess(result)}catch(error){onError(error)}};
  form.addEventListener('submit',submit);return()=>form.removeEventListener('submit',submit);
}
window.IndoAppAuth={signUp,signIn,signOut,currentUser,onAuthChange,mountAuthForm};
