import { supabase } from './auth/supabase-config.js';

const params = new URLSearchParams(location.search);
const projectId = params.get('projectId');
const state = { project:null, workflows:[] };
const $ = (id) => document.getElementById(id);

const TRIGGERS = [
  { id:'click', label:'Button Clicked' },
  { id:'submit', label:'Form Submitted' },
  { id:'page-load', label:'Page Loaded' }
];
const ACTIONS = [
  { id:'navigate', label:'Navigate to Page' },
  { id:'show-message', label:'Show Message' },
  { id:'set-value', label:'Set Value' },
  { id:'show-hide', label:'Show / Hide Component' }
];

function uid(prefix='workflow'){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function defaultWorkflow(){ return { id:uid(), name:'New Workflow', enabled:true, trigger:{type:'click',componentId:''}, actions:[{id:uid('action'),type:'navigate',pageId:'home'}] }; }
function saveLocal(){ if(!state.project) return; localStorage.setItem(`indo-workflows-${state.project.id}`,JSON.stringify(state.workflows)); }

function render(){
  const list=$('workflowList'); if(!list)return;
  list.innerHTML='';
  state.workflows.forEach((workflow,index)=>{
    const card=document.createElement('article'); card.className='workflow-card';
    card.innerHTML=`<div class="workflow-head"><input class="workflow-name" value="${workflow.name.replace(/"/g,'&quot;')}"><label><input type="checkbox" class="workflow-enabled" ${workflow.enabled?'checked':''}> Enabled</label></div><div class="workflow-row"><strong>WHEN</strong><select class="trigger-select">${TRIGGERS.map(t=>`<option value="${t.id}" ${workflow.trigger.type===t.id?'selected':''}>${t.label}</option>`).join('')}</select></div><div class="workflow-row"><strong>DO</strong><select class="action-select">${ACTIONS.map(a=>`<option value="${a.id}" ${workflow.actions[0]?.type===a.id?'selected':''}>${a.label}</option>`).join('')}</select></div><div class="workflow-actions"><button class="secondary test-workflow" type="button">Test</button><button class="danger delete-workflow" type="button">Delete</button></div>`;
    card.querySelector('.workflow-name').addEventListener('input',e=>{workflow.name=e.target.value||'Untitled Workflow';saveLocal();});
    card.querySelector('.workflow-enabled').addEventListener('change',e=>{workflow.enabled=e.target.checked;saveLocal();});
    card.querySelector('.trigger-select').addEventListener('change',e=>{workflow.trigger.type=e.target.value;saveLocal();});
    card.querySelector('.action-select').addEventListener('change',e=>{workflow.actions[0].type=e.target.value;saveLocal();});
    card.querySelector('.delete-workflow').addEventListener('click',()=>{state.workflows.splice(index,1);saveLocal();render();});
    card.querySelector('.test-workflow').addEventListener('click',()=>alert(`Workflow test: ${workflow.name}`));
    list.appendChild(card);
  });
}

async function init(){
  if(!projectId){ $('message').textContent='Open Workflow Builder from an app project.'; return; }
  const {data:userData,error:userError}=await supabase.auth.getUser();
  if(userError||!userData.user){location.assign(new URL('auth/sign-in.html',location.href));return;}
  const {data,error}=await supabase.from('projects').select('id,name,app_definition').eq('id',projectId).eq('user_id',userData.user.id).maybeSingle();
  if(error||!data){$('message').textContent='Project not found.';return;}
  state.project=data; $('projectName').textContent=data.name;
  try{state.workflows=JSON.parse(localStorage.getItem(`indo-workflows-${projectId}`)||'[]');}catch{state.workflows=[];}
  if(!state.workflows.length) state.workflows=[defaultWorkflow()];
  render();
}
$('addWorkflow')?.addEventListener('click',()=>{state.workflows.push(defaultWorkflow());saveLocal();render();});
$('backBuilder')?.addEventListener('click',()=>location.assign(`builder-v2.html?projectId=${encodeURIComponent(projectId)}`));
init();
