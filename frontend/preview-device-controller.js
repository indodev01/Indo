const canvas=document.getElementById('previewCanvas');
const query=new URLSearchParams(location.search);
const projectType=String(query.get('type')||'').toLowerCase();
const widths={desktop:1100,tablet:820,mobile:390};
function setDevice(device){
 const width=widths[device]||widths.desktop;
 document.documentElement.dataset.previewDevice=device;
 if(canvas){canvas.style.width=`min(100%, ${width}px)`;canvas.style.minHeight=device==='mobile'?'680px':device==='tablet'?'760px':'720px';canvas.style.borderRadius=device==='mobile'?'28px':device==='tablet'?'22px':'14px';canvas.style.borderWidth=device==='mobile'?'5px':device==='tablet'?'4px':'1px';}
 document.querySelectorAll('[data-preview-device]').forEach(btn=>btn.classList.toggle('active',btn.dataset.previewDevice===device));
 const u=new URL(location.href);u.searchParams.set('device',device);history.replaceState({},'',u);
}
function mount(){
 const toolbar=document.createElement('div');toolbar.id='previewDeviceToolbar';toolbar.style.cssText='display:flex;justify-content:center;gap:8px;margin:14px 0;flex-wrap:wrap';
 ['desktop','tablet','mobile'].forEach(device=>{const b=document.createElement('button');b.type='button';b.dataset.previewDevice=device;b.textContent=device[0].toUpperCase()+device.slice(1);b.style.cssText='padding:7px 11px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#cbd5e1;font-weight:800;cursor:pointer';b.onclick=()=>setDevice(device);toolbar.append(b)});
 const host=document.querySelector('.preview-frame');if(host)host.prepend(toolbar);
 setDevice(query.get('device')||'desktop');
}
mount();
window.IndoPreviewDevice={setDevice};
