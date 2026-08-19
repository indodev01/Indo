const projectId=new URLSearchParams(location.search).get('projectId');
const status=document.getElementById('projectStatus');
const title=document.getElementById('builderTitle');

function getMode(){return window.IndoProjectMode?.get?.()||'app'}
function applyMode(mode){
  const website=mode==='website';
  document.documentElement.dataset.projectType=mode;
  if(title)title.textContent=`${website?'Website':'App'} Builder`;
  if(status){const old=status.dataset.modeStatus; if(!old||old==='Definition loaded'||old==='Saved successfully')status.textContent=website?'Website mode':'App mode';}
  document.querySelectorAll('[data-mode-only]').forEach(el=>{el.hidden=el.dataset.modeOnly!==mode;});
}
window.addEventListener('indo:project-mode-ready',e=>applyMode(e.detail?.mode||getMode()));
window.addEventListener('indo:project-mode-change',e=>applyMode(e.detail?.mode||getMode()));
applyMode(getMode());

if(projectId)document.body.dataset.projectId=projectId;
