import { supabase } from './auth/supabase-config.js';

const projectList=document.getElementById('projectList');
const mobileProjectList=document.getElementById('mobileProjectList');
const stats={total:document.getElementById('statTotal'),active:document.getElementById('statActive'),trial:document.getElementById('statTrial'),expired:document.getElementById('statExpired')};
const logoutButtons=[document.getElementById('logoutButton'),document.getElementById('mobileLogoutButton')].filter(Boolean);

function statusOf(project){const s=String(project.status||'draft').toLowerCase();if(s.includes('expired')||s.includes('inactive'))return'expired';if(s.includes('trial'))return'trial';return'active';}
function safeName(user,profile){return profile?.name||user.user_metadata?.name||user.email?.split('@')[0]||'User';}
function setIdentity(user,profile){const name=safeName(user,profile);document.getElementById('desktopGreeting').textContent=`Welcome back, ${name}! 👋`;document.getElementById('profileName').textContent=name;document.getElementById('profileInitial').textContent=name[0].toUpperCase();document.getElementById('mobileProfileInitial').textContent=name[0].toUpperCase();document.getElementById('mobileGreeting').textContent=`Hello, ${name} 👋`;}
function updateStats(projects){const c={total:projects.length,active:0,trial:0,expired:0};projects.forEach(p=>c[statusOf(p)]++);Object.keys(stats).forEach(k=>stats[k].textContent=String(c[k]));}
function emptyState(){projectList.innerHTML='<div class="empty-project-card"><h3>No apps yet</h3><p>Create your first real app to see it here.</p><a class="card-button" href="create-app-v2.html">Create App →</a></div>';mobileProjectList.innerHTML='<div class="mobile-app-row"><span><strong>No apps yet</strong><small>Create your first app to get started.</small></span></div>';}

function confirmDelete(name){
  return new Promise(resolve=>{
    const backdrop=document.createElement('div');
    backdrop.style.cssText='position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(2,5,12,.78);backdrop-filter:blur(8px)';
    const modal=document.createElement('div');
    modal.style.cssText='width:min(430px,100%);padding:24px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#111827;color:#fff;box-shadow:0 28px 90px rgba(0,0,0,.55)';
    modal.innerHTML='<p style="margin:0 0 6px;color:#a78bfa;font-size:10px;font-weight:900;letter-spacing:.12em">DELETE APP</p><h2 style="margin:0 0 10px;font-size:20px">Delete this app?</h2><p id="deleteCopy" style="margin:0;color:#aeb8c8;line-height:1.5;font-size:12px"></p><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px"><button data-cancel type="button" style="min-height:38px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#c8d0dd;font-weight:800">Cancel</button><button data-delete type="button" style="min-height:38px;padding:0 14px;border-radius:9px;border:0;background:#dc2626;color:#fff;font-weight:900">Delete App</button></div>';
    modal.querySelector('#deleteCopy').textContent=`“${name||'Untitled App'}” and all of its saved pages, components and app settings will be permanently removed from your workspace.`;
    const done=value=>{backdrop.remove();resolve(value);};
    modal.querySelector('[data-cancel]').onclick=()=>done(false);
    modal.querySelector('[data-delete]').onclick=()=>done(true);
    backdrop.onclick=e=>{if(e.target===backdrop)done(false);};
    document.addEventListener('keydown',function onKey(e){if(e.key==='Escape'){document.removeEventListener('keydown',onKey);done(false);}});
    backdrop.appendChild(modal);document.body.appendChild(backdrop);
  });
}

async function deleteProject(project){
  const ok=await confirmDelete(project.name);if(!ok)return;
  const cards=document.querySelectorAll(`[data-project-id="${CSS.escape(String(project.id))}"]`);cards.forEach(card=>{card.style.opacity='.45';card.style.pointerEvents='none';});
  try{
    const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Not signed in');
    const {error}=await supabase.from('projects').delete().eq('id',project.id).eq('user_id',user.id);if(error)throw error;
    try{localStorage.removeItem(`indo:home-layout:${project.id}`);}catch{}
    await refreshProjects();
  }catch(error){console.error(error);cards.forEach(card=>{card.style.opacity='';card.style.pointerEvents='';});window.alert(`Could not delete “${project.name||'Untitled App'}”. ${error.message||'Please try again.'}`);}
}

