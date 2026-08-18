import { supabase } from './auth/supabase-config.js';
import { makeEmptyDefinition, normalizeComponents, normalizeDefinition, syncLegacyFields } from './app-definition.js';

const title = document.getElementById('builderTitle');
const status = document.getElementById('projectStatus');
const pageStatus = document.getElementById('pageStatus');
const canvas = document.getElementById('canvas');
const emptyState = document.getElementById('emptyState');
const saveButton = document.getElementById('saveButton');
const previewButton = document.getElementById('previewButton');
const buttons = document.querySelectorAll('.component-button');
const inspectorContent = document.getElementById('inspectorContent');
const selectionLabel = document.getElementById('selectionLabel');
const pageList = document.getElementById('pageList');
const addPageButton = document.getElementById('addPageButton');
const pageDialog = document.getElementById('pageDialog');
const pageNameInput = document.getElementById('pageNameInput');
const cancelPageButton = document.getElementById('cancelPageButton');
const confirmPageButton = document.getElementById('confirmPageButton');
const pageDialogMessage = document.getElementById('pageDialogMessage');
const deviceButtons = document.querySelectorAll('.device-button');
const projectId = new URLSearchParams(window.location.search).get('projectId');

let currentUser = null;
let project = null;
let definition = makeEmptyDefinition();
let currentPageId = 'home';
let components = [];
let selectedIndex = -1;
let isReady = false;
let dragIndex = -1;

function showStatus(text) { status.textContent = text; }

