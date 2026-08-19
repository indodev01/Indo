import { supabase } from './auth/supabase-config.js';

if(!supabase.__indoAuthVisibilitySavePatched){
  const originalFrom=supabase.from.bind(supabase);
  supabase.from=(table)=>{
    const query=originalFrom(table);
    if(table!=='projects'||typeof query.update!=='function')return query;
    const originalUpdate=query.update.bind(query);
    query.update=(values,...args)=>originalUpdate(enrichProjectUpdate(values),...args);
    return query;
  };
  supabase.__indoAuthVisibilitySavePatched=true;
}

function enrichProjectUpdate(values){
  if(!values||typeof values!=='object')return values;
  const markers=[...document.querySelectorAll('#canvas .canvas-item[data-index]')].map(el=>({index:Number(el.dataset.index),mode:el.dataset.authVisible||'always'})).filter(x=>Number.isInteger(x.index)&&x.index>=0);
  if(!markers.length)return values;
  const next={...values};
  const definition=next.app_definition&&typeof next.app_definition==='object'?JSON.parse(JSON.stringify(next.app_definition)):null;
  const pages=definition?.pages||next.pages;
  const pageName=document.getElementById('pageStatus')?.textContent?.trim();
  const page=pages&&Object.values(pages).find(item=>String(item?.name||'').trim()===pageName)||pages?.home||Object.values(pages||{})[0];
  if(!page?.components)return next;
  page.components=page.components.map((component,index)=>{
    const marker=markers.find(item=>item.index===index);
    return marker?{...component,props:{...(component.props||{}),authVisibility:marker.mode}}:component;
  });
  if(definition)next.app_definition=definition;
  if(next.pages&&definition?.pages)next.pages=definition.pages;
  return next;
}
