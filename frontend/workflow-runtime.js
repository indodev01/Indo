const KEY_PREFIX='indo-workflows-';

function load(projectId){try{return JSON.parse(localStorage.getItem(`${KEY_PREFIX}${projectId}`)||'[]')}catch{return[]}}
function pages(){return window.IndoAppDefinition?.pages||null}
function navigate(pageId){if(!pageId)return;const url=new URL(location.href);url.searchParams.set('page',pageId);history.pushState({},'',url);window.dispatchEvent(new PopStateEvent('popstate'));}
function executeAction(action,context={}){
  if(!action)return;
  if(action.type==='navigate')navigate(action.pageId||'home');
  else if(action.type==='show-message'){
    const message=action.message||'Done';
    const node=document.createElement('div');node.textContent=message;node.style.cssText='position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px 16px;border-radius:10px;background:#111827;color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.25)';document.body.appendChild(node);setTimeout(()=>node.remove(),2500);
  } else if(action.type==='set-value' && action.selector){const el=document.querySelector(action.selector);if(el)el.value=action.value??'';}
  else if(action.type==='show-hide' && action.selector){const el=document.querySelector(action.selector);if(el)el.style.display=action.visible===false?'none':'';}
}
export function runWorkflows(projectId,eventType,context={}){load(projectId).filter(w=>w.enabled&&w.trigger?.type===eventType).forEach(w=>(w.actions||[]).forEach(a=>executeAction(a,context)));}
export function mountWorkflowRuntime(projectId){
  if(!projectId)return()=>{};
  const click=(e)=>{if(e.target.closest('button,[data-indo-action]'))runWorkflows(projectId,'click',{event:e});};
  const submit=(e)=>{runWorkflows(projectId,'submit',{event:e,form:e.target});};
  document.addEventListener('click',click);document.addEventListener('submit',submit);
  runWorkflows(projectId,'page-load');
  return()=>{document.removeEventListener('click',click);document.removeEventListener('submit',submit)};
}
window.IndoWorkflowRuntime={runWorkflows,mountWorkflowRuntime};
