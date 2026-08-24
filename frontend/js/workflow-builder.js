import { supabase } from './auth/supabase-config.js';
import DataBinding from './data-binding.js';
import { renderApiActionPanel } from './api-action-panel.js';
const params=new URLSearchParams(location.search),projectId=params.get('projectId');
const state={project:null,workflows:[]},$=id=>document.getElementById(id);
const TRIGGERS=[{id:'click',label:'Button Clicked'},{id:'submit',label:'Form Submitted'},{id:'page-load',label:'Page Loaded'}],ACTIONS=[{id:'navigate',label:'Navigate to Page'},{id:'show-message',label:'Show Message'},{id:'set-value',label:'Set Value'},{id:'show-hide',label:'Show / Hide Component'},{id:'api-call',label:'API Request'},{id:'database-create',label:'Create Database Record'}];
const OPERATORS=[['equals','Equals'],['not-equals','Does not equal'],['contains','Contains'],['not-contains','Does not contain'],['greater-than','Greater than'],['less-than','Less than'],['truthy','Is true'],['falsy','Is false']];
const uid=(p='workflow')=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const esc=value=>String(value??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const defaultWorkflow=()=>({id:uid(),name:'New Workflow',enabled:true,trigger:{type:'click',componentId:''},conditions:[],actions:[{id:uid('action'),type:'navigate',pageId:'home'}]});
async function save(){
  if(!state.project)return false;
  const next={...(state.project.app_definition||{}),workflows:state.workflows};
  const {error}=await supabase.from('projects').update({app_definition:next,updated_at:new Date().toISOString()}).eq('id',state.project.id);
  if(error){$('message').textContent='Save failed: '+error.message;return false}
  state.project.app_definition=next;$('message').textContent='Saved';window.dispatchEvent(new CustomEvent('indo:workflow-saved',{detail:{projectId}}));return true;
}
function renderConditions(container,w){
  const conditions=Array.isArray(w.conditions)?w.conditions:[];w.conditions=conditions;
  container.innerHTML='';
  const title=document.createElement('div');title.className='condition-title';title.innerHTML='<strong>IF</strong><span>All conditions must match</span>';container.appendChild(title);
  const list=document.createElement('div');list.className='condition-list';container.appendChild(list);
  const add=()=>{conditions.push({id:uid('condition'),source:'form',field:'',operator:'equals',value:''});draw();window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))};
  const draw=()=>{list.replaceChildren();conditions.forEach((c,index)=>{const row=document.createElement('div');row.className='condition-row';row.innerHTML=`<select class="condition-source"><option value="form">Form field</option><option value="event">Event value</option><option value="static">Static value</option></select><input class="condition-field" placeholder="field / key"><select class="condition-operator">${OPERATORS.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><input class="condition-value" placeholder="value"><button class="danger condition-delete" type="button" aria-label="Delete condition">×</button>`;const source=row.querySelector('.condition-source'),field=row.querySelector('.condition-field'),op=row.querySelector('.condition-operator'),value=row.querySelector('.condition-value');source.value=c.source||'form';field.value=c.field||'';op.value=c.operator||'equals';value.value=c.value??'';const sync=()=>{c.source=source.value;c.field=field.value;c.operator=op.value;c.value=value.value;window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))};source.onchange=sync;field.oninput=sync;op.onchange=sync;value.oninput=sync;row.querySelector('.condition-delete').onclick=()=>{conditions.splice(index,1);draw();window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))};list.appendChild(row);});const addBtn=document.createElement('button');addBtn.type='button';addBtn.className='secondary';addBtn.textContent=conditions.length?'Add Condition':'Add Condition';addBtn.onclick=add;list.appendChild(addBtn)};
  draw();
}
function renderDatabasePanel(container,action){
  container.innerHTML='<div class="db-action-panel"><h3>Create Database Record</h3><label>Table<select class="db-table"><option value="">Choose table…</option></select></label><div class="db-fields"></div><button type="button" class="db-save">Save Mapping</button><span class="db-status"></span></div>';
  const table=container.querySelector('.db-table'),fields=container.querySelector('.db-fields'),status=container.querySelector('.db-status');
  (async()=>{try{const tables=await DataBinding.tables();tables.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.name;o.dataset.columns=JSON.stringify(t.columns||[]);o.selected=t.id===action.tableId;table.appendChild(o)});drawFields()}catch{status.textContent='Could not load tables'}})();
  function drawFields(){fields.innerHTML='';const opt=table.selectedOptions[0];let cols=[];try{cols=JSON.parse(opt?.dataset.columns||'[]')}catch{};if(!cols.length){fields.innerHTML='<small>Choose a table with defined columns.</small>';return}const mapping=action.data||{};cols.forEach(col=>{const name=typeof col==='string'?col:(col.name||col.key||'field');const row=document.createElement('label');row.textContent=name;const input=document.createElement('input');input.value=mapping[name]||`{{form.${name}}}`;input.dataset.field=name;row.appendChild(input);fields.appendChild(row)})}
  table.onchange=drawFields;container.querySelector('.db-save').onclick=()=>{if(!table.value){status.textContent='Choose a table';return}const data={};fields.querySelectorAll('input[data-field]').forEach(i=>data[i.dataset.field]=i.value);action.tableId=table.value;action.data=data;status.textContent='Mapping changed — click Save';window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))};
}
function render(){
  const list=$('workflowList');if(!list)return;list.innerHTML='';
  state.workflows.forEach((w,i)=>{
    const card=document.createElement('article');card.className='workflow-card';
    card.innerHTML=`<div class="workflow-head"><input class="workflow-name" value="${esc(w.name)}"><label><input type="checkbox" class="workflow-enabled" ${w.enabled?'checked':''}> Enabled</label></div><div class="workflow-row"><strong>WHEN</strong><select class="trigger-select">${TRIGGERS.map(t=>`<option value="${t.id}" ${w.trigger.type===t.id?'selected':''}>${t.label}</option>`).join('')}</select></div><div class="workflow-conditions"></div><div class="workflow-row"><strong>DO</strong><select class="action-select">${ACTIONS.map(a=>`<option value="${a.id}" ${w.actions[0]?.type===a.id?'selected':''}>${a.label}</option>`).join('')}</select></div><div class="action-config"></div><div class="workflow-actions"><button class="secondary save-workflow" type="button">Save</button><button class="danger delete-workflow" type="button">Delete</button></div>`;
    const action=w.actions[0]||{};const box=card.querySelector('.action-config');const select=card.querySelector('.action-select');renderConditions(card.querySelector('.workflow-conditions'),w);
    const draw=()=>{box.replaceChildren();if(select.value==='api-call')renderApiActionPanel(box,action,next=>{w.actions[0]=next;window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))});else if(select.value==='database-create')renderDatabasePanel(box,action)};
    card.querySelector('.workflow-name').oninput=e=>{w.name=e.target.value||'Untitled Workflow';window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))};
    card.querySelector('.workflow-enabled').onchange=e=>{w.enabled=e.target.checked;window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))};
    card.querySelector('.trigger-select').onchange=e=>{w.trigger.type=e.target.value;window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))};
    select.onchange=e=>{w.actions[0]={id:action.id||uid('action'),type:e.target.value};if(e.target.value==='api-call')w.actions[0].config={method:'GET',url:'',headers:{},body:null};draw();window.dispatchEvent(new CustomEvent('indo:workflow-dirty'))};
    card.querySelector('.save-workflow').onclick=()=>save();card.querySelector('.delete-workflow').onclick=async()=>{state.workflows.splice(i,1);render();await save()};draw();list.appendChild(card)
  })
}
async function init(){
  if(!projectId){$('message').textContent='Open Workflow Builder from an app project.';return}
  const u=await supabase.auth.getUser();if(u.error||!u.data.user){location.assign(new URL('auth/sign-in.html',location.href));return}
  const r=await supabase.from('projects').select('id,name,app_definition').eq('id',projectId).eq('user_id',u.data.user.id).maybeSingle();if(r.error||!r.data){$('message').textContent='Project not found.';return}
  state.project=r.data;state.workflows=Array.isArray(r.data.app_definition?.workflows)?structuredClone(r.data.app_definition.workflows):[];if(!state.workflows.length)state.workflows=[defaultWorkflow()];$('projectName').textContent=r.data.name;render()
}
$('addWorkflow')?.addEventListener('click',async()=>{state.workflows.push(defaultWorkflow());render();await save()});
$('backBuilder')?.addEventListener('click',()=>location.assign(`builder-v2.html?projectId=${encodeURIComponent(projectId)}`));
window.addEventListener('beforeunload',event=>{if($('message')?.textContent==='Unsaved changes'){event.preventDefault();event.returnValue=''}});window.addEventListener('indo:workflow-dirty',()=>$('message').textContent='Unsaved changes');init();
