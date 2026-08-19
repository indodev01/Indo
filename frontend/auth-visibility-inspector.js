import './auth-visibility-save-bridge.js';

const inspector=document.getElementById('inspectorContent');
let selectedTarget=null;
function controlMarkup(value='always'){const wrap=document.createElement('div');wrap.className='auth-visibility-panel';wrap.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)';wrap.innerHTML=`<label style="display:block;font-size:12px;font-weight:700;margin-bottom:7px">Show when</label><select data-auth-visibility style="width:100%;padding:9px;border-radius:8px;background:#111827;color:#fff;border:1px solid rgba(255,255,255,.12)"><option value="always">Always</option><option value="signed-in">Signed in</option><option value="signed-out">Signed out</option></select>`;wrap.querySelector('select').value=value;wrap.querySelector('select').addEventListener('change',e=>{const mode=e.target.value;if(!selectedTarget)return;selectedTarget.dataset.authVisible=mode;selectedTarget.dispatchEvent(new CustomEvent('indo:auth-visibility-change',{bubbles:true,detail:{mode}}));window.dispatchEvent(new CustomEvent('indo:auth-visibility-changed',{detail:{index:selectedTarget.dataset.index??null,mode,element:selectedTarget}}));});return wrap;}
function refresh(target){selectedTarget=target||null;if(!inspector)return;inspector.querySelector('.auth-visibility-panel')?.remove();if(!selectedTarget)return;inspector.appendChild(controlMarkup(selectedTarget.dataset.authVisible||'always'));}
function resolveSelected(){return document.querySelector('.canvas-item.selected')||null}
window.addEventListener('indo:component-selected',event=>refresh(event.detail?.element||resolveSelected()));
document.addEventListener('click',event=>{const target=event.target.closest?.('.canvas-item,[data-component-id],[data-component-index],[data-auth-visible]');if(target)requestAnimationFrame(()=>refresh(resolveSelected()||target));});
const observer=new MutationObserver(()=>{const target=resolveSelected();if(target&&target!==selectedTarget)refresh(target)});if(document.body)observer.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
window.IndoAuthVisibilityInspector={refresh};
import('./project-type-builder.js').catch(()=>{});
