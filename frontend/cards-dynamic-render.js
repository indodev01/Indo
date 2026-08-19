import DataBinding from './data-binding.js';

function value(data, key, fallback='') {
  if (!key) return fallback;
  const v = data?.[key];
  return v == null ? fallback : String(v);
}

export async function renderDynamicCards(host, binding, options = {}) {
  if (!host || !binding?.tableId) return [];
  host.replaceChildren();
  const rows = await DataBinding.records(binding.tableId, Math.min(100, Math.max(1, Number(binding.limit) || 50)));
  const fields = binding.fields || {};
  host.style.display='grid';
  host.style.gridTemplateColumns='repeat(auto-fit,minmax(180px,1fr))';
  host.style.gap='14px';
  rows.forEach(row => {
    const card=document.createElement('article');
    card.className='indo-dynamic-card';
    card.style.cssText='padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#111827;color:#fff;display:grid;gap:9px;';
    const image=value(row.data,fields.image,'');
    if(image){const img=document.createElement('img');img.src=image;img.alt=value(row.data,fields.title,'');img.style.cssText='width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;';card.appendChild(img);}
    const title=document.createElement('h3');title.textContent=value(row.data,fields.title,'Untitled');title.style.margin='0';card.appendChild(title);
    const description=document.createElement('p');description.textContent=value(row.data,fields.description,'');description.style.margin='0';description.style.opacity='.75';card.appendChild(description);
    const link=value(row.data,fields.link,'');
    if(link){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener';a.textContent=options.linkLabel||'Open';card.appendChild(a);}
    host.appendChild(card);
  });
  if(!rows.length){const empty=document.createElement('p');empty.textContent='No records yet';empty.style.opacity='.6';host.appendChild(empty);}
  return rows;
}

window.IndoDynamicCards={renderDynamicCards};
