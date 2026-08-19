import { supabase } from '../auth/supabase-config.js';
import { makeEmptyDefinition, normalizeComponents, normalizeDefinition, syncLegacyFields } from './app-definition.js';

const $ = (id) => document.getElementById(id);
const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = $('canvas');
const pageList = $('pageList');
const componentList = $('componentList');
const inspector = $('inspectorContent');
const selectionLabel = $('selectionLabel');
const pageStatus = $('pageStatus');
const projectStatus = $('projectStatus');
const saveButton = $('saveButton');
const previewButton = $('previewButton');
const publishButton = $('publishButton');
const addPageButton = $('addPageButton');
const pageDialog = $('pageDialog');
const pageNameInput = $('pageNameInput');
const cancelPageButton = $('cancelPageButton');
const confirmPageButton = $('confirmPageButton');
const deviceButtons = [...document.querySelectorAll('.device-button')];
const tabs = [...document.querySelectorAll('.inspector-tabs .tab')];

const TYPES = [
  ['Header', '≡'], ['Navigation', '☰'], ['Hero Section', '◒'], ['Buttons', '↗'],
  ['Cards', '▣'], ['Images', '▧'], ['Videos', '▶'], ['Music Player', '♫'],
  ['Forms', '▤'], ['Footer / Bottom', '⌄'], ['Others', '✦']
];

const HEADER_DESIGNS = [
  { id:'left-menu-right', name:'Brand Left • Menu Right', brandSide:'left', menuSide:'right', bg:'#ffffff', color:'#111827' },
  { id:'left-menu-left', name:'Menu Left • Brand Left', brandSide:'left', menuSide:'left', bg:'#ffffff', color:'#111827' },
  { id:'center-menu-right', name:'Centered Brand • Menu Right', brandSide:'center', menuSide:'right', bg:'#ffffff', color:'#111827' },
  { id:'menu-left-center', name:'Menu Left • Center Brand', brandSide:'center', menuSide:'left', bg:'#ffffff', color:'#111827' },
  { id:'dark-left-right', name:'Dark • Brand Left', brandSide:'left', menuSide:'right', bg:'#0f172a', color:'#ffffff' },
  { id:'minimal-center', name:'Minimal Center', brandSide:'center', menuSide:'right', bg:'#f8fafc', color:'#0f172a' },
  { id:'right-brand', name:'Brand Right • Menu Left', brandSide:'right', menuSide:'left', bg:'#ffffff', color:'#111827' },
  { id:'soft-purple', name:'Soft Purple', brandSide:'left', menuSide:'right', bg:'#f5f3ff', color:'#312e81' }
];

const DEFAULTS = {
  Navigation: { items:['Home','Music','Search'], icon:'☰' },
  'Hero Section': { title:'Build something amazing', text:'Your hero section starts here.', button:'Get Started' },
  Buttons: { label:'Get Started', background:'#7c3aed', color:'#ffffff', radius:10 },
  Cards: { title:'Card title', text:'Card content', background:'#111827', color:'#ffffff' },
  Images: { url:'', alt:'Image' },
  Videos: { url:'', controls:true, autoplay:false },
  'Music Player': { title:'Now Playing', artist:'Artist', src:'' },
  Forms: { title:'Contact us', fields:['Name','Email','Message'] },
  'Footer / Bottom': { items:['Home','Music','Search','Profile'] },
  Others: { text:'Custom block' }
};

let currentUser = null;
let project = null;
let definition = makeEmptyDefinition();
let currentPageId = 'home';
let selectedIndex = -1;
let activeDevice = 'desktop';
let dirty = false;
let loading = false;

const clone = (value) => JSON.parse(JSON.stringify(value));
const setStatus = (text) => { if (projectStatus) projectStatus.textContent = text; };
const activePage = () => definition.pages?.[currentPageId] || null;

function slugify(value) {
  return String(value || 'page').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
}

function markDirty(text = 'Unsaved changes') {
  dirty = true;
  if (text) setStatus(text);
  window.dispatchEvent(new CustomEvent('indo:builder-dirty'));
}

