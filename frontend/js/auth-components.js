import { mountAuthForm, signOut, currentUser } from './app-auth.js';

export function renderAuthComponent(component, mount, { onSuccess=()=>{}, onError=()=>{} }={}) {
  if (!mount) return () => {};
  const type=component?.type;
  if (type==='Login' || type==='Signup') {
    const form=document.createElement('form');
    form.dataset.indoAuth=type.toLowerCase();
    form.style.cssText='display:grid;gap:12px;max-width:420px;padding:24px;border:1px solid #e5e7eb;border-radius:14px;background:#fff';
    const title=document.createElement('h2'); title.textContent=type==='Login'?'Log in':'Create account';
    const email=document.createElement('input'); email.name='email'; email.type='email'; email.required=true; email.placeholder='Email';
    const password=document.createElement('input'); password.name='password'; password.type='password'; password.required=true; password.placeholder='Password';
    if (type==='Signup') {
      password.minLength=12;
      password.autocomplete='new-password';
      password.setAttribute('aria-describedby','indo-password-hint');
    } else {
      password.autocomplete='current-password';
    }
    const hint=document.createElement('small');
    hint.id='indo-password-hint';
    hint.textContent=type==='Signup'?'Use at least 12 characters; a mix of upper/lowercase letters, numbers, and symbols is recommended.':'';
    const submit=document.createElement('button'); submit.type='submit'; submit.textContent=type==='Login'?'Log in':'Sign up';
    const message=document.createElement('small');
    form.append(title,email,password,hint,submit,message); mount.appendChild(form);
    const cleanup=mountAuthForm(form,{mode:type==='Signup'?'signup':'signin',onSuccess:(result)=>{message.textContent=type==='Signup'?'Check your email to confirm your account.':'Logged in';onSuccess(result)},onError:(error)=>{message.textContent=error?.message||'Authentication failed';onError(error)}});
    return cleanup;
  }
  if(type==='Logout'){
    const button=document.createElement('button'); button.type='button'; button.textContent=component?.props?.label||'Log out';
    button.onclick=async()=>{try{await signOut();onSuccess(null)}catch(error){onError(error)}}; mount.appendChild(button); return ()=>button.remove();
  }
  if(type==='User'){
    const box=document.createElement('div'); box.textContent='Loading user…'; mount.appendChild(box); currentUser().then(user=>{box.textContent=user?.email||'Not signed in'}).catch(()=>{box.textContent='Not signed in'}); return ()=>box.remove();
  }
  return ()=>{};
}
