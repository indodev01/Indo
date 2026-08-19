const inspector=document.getElementById('inspectorContent');
let selectedTarget=null;

function controlMarkup(value='always'){
  const wrap=document.createElement('div');
  wrap.className='auth-visibility-panel';
  wrap.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)';
  wrap.innerHTML=`<label style="display:block;font-size:12px;font-weight:700;margin-bottom:7px">Show when</label><select data-auth-visibility style="width:100%;padding:9px;border-radius:8px;background:#111827;color:#fff;border:1px solid rgba(255,255,255,.12)"><option value="always">Always</option><option value="signed-in">Signed in</option><option value="signed-out">Signed out</option></select>`;
  wrap.querySelector('select').value=value;
  wrap.querySelector('select').addEventListener('change',e=>{
    const mode=e.target.value;
    if(selectedTarget){selectedTarget.dataset.authVisible=mode;selectedTarget.dispatchEvent(new CustomEvent('indo:auth-visibility-change',{bubbles:true,detail:{mode}}));}
  });
  return wrap;
}

function refresh(target){
  selectedTarget=target||null;
  if(!inspector)return;
  inspector.querySelector('.auth-visibility-panel')?.remove();
  if(!selectedTarget)return;
  inspector.appendChild(controlMarkup(selectedTarget.dataset.authVisible||'always'));
}

window.addEventListener('indo:component-selected',event=>refresh(event.detail?.element));
document.addEventListener('click',event=>{
  const target=event.target.closest?.('[data-component-id],[data-component-index],[data-auth-visible]');
  if(target)refresh(target);
});

window.IndoAuthVisibilityInspector={refresh};