function desktopCard(p){const s=statusOf(p),el=document.createElement('article');el.className='app-card';el.dataset.projectId=p.id;el.innerHTML=`<div class="app-icon">${(p.name||'A')[0].toUpperCase()}</div><h3></h3><p></p><span class="status ${s}-status">${s}</span><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><a data-edit>✎ Edit App</a><a data-preview>Preview</a><button data-delete type="button" title="Delete app" style="border:1px solid rgba(220,38,38,.28);background:rgba(220,38,38,.08);color:#fca5a5;border-radius:8px;padding:6px 9px;font-size:11px;font-weight:800;cursor:pointer">Delete</button></div>`;el.querySelector('h3').textContent=p.name||'Untitled App';el.querySelector('p').textContent=p.description||'No description';el.querySelector('[data-edit]').href=`builder-v2.html?projectId=${encodeURIComponent(p.id)}`;el.querySelector('[data-preview]').href=`preview.html?projectId=${encodeURIComponent(p.id)}`;el.querySelector('[data-delete]').addEventListener('click',()=>deleteProject(p));return el;}
function mobileCard(p){const s=statusOf(p),el=document.createElement('div');el.className='mobile-app-row';el.dataset.projectId=p.id;const updated=p.updated_at?new Date(p.updated_at).toLocaleDateString():'';el.innerHTML=`<a data-open href="builder-v2.html?projectId=${encodeURIComponent(p.id)}" style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;color:inherit;text-decoration:none"><span class="mobile-app-icon purple-icon"></span><span style="min-width:0"><strong></strong><small></small></span><em class="${s}">${s}</em><b>›</b></a><button data-delete type="button" aria-label="Delete app" style="margin-left:8px;border:1px solid rgba(220,38,38,.25);background:rgba(220,38,38,.08);color:#fca5a5;border-radius:8px;padding:7px 9px;font-size:11px;font-weight:800">Delete</button>`;el.querySelector('.mobile-app-icon').textContent=(p.name||'A')[0].toUpperCase();el.querySelector('strong').textContent=p.name||'Untitled App';el.querySelector('small').textContent=updated?`Updated ${updated}`:'Ready to edit';el.querySelector('[data-delete]').addEventListener('click',()=>deleteProject(p));return el;}
function render(projects){projectList.innerHTML='';mobileProjectList.innerHTML='';updateStats(projects);if(!projects.length){emptyState();return;}projects.forEach(p=>{projectList.appendChild(desktopCard(p));mobileProjectList.appendChild(mobileCard(p));});}
async function loadProjects(){const {data:{user},error}=await supabase.auth.getUser();if(error||!user)throw error||new Error('Not signed in');const {data:projects,error:projectError}=await supabase.from('projects').select('id,name,description,start_mode,status,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false});if(projectError)throw projectError;return projects||[];}
async function refreshProjects(){const projects=await loadProjects();render(projects);}
async function logout(){logoutButtons.forEach(button=>{button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='Signing Out...';});try{const {error}=await supabase.auth.signOut();if(error)throw error;window.location.replace('landing/index.html');}catch(error){console.error(error);logoutButtons.forEach(button=>{button.disabled=false;button.textContent=button.dataset.originalText||'Sign Out';});window.alert('Could not sign out. Please try again.');}}
logoutButtons.forEach(button=>button.addEventListener('click',event=>{event.preventDefault();logout();}));

async function init(){const {data:{user},error}=await supabase.auth.getUser();if(error||!user){window.location.replace('auth/sign-in.html');return;}const {data:profile}=await supabase.from('users').select('name,email').eq('id',user.id).maybeSingle();setIdentity(user,profile);projectList.innerHTML='<div class="loading-card">Loading apps...</div>';mobileProjectList.innerHTML='<div class="mobile-app-row"><span><strong>Loading apps...</strong></span></div>';const projects=await loadProjects();render(projects);}
init().catch(error=>{console.error(error);projectList.innerHTML='<div class="empty-project-card"><h3>Could not load your apps</h3><p>Please refresh and try again.</p></div>';mobileProjectList.innerHTML='<div class="mobile-app-row"><span><strong>Could not load apps</strong><small>Please refresh and try again.</small></span></div>';});