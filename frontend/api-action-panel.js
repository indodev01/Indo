const METHODS=['GET','POST','PUT','PATCH','DELETE'];
export function renderApiActionPanel(container, action={}, onChange=()=>{}){
  if(!container)return;
  const cfg=action.config||action;
  container.innerHTML='<div class="api-action-panel"><h3>API Request</h3><label>Method<select class="api-method"></select></label><label>URL<input class="api-url" placeholder="https://api.example.com/items"></label><label>Headers<textarea class="api-headers" placeholder="Authorization: Bearer ..."></textarea></label><label>JSON Body<textarea class="api-body" placeholder="{&quot;name&quot;:&quot;{{form.name}}&quot;}"></textarea></label><button type="button" class="api-save">Save API Action</button><span class="api-status"></span></div>';
  const method=container.querySelector('.api-method'),url=container.querySelector('.api-url'),headers=container.querySelector('.api-headers'),body=container.querySelector('.api-body'),status=container.querySelector('.api-status');
  METHODS.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;o.selected=(cfg.method||'GET')===m;method.appendChild(o)});
  url.value=cfg.url||'';headers.value=Object.entries(cfg.headers||{}).map(([k,v])=>`${k}: ${v}`).join('\n');body.value=typeof cfg.body==='string'?cfg.body:(cfg.body?JSON.stringify(cfg.body,null,2):'');
  container.querySelector('.api-save').onclick=()=>{let parsedBody=null;try{parsedBody=body.value.trim()?JSON.parse(body.value):null}catch{status.textContent='Invalid JSON body';return}const parsedHeaders={};headers.value.split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>{const i=line.indexOf(':');if(i>0)parsedHeaders[line.slice(0,i).trim()]=line.slice(i+1).trim()});const next={type:'api-call',config:{method:method.value,url:url.value.trim(),headers:parsedHeaders,body:parsedBody}};onChange(next);status.textContent='Saved'};
}
