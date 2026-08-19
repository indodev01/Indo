const status=document.getElementById('projectStatus');

function ensurePublishResultUi(){
  let panel=document.getElementById('publishResultPanel');
  if(panel)return panel;
  panel=document.createElement('div');
  panel.id='publishResultPanel';
  panel.hidden=true;
  panel.style.cssText='position:fixed;inset:0;display:none;place-items:center;background:rgba(2,6,23,.58);backdrop-filter:blur(6px);z-index:5000;padding:20px';
  panel.innerHTML=`<div style="width:min(560px,100%);background:#fff;color:#0f172a;border-radius:18px;box-shadow:0 20px 70px rgba(0,0,0,.24);padding:24px"><div style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed">Published</div><h2 style="margin:6px 0 0;font-size:24px">Your app is live</h2></div><button type="button" data-publish-close style="border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:18px">×</button></div><div style="margin-top:20px"><label style="display:block;font-size:12px;font-weight:700;margin-bottom:7px;color:#475569">Live URL</label><div style="display:flex;gap:8px"><input data-publish-url readonly style="flex:1;min-width:0;padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;color:#0f172a"><button type="button" data-publish-copy style="padding:11px 14px;border:1px solid #c4b5fd;border-radius:10px;background:#f5f3ff;color:#6d28d9;font-weight:800;cursor:pointer">Copy</button></div></div><div style="display:flex;gap:10px;margin-top:18px"><a data-publish-open target="_blank" rel="noopener" style="flex:1;text-align:center;text-decoration:none;padding:12px 14px;border-radius:10px;background:#7c3aed;color:#fff;font-weight:800">Open Live App</a><button type="button" data-publish-close style="flex:1;padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font-weight:800;cursor:pointer">Done</button></div><p data-publish-copy-status style="margin:10px 0 0;min-height:18px;color:#64748b;font-size:12px"></p></div>`;
  document.body.appendChild(panel);
  panel.querySelectorAll('[data-publish-close]').forEach(btn=>btn.addEventListener('click',closePublishResult));
  panel.addEventListener('click',e=>{if(e.target===panel)closePublishResult();});
  panel.querySelector('[data-publish-copy]').addEventListener('click',async()=>{
    const url=panel.querySelector('[data-publish-url]').value;
    try{await navigator.clipboard.writeText(url);panel.querySelector('[data-publish-copy-status]').textContent='Copied to clipboard.';}catch{panel.querySelector('[data-publish-copy-status]').textContent='Copy failed — select the URL manually.';}
  });
  return panel;
}

export function showPublishResult(url){
  const panel=ensurePublishResultUi();
  panel.querySelector('[data-publish-url]').value=url;
  panel.querySelector('[data-publish-open]').href=url;
  panel.querySelector('[data-publish-copy-status]').textContent='';
  panel.hidden=false;panel.style.display='grid';
  if(status)status.textContent='Published';
}
export function closePublishResult(){
  const panel=document.getElementById('publishResultPanel');
  if(panel){panel.hidden=true;panel.style.display='none';}
}
window.IndoPublishResult={showPublishResult,closePublishResult};