function makeComponent(type) {
  const id = `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const defaults = {
    Heading: { text: 'Your Heading', size: 28, weight: '700', color: '#111827', align: 'left' },
    Text: { text: 'Add your text here.', size: 15, color: '#5f6b82' },
    Button: { label: 'Get Started', link: '', background: '#5b45f4', color: '#ffffff', radius: 10 },
    Image: { url: '', alt: 'Image', radius: 10 },
    Input: { label: 'Your Name', placeholder: 'Enter your name', name: 'name', inputType: 'text', required: false },
    Card: { title: 'Card Title', text: 'Card content', background: '#ffffff', radius: 14 },
    Container: { direction: 'column', gap: 12, background: '#ffffff', padding: 16, radius: 12 },
    Icon: { name: '★', size: 28, color: '#5b45f4' },
    List: { title: 'List', items: ['Item one', 'Item two', 'Item three'], bullet: true },
    Menu: { items: ['Home', 'About', 'Contact'], direction: 'row', gap: 18 },
    Divider: { color: '#e5e7ef', thickness: 1 },
    Spacer: { height: 24 }
  };
  return { id, type, props: defaults[type] || {} };
}

function slugifyPageName(name) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
  let id = base; let n = 2;
  while (definition.pages[id]) { id = `${base}-${n++}`; }
  return id;
}

function currentPage() { return definition.pages[currentPageId] || null; }

function renderPages() {
  pageList.innerHTML = '';
  Object.entries(definition.pages).forEach(([id, page]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `page-button${id === currentPageId ? ' active' : ''}`;
    button.textContent = page.name; button.addEventListener('click', () => switchPage(id));
    pageList.appendChild(button);
  });
}

function switchPage(id) {
  const next = definition.pages[id]; if (!next) return;
  if (currentPage()) currentPage().components = normalizeComponents(components);
  currentPageId = id; components = normalizeComponents(next.components || []); selectedIndex = -1;
  pageStatus.textContent = next.name; renderPages(); renderCanvas(); renderInspector(); showStatus(`Editing ${next.name}`);
}

function addPage() {
  const name = pageNameInput.value.trim();
  if (!name) { pageDialogMessage.textContent = 'Enter a page name.'; return; }
  const id = slugifyPageName(name);
  if (currentPage()) currentPage().components = normalizeComponents(components);
  definition.pages[id] = { id, name, slug: id, components: [], styles: { background: '#ffffff', padding: '16px' }, settings: { title: name } };
  pageDialog.hidden = true; switchPage(id);
}

function renderCanvas() {
  canvas.querySelectorAll('.canvas-item').forEach((el) => el.remove());
  emptyState.style.display = components.length ? 'none' : '';
  components.forEach((component, index) => {
    const item = document.createElement('div');
    item.className = 'canvas-item';
    item.draggable = true;
    item.dataset.index = String(index);
    if (index === selectedIndex) item.classList.add('selected');
    item.addEventListener('click', () => selectComponent(index));
    item.addEventListener('dragstart', () => {
      dragIndex = index;
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      dragIndex = -1;
      item.classList.remove('dragging');
      canvas.querySelectorAll('.canvas-item').forEach((node) => node.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (dragIndex === -1 || dragIndex === index) return;
      canvas.querySelectorAll('.canvas-item').forEach((node) => node.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      if (dragIndex === -1 || dragIndex === index) return;
      const [moved] = components.splice(dragIndex, 1);
      const targetIndex = dragIndex < index ? index - 1 : index;
      components.splice(targetIndex, 0, moved);
      selectedIndex = targetIndex;
      dragIndex = -1;
      showStatus(`Moved ${moved.type} to position ${targetIndex + 1}`);
      renderCanvas();
      renderInspector();
    });
    renderComponent(item, component); canvas.appendChild(item);
  });
}

function renderComponent(item, component) {
  const label = document.createElement('span'); label.className = 'component-type'; label.textContent = component.type; item.appendChild(label);
  const p = component.props || {};
  if (component.type === 'Heading') {
    const el = document.createElement('h3'); el.textContent = p.text || 'Your Heading'; el.style.fontSize = `${Number(p.size) || 28}px`; el.style.fontWeight = p.weight || '700'; el.style.color = p.color || '#111827'; el.style.textAlign = p.align || 'left'; item.appendChild(el);
  } else if (component.type === 'Text') {
    const el = document.createElement('p'); el.textContent = p.text || ''; el.style.fontSize = `${Number(p.size) || 15}px`; el.style.color = p.color || '#5f6b82'; item.appendChild(el);
  } else if (component.type === 'Button') {
    const el = document.createElement('span'); el.textContent = p.label || 'Get Started'; Object.assign(el.style, { display: 'inline-flex', padding: '10px 14px', borderRadius: `${Number(p.radius) || 10}px`, background: p.background || '#5b45f4', color: p.color || '#fff', fontWeight: '800' }); item.appendChild(el);
  } else if (component.type === 'Image') {
    if (p.url) { const el = document.createElement('img'); el.src = p.url; el.alt = p.alt || 'Image'; el.className = 'component-preview-image'; el.style.borderRadius = `${Number(p.radius) || 10}px`; item.appendChild(el); }
    else { const ph = document.createElement('div'); ph.className = 'component-preview-text'; ph.textContent = 'Image URL not set'; item.appendChild(ph); }
  } else if (component.type === 'Input') {
    const wrap = document.createElement('div'); const lab = document.createElement('label'); lab.textContent = p.label || 'Input'; lab.style.display = 'block'; lab.style.fontWeight = '700'; lab.style.marginBottom = '6px'; const input = document.createElement('input'); input.type = p.inputType || 'text'; input.placeholder = p.placeholder || ''; input.disabled = true; Object.assign(input.style, { width: '100%', padding: '11px', border: '1px solid #d6d9e4', borderRadius: '9px' }); wrap.append(lab, input); item.appendChild(wrap);
  } else if (component.type === 'Card') {
    const box = document.createElement('div'); Object.assign(box.style, { background: p.background || '#fff', border: '1px solid #e5e7ef', borderRadius: `${Number(p.radius) || 14}px`, padding: '16px' }); const h = document.createElement('strong'); h.textContent = p.title || 'Card Title'; const text = document.createElement('p'); text.textContent = p.text || 'Card content'; text.style.color = '#667085'; box.append(h, text); item.appendChild(box);
  } else if (component.type === 'Container') {
    const box = document.createElement('div'); box.textContent = 'Container'; Object.assign(box.style, { padding: `${Number(p.padding) || 16}px`, background: p.background || '#fff', border: '1px dashed #bdb5ff', borderRadius: `${Number(p.radius) || 12}px`, color: '#6b7280' }); item.appendChild(box);
  } else if (component.type === 'Icon') {
    const el = document.createElement('span'); el.textContent = p.name || '★'; el.style.fontSize = `${Number(p.size) || 28}px`; el.style.color = p.color || '#5b45f4'; item.appendChild(el);
  } else if (component.type === 'List') {
    const h = document.createElement('strong'); h.textContent = p.title || 'List'; const list = document.createElement(p.bullet === false ? 'div' : 'ul'); (p.items || []).forEach((v) => { const li = document.createElement(p.bullet === false ? 'div' : 'li'); li.textContent = v; list.appendChild(li); }); item.append(h, list);
  } else if (component.type === 'Menu') {
    const nav = document.createElement('nav'); Object.assign(nav.style, { display: 'flex', flexDirection: p.direction === 'column' ? 'column' : 'row', gap: `${Number(p.gap) || 18}px`, flexWrap: 'wrap' }); (p.items || []).forEach((v) => { const a = document.createElement('span'); a.textContent = v; a.style.fontWeight = '700'; nav.appendChild(a); }); item.appendChild(nav);
  } else if (component.type === 'Divider') {
    const hr = document.createElement('div'); Object.assign(hr.style, { height: `${Math.max(1, Number(p.thickness) || 1)}px`, background: p.color || '#e5e7ef' }); item.appendChild(hr);
  } else if (component.type === 'Spacer') {
    const spacer = document.createElement('div'); spacer.style.height = `${Math.max(4, Number(p.height) || 24)}px`; spacer.style.background = '#f7f7fb'; item.appendChild(spacer);
  }
}

function inputField(labelText, value, handler, options = {}) {
  const wrap = document.createElement('div'); wrap.className = 'inspector-field'; const label = document.createElement('label'); label.textContent = labelText; wrap.appendChild(label);
  const input = document.createElement(options.textarea ? 'textarea' : 'input'); if (options.type) input.type = options.type; input.value = value ?? ''; if (options.placeholder) input.placeholder = options.placeholder; if (options.min) input.min = options.min; if (options.max) input.max = options.max; input.addEventListener('input', (e) => handler(e.target.value)); wrap.appendChild(input); return wrap;
}
function selectField(labelText, value, choices, handler) { const wrap = document.createElement('div'); wrap.className = 'inspector-field'; const label = document.createElement('label'); label.textContent = labelText; wrap.appendChild(label); const select = document.createElement('select'); choices.forEach(([v,l]) => { const o=document.createElement('option'); o.value=v; o.textContent=l; o.selected=v===value; select.appendChild(o); }); select.addEventListener('change',(e)=>handler(e.target.value)); wrap.appendChild(select); return wrap; }
function setProp(key,value){ if(!components[selectedIndex]) return; components[selectedIndex].props={...(components[selectedIndex].props||{}),[key]:value}; renderCanvas(); }

function renderInspector() {
  inspectorContent.innerHTML='';
  if(selectedIndex<0||!components[selectedIndex]){ selectionLabel.textContent='Nothing selected'; const empty=document.createElement('p'); empty.className='inspector-empty'; empty.textContent=`Select a component on ${currentPage()?.name||'this page'} to configure it.`; inspectorContent.appendChild(empty); return; }
  const c=components[selectedIndex], p=c.props||{}; selectionLabel.textContent=c.type;
  const helper=document.createElement('p'); helper.className='helper'; helper.textContent='Component properties are part of the app definition.'; inspectorContent.appendChild(helper);
  if(c.type==='Heading'){ inspectorContent.appendChild(inputField('Text',p.text,v=>setProp('text',v))); inspectorContent.appendChild(inputField('Size (px)',p.size,v=>setProp('size',Number(v)||28),{type:'number',min:'12',max:'96'})); inspectorContent.appendChild(selectField('Weight',p.weight||'700',[['400','Regular'],['500','Medium'],['700','Bold'],['800','Extra Bold']],v=>setProp('weight',v))); inspectorContent.appendChild(inputField('Color',p.color,v=>setProp('color',v),{placeholder:'#111827'})); inspectorContent.appendChild(selectField('Align',p.align||'left',[['left','Left'],['center','Center'],['right','Right']],v=>setProp('align',v))); }
  else if(c.type==='Text'){ inspectorContent.appendChild(inputField('Text',p.text,v=>setProp('text',v),{textarea:true})); inspectorContent.appendChild(inputField('Size (px)',p.size,v=>setProp('size',Number(v)||15),{type:'number',min:'10',max:'48'})); inspectorContent.appendChild(inputField('Color',p.color,v=>setProp('color',v),{placeholder:'#5f6b82'})); }
  else if(c.type==='Button'){ inspectorContent.appendChild(inputField('Label',p.label,v=>setProp('label',v))); inspectorContent.appendChild(inputField('Link',p.link,v=>setProp('link',v),{placeholder:'page id or https://...'})); inspectorContent.appendChild(inputField('Background',p.background,v=>setProp('background',v),{placeholder:'#5b45f4'})); inspectorContent.appendChild(inputField('Text Color',p.color,v=>setProp('color',v),{placeholder:'#ffffff'})); inspectorContent.appendChild(inputField('Radius',p.radius,v=>setProp('radius',Number(v)||10),{type:'number',min:'0',max:'48'})); }
  else if(c.type==='Image'){ inspectorContent.appendChild(inputField('Image URL',p.url,v=>setProp('url',v),{placeholder:'https://...'})); inspectorContent.appendChild(inputField('Alt text',p.alt,v=>setProp('alt',v))); inspectorContent.appendChild(inputField('Radius',p.radius,v=>setProp('radius',Number(v)||10),{type:'number',min:'0',max:'48'})); }
  else if(c.type==='Input'){ inspectorContent.appendChild(inputField('Label',p.label,v=>setProp('label',v))); inspectorContent.appendChild(inputField('Placeholder',p.placeholder,v=>setProp('placeholder',v))); inspectorContent.appendChild(inputField('Field Name',p.name,v=>setProp('name',v))); inspectorContent.appendChild(selectField('Input Type',p.inputType||'text',[['text','Text'],['email','Email'],['number','Number'],['password','Password'],['tel','Phone']],v=>setProp('inputType',v))); inspectorContent.appendChild(selectField('Required',p.required?'yes':'no',[['no','No'],['yes','Yes']],v=>setProp('required',v==='yes'))); }
  else if(c.type==='Card'){ inspectorContent.appendChild(inputField('Title',p.title,v=>setProp('title',v))); inspectorContent.appendChild(inputField('Text',p.text,v=>setProp('text',v),{textarea:true})); inspectorContent.appendChild(inputField('Background',p.background,v=>setProp('background',v))); inspectorContent.appendChild(inputField('Radius',p.radius,v=>setProp('radius',Number(v)||14),{type:'number',min:'0',max:'48'})); }
  else if(c.type==='Container'){ inspectorContent.appendChild(selectField('Direction',p.direction||'column',[['column','Vertical'],['row','Horizontal']],v=>setProp('direction',v))); inspectorContent.appendChild(inputField('Gap',p.gap,v=>setProp('gap',Number(v)||12),{type:'number',min:'0',max:'64'})); inspectorContent.appendChild(inputField('Padding',p.padding,v=>setProp('padding',Number(v)||16),{type:'number',min:'0',max:'96'})); inspectorContent.appendChild(inputField('Background',p.background,v=>setProp('background',v))); }
  else if(c.type==='Icon'){ inspectorContent.appendChild(inputField('Icon',p.name,v=>setProp('name',v),{placeholder:'★'})); inspectorContent.appendChild(inputField('Size',p.size,v=>setProp('size',Number(v)||28),{type:'number',min:'8',max:'96'})); inspectorContent.appendChild(inputField('Color',p.color,v=>setProp('color',v))); }
  else if(c.type==='List'){ inspectorContent.appendChild(inputField('Title',p.title,v=>setProp('title',v))); inspectorContent.appendChild(inputField('Items (one per line)',(p.items||[]).join('\n'),v=>setProp('items',v.split('\n').map(x=>x.trim()).filter(Boolean)),{textarea:true})); inspectorContent.appendChild(selectField('Bullet',p.bullet===false?'no':'yes',[['yes','Yes'],['no','No']],v=>setProp('bullet',v==='yes'))); }
  else if(c.type==='Menu'){ inspectorContent.appendChild(inputField('Items (one per line)',(p.items||[]).join('\n'),v=>setProp('items',v.split('\n').map(x=>x.trim()).filter(Boolean)),{textarea:true})); inspectorContent.appendChild(selectField('Direction',p.direction||'row',[['row','Horizontal'],['column','Vertical']],v=>setProp('direction',v))); inspectorContent.appendChild(inputField('Gap',p.gap,v=>setProp('gap',Number(v)||18),{type:'number',min:'0',max:'64'})); }
  else if(c.type==='Divider'){ inspectorContent.appendChild(inputField('Color',p.color,v=>setProp('color',v))); inspectorContent.appendChild(inputField('Thickness',p.thickness,v=>setProp('thickness',Number(v)||1),{type:'number',min:'1',max:'8'})); }
  else if(c.type==='Spacer'){ inspectorContent.appendChild(inputField('Height',p.height,v=>setProp('height',Number(v)||24),{type:'number',min:'4',max:'240'})); }
  const del=document.createElement('button'); del.type='button'; del.className='danger'; del.textContent='Delete Component'; del.addEventListener('click',()=>{components.splice(selectedIndex,1);selectedIndex=-1;renderCanvas();renderInspector();showStatus('Component removed');}); inspectorContent.appendChild(del);
}
function selectComponent(index){selectedIndex=index;renderCanvas();renderInspector();}

async function loadProject(){
  if(!projectId) throw new Error('Missing project');
  const {data:authData,error:authError}=await supabase.auth.getUser(); if(authError) throw authError; currentUser=authData.user; if(!currentUser){window.location.replace('auth/sign-in.html');return;}
  const {data:loadedProject,error}=await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id',projectId).eq('user_id',currentUser.id).maybeSingle();
  if(error) throw error; if(!loadedProject) throw new Error('Project not found or access denied');
  project=loadedProject; definition=normalizeDefinition(project); title.textContent=`${project.name||'Untitled App'} Builder`; currentPageId=Object.keys(definition.pages)[0]||'home'; components=normalizeComponents(definition.pages[currentPageId]?.components||[]); pageStatus.textContent=definition.pages[currentPageId]?.name||'Home'; renderPages(); renderCanvas(); renderInspector(); showStatus(`Definition v${definition.schemaVersion} loaded`); isReady=true;
}

buttons.forEach((button)=>button.addEventListener('click',()=>{if(!isReady)return;components.push(makeComponent(button.dataset.component));selectedIndex=components.length-1;renderCanvas();renderInspector();showStatus(`${button.dataset.component} added to ${currentPage().name}`);}));
addPageButton.addEventListener('click',()=>{pageNameInput.value='';pageDialogMessage.textContent='';pageDialog.hidden=false;setTimeout(()=>pageNameInput.focus(),0);});
cancelPageButton.addEventListener('click',()=>{pageDialog.hidden=true;});
confirmPageButton.addEventListener('click',addPage);
pageNameInput.addEventListener('keydown',(event)=>{if(event.key==='Enter')addPage();if(event.key==='Escape')pageDialog.hidden=true;});

deviceButtons.forEach((button)=>button.addEventListener('click',()=>{deviceButtons.forEach((b)=>b.classList.toggle('active',b===button));canvas.classList.toggle('canvas-mobile',button.dataset.device==='mobile');canvas.classList.toggle('canvas-desktop',button.dataset.device!=='mobile');}));

saveButton.addEventListener('click',async()=>{
  if(!isReady||!projectId||!currentUser)return; saveButton.disabled=true; showStatus('Saving definition...');
  try{
    if(currentPage()) currentPage().components=normalizeComponents(components);
    const synced=syncLegacyFields(definition);
    const {data:savedProject,error:saveError}=await supabase.from('projects').update({pages:synced.pages,app_definition:synced.appDefinition,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',currentUser.id).select('id,user_id,pages,app_definition,updated_at').maybeSingle();
    if(saveError)throw saveError; if(!savedProject)throw new Error('No project was updated. Check the project owner and RLS policy.');
    definition=normalizeDefinition(savedProject); showStatus(`Saved App Definition v${definition.schemaVersion} • ${Object.keys(definition.pages).length} page${Object.keys(definition.pages).length===1?'':'s'}`);
    window.setTimeout(()=>window.location.replace('dashboard/index.html'),700);
  }catch(error){console.error(error);showStatus(`Save failed: ${error.code||error.message||'error'}`);saveButton.disabled=false;}
});

previewButton.addEventListener('click',()=>{if(currentPage())currentPage().components=normalizeComponents(components);window.location.href=`preview.html?projectId=${encodeURIComponent(projectId||'')}&page=${encodeURIComponent(currentPageId)}`;});

loadProject().catch((error)=>{console.error(error);showStatus(`Load failed: ${error.code||error.message||'error'}`);buttons.forEach((button)=>button.disabled=true);addPageButton.disabled=true;saveButton.disabled=true;});