function makeHeader(designId = 'left-menu-right') {
  const d = HEADER_DESIGNS.find((item) => item.id === designId) || HEADER_DESIGNS[0];
  return {
    id: `header-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    type: 'Header',
    props: {
      designId:d.id, title:project?.name || 'My App', fontFamily:'Inter', fontSize:20, fontWeight:'800',
      titleColor:d.color, menuIcon:'☰', menuIconColor:d.color, menuIconSize:22,
      menuBackground:d.bg, menuPanelBackground:'#0f172a', menuPanelColor:'#ffffff',
      menuSide:d.menuSide, brandSide:d.brandSide, items:Object.keys(definition.pages)
    }
  };
}

function dedupeHeaders(page) {
  if (!page?.components) return false;
  const normalized = normalizeComponents(page.components);
  let seen = false;
  const filtered = normalized.filter((component) => {
    if (component.type !== 'Header') return true;
    if (seen) return false;
    seen = true;
    return true;
  });
  const changed = filtered.length !== normalized.length;
  page.components = filtered;
  return changed;
}

function ensurePageNavigation() {
  for (const page of Object.values(definition.pages || {})) {
    page.components = normalizeComponents(page.components || []);
    for (const component of page.components) {
      if (component.type === 'Header') {
        const items = Array.isArray(component.props?.items) ? component.props.items.filter((id) => definition.pages[id]) : [];
        component.props = { ...(component.props || {}), items: items.length ? items : Object.keys(definition.pages) };
      }
    }
  }
}

async function loadProject() {
  if (!projectId) throw new Error('Missing project ID');
  const auth = await supabase.auth.getUser();
  if (auth.error) throw auth.error;
  if (!auth.data.user) throw new Error('Please sign in again');
  currentUser = auth.data.user;
  const result = await supabase.from('projects')
    .select('id,user_id,name,description,status,project_type,app_definition,pages,updated_at')
    .eq('id', projectId).eq('user_id', currentUser.id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Project not found');
  project = result.data;
  definition = normalizeDefinition(project);
  let changed = false;
  Object.values(definition.pages).forEach((page) => { if (dedupeHeaders(page)) changed = true; });
  ensurePageNavigation();
  currentPageId = definition.pages.home ? 'home' : Object.keys(definition.pages)[0] || 'home';
  if (changed) markDirty('Duplicate headers cleaned');
  exposeState();
}

async function saveDefinition() {
  if (!projectId || !currentUser || loading) return;
  loading = true;
  try {
    const page = activePage();
    if (page) page.components = normalizeComponents(page.components || []);
    ensurePageNavigation();
    const synced = syncLegacyFields(definition);
    const result = await supabase.from('projects').update({
      pages: clone(synced.pages),
      app_definition: clone(synced.appDefinition),
      updated_at: new Date().toISOString()
    }).eq('id', projectId).eq('user_id', currentUser.id);
    if (result.error) throw result.error;
    project.pages = clone(synced.pages);
    project.app_definition = clone(synced.appDefinition);
    dirty = false;
    setStatus('Saved');
    window.dispatchEvent(new CustomEvent('indo:builder-saved', { detail:{ projectId } }));
  } finally {
    loading = false;
    exposeState();
  }
}

function exposeState() {
  window.__indoBuilderComponents = activePage()?.components || [];
  window.__indoBuilderState = {
    getDefinition: () => definition,
    getSelectedIndex: () => selectedIndex,
    getActiveDevice: () => activeDevice,
    save: saveDefinition,
    markDirty
  };
}

function currentComponent() {
  return activePage()?.components?.[selectedIndex] || null;
}

function renderPages() {
  pageList.innerHTML = '';
  Object.entries(definition.pages || {}).forEach(([id, page]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `page-button${id === currentPageId ? ' active' : ''}`;
    button.textContent = page.name || id;
    button.addEventListener('click', () => switchPage(id));
    button.addEventListener('dblclick', () => renamePage(id));
    pageList.appendChild(button);
  });
}

function switchPage(id) {
  if (!definition.pages[id]) return;
  currentPageId = id;
  selectedIndex = -1;
  const page = activePage();
  if (page) page.components = normalizeComponents(page.components || []);
  pageStatus.textContent = page?.name || id;
  renderPages();
  renderCanvas();
  renderInspector();
  exposeState();
  setStatus(`Editing ${page?.name || id}`);
}

function renamePage(id) {
  const page = definition.pages[id];
  if (!page) return;
  const next = window.prompt('Page name', page.name || id);
  if (!next?.trim()) return;
  page.name = next.trim();
  page.slug = slugify(next);
  page.settings = { ...(page.settings || {}), title: page.name };
  ensurePageNavigation();
  renderPages(); renderCanvas(); renderInspector();
  markDirty('Page renamed');
}

function renderComponents() {
  componentList.innerHTML = '';
  TYPES.forEach(([type, icon]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'component-button';
    button.dataset.component = type;
    button.innerHTML = `<span aria-hidden="true">${icon}</span><span>${type}</span>`;
    if (type === 'Header') button.classList.add('component-special');
    button.addEventListener('click', () => {
      if (type === 'Header' && window.IndoHeaderLibrary?.open) window.IndoHeaderLibrary.open();
      else addComponent(type);
    });
    componentList.appendChild(button);
  });
  const count = document.querySelector('.component-count');
  if (count) count.textContent = String(TYPES.length);
}

function addComponent(type) {
  const page = activePage();
  if (!page) return;
  const component = type === 'Header' ? makeHeader() : {
    id:`${slugify(type)}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    type,
    props: clone(DEFAULTS[type] || { text:type })
  };
  page.components = normalizeComponents(page.components || []);
  page.components.push(component);
  selectedIndex = page.components.length - 1;
  renderCanvas(); renderInspector(); exposeState(); markDirty(`${type} added`);
}

