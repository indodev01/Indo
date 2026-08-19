import { supabase } from '../auth/supabase-config.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const REPO = 'indodev01/Indo';
const WORKFLOW_URL = `https://github.com/${REPO}/actions/workflows/build-apk.yml`;

function slugify(value){return String(value||'app').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32)||'app'}
function appIdFrom(slug){return `com.indodev01.${slugify(slug).replace(/-/g,'')}`.slice(0,48)}
function versionName(){return '1.0'}
function status(text){const el=document.getElementById('projectStatus');if(el)el.textContent=text}

function closeDialog(){document.getElementById('apkBuildDialog')?.remove()}
function showDialog(details){
  closeDialog();
  const backdrop=document.createElement('div');backdrop.id='apkBuildDialog';backdrop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:99999;display:grid;place-items:center;padding:24px';
  const panel=document.createElement('div');panel.style.cssText='width:min(620px,100%);background:#0d1324;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.45)';
  panel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><div style="font-size:12px;opacity:.62;font-weight:800;letter-spacing:.08em">ANDROID BUILD</div><h2 style="margin:6px 0 0">Build APK</h2></div><button id="apkClose" style="background:transparent;border:0;color:#fff;font-size:24px;cursor:pointer">×</button></div><p style="color:#aab3c6;line-height:1.5">Build record created. GitHub Actions must be started from the workflow page because this frontend does not have permission to dispatch GitHub workflows.</p><div style="display:grid;gap:10px;margin:18px 0"><label>Live URL<input readonly value="${details.liveUrl}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label><label>Application ID<input readonly value="${details.applicationId}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label><label>Version<input readonly value="${details.versionName}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label></div><div style="display:flex;justify-content:flex-end;gap:10px"><button id="apkDone" style="padding:10px 14px;border-radius:9px;border:1px solid #2b3650;background:#151d31;color:#fff;cursor:pointer">Close</button><a href="${WORKFLOW_URL}" target="_blank" rel="noopener" style="padding:10px 14px;border-radius:9px;background:#6d4aff;color:#fff;text-decoration:none;font-weight:800">Open GitHub Build</a></div>`;
  backdrop.appendChild(panel);document.body.appendChild(backdrop);document.getElementById('apkClose').onclick=closeDialog;document.getElementById('apkDone').onclick=closeDialog;
}

async function loadProject(){
  if(!projectId) throw new Error('Missing project ID');
  const auth=await supabase.auth.getUser();if(auth.error)throw auth.error;if(!auth.data.user)throw new Error('Please sign in first');
  const result=await supabase.from('projects').select('id,user_id,name,status,project_type,app_definition').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
  if(result.error)throw result.error;if(!result.data)throw new Error('Project not found');
  return result.data;
}

async function createBuild(){
  const button=document.getElementById('buildApkButton');if(button)button.disabled=true;status('Preparing APK build...');
  try{
    const project=await loadProject();
    const slug=project.app_definition?.publishing?.slug;
    if(project.status!=='published' || !slug) throw new Error('Publish this project first, then build the APK.');
    const liveUrl=new URL(`live-app.html?slug=${encodeURIComponent(slug)}`,new URL('../html/live-app.html',location.href)).href;
    const applicationId=appIdFrom(slug);const version=versionName();
    const {data:build,error}=await supabase.from('app_builds').insert({project_id:project.id,user_id:project.user_id,platform:'android',status:'queued'}).select('id').single();
    if(error)throw error;
    status(`Build queued • ${build.id.slice(0,8)}`);showDialog({buildId:build.id,liveUrl,applicationId,versionName:version});
  }catch(error){console.error(error);status(error.message||'APK build preparation failed');}finally{if(button)button.disabled=false;}
}

function install(){
  const actions=document.querySelector('.topbar-actions');if(!actions||document.getElementById('buildApkButton'))return;
  const button=document.createElement('button');button.id='buildApkButton';button.type='button';button.className='secondary';button.textContent='Build APK';button.onclick=createBuild;actions.insertBefore(button,document.getElementById('publishButton')||null);
}
install();
window.IndoApkBuild={createBuild};
