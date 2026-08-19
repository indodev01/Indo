import { supabase } from './auth/supabase-config.js';

const canvas=document.getElementById('previewCanvas');
const projectId=new URLSearchParams(window.location.search).get('projectId');

const style=document.createElement('style');
style.textContent=`.preview-video{position:relative;width:100%;margin:14px 0;border-radius:16px;overflow:hidden;background:#05070b;box-shadow:0 18px 40px rgba(0,0,0,.24)}.preview-video video{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#000}.preview-video-title{position:absolute;left:14px;top:12px;z-index:3;color:#fff;font-size:11px;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.7);pointer-events:none}.preview-video-controls{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:9px 10px 10px;background:linear-gradient(transparent,rgba(0,0,0,.9));display:grid;gap:6px}.preview-video-row{display:flex;align-items:center;gap:7px}.preview-video-row button{border:0;background:transparent;color:#fff;cursor:pointer;font:inherit;min-width:28px}.preview-video-progress{width:100%;accent-color:#ff2b55}.preview-video-time{color:#e8ebf2;font-size:10px;white-space:nowrap}.preview-video-spacer{flex:1}.preview-video-speed{color:#fff;background:transparent;border:0;font-size:10px}`;
document.head.appendChild(style);

function fmt(s){if(!Number.isFinite(s))return'0:00';s=Math.max(0,Math.floor(s));return`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
function makePlayer(p){
  const wrap=document.createElement('div');wrap.className='preview-video';
  const video=document.createElement('video');video.src=p.url||'';video.poster=p.posterUrl||'';video.autoplay=Boolean(p.autoplay&&p.url);video.loop=Boolean(p.loop);video.muted=Boolean(p.muted);video.playsInline=true;video.preload='metadata';wrap.appendChild(video);
  const title=document.createElement('div');title.className='preview-video-title';title.textContent=p.title||'Featured Video';wrap.appendChild(title);
  const controls=document.createElement('div');controls.className='preview-video-controls';
  const row=document.createElement('div');row.className='preview-video-row';
  const play=document.createElement('button');play.textContent='▶';const time=document.createElement('span');time.className='preview-video-time';time.textContent='0:00 / 0:00';const spacer=document.createElement('span');spacer.className='preview-video-spacer';const mute=document.createElement('button');mute.textContent=p.muted?'🔇':'🔊';const speed=document.createElement('select');speed.className='preview-video-speed';['1','1.25','1.5','2'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=`${v}x`;speed.appendChild(o)});const full=document.createElement('button');full.textContent='⛶';const progress=document.createElement('input');progress.className='preview-video-progress';progress.type='range';progress.min='0';progress.max='100';progress.value='0';
  play.onclick=()=>video.paused?video.play():video.pause();video.onplay=()=>play.textContent='❚❚';video.onpause=()=>play.textContent='▶';video.onloadedmetadata=()=>{progress.max=String(video.duration||100);time.textContent=`0:00 / ${fmt(video.duration)}`};video.ontimeupdate=()=>{progress.value=String(video.currentTime||0);time.textContent=`${fmt(video.currentTime)} / ${fmt(video.duration)}`};progress.oninput=()=>video.currentTime=Number(progress.value)||0;mute.onclick=()=>{video.muted=!video.muted;mute.textContent=video.muted?'🔇':'🔊'};speed.onchange=()=>video.playbackRate=Number(speed.value)||1;full.onclick=()=>wrap.requestFullscreen?.();
  row.append(play,time,spacer,mute,speed,full);controls.append(progress,row);wrap.append(controls);return wrap;
}

async function renderVideos(){
  if(!projectId||!canvas)return;
  const {data:user}=await supabase.auth.getUser();if(!user?.user)return;
  const {data:project}=await supabase.from('projects').select('name,app_definition,pages').eq('id',projectId).eq('user_id',user.user.id).maybeSingle();if(!project)return;
  const definition=project.app_definition&&typeof project.app_definition==='object'?project.app_definition:{pages:project.pages||{}};
  const pageId=new URLSearchParams(window.location.search).get('page')||Object.keys(definition.pages||{})[0]||'home';
  const page=definition.pages?.[pageId];if(!page)return;
  const videos=(page.components||[]).filter(c=>c.type==='Video');
  canvas.querySelectorAll('.preview-video-hook').forEach(el=>el.remove());
  videos.forEach(component=>{const holder=document.createElement('div');holder.className='preview-video-hook';holder.appendChild(makePlayer(component.props||{}));canvas.appendChild(holder)});
}
renderVideos();window.addEventListener('popstate',()=>setTimeout(renderVideos,50));
