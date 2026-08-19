import { supabase } from './auth/supabase-config.js';
const projectId=new URLSearchParams(location.search).get('projectId');
let user=null,tables=[],selected=null,records=[];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const slug=v=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'table';
async function init(){
 const u=await supabase.auth.getUser(); user=u.data.user;
 if(!user){location.assign(new URL('auth/sign-in.html',location.href));return;}
 if(!projectId){$('status').textContent='Missing projectId';return;}
 const p=await supabase.from('projects').select('id,name').eq('id',projectId).eq('user_id',user.id).maybeSingle();
 if(p.error||!p.data){$('status').textContent='Project not found';return;}
 $('projectName').textContent=p.data.name+' · Data';
 await loadTables();
}
async function loadTables(){const r=await supabase.from('app_data_tables').select('*').eq('project_id',projectId).eq('user_id',user.id).order('created_at');tables=r.data||[];renderTables();if(selected) await selectTable(selected.id);}
function renderTables(){const el=$('tableList');el.innerHTML='';tables.forEach(t=>{const b=document.createElement('button');b.className='table-item'+(selected?.id===t.id?' active':'');b.textContent=t.name;b.onclick=()=>selectTable(t.id);el.appendChild(b);});if(!tables.length)el.innerHTML='<div class="empty">No tables yet.</div>';}
async function selectTable(id){selected=tables.find(t=>t.id===id);renderTables();if(!selected)return;const r=await supabase.from('app_data_records').select('*').eq('table_id',id).eq('user_id',user.id).order('created_at');records=r.data||[];renderTable();}
function renderTable(){const cols=Array.isArray(selected.columns)?selected.columns:[];if(!cols.length){$('tableArea').innerHTML='<div class="empty">No columns yet. Click + Column.</div>';return;}let h='<div class="table-wrap"><table class="data-table"><thead><tr>'+cols.map(c=>`<th>${esc(c.name)}</th>`).join('')+'<th>Actions</th></tr></thead><tbody>';h+=records.map(row=>'<tr>'+cols.map(c=>`<td>${esc(row.data?.[c.name])}</td>`).join('')+`<td><button class="danger delete-record" data-id="${row.id}">Delete</button></td></tr>`).join('');h+='</tbody></table></div>'; $('tableArea').innerHTML=h;document.querySelectorAll('.delete-record').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.id));}
async function addTable(){const name=prompt('Table name');if(!name?.trim())return;let s=slug(name);if(tables.some(t=>t.slug===s))s+=`-${Date.now().toString().slice(-4)}`;const r=await supabase.from('app_data_tables').insert({project_id:projectId,user_id:user.id,name:name.trim(),slug:s,columns:[{name:'name',type:'text'}]}).select().single();if(r.error){alert(r.error.message);return;}selected=r.data;await loadTables();}
async function addColumn(){if(!selected)return alert('Select a table first.');const name=prompt('Column name');if(!name?.trim())return;const type=(prompt('Type: text, number, boolean, date, url, json','text')||'text').trim();const columns=[...(selected.columns||[])];if(columns.some(c=>c.name===name.trim()))return alert('Column already exists.');columns.push({name:name.trim(),type});const r=await supabase.from('app_data_tables').update({columns,updated_at:new Date().toISOString()}).eq('id',selected.id).eq('user_id',user.id);if(r.error)alert(r.error.message);else{selected.columns=columns;renderTable();}}
async function addRecord(){if(!selected)return alert('Select a table first.');const data={};for(const c of selected.columns||[]){const value=prompt(`Value for ${c.name}`);if(value===null)return;data[c.name]=c.type==='number'?(Number(value)||0):c.type==='boolean'?(value.toLowerCase()==='true'):value;}const r=await supabase.from('app_data_records').insert({table_id:selected.id,project_id:projectId,user_id:user.id,data});if(r.error)alert(r.error.message);else await selectTable(selected.id);}
async function deleteRecord(id){if(!confirm('Delete this record?'))return;const r=await supabase.from('app_data_records').delete().eq('id',id).eq('user_id',user.id);if(r.error)alert(r.error.message);else await selectTable(selected.id);}
$('addTable').onclick=addTable;$('addColumn').onclick=addColumn;$('addRecord').onclick=addRecord;$('backBuilder').onclick=()=>location.assign(`builder-v2.html?projectId=${encodeURIComponent(projectId)}`);init();