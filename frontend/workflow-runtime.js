import { runApiAction } from './api-action.js';
import { bindApiResponse } from './response-binding.js';
function navigate(pageId){if(!pageId)return;const url=new URL(location.href);url.searchParams.set('page',pageId);history.pushState({},'',url);window.dispatchEvent(new PopStateEvent('popstate'));}
async function executeAction(action,context={}){if(!action)return;
  if(action.type==='navigate')navigate(action.pageId||'home');
  else if(action.type==='show-message'){const node=document.createElement('div');node.textContent=action.message||'Done';node.style.cssText='position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px 16px;border-radius:10px;background:#111827;color:#fff';document.body.appendChild(node);setTimeout(()=>node.remove(),2500)}
  else if(action.type==='set-value'&&action.selector){const el=document.querySelector(action.selector);if(el)el.value=action.value??''}
  else if(action.type==='show-hide'&&action.selector){const el=document.querySelector(action.selector);if(el)el.style.display=action.visible===false?'none':''}
  else if(action.type==='api-call'){const result=await runApiAction(action.config||action,context);bindApiResponse(document,result);window.dispatchEvent(new CustomEvent('indo:api-result',{detail:result}));return result}
}
export async function runWorkflows(projectId,eventType,context={}){const definition=window.IndoAppDefinition||{},workflows=Array.isArray(definition.workflows)?definition.workflows:[];for(const workflow of workflows.filter(w=>w.enabled&&w.trigger?.type===eventType))for(const action of workflow.actions||[])await executeAction(action,context)}
export function mountWorkflowRuntime(projectId){if(!projectId)return()=>{};const click=e=>{if(e.target.closest('button,[data-indo-action]'))runWorkflows(projectId,'click',{event:e}).catch(console.error)},submit=e=>{runWorkflows(projectId,'submit',{event:e,form:e.target}).catch(console.error)};document.addEventListener('click',click);document.addEventListener('submit',submit);runWorkflows(projectId,'page-load').catch(console.error);return()=>{document.removeEventListener('click',click);document.removeEventListener('submit',submit)}}
window.IndoWorkflowRuntime={runWorkflows,mountWorkflowRuntime};