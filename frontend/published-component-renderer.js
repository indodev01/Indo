function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

export function renderPublishedComponent(component){
 const type=String(component?.type||'Text').toLowerCase();
 const p=component?.props||{};
 const text=esc(p.text??p.label??p.content??'');
 if(type==='text'||type==='heading'||type==='paragraph')return `<div class="pub-text">${text}</div>`;
 if(type==='button'||type==='cta')return `<button class="pub-button" type="button">${text||'Button'}</button>`;
 if(type==='image')return `<img class="pub-image" src="${esc(p.src||p.url||'')}" alt="${esc(p.alt||'')}" loading="lazy">`;
 if(type==='video'||type==='videoplayer')return `<video class="pub-video" controls preload="metadata" src="${esc(p.src||p.url||'')}"></video>`;
 if(type==='divider')return '<hr class="pub-divider">';
 if(type==='spacer')return `<div style="height:${Number(p.height)||32}px"></div>`;
 if(type==='link')return `<a class="pub-link" href="${esc(p.href||p.url||'#')}">${text||'Link'}</a>`;
 return `<div class="pub-card"><strong>${esc(component?.type||'Component')}</strong>${text?`<div>${text}</div>`:''}</div>`;
}