function headerStyles(component) {
  const props = component?.props || {};
  const design = HEADER_DESIGNS.find((item) => item.id === props.designId) || HEADER_DESIGNS[0];
  return { ...design, ...props };
}

function renderHeader(item, component) {
  const p = headerStyles(component);
  const header = document.createElement('div');
  header.className = `app-header ${p.brandSide || 'left'}-brand menu-${p.menuSide || 'right'}`;
  header.dataset.headerComponent = component.id;
  header.style.background = p.bg || '#fff';
  header.style.color = p.color || '#111827';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'header-title-wrap';
  const title = document.createElement('span');
  title.className = 'header-title-edit';
  title.textContent = p.title || 'My App';
  Object.assign(title.style, { fontFamily:p.fontFamily || 'Inter', fontSize:`${Number(p.fontSize)||20}px`, fontWeight:p.fontWeight || '800', color:p.titleColor || p.color || '#111827' });
  titleWrap.appendChild(title);

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'header-menu-toggle';
  menu.textContent = p.menuIcon || '☰';
  menu.title = 'Open menu';
  Object.assign(menu.style, { color:p.menuIconColor || p.color || '#111827', fontSize:`${Number(p.menuIconSize)||22}px`, background:p.menuBackground || 'rgba(16,24,40,.04)' });
  menu.addEventListener('click', (event) => { event.stopPropagation(); toggleHeaderMenu(header, component); });

  if (p.brandSide === 'center') header.append(menu, titleWrap);
  else if (p.menuSide === 'left') header.append(menu, titleWrap);
  else header.append(titleWrap, menu);
  item.appendChild(header);
}

function toggleHeaderMenu(header, component) {
  const existing = header.querySelector('.header-menu-panel');
  if (existing) { existing.remove(); return; }
  const p = headerStyles(component);
  const panel = document.createElement('div');
  panel.className = `header-menu-panel ${p.menuSide === 'left' ? 'left' : ''}`;
  (Array.isArray(p.items) ? p.items : Object.keys(definition.pages)).forEach((id) => {
    const page = definition.pages[id];
    if (!page) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className='header-menu-item'; button.textContent = page.name;
    button.addEventListener('click', () => { panel.remove(); switchPage(id); });
    panel.appendChild(button);
  });
  const add = document.createElement('button');
  add.type='button'; add.className='header-menu-add'; add.textContent='+ Add Page';
  add.addEventListener('click', () => { panel.remove(); openPageDialog(); });
  panel.appendChild(add);
  header.appendChild(panel);
}

