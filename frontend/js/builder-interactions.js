const state={tab:'content'};
const setStatus=(text)=>{const el=document.getElementById('projectStatus');if(el)el.textContent=text};

function setTab(tab){
  state.tab=tab;
  document.querySelectorAll('.inspector-tabs .tab').forEach((button,index)=>{
    const active=tab===(index===0?'content':'style');
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  const content=document.getElementById('inspectorContent');
  if(!content)return;
  content.dataset.activeTab=tab;
  if(tab==='style'){
    content.classList.add('style-tab');
    if(!content.querySelector('.style-tab-note')){
      const note=document.createElement('p');
      note.className='style-tab-note';
      note.textContent='Style controls are available for components that expose style properties.';
      note.style.cssText='padding:12px 10px;color:#7f8a9d;font-size:10px;line-height:1.5;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#0f1621;';
      content.appendChild(note);
    }
  }else{
    content.classList.remove('style-tab');
    content.querySelector('.style-tab-note')?.remove();
  }
}

function setDevice(device){
  const api=window.__indoResponsive?.setDevice;
  if(typeof api==='function')api(device);
  else{
    document.querySelectorAll('.device-button').forEach(button=>button.classList.toggle('active',button.dataset.device===device));
    document.getElementById('canvas')?.classList.remove('canvas-desktop','canvas-tablet','canvas-mobile');
    document.getElementById('canvas')?.classList.add(`canvas-${device}`);
  }
}

function refreshActionState(){
  document.querySelectorAll('.inspector-tabs .tab').forEach((button,index)=>{
    button.type='button';
    button.setAttribute('aria-selected',String(index===0));
  });
}

document.addEventListener('click',(event)=>{
  const tab=event.target.closest?.('.inspector-tabs .tab');
  if(tab){event.preventDefault();event.stopPropagation();setTab(tab.textContent.trim().toLowerCase()==='style'?'style':'content');return;}

  const device=event.target.closest?.('.device-button');
  if(device){event.preventDefault();event.stopPropagation();setDevice(device.dataset.device||'desktop');return;}

  const settings=event.target.closest?.('.toolbar-icon');
  if(settings){event.preventDefault();setStatus('Canvas settings');return;}
});

window.addEventListener('indo:component-selected',()=>setTab('content'));
window.addEventListener('indo:builder-ready',()=>setTab('content'));
refreshActionState();
