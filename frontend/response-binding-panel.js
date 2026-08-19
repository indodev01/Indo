const TYPES=['text','image','value'];
export function renderResponseBindingPanel(container, component={}, onChange=()=>{}){
  if(!container)return;
  const current=component.responseBinding||{};
  container.innerHTML='<div class="response-binding-panel"><h3>Dynamic Data</h3><label>Source<select class="response-source"><option value="">Choose response field…</option><option value="response.name">response.name</option><option value="response.title">response.title</option><option value="response.description">response.description</option><option value="response.price">response.price</option><option value="response.image">response.image</option><option value="response.url">response.url</option></select></label><label>Type<select class="response-type"></select></label><button type="button" class="response-save">Bind</button><span class="response-status"></span></div>';
  const source=container.querySelector('.response-source'),type=container.querySelector('.response-type'),status=container.querySelector('.response-status');
  TYPES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t[0].toUpperCase()+t.slice(1);o.selected=(current.type||'text')===t;type.appendChild(o)});
  source.value=current.path||'';
  container.querySelector('.response-save').onclick=()=>{if(!source.value){status.textContent='Choose a response field';return}const next={path:source.value,type:type.value};onChange(next);status.textContent='Bound'};
}