function renderGeneric(item, component) {
  const p = component.props || {};
  if (component.type === 'Navigation') {
    const nav = document.createElement('nav'); nav.className='generic-navigation';
    (Array.isArray(p.items) ? p.items : []).forEach((name) => {
      const button=document.createElement('button'); button.type='button'; button.textContent=name;
      button.addEventListener('click', () => { const target=Object.entries(definition.pages).find(([,page]) => String(page.name).toLowerCase()===String(name).toLowerCase())?.[0]; if(target) switchPage(target); });
      nav.appendChild(button);
    }); item.appendChild(nav); return;
  }
  if (component.type === 'Hero Section') {
    const box=document.createElement('div'); box.className='generic-hero';
    const h=document.createElement('h2'); h.textContent=p.title||''; const t=document.createElement('p'); t.textContent=p.text||'';
    const b=document.createElement('button'); b.type='button'; b.textContent=p.button||'Get Started'; box.append(h,t,b); item.appendChild(box); return;
  }
  if (component.type === 'Buttons') {
    const b=document.createElement('button'); b.type='button'; b.textContent=p.label||'Get Started'; b.className='generic-button'; b.style.background=p.background||'#7c3aed'; b.style.color=p.color||'#fff'; b.style.borderRadius=`${Number(p.radius)||10}px`; item.appendChild(b); return;
  }
  if (component.type === 'Cards') {
    const card=document.createElement('article'); card.className='generic-card'; const h=document.createElement('h3'); h.textContent=p.title||''; const t=document.createElement('p'); t.textContent=p.text||''; card.append(h,t); item.appendChild(card); return;
  }
  if (component.type === 'Images') {
    if (p.url) { const img=document.createElement('img'); img.src=p.url; img.alt=p.alt||'Image'; img.className='generic-image'; item.appendChild(img); }
    else { const empty=document.createElement('div'); empty.className='generic-empty'; empty.textContent='Image URL not set'; item.appendChild(empty); }
    return;
  }
  if (component.type === 'Videos') {
    const video=document.createElement('video'); video.controls=p.controls!==false; video.autoplay=Boolean(p.autoplay); video.src=p.url||''; video.className='generic-video'; item.appendChild(video); return;
  }
  if (component.type === 'Music Player') {
    const title=document.createElement('strong'); title.textContent=p.title||'Now Playing'; const audio=document.createElement('audio'); audio.controls=true; audio.src=p.src||''; item.append(title,audio); return;
  }
  if (component.type === 'Forms') {
    const form=document.createElement('div'); form.className='generic-form'; const h=document.createElement('h3'); h.textContent=p.title||'Contact us'; form.appendChild(h);
    (Array.isArray(p.fields)?p.fields:[]).forEach((name) => { const input=document.createElement('input'); input.placeholder=name; form.appendChild(input); }); item.appendChild(form); return;
  }
  if (component.type === 'Footer / Bottom') {
    const footer=document.createElement('nav'); footer.className='generic-footer'; (Array.isArray(p.items)?p.items:[]).forEach((label) => { const b=document.createElement('button'); b.type='button'; b.textContent=label; footer.appendChild(b); }); item.appendChild(footer); return;
  }
  const other=document.createElement('div'); other.className='generic-other'; other.textContent=p.text||component.type; item.appendChild(other);
}

function renderCanvas() {
  canvas.querySelectorAll(':scope > .canvas-item').forEach((node) => node.remove());
  const page = activePage();
  const components = page?.components || [];
  const empty = $('emptyState');
  if (empty) empty.style.display = components.length ? 'none' : '';
  components.forEach((component, index) => {
    const item=document.createElement('div');
    item.className=`canvas-item${component.type==='Header'?' canvas-header-component':''}${index===selectedIndex?' selected':''}`;
    item.dataset.index=String(index); item.dataset.componentId=component.id;
    item.addEventListener('click', (event) => { if (event.target.closest('.header-menu-panel,.header-menu-toggle')) return; event.stopPropagation(); selectComponent(index); });
    if (component.type==='Header') renderHeader(item, component); else renderGeneric(item, component);
    canvas.appendChild(item);
  });
}

function selectComponent(index) {
  if (!Number.isInteger(index) || !activePage()?.components?.[index]) return;
  selectedIndex=index;
  renderCanvas(); renderInspector(); exposeState();
  window.dispatchEvent(new CustomEvent('indo:component-selected', { detail:{ index, element:canvas.querySelector(`.canvas-item[data-index="${index}"]`) } }));
}

function createField(label, value, onChange, options={}) {
  const wrap=document.createElement('div'); wrap.className='inspector-field';
  const labelEl=document.createElement('label'); labelEl.textContent=label; wrap.appendChild(labelEl);
  const input=document.createElement(options.multiline?'textarea':'input');
  input.type=options.type||'text'; input.value=value ?? '';
  input.addEventListener('input',(event)=>{ onChange(options.type==='number' ? Number(event.target.value) : event.target.value); });
  wrap.appendChild(input); return wrap;
}

function setComponentProp(key, value) {
  const component=currentComponent(); if(!component) return;
  component.props={...(component.props||{}),[key]:value};
  markDirty('Unsaved changes'); renderCanvas(); renderInspector(); exposeState();
}

