import { supabase } from './auth/supabase-config.js';

function routeHref(value){const raw=String(value||'').trim();if(!raw)return null;if(/^https?:\/\//i.test(raw)||raw.startsWith('/'))return raw;if(raw.startsWith('#'))return raw;return `#page=${encodeURIComponent(raw)}`;}

export function mountPublishedInteractions(root,{goPage}={}){
  root.querySelectorAll('button,a').forEach(node=>{
    if(node.dataset.publishedBound==='1')return;
    const href=node.getAttribute('href');
    const link=node.dataset.href||href;
    if(link&&node.tagName==='A'){
      const route=routeHref(link);
      if(route&&route.startsWith('#')){node.addEventListener('click',e=>{e.preventDefault();const page=route.split('=')[1]||'';goPage?.(decodeURIComponent(page));});}
      node.dataset.publishedBound='1';return;
    }
    const action=node.dataset.action||node.getAttribute('data-link');
    if(action){node.addEventListener('click',()=>{const route=routeHref(action);if(route?.startsWith('#'))goPage?.(decodeURIComponent(route.split('=')[1]||''));else if(route)location.href=route;});}
    node.dataset.publishedBound='1';
  });

  root.querySelectorAll('form').forEach(form=>{
    if(form.dataset.publishedFormBound==='1')return;
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const button=form.querySelector('button[type="submit"],button:last-of-type');
      const original=button?.textContent;
      if(button){button.disabled=true;button.textContent='Submitting…';}
      try{
        const payload=Object.fromEntries(new FormData(form).entries());
        const table=form.dataset.table||form.getAttribute('data-submit-table');
        if(table){const {error}=await supabase.from(table).insert(payload);if(error)throw error;}
        form.querySelector('.pub-form-message')?.replaceChildren(document.createTextNode(form.dataset.successMessage||'Submitted successfully.'));
        form.reset();
      }catch(error){form.querySelector('.pub-form-message')?.replaceChildren(document.createTextNode(error?.message||'Submission failed.'));}
      finally{if(button){button.disabled=false;button.textContent=original||'Submit';}}
    });
    form.dataset.publishedFormBound='1';
  });
}
