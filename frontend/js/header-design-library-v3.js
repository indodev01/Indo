import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, normalizeComponents, syncLegacyFields } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const pageStatus = document.getElementById('pageStatus');

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
  {id:'hd20',name:'White Wave',bg:'linear-gradient(180deg,#ffffff,#f1f5f9)',color:'#0f172a',brandSide:'center',menuSide:'left',menuIcon:'☰',menuIconSize:22,fontSize:19,height:76}
];

let selected = DESIGNS[0];

function modalTemplate() {
  const backdrop = document.createElement('div');
  backdrop.id = 'headerDesignV3Backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(2,5,12,.82);backdrop-filter:blur(12px);display:flex;justify-content:center;align-items:flex-start;padding:24px;overflow:auto;';
  backdrop.innerHTML = `
    <div style="width:min(1180px,100%);background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:20px;color:#fff;box-shadow:0 32px 100px rgba(0,0,0,.58);overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.08)">
        <div><h2 style="margin:0 0 5px;font-size:22px">Header Design Library</h2><p style="margin:0;color:#94a3b8;font-size:12px">Choose a different color, size and layout. Then add it to your Home screen.</p></div>
        <button id="hdv3Close" type="button" style="width:36px;height:36px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.04);color:#fff;font-size:18px">×</button>
      </div>
      <div id="hdv3Grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:20px"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-top:1px solid rgba(255,255,255,.08)">
        <span id="hdv3Selected" style="color:#a5b4fc;font-size:11px;font-weight:800">Design 01 selected</span>
        <button id="hdv3Add" type="button" style="min-height:40px;padding:0 18px;border:0;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900">Add to App</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  return backdrop;
}

function previewCard(design, index) {
  const card = document.createElement('button');
  card.type='button';
  card.style.cssText='text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#0b1220;color:#fff;padding:10px;cursor:pointer;transition:.15s;';
  const preview = document.createElement('div');
  preview.style.cssText=`height:${Math.max(62, Math.min(86, design.height))}px;border-radius:${design.rounded?'18px':'10px'};padding:0 16px;display:flex;align-items:center;justify-content:space-between;background:${design.bg};color:${design.color};overflow:hidden;gap:12px;`;
  const brand=document.createElement('strong');brand.textContent='My App';brand.style.fontSize=`${Math.max(14,Math.min(24,design.fontSize))}px`;brand.style.order=design.brandSide==='right'?'3':design.brandSide==='center'?'2':'1';
  const nav=document.createElement('span');nav.textContent='Home   About   Contact';nav.style.fontSize='11px';nav.style.opacity='.92';nav.style.flex='1';nav.style.textAlign='center';
  const menu=document.createElement('span');menu.textContent=design.menuIcon;menu.style.fontSize=`${Math.max(16,design.menuIconSize-2)}px`;menu.style.order=design.menuSide==='left'?'0':'3';
  preview.append(menu,brand,nav);
  const meta=document.createElement('div');meta.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:9px 2px 2px;';
  const name=document.createElement('span');name.textContent=`${String(index+1).padStart(2,'0')} · ${design.name}`;name.style.fontSize='11px';name.style.fontWeight='800';
  const choose=document.createElement('span');choose.textContent='Select';choose.style.cssText='padding:5px 9px;border-radius:7px;background:#7c3aed;color:#fff;font-size:10px;font-weight:900;';
  meta.append(name,choose);card.append(preview,meta);
  card.addEventListener('click',()=>{selected=design;document.querySelectorAll('#hdv3Grid > button').forEach(n=>n.style.borderColor='rgba(255,255,255,.08)');card.style.borderColor='#8b5cf6';document.getElementById('hdv3Selected').textContent=`Design ${String(index+1).padStart(2,'0')} selected`;});
  return card;
}

function openLibrary() {
  if(document.getElementById('headerDesignV3Backdrop')) return;
  selected=DESIGNS[0];
  const modal=modalTemplate();
  const grid=modal.querySelector('#hdv3Grid');
  DESIGNS.forEach((d,i)=>grid.appendChild(previewCard(d,i)));
  grid.firstElementChild.style.borderColor='#8b5cf6';
  modal.querySelector('#hdv3Close').onclick=()=>modal.remove();
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  modal.querySelector('#hdv3Add').onclick=async()=>{await addDesignToApp(selected,modal);};
}

async function addDesignToApp(design, modal) {
  const add=modal.querySelector('#hdv3Add');
  add.disabled=true;add.textContent='Adding…';
  try {
    if(!projectId) throw new Error('Missing project ID');
    const auth=await supabase.auth.getUser();
    if(auth.error||!auth.data.user) throw new Error('Not signed in');
    const result=await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id',projectId).eq('user_id',auth.data.user.id).maybeSingle();
    if(result.error) throw result.error;
    if(!result.data) throw new Error('Project not found');
    const definition=normalizeDefinition(result.data);
    const pageName=(pageStatus?.textContent||'Home').trim().toLowerCase();
    const pageId=Object.keys(definition.pages).find(id=>String(definition.pages[id].name||'').trim().toLowerCase()===pageName)||'home';
    if(!definition.pages[pageId]) throw new Error('Home page not found');
    const component={
      id:`header-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type:'Header',
      props:{
        designId:design.id,
        title:result.data.name||'My App',
        fontFamily:'Inter',fontSize:design.fontSize,fontWeight:'800',
        titleColor:design.color,menuIcon:design.menuIcon,menuIconColor:design.color,menuIconSize:design.menuIconSize,
        menuBackground:design.bg,menuPanelBackground:'#0f172a',menuPanelColor:'#fff',menuSide:design.menuSide,brandSide:design.brandSide,
        items:Object.keys(definition.pages),bg:design.bg,color:design.color,
        position:{x:0,y:0,width:null,height:design.height}
      }
    };
    definition.pages[pageId].components=normalizeComponents(definition.pages[pageId].components||[]);
    definition.pages[pageId].components.push(component);
    const synced=syncLegacyFields(definition);
    const save=await supabase.from('projects').update({pages:synced.pages,app_definition:synced.appDefinition,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',auth.data.user.id).select('id').maybeSingle();
    if(save.error) throw save.error;
    if(!save.data) throw new Error('App was not updated');
    modal.remove();
    location.reload();
  } catch(error) {
    console.error('Header design add failed',error);
    add.disabled=false;add.textContent='Add to App';
    window.alert(`Could not add this header. ${error.message||'Please try again.'}`);
  }
}

function replaceHeaderButton() {
  const current=[...document.querySelectorAll('#componentList .component-button')].find(b=>String(b.dataset.component||'').trim().toLowerCase()==='header');
  if(!current||current.dataset.hdv3==='1') return;
  const clone=current.cloneNode(true);
  clone.dataset.hdv3='1';
  clone.dataset.component='Header';
  clone.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openLibrary();});
  current.replaceWith(clone);
}

replaceHeaderButton();
const observer=new MutationObserver(()=>replaceHeaderButton());
const list=document.getElementById('componentList');
if(list) observer.observe(list,{childList:true,subtree:true});
