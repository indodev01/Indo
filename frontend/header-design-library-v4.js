import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, normalizeComponents, syncLegacyFields } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const pageStatus = document.getElementById('pageStatus');

// 30 selectable header designs. The final ten mirror the latest visual concepts requested.
const DESIGNS = [
  {id:'hd01',name:'Classic Menu',bg:'#ffffff',color:'#111827',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:20,height:64},
  {id:'hd02',name:'Wide Navigation',bg:'#ffffff',color:'#111827',brandSide:'left',menuSide:'right',menuIcon:'⋯',menuIconSize:24,fontSize:18,height:58},
  {id:'hd03',name:'Center Brand',bg:'#ffffff',color:'#111827',brandSide:'center',menuSide:'left',menuIcon:'☰',menuIconSize:22,fontSize:22,height:70},
  {id:'hd04',name:'Minimal Center',bg:'#f8fafc',color:'#0f172a',brandSide:'center',menuSide:'right',menuIcon:'•',menuIconSize:22,fontSize:18,height:52},
  {id:'hd05',name:'Soft Lavender',bg:'#ede9fe',color:'#4c1d95',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:20,fontSize:20,height:62},
  {id:'hd06',name:'Ocean Blue',bg:'linear-gradient(135deg,#2563eb,#06b6d4)',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:20,height:68},
  {id:'hd07',name:'Emerald',bg:'linear-gradient(135deg,#059669,#10b981)',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'⌄',menuIconSize:24,fontSize:19,height:72},
  {id:'hd08',name:'Sunset',bg:'linear-gradient(135deg,#f97316,#ec4899)',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:21,height:74},
  {id:'hd09',name:'Dark Compact',bg:'#05070d',color:'#f8fafc',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:19,fontSize:17,height:50},
  {id:'hd10',name:'Dark Center',bg:'#111827',color:'#ffffff',brandSide:'center',menuSide:'left',menuIcon:'≡',menuIconSize:25,fontSize:22,height:76},
  {id:'hd11',name:'Purple CTA',bg:'linear-gradient(135deg,#6d28d9,#a855f7)',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'→',menuIconSize:24,fontSize:20,height:66},
  {id:'hd12',name:'Skyline',bg:'#0ea5e9',color:'#ffffff',brandSide:'right',menuSide:'left',menuIcon:'☰',menuIconSize:22,fontSize:20,height:64},
  {id:'hd13',name:'Forest',bg:'#14532d',color:'#ecfdf5',brandSide:'left',menuSide:'right',menuIcon:'⋮',menuIconSize:24,fontSize:19,height:72},
  {id:'hd14',name:'Rose Glass',bg:'linear-gradient(135deg,#fda4af,#f9a8d4)',color:'#500724',brandSide:'left',menuSide:'right',menuIcon:'⌄',menuIconSize:23,fontSize:20,height:70},
  {id:'hd15',name:'Amber',bg:'#fef3c7',color:'#78350f',brandSide:'right',menuSide:'left',menuIcon:'☰',menuIconSize:21,fontSize:18,height:60},
  {id:'hd16',name:'Midnight',bg:'linear-gradient(135deg,#020617,#1e293b)',color:'#e2e8f0',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:26,fontSize:22,height:80},
  {id:'hd17',name:'Frost',bg:'#e0f2fe',color:'#0c4a6e',brandSide:'center',menuSide:'right',menuIcon:'⋯',menuIconSize:26,fontSize:21,height:58},
  {id:'hd18',name:'Rounded Premium',bg:'#ffffff',color:'#111827',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:20,fontSize:20,height:66,rounded:true},
  {id:'hd19',name:'Black Gold',bg:'#111111',color:'#fbbf24',brandSide:'right',menuSide:'left',menuIcon:'✦',menuIconSize:23,fontSize:20,height:70},
  {id:'hd20',name:'White Wave',bg:'linear-gradient(180deg,#ffffff,#f1f5f9)',color:'#0f172a',brandSide:'center',menuSide:'left',menuIcon:'☰',menuIconSize:22,fontSize:19,height:76},
  {id:'hd21',name:'Wave Gradient',bg:'linear-gradient(160deg,#ff4d2e 0%,#ff4778 55%,#9c45ff 100%)',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:21,height:78,wave:true},
  {id:'hd22',name:'Soft Cutout',bg:'#ffffff',color:'#111827',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:20,height:72,cutout:true},
  {id:'hd23',name:'Purple Neon Wave',bg:'linear-gradient(135deg,#0b0d1a,#18142f)',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:20,height:80,waveBorder:true},
  {id:'hd24',name:'Search + CTA',bg:'#ffffff',color:'#111827',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:20,height:66,search:true,cta:true},
  {id:'hd25',name:'Neon Outline',bg:'#05070d',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:20,height:66,outline:true,cta:true},
  {id:'hd26',name:'Contact CTA',bg:'#ffffff',color:'#111827',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:19,height:68,phone:true,cta:true},
  {id:'hd27',name:'Rounded Pill',bg:'#0d1322',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:20,fontSize:20,height:62,pill:true,cta:true},
  {id:'hd28',name:'Cart Header',bg:'#ffffff',color:'#111827',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:20,height:68,cart:true},
  {id:'hd29',name:'Hero Image',bg:'linear-gradient(105deg,#111827 0%,#26365c 48%,#7d4d75 100%)',color:'#ffffff',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:22,fontSize:21,height:82,imageTone:true,cta:true},
  {id:'hd30',name:'Icon Navigation',bg:'#ffffff',color:'#111827',brandSide:'left',menuSide:'right',menuIcon:'☰',menuIconSize:21,fontSize:20,height:72,icons:true}
];

