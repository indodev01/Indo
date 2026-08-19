import { supabase } from './auth/supabase-config.js';

const nameEl=document.getElementById('templateName');
const descEl=document.getElementById('templateDescription');
const screen=document.getElementById('screen');
const bottom=document.getElementById('bottom');
const appbar=document.getElementById('appbar');
const backButton=document.getElementById('backButton');
const useButton=document.getElementById('useButton');
const useButtonSide=document.getElementById('useButtonSide');
const slug=new URLSearchParams(location.search).get('slug');
let template=null;
let currentPageId='home';

const saved=sessionStorage.getItem('indoTemplatePreview');
if(saved){ try{ template=JSON.parse(saved); }catch{} }

function esc(v){const d=document.createElement('div');d.textContent=v??'';return d.innerHTML;}
function definition(){return template?.definition||{};}
function pageFor(id){return definition().pages?.[id]||null;}

function componentHtml(c){
  const p=c.props||{}; const type=c.type;
  if(type==='Heading') return `<section class="item"><h2 style="margin:0;font-size:${Math.min(Number(p.size)||28,32)}px;font-weight:${p.weight||700};color:${esc(p.color||'#111827')};text-align:${p.align||'left'}">${esc(p.text||'Heading')}</h2></section>`;
  if(type==='Text') return `<section class="item"><p style="margin:0;font-size:${Number(p.size)||15}px;color:${esc(p.color||'#667085')}">${esc(p.text||'Text')}</p></section>`;
  if(type==='Video') return `<section class="item video" style="background-image:url('${esc(p.posterUrl||'')}')"><span class="play">▶</span><span class="title">${esc(p.title||'Featured Video')}</span></section>`;
  if(type==='Button') return `<section class="item" style="display:flex"><button class="preview-action" data-link="${esc(p.link||'')}" style="border:0;border-radius:${Number(p.radius)||10}px;padding:10px 14px;background:${esc(p.background||'#6d35ef')};color:${esc(p.color||'#fff')};font-weight:800;cursor:pointer">${esc(p.label||'Button')}</button></section>`;
  if(type==='Image'&&p.url) return `<section class="item"><img src="${esc(p.url)}" alt="${esc(p.alt||'')}" style="width:100%;border-radius:${Number(p.radius)||10}px;display:block"></section>`;
  if(type==='Card') return `<section class="item" style="background:${esc(p.background||'#fff')};border:1px solid #e5e7ef;border-radius:${Number(p.radius)||14}px;padding:14px"><strong>${esc(p.title||'Card')}</strong><p style="color:#667085;margin:6px 0 0;font-size:12px">${esc(p.text||'')}</p></section>`;
  if(type==='Input') return `<section class="item"><label style="display:block;font-size:11px;font-weight:800;margin-bottom:6px">${esc(p.label||'Input')}</label><div style="padding:10px;border:1px solid #d7dce6;border-radius:9px;color:#9aa3b1;font-size:11px">${esc(p.placeholder||'Enter value')}</div></section>`;
  if(type==='List') return `<section class="item"><strong style="display:block;margin-bottom:7px">${esc(p.title||'List')}</strong>${(p.items||[]).slice(0,5).map(i=>`<div style="padding:8px 0;border-bottom:1px solid #eef1f5;font-size:12px">${esc(i)}</div>`).join('')}</section>`;
  if(type==='Menu') return `<section class="item" style="display:flex;gap:${Number(p.gap)||14}px;flex-wrap:wrap">${(p.items||[]).map(i=>`<span style="font-size:11px;font-weight:800;color:#4b5563">${esc(i)}</span>`).join('')}</section>`;
  return '';
}

function navigate(id){
  if(!pageFor(id)) return;
  currentPageId=id;
  render();
}

function render(){
  if(!template){nameEl.textContent='Template Preview';descEl.textContent='Template could not be loaded.';screen.innerHTML='<div class="empty">No preview data.</div>';return;}
  const def=definition();
  const page=pageFor(currentPageId)||pageFor('home')||Object.values(def.pages||{})[0];
  if(!page)return;
  currentPageId=page.id;
  nameEl.textContent=template.name||'Template Preview';
  descEl.textContent=`${template.description||''}  •  ${page.name}`;
  appbar.querySelector('strong').textContent=page.name||def.metadata?.title||template.name||'App';
  screen.innerHTML='';
  (page.components||[]).forEach((c,index)=>{
    const wrap=document.createElement('div');wrap.innerHTML=componentHtml(c);const el=wrap.firstElementChild;if(!el)return;
    el.dataset.index=String(index);
    el.addEventListener('click',e=>{
      e.stopPropagation();
      document.querySelectorAll('.selection').forEach(x=>x.classList.remove('selection'));
      el.classList.add('selection');
    });
    const action=el.querySelector('.preview-action');
    if(action){
      action.addEventListener('click',e=>{
        e.stopPropagation();
        const link=action.dataset.link||'';
        if(link && pageFor(link)) navigate(link);
      });
    }
    screen.appendChild(el);
  });
  bottom.innerHTML='';
  (def.navigation?.items||[]).slice(0,5).forEach(item=>{
    const nav=document.createElement('button');
    nav.type='button';nav.textContent=item.label;nav.style.cssText='border:0;background:transparent;color:#d5dbe5;font-size:9px;cursor:pointer;padding:4px 6px';
    nav.addEventListener('click',()=>navigate(item.pageId));
    bottom.appendChild(nav);
  });
}

async function useTemplate(){
  if(!template)return;
  const {data,error}=await supabase.auth.getUser(); if(error) throw error; if(!data.user){location.href='auth/sign-in.html';return;}
  const definitionCopy=structuredClone(template.definition||{}); const name=`${template.name} App`;
  const {data:project,error:insertError}=await supabase.from('projects').insert({user_id:data.user.id,name,description:template.description||'',start_mode:'template',status:'draft',pages:definitionCopy.pages||{},app_definition:{...definitionCopy,metadata:{...(definitionCopy.metadata||{}),title:name}}}).select('id').single();
  if(insertError)throw insertError; location.href=`builder-v2.html?projectId=${encodeURIComponent(project.id)}`;
}
backButton.addEventListener('click',()=>history.back());
useButton.addEventListener('click',()=>useTemplate().catch(e=>alert(e.message||'Could not use template')));
useButtonSide.addEventListener('click',()=>useTemplate().catch(e=>alert(e.message||'Could not use template')));
render();
