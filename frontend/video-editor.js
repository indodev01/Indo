import { supabase } from './auth/supabase-config.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');
const canvas = document.getElementById('canvas');
const inspector = document.getElementById('inspectorContent');
const pageStatus = document.getElementById('pageStatus');
const saveButton = document.getElementById('saveButton');

let project = null;
let definition = null;
let lastPageId = null;
let videoCache = new Map();
let hydrated = false;
let editorObserverBusy = false;

const style = document.createElement('style');
style.textContent = `
  .indo-video-editor{position:relative;width:100%;max-width:760px;margin:0 auto;background:#05070b;border-radius:16px;overflow:hidden;box-shadow:0 14px 36px rgba(0,0,0,.24)}
  .indo-video-editor video{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#000}
  .indo-video-title{position:absolute;left:16px;top:14px;z-index:4;color:#fff;font-size:12px;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.7);pointer-events:none}
  .indo-video-controls{position:absolute;left:0;right:0;bottom:0;z-index:4;padding:10px 12px 11px;background:linear-gradient(transparent,rgba(0,0,0,.88));display:grid;gap:7px}
  .indo-video-row{display:flex;align-items:center;gap:8px}.indo-video-row button{border:0;background:transparent;color:#fff;cursor:pointer;font:inherit;min-width:28px}.indo-video-progress{width:100%;accent-color:#ff2b55}.indo-video-time{color:#e5e7eb;font-size:11px;white-space:nowrap}.indo-video-spacer{flex:1}
  .indo-video-speed{color:#fff;background:transparent;border:0;font-size:11px;cursor:pointer}.indo-video-editor input,.indo-video-editor select{accent-color:#7c2cff}
  .indo-video-field{display:grid;gap:6px;margin:10px 0}.indo-video-field label{font-size:11px;font-weight:800;color:#c7cfdd}.indo-video-field input,.indo-video-field select{width:100%;padding:10px;border:1px solid rgba(255,255,255,.1);background:#0d131d;color:#fff;border-radius:9px;font:inherit}.indo-video-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.indo-video-check{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#0d131d;color:#c7cfdd;font-size:11px}
`;
document.head.appendChild(style);

function pageIdFromName(name){
  if(!definition?.pages) return 'home';
  const exact = Object.values(definition.pages).find(p=>p.name===name);
  return exact?.id || Object.keys(definition.pages)[0] || 'home';
}
function currentPage(){ return definition?.pages?.[lastPageId || pageIdFromName(pageStatus?.textContent)] || null; }
function videoComponents(){
  const page=currentPage();
  if(!page) return [];
  return (page.components||[]).filter(c=>c.type==='Video');
}
function formatTime(seconds){
  if(!Number.isFinite(seconds)) return '0:00';
  const s=Math.max(0,Math.floor(seconds)); const m=Math.floor(s/60); return `${m}:${String(s%60).padStart(2,'0')}`;
}
function getProps(component){
  const defaults={url:'',posterUrl:'',title:'Featured Video',autoplay:false,controls:true,loop:false,muted:false};
  return {...defaults,...(component.props||{})};
}

async function loadProject(){
  if(!projectId) return false;
  const {data:userData,error:userError}=await supabase.auth.getUser();
  if(userError||!userData.user) return false;
  const {data:loaded,error}=await supabase.from('projects').select('id,user_id,name,app_definition,pages').eq('id',projectId).eq('user_id',userData.user.id).maybeSingle();
  if(error||!loaded) return false;
  project=loaded;
  definition=loaded.app_definition && typeof loaded.app_definition==='object' ? loaded.app_definition : {pages:loaded.pages||{}};
  if(!definition.pages) definition.pages=loaded.pages||{};
  lastPageId=pageIdFromName(pageStatus?.textContent);
  videoCache.clear();
  videoComponents().forEach(c=>videoCache.set(c.id,getProps(c)));
  return true;
}

async function persistVideos(){
  if(!projectId||!definition?.pages) return;
  const pages=structuredClone(definition.pages);
  for(const page of Object.values(pages)){
    for(const component of page.components||[]){
      if(component.type==='Video' && videoCache.has(component.id)) component.props={...component.props,...videoCache.get(component.id)};
    }
  }
  const appDefinition={...(project?.app_definition||{}),pages};
  const {error}=await supabase.from('projects').update({pages,app_definition:appDefinition,updated_at:new Date().toISOString()}).eq('id',projectId);
  if(error) console.error(error);
  definition.pages=pages;
}

