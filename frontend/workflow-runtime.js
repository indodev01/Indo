import { runApiAction } from './api-action.js';
import { bindApiResponse } from './response-binding.js';
import DataBinding from './data-binding.js';
function navigate(pageId){if(!pageId)return;const url=new URL(location.href);url.searchParams.set('page',pageId);history.pushState({},'',url);window.dispatchEvent(new PopStateEvent('popstate'));}
function formData(form){return Object.fromEntries(new FormData(form).entries())}
function resolve(value,context){if(typeof value!=='string')return value;return value.replace(/\{\{\s*form\.([^}]+)\s*\}\}/g,(_,key)=>context.formData?.[key.trim()]??'')}
function resolveObject(obj,context){return Object.fromEntries(Object.entries(obj||{}).map(([k,v])=>[k,resolve(v,context)]))}
async function executeAction(action,context={}){if(!action)return;
  if(action.type==='navigate')navigate(action.pageId||'home');
  else if(action.type==='show-message'){const node=document.createElement('div');node.textContent=action.message||'Done';node.style.cssText='position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px 16px;border-radius:10px;background:#111827;color:#fff';document.body.appendChild(node);setTimeout(()=>node.remove(),2500)}
  else if(action.type==='set-value'&&action.selector){const el=document.querySelector(action.selector);if(el)el.value=resolve(action.value,context)}
  else if(action.type==='show-hide'&&action.selector){const el=document.querySelector(action.selector);if(el)el.style.display=action.visible===false?'none':''}
  else if(action.type==='api-call'){const config={...(action.config||action),url:resolve((action.config||action).url,context),body:resolve((action.config||action).body,context)};const result=await runApiAction(config,context);bindApiResponse(document,result);window.dispatchEvent(new CustomEvent('indo:api-result',{detail:result}));return result}
  else if(action.type==='database-create'){if(!action.tableId)throw new Error('Database table is required');const row=await DataBinding.create(action.tableId,resolveObject(action.data,context));window.dispatchEvent(new CustomEvent('indo:database-created',{detail:row}));return row}
}
export async function runWorkflows(projectId,eventType,context={}){const definition=window.IndoAppDefinition||{},workflows=Array.isArray(definition.workflows)?definition.workflows:[];for(const workflow of workflows.filter(w=>w.enabled&&w.trigger?.type===eventType))for(const action of workflow.actions||[])await executeAction(action,context)}
export function mountWorkflowRuntime(projectId){if(!projectId)return()=>{};const click=e=>{if(e.target.closest('button,[data-indo-action]'))runWorkflows(projectId,'click',{event:e}).catch(console.error)},submit=e=>{e.preventDefault();runWorkflows(projectId,'submit',{event:e,form:e.target,formData:formData(e.target)}).catch(console.error)};document.addEventListener('click',click);document.addEventListener('submit',submit);runWorkflows(projectId,'page-load').catch(console.error);return()=>{document.removeEventListener('click',click);document.removeEventListener('submit',submit)}}
window.IndoWorkflowRuntime={runWorkflows,mountWorkflowRuntime};