let selected = DESIGNS[0];

function createModal(){
  const backdrop=document.createElement('div');
  backdrop.id='headerDesignV4Backdrop';
  backdrop.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(2,5,12,.84);backdrop-filter:blur(14px);display:flex;justify-content:center;align-items:flex-start;padding:20px;overflow:auto';
  backdrop.innerHTML=`<div style="width:min(1260px,100%);background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:20px;color:#fff;box-shadow:0 32px 100px rgba(0,0,0,.58);overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:flex-start;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.08)"><div><h2 style="margin:0 0 5px;font-size:22px">Header Design Library</h2><p style="margin:0;color:#94a3b8;font-size:12px">30 different header styles. Pick one, then add it to your app.</p></div><button id="hdv4Close" type="button" style="width:36px;height:36px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.04);color:#fff;font-size:18px">×</button></div><div id="hdv4Grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:18px"></div><div style="display:flex;justify-content:space-between;align-items:center;padding:15px 18px;border-top:1px solid rgba(255,255,255,.08)"><span id="hdv4Selected" style="color:#a5b4fc;font-size:11px;font-weight:800">Design 01 selected</span><button id="hdv4Add" type="button" style="min-height:40px;padding:0 18px;border:0;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900">Add to App</button></div></div>`;
  document.body.appendChild(backdrop);
  return backdrop;
}

function previewCard(d,index){
  const card=document.createElement('button'); card.type='button';
  card.style.cssText='text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#0b1220;color:#fff;padding:10px;cursor:pointer;transition:.15s;';
  const p=document.createElement('div');
  p.style.cssText=`height:${Math.max(58,Math.min(94,d.height))}px;border-radius:${d.pill?'999px':d.rounded?'18px':'10px'};padding:0 14px;display:flex;align-items:center;justify-content:space-between;background:${d.bg};color:${d.color};overflow:hidden;gap:10px;position:relative;${d.outline?'border:1px solid #ff4c8a;box-shadow:0 0 0 1px rgba(124,58,237,.15)':''};${d.cutout?'clip-path:polygon(0 0,100% 0,100% 88%,77% 88%,73% 100%,65% 88%,0 88%)':''};`;
  if(d.wave||d.waveBorder){p.style.borderBottom='2px solid rgba(196,181,253,.72)';p.style.borderRadius='10px 10px 28px 28px';}
  const brand=document.createElement('strong'); brand.textContent='Imdo'; brand.style.cssText=`font-size:${Math.max(15,Math.min(24,d.fontSize))}px;white-space:nowrap;`;
  const nav=document.createElement('span'); nav.textContent=d.icons?'⌂  ☆  ♙  ◇  ✉':'Home    Features    About    Pricing    Contact'; nav.style.cssText='font-size:10px;opacity:.94;flex:1;text-align:center;white-space:nowrap;overflow:hidden;';
  const extras=document.createElement('span'); extras.style.cssText='display:flex;align-items:center;gap:7px;white-space:nowrap;font-size:9px;';
  if(d.search) extras.innerHTML+='⌕ ';
  if(d.phone) extras.innerHTML+='⌕ +1 234 567 890 ';
  if(d.cart) extras.innerHTML+='🛒 '; 
  if(d.cta) extras.innerHTML+='<b style="padding:7px 10px;border-radius:7px;background:rgba(255,255,255,.92);color:#111827;font-size:9px">Get Started</b>';
  extras.innerHTML+=' <span style="font-size:20px">'+d.menuIcon+'</span>';
  if(d.brandSide==='right') brand.style.order='3';
  if(d.menuSide==='left') extras.style.order='0';
  p.append(brand,nav,extras);
  const meta=document.createElement('div'); meta.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:9px 2px 2px;';
  const name=document.createElement('span'); name.textContent=`${String(index+1).padStart(2,'0')} · ${d.name}`; name.style.fontSize='11px'; name.style.fontWeight='800';
  const choose=document.createElement('span'); choose.textContent='Select'; choose.style.cssText='padding:5px 9px;border-radius:7px;background:#7c3aed;color:#fff;font-size:10px;font-weight:900;';
  meta.append(name,choose); card.append(p,meta);
  card.onclick=()=>{selected=d;document.querySelectorAll('#hdv4Grid > button').forEach(n=>n.style.borderColor='rgba(255,255,255,.08)');card.style.borderColor='#8b5cf6';const s=document.getElementById('hdv4Selected');if(s)s.textContent=`Design ${String(index+1).padStart(2,'0')} selected`;};
  return card;
}