function renderInspector() {
  inspector.innerHTML='';
  const component=currentComponent();
  selectionLabel.textContent=component?.type || 'Nothing selected';
  if (!component) { const empty=document.createElement('p'); empty.className='inspector-empty'; empty.textContent='Select an element to configure it.'; inspector.appendChild(empty); return; }

  if (activeInspectorTab === 'style') renderStyleInspector(component); else renderContentInspector(component);
}

let activeInspectorTab='content';

function renderContentInspector(component) {
  const p=component.props||{};
  if (component.type==='Header') {
    const hp=headerStyles(component);
    inspector.appendChild(createField('Header title',hp.title,v=>setComponentProp('title',v)));
    const selectWrap=document.createElement('div'); selectWrap.className='inspector-field'; const label=document.createElement('label'); label.textContent='Design'; const select=document.createElement('select');
    HEADER_DESIGNS.forEach((design)=>{ const option=document.createElement('option'); option.value=design.id; option.textContent=design.name; option.selected=design.id===hp.designId; select.appendChild(option); });
    select.addEventListener('change',(e)=>setComponentProp('designId',e.target.value)); selectWrap.append(label,select); inspector.appendChild(selectWrap);
    inspector.appendChild(createField('Font',hp.fontFamily,v=>setComponentProp('fontFamily',v)));
    inspector.appendChild(createField('Font size',hp.fontSize,v=>setComponentProp('fontSize',v),{type:'number'}));
    inspector.appendChild(createField('Title color',hp.titleColor,v=>setComponentProp('titleColor',v)));
    inspector.appendChild(createField('Menu icon',hp.menuIcon,v=>setComponentProp('menuIcon',v)));
    inspector.appendChild(createField('Menu icon color',hp.menuIconColor,v=>setComponentProp('menuIconColor',v)));
    inspector.appendChild(createField('Menu icon size',hp.menuIconSize,v=>setComponentProp('menuIconSize',v),{type:'number'}));
    const pagesBox=document.createElement('div'); pagesBox.className='inspector-field'; const pagesLabel=document.createElement('label'); pagesLabel.textContent='Pages in menu'; pagesBox.appendChild(pagesLabel);
    (hp.items||[]).forEach((id)=>{ const page=definition.pages[id]; if(!page)return; const row=document.createElement('div'); row.className='header-page-row'; const name=document.createElement('span'); name.textContent=page.name; const remove=document.createElement('button'); remove.type='button'; remove.className='inspector-mini-button'; remove.textContent='×'; remove.title='Remove from menu'; remove.addEventListener('click',()=>{setComponentProp('items',(component.props.items||[]).filter((item)=>item!==id));}); row.append(name,remove); pagesBox.appendChild(row); });
    const add=document.createElement('button'); add.type='button'; add.className='header-menu-add'; add.textContent='+ Add Page'; add.addEventListener('click',openPageDialog); pagesBox.appendChild(add); inspector.appendChild(pagesBox);
  } else {
    Object.entries(p).forEach(([key,value])=>{
      if (key==='position' || key.startsWith('_') || typeof value==='object' && !Array.isArray(value)) return;
      if (Array.isArray(value)) inspector.appendChild(createField(key,value.join('\n'),v=>setComponentProp(key,v.split('\n').map((x)=>x.trim()).filter(Boolean)),{multiline:true}));
      else if (typeof value==='boolean') {
        const wrap=document.createElement('label'); wrap.className='inspector-check'; const input=document.createElement('input'); input.type='checkbox'; input.checked=value; input.addEventListener('change',()=>setComponentProp(key,input.checked)); const text=document.createElement('span'); text.textContent=key; wrap.append(input,text); inspector.appendChild(wrap);
      } else inspector.appendChild(createField(key,value,v=>setComponentProp(key,v)));
    });
  }
  const del=document.createElement('button'); del.type='button'; del.className='danger-button'; del.textContent='Delete Component'; del.addEventListener('click',deleteSelected); inspector.appendChild(del);
}

