import { supabase } from './auth/supabase-config.js';

export function isWebsiteProject(project){return String(project?.project_type||project?.type||'app').toLowerCase()==='website';}

export function mountWebsiteMode({project,definition,switchPage,root=document}={}){
  if(!isWebsiteProject(project))return ()=>{};
  const pages=definition?.pages||{};
  const navItems=Object.entries(pages);
  root.querySelectorAll('[data-website-nav]').forEach(node=>node.remove());
  const nav=document.createElement('nav');nav.dataset.websiteNav='true';nav.setAttribute('aria-label','Website navigation');nav.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 20px';
  navItems.forEach(([id,page])=>{const button=document.createElement('button');button.type='button';button.textContent=page.name||id;button.dataset.pageId=id;button.style.cssText='border:1px solid #e5e7eb;background:#fff;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer';button.addEventListener('click',()=>{try{switchPage?.(id)}catch{location.hash=`page=${encodeURIComponent(id)}`}});nav.appendChild(button);});
  const target=root.querySelector('#canvas')||root.querySelector('.published-shell')||root.body?.firstElementChild||root.firstElementChild;
  if(target?.parentNode)target.parentNode.insertBefore(nav,target);
  return ()=>nav.remove();
}

export function websitePageUrl(pageId){return `#page=${encodeURIComponent(pageId||'home')}`}

window.IndoWebsiteMode={isWebsiteProject,mountWebsiteMode,websitePageUrl};