function openLibrary(){
  if(document.getElementById('headerDesignV4Backdrop')) return;
  selected=DESIGNS[0];
  const modal=createModal();
  const grid=modal.querySelector('#hdv4Grid');
  DESIGNS.forEach((d,i)=>grid.appendChild(previewCard(d,i)));
  grid.firstElementChild.style.borderColor='#8b5cf6';
  modal.querySelector('#hdv4Close').onclick=()=>modal.remove();
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  modal.querySelector('#hdv4Add').onclick=()=>addDesignToApp(selected,modal);
}

async function addDesignToApp(d,modal){
  const add=modal.querySelector('#hdv4Add'); add.disabled=true; add.textContent='Adding…';
  try{
    if(!projectId) throw new Error('Missing project ID');
    const auth=await supabase.auth.getUser(); if(auth.error||!auth.data.user) throw new Error('Not signed in');
    const result=await supabase.from('projects').select('id,user_id,name,description,app_definition,pages').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
    if(result.error)throw result.error; if(!result.data)throw new Error('Project not found');
    const def=normalizeDefinition(result.data); const wanted=(pageStatus?.textContent||'Home').trim().toLowerCase(); const pid=Object.keys(def.pages).find(id=>String(def.pages[id].name||'').trim().toLowerCase()===wanted)||'home'; if(!def.pages[pid])throw new Error('Page not found');
    const component={id:`header-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type:'Header',props:{designId:d.id,title:result.data.name||'My App',fontFamily:'Inter',fontSize:d.fontSize,fontWeight:'800',titleColor:d.color,menuIcon:d.menuIcon,menuIconColor:d.color,menuIconSize:d.menuIconSize,menuBackground:d.bg,menuPanelBackground:'#0f172a',menuPanelColor:'#fff',menuSide:d.menuSide,brandSide:d.brandSide,items:Object.keys(def.pages),bg:d.bg,color:d.color,height:d.height,position:{x:0,y:0,width:null,height:d.height},styleFlags:{search:!!d.search,cta:!!d.cta,phone:!!d.phone,cart:!!d.cart,icons:!!d.icons,outline:!!d.outline,pill:!!d.pill,wave:!!d.wave,cutout:!!d.cutout,imageTone:!!d.imageTone}}};
    def.pages[pid].components=normalizeComponents(def.pages[pid].components||[]); def.pages[pid].components.push(component); const synced=syncLegacyFields(def);
    const saved=await supabase.from('projects').update({pages:synced.pages,app_definition:synced.appDefinition,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',auth.data.user.id).select('id').maybeSingle();
    if(saved.error)throw saved.error; if(!saved.data)throw new Error('App was not updated'); modal.remove(); location.reload();
  }catch(e){console.error('Header library add failed',e);add.disabled=false;add.textContent='Add to App';window.alert(`Could not add this header. ${e.message||'Please try again.'}`);}
}

function replaceHeaderButton(){
  const current=[...document.querySelectorAll('#componentList .component-button')].find(b=>String(b.dataset.component||'').trim().toLowerCase()==='header');
  if(!current||current.dataset.hdv4==='1')return;
  const clone=current.cloneNode(true); clone.dataset.hdv4='1'; clone.dataset.component='Header'; clone.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openLibrary();}); current.replaceWith(clone);
}
replaceHeaderButton();
const observer=new MutationObserver(replaceHeaderButton); const list=document.getElementById('componentList'); if(list)observer.observe(list,{childList:true,subtree:true});