function renderStyleInspector(component) {
  const p=component.props||{};
  inspector.appendChild(createField('Background',p.background || p.menuBackground || '#ffffff',v=>setComponentProp(component.type==='Header'?'menuBackground':'background',v)));
  inspector.appendChild(createField('Text color',p.color || p.titleColor || '#111827',v=>setComponentProp(component.type==='Header'?'titleColor':'color',v)));
  inspector.appendChild(createField('Border radius',p.radius || 12,v=>setComponentProp('radius',v),{type:'number'}));
  inspector.appendChild(createField('Width',p.width || '',v=>setComponentProp('width',v),{}));
  inspector.appendChild(createField('Height',p.height || '',v=>setComponentProp('height',v),{}));
  const reset=document.createElement('button'); reset.type='button'; reset.className='secondary inspector-action'; reset.textContent='Reset style'; reset.addEventListener('click',()=>{const next={...(component.props||{})}; delete next.background; delete next.color; delete next.radius; delete next.width; delete next.height; component.props=next; markDirty('Style reset'); renderCanvas(); renderInspector();}); inspector.appendChild(reset);
}

function deleteSelected() {
  const page=activePage(); if (!page || selectedIndex<0) return;
  page.components.splice(selectedIndex,1); selectedIndex=Math.min(selectedIndex,page.components.length-1); markDirty('Component deleted'); renderCanvas(); renderInspector(); exposeState();
}

function openPageDialog() {
  pageNameInput.value=''; $('pageDialogMessage').textContent=''; pageDialog.hidden=false; setTimeout(()=>pageNameInput.focus(),0);
}
function closePageDialog() { pageDialog.hidden=true; pageNameInput.value=''; }
function addPage() {
  const name=pageNameInput.value.trim(); if(!name){$('pageDialogMessage').textContent='Enter a page name.'; return;}
  const slugBase=slugify(name); let id=slugBase; let suffix=2; while(definition.pages[id]) id=`${slugBase}-${suffix++}`;
  const page={id,name,slug:id,components:[],styles:{background:'#ffffff',padding:'16px'},settings:{title:name}};
  if(activePage()) activePage().components=normalizeComponents(activePage().components||[]);
  definition.pages[id]=page; ensurePageNavigation(); closePageDialog(); renderPages(); switchPage(id); markDirty('Page added');
}

function setDevice(device) {
  if (!['desktop','tablet','mobile'].includes(device)) return;
  activeDevice=device; window.__indoBuilderDevice=device; document.documentElement.dataset.indoDevice=device;
  deviceButtons.forEach((button)=>button.classList.toggle('active',button.dataset.device===device));
  canvas.classList.remove('canvas-desktop','canvas-tablet','canvas-mobile'); canvas.classList.add(`canvas-${device}`);
  setStatus(`${device[0].toUpperCase()+device.slice(1)} preview`);
}

function openPreview() {
  const url=new URL('preview.html',location.href); url.searchParams.set('projectId',projectId); url.searchParams.set('device',activeDevice); location.href=url.href;
}

async function init() {
  try {
    setStatus('Loading project...');
    await loadProject();
    renderPages(); renderComponents(); switchPage(currentPageId); setDevice('desktop');
    dirty=false; setStatus(project?.status==='published'?'Published':'Ready');
    if (previewButton) previewButton.addEventListener('click',openPreview);
    if (saveButton) saveButton.addEventListener('click',()=>saveDefinition().catch((error)=>setStatus(`Save failed: ${error.message||'error'}`)));
    if (publishButton) publishButton.title='Publish this project';
    addPageButton?.addEventListener('click',openPageDialog);
    cancelPageButton?.addEventListener('click',closePageDialog);
    confirmPageButton?.addEventListener('click',()=>addPage());
    pageNameInput?.addEventListener('keydown',(event)=>{if(event.key==='Enter')addPage();if(event.key==='Escape')closePageDialog();});
    deviceButtons.forEach((button)=>button.addEventListener('click',()=>setDevice(button.dataset.device)));
    tabs.forEach((tab,index)=>tab.addEventListener('click',()=>{activeInspectorTab=index===0?'content':'style';tabs.forEach((item)=>item.classList.toggle('active',item===tab));tabs.forEach((item)=>item.setAttribute('aria-selected',String(item===tab)));renderInspector();}));
    document.addEventListener('keydown',(event)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveDefinition().catch(()=>{});}if(event.key==='Escape'&&pageDialog&&!pageDialog.hidden)closePageDialog();});
    window.addEventListener('beforeunload',(event)=>{if(dirty){event.preventDefault();event.returnValue='';}});
    exposeState();
  } catch (error) {
    console.error('Builder init failed',error); setStatus(error.message||'Builder failed to load');
  }
}

window.IndoHeaderLibrary = window.IndoHeaderLibrary || null;
window.IndoBuilder = { save:saveDefinition, addComponent, openPageDialog, setDevice, selectComponent, getDefinition:()=>definition };
init();