function playerFor(component){
  const p=getProps(component);
  const wrap=document.createElement('div'); wrap.className='indo-video-editor';
  const video=document.createElement('video');
  video.src=p.url||''; video.poster=p.posterUrl||''; video.autoplay=Boolean(p.autoplay&&p.url); video.loop=Boolean(p.loop); video.muted=Boolean(p.muted); video.playsInline=true; video.preload='metadata';
  wrap.appendChild(video);
  const title=document.createElement('div'); title.className='indo-video-title'; title.textContent=p.title||'Featured Video'; wrap.appendChild(title);
  const controls=document.createElement('div'); controls.className='indo-video-controls';
  const row=document.createElement('div'); row.className='indo-video-row';
  const play=document.createElement('button'); play.textContent='▶'; play.setAttribute('aria-label','Play');
  const time=document.createElement('span'); time.className='indo-video-time'; time.textContent='0:00 / 0:00';
  const spacer=document.createElement('span'); spacer.className='indo-video-spacer';
  const mute=document.createElement('button'); mute.textContent=p.muted?'🔇':'🔊';
  const speed=document.createElement('select'); speed.className='indo-video-speed'; ['1','1.25','1.5','2'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=`${v}x`;speed.appendChild(o)});
  const full=document.createElement('button'); full.textContent='⛶'; full.setAttribute('aria-label','Fullscreen');
  const progress=document.createElement('input'); progress.className='indo-video-progress'; progress.type='range'; progress.min='0'; progress.max='100'; progress.value='0';
  play.addEventListener('click',()=>{ if(video.paused){video.play();}else{video.pause();} });
  video.addEventListener('play',()=>play.textContent='❚❚'); video.addEventListener('pause',()=>play.textContent='▶');
  video.addEventListener('loadedmetadata',()=>{progress.max=String(video.duration||100);time.textContent=`0:00 / ${formatTime(video.duration)}`;});
  video.addEventListener('timeupdate',()=>{progress.value=String(video.currentTime||0);time.textContent=`${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;});
  progress.addEventListener('input',()=>{video.currentTime=Number(progress.value)||0;});
  mute.addEventListener('click',()=>{video.muted=!video.muted;mute.textContent=video.muted?'🔇':'🔊';});
  speed.addEventListener('change',()=>{video.playbackRate=Number(speed.value)||1;});
  full.addEventListener('click',()=>{if(wrap.requestFullscreen)wrap.requestFullscreen();});
  row.append(play,time,spacer,mute,speed,full); controls.append(progress,row); wrap.appendChild(controls);
  return wrap;
}

function renderVideoEditors(){
  if(editorObserverBusy||!inspector) return;
  const selected=canvas?.querySelector('.canvas-item.selected');
  if(!selected) return;
  const label=selected.querySelector('.component-type');
  if(!label||label.textContent!=='Video') return;
  const index=Number(selected.dataset.index);
  const page=currentPage(); const component=page?.components?.[index];
  if(!component||component.type!=='Video') return;
  const p=getProps(component); videoCache.set(component.id,p);
  editorObserverBusy=true;
  inspector.innerHTML='';
  const heading=document.createElement('p'); heading.style.cssText='margin:0 0 12px;color:#bca4ff;font-size:11px;font-weight:800'; heading.textContent='VIDEO PLAYER'; inspector.appendChild(heading);
  const fields=[['Video URL','url','https://.../video.mp4'],['Poster URL','posterUrl','https://.../poster.jpg'],['Title','title','Featured Video']];
  for(const [labelText,key,placeholder] of fields){const wrap=document.createElement('div');wrap.className='indo-video-field';const l=document.createElement('label');l.textContent=labelText;const input=document.createElement('input');input.value=p[key]||'';input.placeholder=placeholder;input.addEventListener('input',()=>{p[key]=input.value;videoCache.set(component.id,{...p});});wrap.append(l,input);inspector.appendChild(wrap);}
  const checks=document.createElement('div');checks.className='indo-video-checks';[['autoplay','Autoplay'],['loop','Loop'],['muted','Muted'],['controls','Controls']].forEach(([key,labelText])=>{const item=document.createElement('label');item.className='indo-video-check';const c=document.createElement('input');c.type='checkbox';c.checked=Boolean(p[key]);c.addEventListener('change',()=>{p[key]=c.checked;videoCache.set(component.id,{...p});renderSelectedVideo();});item.append(c,document.createTextNode(labelText));checks.appendChild(item)});inspector.appendChild(checks);
  const note=document.createElement('p');note.style.cssText='margin:14px 0 0;color:#7f899a;font-size:10px;line-height:1.5';note.textContent='Use your own video URL/poster. The player controls can be customized here and remain editable in your app.';inspector.appendChild(note);
  editorObserverBusy=false;
}

function renderSelectedVideo(){
  const selected=canvas?.querySelector('.canvas-item.selected');
  if(!selected) return;
  const index=Number(selected.dataset.index); const component=currentPage()?.components?.[index]; if(!component||component.type!=='Video') return;
  const old=selected.querySelector('.indo-video-editor'); if(old) old.remove();
  const label=selected.querySelector('.component-type'); if(label) label.style.display='none';
  selected.appendChild(playerFor(component));
}

const canvasObserver=new MutationObserver(()=>{
  if(!definition) return;
  const items=canvas?.querySelectorAll('.canvas-item')||[];
  items.forEach(item=>{
    const label=item.querySelector('.component-type');
    if(label?.textContent==='Video' && !item.querySelector('.indo-video-editor')){
      const index=Number(item.dataset.index); const component=currentPage()?.components?.[index]; if(component) item.appendChild(playerFor(component));
    }
  });
  renderVideoEditors();
});
if(canvas) canvasObserver.observe(canvas,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-index']});

const inspectorObserver=new MutationObserver(()=>renderVideoEditors());
if(inspector) inspectorObserver.observe(inspector,{childList:true,subtree:true});

saveButton?.addEventListener('click',()=>setTimeout(persistVideos,700));

(async()=>{
  const ok=await loadProject();
  if(!ok) return;
  const existingVideo=videoComponents()[0];
  if(existingVideo){videoCache.set(existingVideo.id,getProps(existingVideo));}
  window.setTimeout(()=>{
    const label=[...document.querySelectorAll('.component-button')].find(b=>b.dataset.component==='Video');
    if(label&&!label.dataset.bridgeBound){
      label.dataset.bridgeBound='1';
      label.addEventListener('click',async()=>{
        await new Promise(r=>setTimeout(r,200));
        const fresh=await loadProject();
        if(fresh) window.location.reload();
      });
    }
  },400);
})();
