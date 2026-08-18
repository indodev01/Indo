import { supabase } from './auth/supabase-config.js';
import { makeEmptyDefinition, normalizeComponents, normalizeDefinition, syncLegacyFields } from './app-definition.js';

const $ = (id) => document.getElementById(id);
const title = $('builderTitle');
const status = $('projectStatus');
const pageStatus = $('pageStatus');
const canvas = $('canvas');
const emptyState = $('emptyState');
const saveButton = $('saveButton');
const previewButton = $('previewButton');
const inspector = $('inspectorContent');
const selectionLabel = $('selectionLabel');
const pageList = $('pageList');
const componentList = $('componentList');
const projectId = new URLSearchParams(window.location.search).get('projectId');

let currentUser = null;
let project = null;
let definition = makeEmptyDefinition();
let currentPageId = 'home';
let components = [];
let selectedIndex = -1;
let dragIndex = -1;
let isReady = false;

const TYPES = [
  'Heading','Text','Button','Image','Video','Input','Card','Container','Icon','List','Menu','Divider','Spacer',
  'Navbar','Footer','Form','Checkbox','Radio','Select','Tabs','Accordion','Modal','Table','Search','Avatar','Badge',
  'Progress','Slider','Date Picker','Map','YouTube','Audio Player','Gallery','Carousel','Login','Signup','Pricing',
  'Testimonials','Social Links'
];

const ICONS = ['H','T','↗','▧','▶','▱','▣','□','✦','☷','☰','━','↕','⌂','▰','▤','☑','◉','▾','▤','⌄','▣','▦','⌕','●','◆','▰','◒','▤','⌁','▶','♫','▧','◀','⇥','⇥','$','❝','◎'];

const DEFAULTS = {
  Heading: { text: 'Your Heading', size: 28, weight: '700', color: '#f7f8ff', align: 'left' },
  Text: { text: 'Add your text here.', size: 15, color: '#a8b2c5' },
  Button: { label: 'Get Started', link: '', background: '#7c3aed', color: '#ffffff', radius: 10 },
  Image: { url: '', alt: 'Image', radius: 10 },
  Video: { url: '', title: 'Video Player', controls: true, autoplay: false },
  Input: { label: 'Your Name', placeholder: 'Enter your name', name: 'name', inputType: 'text', required: false },
  Card: { title: 'Card Title', text: 'Card content', background: '#111827', radius: 14 },
  Container: { direction: 'column', gap: 12, background: '#0f172a', padding: 16, radius: 12 },
  Icon: { name: '★', size: 28, color: '#a855f7' },
  List: { title: 'List', items: ['Item one', 'Item two', 'Item three'], bullet: true },
  Menu: { items: ['Home', 'About', 'Contact'], direction: 'row', gap: 18 },
  Divider: { color: '#293346', thickness: 1 },
  Spacer: { height: 24 },
  Navbar: { brand: 'My App', items: ['Home', 'About', 'Contact'] },
  Footer: { text: '© 2026 My App', links: ['Privacy', 'Terms'] },
  Form: { title: 'Contact us', submit: 'Submit', fields: ['Name', 'Email', 'Message'] },
  Checkbox: { label: 'I agree', checked: false },
  Radio: { label: 'Option A', name: 'choice', value: 'a' },
  Select: { label: 'Choose one', options: ['Option 1', 'Option 2', 'Option 3'] },
  Tabs: { tabs: ['Overview', 'Features', 'Pricing'], active: 0 },
  Accordion: { items: [['Question 1', 'Answer 1'], ['Question 2', 'Answer 2']] },
  Modal: { title: 'Modal title', text: 'Modal content', button: 'Open Modal' },
  Table: { headers: ['Name', 'Status'], rows: [['Example', 'Active'], ['Demo', 'Pending']] },
  Search: { placeholder: 'Search...', value: '' },
  Avatar: { url: '', name: 'User' },
  Badge: { text: 'New', background: '#7c3aed', color: '#fff' },
  Progress: { value: 65, max: 100 },
  Slider: { value: 50, min: 0, max: 100, step: 1 },
  'Date Picker': { label: 'Select date', value: '' },
  Map: { address: 'Bengaluru, India', lat: 12.9716, lng: 77.5946 },
  YouTube: { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'YouTube video' },
  'Audio Player': { url: '', title: 'Audio' },
  Gallery: { images: [], columns: 3 },
  Carousel: { items: ['Slide 1', 'Slide 2', 'Slide 3'], active: 0 },
  Login: { title: 'Welcome back', button: 'Sign in' },
  Signup: { title: 'Create account', button: 'Create account' },
  Pricing: { title: 'Pro', price: '₹999', period: '/month', features: ['Feature one', 'Feature two', 'Feature three'], button: 'Choose plan' },
  Testimonials: { quote: 'Great product!', author: 'Happy customer' },
  'Social Links': { links: ['Instagram', 'YouTube', 'X', 'LinkedIn'] }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeComponent(type) {
  const slug = type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'component';
  return { id: `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, props: clone(DEFAULTS[type] || {}) };
}

function showStatus(message) {
  if (status) status.textContent = message;
}

function currentPage() {
  return definition.pages[currentPageId] || null;
}

function setupComponents() {
  if (!componentList) return;
  componentList.innerHTML = '';
  TYPES.forEach((type, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'component-button';
    button.dataset.component = type;
    const icon = document.createElement('span');
    icon.textContent = ICONS[index] || '•';
    button.append(icon, document.createTextNode(type));
    button.addEventListener('click', () => addComponent(type));
    componentList.appendChild(button);
  });
}

function renderPages() {
  pageList.innerHTML = '';
  Object.entries(definition.pages).forEach(([id, page]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `page-button${id === currentPageId ? ' active' : ''}`;
    button.textContent = page.name;
    button.addEventListener('click', () => switchPage(id));
    pageList.appendChild(button);
  });
}

function switchPage(id) {
  if (!definition.pages[id]) return;
  if (currentPage()) currentPage().components = normalizeComponents(components);
  currentPageId = id;
  components = normalizeComponents(definition.pages[id].components || []);
  selectedIndex = -1;
  pageStatus.textContent = definition.pages[id].name;
  renderPages();
  renderCanvas();
  renderInspector();
  showStatus(`Editing ${definition.pages[id].name}`);
}

function addPage() {
  const input = $('pageNameInput');
  const name = input.value.trim();
  if (!name) {
    $('pageDialogMessage').textContent = 'Enter a page name.';
    return;
  }
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'page';
  let id = base;
  let n = 2;
  while (definition.pages[id]) id = `${base}-${n++}`;
  if (currentPage()) currentPage().components = normalizeComponents(components);
  definition.pages[id] = {
    id,
    name,
    slug: id,
    components: [],
    styles: { background: '#ffffff', padding: '16px' },
    settings: { title: name }
  };
  $('pageDialog').hidden = true;
  switchPage(id);
}

function addComponent(type) {
  if (!isReady) return;
  components.push(makeComponent(type));
  selectedIndex = components.length - 1;
  renderCanvas();
  renderInspector();
  showStatus(`${type} added`);
}

function style(element, styles) {
  Object.assign(element.style, styles);
}

function addText(parent, value) {
  const node = document.createElement('span');
  node.textContent = value ?? '';
  parent.appendChild(node);
  return node;
}

function renderComponent(item, component) {
  const p = component.props || {};
  let el = null;

  const mark = document.createElement('span');
  mark.className = 'component-type';
  mark.textContent = component.type;
  item.appendChild(mark);

  if (component.type === 'Heading') {
    el = document.createElement('h3');
    el.textContent = p.text || 'Your Heading';
    style(el, { margin: '0', fontSize: `${Number(p.size) || 28}px`, fontWeight: p.weight || '700', color: p.color || '#fff', textAlign: p.align || 'left' });
    item.appendChild(el);
  } else if (component.type === 'Text') {
    el = document.createElement('p');
    el.textContent = p.text || 'Add your text here.';
    style(el, { margin: '0', fontSize: `${Number(p.size) || 15}px`, color: p.color || '#a8b2c5', lineHeight: '1.6' });
    item.appendChild(el);
  } else if (component.type === 'Button') {
    el = document.createElement('button');
    el.type = 'button';
    el.textContent = p.label || 'Get Started';
    style(el, { padding: '10px 14px', border: '0', borderRadius: `${Number(p.radius) || 10}px`, background: p.background || '#7c3aed', color: p.color || '#fff', fontWeight: '800', cursor: 'pointer' });
    if (p.link) el.addEventListener('click', () => { window.open(p.link, '_blank', 'noopener'); });
    item.appendChild(el);
  } else if (component.type === 'Image') {
    if (p.url) {
      el = document.createElement('img');
      el.src = p.url;
      el.alt = p.alt || 'Image';
      style(el, { maxWidth: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: `${Number(p.radius) || 10}px` });
    } else {
      el = document.createElement('div');
      el.textContent = 'Image URL not set';
      style(el, { padding: '30px', border: '1px dashed #334155', color: '#7c8799', textAlign: 'center' });
    }
    item.appendChild(el);
  } else if (component.type === 'Video') {
    if (p.url) {
      el = document.createElement('video');
      el.controls = p.controls !== false;
      el.autoplay = Boolean(p.autoplay);
      el.src = p.url;
      style(el, { width: '100%', maxHeight: '320px', borderRadius: '10px', background: '#000' });
    } else {
      el = document.createElement('div');
      el.textContent = 'Video URL not set';
      style(el, { minHeight: '180px', display: 'grid', placeItems: 'center', background: '#05070d', color: '#7c8799' });
    }
    item.appendChild(el);
  } else if (component.type === 'YouTube') {
    el = document.createElement('iframe');
    el.src = p.url || '';
    el.title = p.title || 'YouTube video';
    el.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    el.allowFullscreen = true;
    style(el, { width: '100%', minHeight: '220px', border: '0', borderRadius: '10px', background: '#000' });
    item.appendChild(el);
  } else if (component.type === 'Input') {
    const label = document.createElement('label');
    label.textContent = p.label || 'Input';
    style(label, { display: 'block', color: '#cbd5e1', fontWeight: '700' });
    const input = document.createElement('input');
    input.type = p.inputType || 'text';
    input.placeholder = p.placeholder || '';
    input.disabled = true;
    style(input, { width: '100%', padding: '11px', marginTop: '7px', border: '1px solid #334155', borderRadius: '9px', background: '#0b1220', color: '#fff' });
    item.append(label, input);
  } else if (component.type === 'Card') {
    el = document.createElement('div');
    style(el, { background: p.background || '#111827', border: '1px solid #293346', borderRadius: `${Number(p.radius) || 14}px`, padding: '16px' });
    const h = document.createElement('strong'); h.textContent = p.title || 'Card Title';
    const q = document.createElement('p'); q.textContent = p.text || 'Card content'; style(q, { color: '#9ca8bb', marginBottom: '0' });
    el.append(h, q); item.appendChild(el);
  } else if (component.type === 'Container') {
    el = document.createElement('div');
    addText(el, 'Container');
    style(el, { padding: `${Number(p.padding) || 16}px`, background: p.background || '#0f172a', border: '1px dashed #8b7cf6', borderRadius: `${Number(p.radius) || 12}px`, display: 'flex', flexDirection: p.direction === 'row' ? 'row' : 'column', gap: `${Number(p.gap) || 12}px`, color: '#94a3b8' });
    item.appendChild(el);
  } else if (component.type === 'Icon') {
    el = document.createElement('span');
    el.textContent = p.name || '★';
    style(el, { fontSize: `${Number(p.size) || 28}px`, color: p.color || '#a855f7' });
    item.appendChild(el);
  } else if (component.type === 'List') {
    const heading = document.createElement('strong'); heading.textContent = p.title || 'List';
    const list = document.createElement(p.bullet === false ? 'div' : 'ul');
    (p.items || []).forEach((value) => { const li = document.createElement(p.bullet === false ? 'div' : 'li'); li.textContent = value; list.appendChild(li); });
    item.append(heading, list);
  } else if (component.type === 'Menu' || component.type === 'Navbar' || component.type === 'Social Links') {
    el = document.createElement('nav');
    style(el, { display: 'flex', gap: `${Number(p.gap) || 18}px`, flexWrap: 'wrap', alignItems: 'center', padding: '10px 2px', borderBottom: '1px solid #293346' });
    if (component.type === 'Navbar') { const brand = document.createElement('strong'); brand.textContent = p.brand || 'My App'; el.appendChild(brand); }
    const items = p.items || p.links || [];
    items.forEach((value) => { const link = document.createElement('span'); link.textContent = value; style(link, { color: '#aeb8ca', fontWeight: '700' }); el.appendChild(link); });
    item.appendChild(el);
  } else if (component.type === 'Divider') {
    el = document.createElement('div'); style(el, { height: `${Math.max(1, Number(p.thickness) || 1)}px`, background: p.color || '#293346' }); item.appendChild(el);
  } else if (component.type === 'Spacer') {
    el = document.createElement('div'); style(el, { height: `${Math.max(4, Number(p.height) || 24)}px` }); item.appendChild(el);
  } else if (component.type === 'Footer') {
    el = document.createElement('footer');
    style(el, { padding: '18px', borderTop: '1px solid #293346', color: '#94a3b8' });
    addText(el, p.text || '© 2026 My App');
    item.appendChild(el);
  } else if (component.type === 'Form' || component.type === 'Login' || component.type === 'Signup') {
    el = document.createElement('form');
    el.addEventListener('submit', (event) => event.preventDefault());
    const h = document.createElement('h3'); h.textContent = p.title || 'Form'; el.appendChild(h);
    const fields = component.type === 'Signup' ? ['Name', 'Email', 'Password'] : component.type === 'Login' ? ['Email', 'Password'] : (p.fields || ['Name', 'Email', 'Message']);
    fields.forEach((fieldName) => { const input = document.createElement(fieldName === 'Message' ? 'textarea' : 'input'); input.placeholder = fieldName; style(input, { display: 'block', width: '100%', padding: '10px', margin: '7px 0', border: '1px solid #334155', borderRadius: '8px', background: '#0b1220', color: '#fff' }); el.appendChild(input); });
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = p.button || p.submit || 'Submit'; style(submit, { padding: '10px 14px', border: '0', borderRadius: '8px', background: '#7c3aed', color: '#fff', fontWeight: '800' }); el.appendChild(submit);
    item.appendChild(el);
  } else if (component.type === 'Checkbox' || component.type === 'Radio') {
    el = document.createElement('label');
    const input = document.createElement('input'); input.type = component.type === 'Checkbox' ? 'checkbox' : 'radio'; input.checked = Boolean(p.checked); if (component.type === 'Radio') { input.name = p.name || 'choice'; input.value = p.value || 'a'; }
    el.append(input, document.createTextNode(` ${p.label || 'Option'}`)); item.appendChild(el);
  } else if (component.type === 'Select') {
    const label = document.createElement('label'); label.textContent = p.label || 'Choose one'; style(label, { display: 'grid', gap: '6px' });
    const select = document.createElement('select'); (p.options || []).forEach((value) => { const option = document.createElement('option'); option.textContent = value; select.appendChild(option); }); style(select, { padding: '10px', background: '#0b1220', color: '#fff', border: '1px solid #334155', borderRadius: '8px' }); label.appendChild(select); item.appendChild(label);
  } else if (component.type === 'Tabs') {
    el = document.createElement('div'); const nav = document.createElement('div'); style(nav, { display: 'flex', gap: '6px', flexWrap: 'wrap' });
    (p.tabs || []).forEach((tab, index) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = tab; if (index === Number(p.active || 0)) button.classList.add('active'); button.addEventListener('click', () => { p.active = index; renderCanvas(); }); nav.appendChild(button); });
    const body = document.createElement('div'); body.textContent = `Tab ${(Number(p.active) || 0) + 1} content`; style(body, { padding: '12px', color: '#94a3b8' }); el.append(nav, body); item.appendChild(el);
  } else if (component.type === 'Accordion') {
    el = document.createElement('div'); (p.items || []).forEach((pair) => { const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = pair[0]; const answer = document.createElement('p'); answer.textContent = pair[1]; details.append(summary, answer); el.appendChild(details); }); item.appendChild(el);
  } else if (component.type === 'Modal') {
    el = document.createElement('button'); el.type = 'button'; el.textContent = p.button || 'Open Modal'; el.addEventListener('click', () => window.alert(`${p.title || 'Modal'}\n\n${p.text || ''}`)); item.appendChild(el);
  } else if (component.type === 'Table') {
    el = document.createElement('table'); el.border = '1'; style(el, { width: '100%', borderCollapse: 'collapse' });
    const head = document.createElement('tr'); (p.headers || []).forEach((value) => { const th = document.createElement('th'); th.textContent = value; head.appendChild(th); }); el.appendChild(head);
    (p.rows || []).forEach((row) => { const tr = document.createElement('tr'); row.forEach((value) => { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); }); el.appendChild(tr); });
    item.appendChild(el);
  } else if (component.type === 'Search') {
    el = document.createElement('input'); el.placeholder = p.placeholder || 'Search...'; el.value = p.value || ''; style(el, { width: '100%', padding: '10px', background: '#0b1220', color: '#fff', border: '1px solid #334155', borderRadius: '8px' }); el.addEventListener('input', (event) => { p.value = event.target.value; }); item.appendChild(el);
  } else if (component.type === 'Avatar') {
    el = p.url ? document.createElement('img') : document.createElement('div');
    if (p.url) el.src = p.url; else el.textContent = (p.name || 'U').slice(0, 1).toUpperCase();
    style(el, { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', display: 'grid', placeItems: 'center', background: '#1e293b', color: '#fff' }); item.appendChild(el);
  } else if (component.type === 'Badge') {
    el = document.createElement('span'); el.textContent = p.text || 'New'; style(el, { display: 'inline-block', padding: '5px 9px', borderRadius: '999px', background: p.background || '#7c3aed', color: p.color || '#fff', fontWeight: '800' }); item.appendChild(el);
  } else if (component.type === 'Progress') {
    el = document.createElement('progress'); el.value = Number(p.value) || 0; el.max = Number(p.max) || 100; style(el, { width: '100%' }); item.appendChild(el);
  } else if (component.type === 'Slider') {
    el = document.createElement('input'); el.type = 'range'; el.min = p.min ?? 0; el.max = p.max ?? 100; el.step = p.step ?? 1; el.value = p.value ?? 50; style(el, { width: '100%' }); item.appendChild(el);
  } else if (component.type === 'Date Picker') {
    const label = document.createElement('label'); label.textContent = p.label || 'Select date'; style(label, { display: 'grid', gap: '6px' }); const date = document.createElement('input'); date.type = 'date'; date.value = p.value || ''; label.appendChild(date); item.appendChild(label);
  } else if (component.type === 'Map') {
    el = document.createElement('div'); el.textContent = `📍 ${p.address || 'Map location'}`; style(el, { minHeight: '140px', display: 'grid', placeItems: 'center', background: '#162033', border: '1px solid #293346', borderRadius: '10px', color: '#cbd5e1' }); item.appendChild(el);
  } else if (component.type === 'Audio Player') {
    el = document.createElement('audio'); el.controls = true; if (p.url) el.src = p.url; style(el, { width: '100%' }); item.appendChild(el);
  } else if (component.type === 'Gallery') {
    el = document.createElement('div'); style(el, { display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Number(p.columns) || 3)},1fr)`, gap: '6px' });
    (p.images || []).forEach((src) => { const image = document.createElement('img'); image.src = src; style(image, { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px' }); el.appendChild(image); });
    if (!p.images?.length) addText(el, 'Add image URLs in Customize');
    item.appendChild(el);
  } else if (component.type === 'Carousel') {
    el = document.createElement('div'); style(el, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' });
    const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '‹';
    const label = document.createElement('strong'); label.textContent = (p.items || ['Slide 1'])[Number(p.active) || 0];
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '›';
    prev.onclick = () => { const len = (p.items || []).length || 1; p.active = ((Number(p.active) || 0) - 1 + len) % len; renderCanvas(); };
    next.onclick = () => { const len = (p.items || []).length || 1; p.active = ((Number(p.active) || 0) + 1) % len; renderCanvas(); };
    el.append(prev, label, next); item.appendChild(el);
  } else if (component.type === 'Pricing') {
    el = document.createElement('div'); style(el, { padding: '18px', border: '1px solid #293346', borderRadius: '14px', background: '#111827' });
    const heading = document.createElement('h3'); heading.textContent = p.title || 'Pro'; const price = document.createElement('strong'); price.textContent = `${p.price || '₹999'}${p.period || '/month'}`; const list = document.createElement('ul'); (p.features || []).forEach((f) => { const li = document.createElement('li'); li.textContent = f; list.appendChild(li); }); el.append(heading, price, list); item.appendChild(el);
  } else if (component.type === 'Testimonials') {
    el = document.createElement('blockquote'); el.textContent = `“${p.quote || 'Great product!'}” — ${p.author || 'Customer'}`; style(el, { margin: '0', color: '#cbd5e1' }); item.appendChild(el);
  }
}

function renderCanvas() {
  canvas.querySelectorAll('.canvas-item').forEach((node) => node.remove());
  emptyState.style.display = components.length ? 'none' : '';
  components.forEach((component, index) => {
    const item = document.createElement('div');
    item.className = 'canvas-item';
    item.draggable = true;
    if (index === selectedIndex) item.classList.add('selected');
    item.addEventListener('click', () => selectComponent(index));
    item.addEventListener('dragstart', () => { dragIndex = index; item.classList.add('dragging'); });
    item.addEventListener('dragend', () => { dragIndex = -1; item.classList.remove('dragging'); });
    item.addEventListener('dragover', (event) => event.preventDefault());
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      if (dragIndex < 0 || dragIndex === index) return;
      const [moved] = components.splice(dragIndex, 1);
      const target = dragIndex < index ? index - 1 : index;
      components.splice(target, 0, moved);
      selectedIndex = target;
      dragIndex = -1;
      renderCanvas();
      renderInspector();
    });
    renderComponent(item, component);
    canvas.appendChild(item);
  });
}

function field(label, value, handler, options = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'inspector-field';
  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  const input = document.createElement(options.textarea ? 'textarea' : 'input');
  if (options.type) input.type = options.type;
  input.value = value ?? '';
  if (options.placeholder) input.placeholder = options.placeholder;
  input.addEventListener('input', (event) => handler(event.target.value));
  wrap.append(labelEl, input);
  return wrap;
}

function setProp(key, value) {
  if (!components[selectedIndex]) return;
  components[selectedIndex].props = { ...components[selectedIndex].props, [key]: value };
  renderCanvas();
}

function parseArrayValue(value, key) {
  const lines = String(value).split('\n').map((line) => line.trim()).filter(Boolean);
  if (key === 'items' && lines.every((line) => line.includes(' | '))) return lines.map((line) => line.split(' | '));
  return lines;
}

function renderInspector() {
  inspector.innerHTML = '';
  if (selectedIndex < 0 || !components[selectedIndex]) {
    selectionLabel.textContent = 'Nothing selected';
    const p = document.createElement('p');
    p.className = 'inspector-empty';
    p.textContent = 'Select an element to configure it.';
    inspector.appendChild(p);
    return;
  }
  const component = components[selectedIndex];
  const props = component.props || {};
  selectionLabel.textContent = component.type;
  const helper = document.createElement('p');
  helper.className = 'helper';
  helper.textContent = 'Changes update the live canvas. Save when you are ready.';
  inspector.appendChild(helper);

  Object.entries(props).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      const wrap = document.createElement('div');
      wrap.className = 'inspector-field';
      const label = document.createElement('label'); label.textContent = key;
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = value;
      checkbox.addEventListener('change', () => setProp(key, checkbox.checked));
      wrap.append(label, checkbox);
      inspector.appendChild(wrap);
    } else if (Array.isArray(value)) {
      const serial = value.map((item) => Array.isArray(item) ? item.join(' | ') : item).join('\n');
      inspector.appendChild(field(key, serial, (newValue) => setProp(key, parseArrayValue(newValue, key)), { textarea: true }));
    } else if (typeof value === 'number') {
      inspector.appendChild(field(key, value, (newValue) => setProp(key, Number(newValue) || 0), { type: 'number' }));
    } else {
      inspector.appendChild(field(key, value, (newValue) => setProp(key, newValue), { type: 'text' }));
    }
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger';
  deleteButton.textContent = 'Delete Component';
  deleteButton.addEventListener('click', () => {
    components.splice(selectedIndex, 1);
    selectedIndex = -1;
    renderCanvas();
    renderInspector();
    showStatus('Component removed');
  });
  inspector.appendChild(deleteButton);
}

function selectComponent(index) {
  selectedIndex = index;
  renderCanvas();
  renderInspector();
}

async function loadProject() {
  if (!projectId) throw new Error('Missing project');
  const auth = await supabase.auth.getUser();
  if (auth.error) throw auth.error;
  currentUser = auth.data.user;
  if (!currentUser) {
    window.location.replace('auth/sign-in.html');
    return;
  }
  const result = await supabase.from('projects')
    .select('id,user_id,name,description,app_definition,pages,updated_at')
    .eq('id', projectId)
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Project not found or access denied');

  project = result.data;
  definition = normalizeDefinition(project);
  title.textContent = `${project.name || 'Untitled App'} Builder`;
  currentPageId = Object.keys(definition.pages)[0] || 'home';
  components = normalizeComponents(definition.pages[currentPageId]?.components || []);
  pageStatus.textContent = definition.pages[currentPageId]?.name || 'Home';
  renderPages();
  renderCanvas();
  renderInspector();
  showStatus('Definition loaded');
  isReady = true;
}

setupComponents();

$('addPageButton').addEventListener('click', () => {
  $('pageNameInput').value = '';
  $('pageDialogMessage').textContent = '';
  $('pageDialog').hidden = false;
  $('pageNameInput').focus();
});
$('cancelPageButton').addEventListener('click', () => { $('pageDialog').hidden = true; });
$('confirmPageButton').addEventListener('click', addPage);
$('pageNameInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') addPage();
  if (event.key === 'Escape') $('pageDialog').hidden = true;
});

document.querySelectorAll('.device-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.device-button').forEach((node) => node.classList.toggle('active', node === button));
    canvas.classList.toggle('canvas-mobile', button.dataset.device === 'mobile');
    canvas.classList.toggle('canvas-desktop', button.dataset.device !== 'mobile');
  });
});

saveButton.addEventListener('click', async () => {
  if (!isReady || !projectId || !currentUser) return;
  if (currentPage()) currentPage().components = normalizeComponents(components);
  saveButton.disabled = true;
  showStatus('Saving...');
  try {
    const synced = syncLegacyFields(definition);
    const saved = await supabase.from('projects')
      .update({ pages: synced.pages, app_definition: synced.appDefinition, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', currentUser.id)
      .select('id,pages,app_definition,updated_at')
      .maybeSingle();
    if (saved.error) throw saved.error;
    if (!saved.data) throw new Error('No project updated');
    definition = normalizeDefinition({ ...project, ...saved.data });
    project = { ...project, ...saved.data };
    showStatus('Saved successfully');
  } catch (error) {
    console.error(error);
    showStatus(`Save failed: ${error.message || 'error'}`);
  } finally {
    saveButton.disabled = false;
  }
});

previewButton.addEventListener('click', () => {
  if (currentPage()) currentPage().components = normalizeComponents(components);
  window.location.href = `preview.html?projectId=${encodeURIComponent(projectId || '')}&page=${encodeURIComponent(currentPageId)}`;
});

loadProject().catch((error) => {
  console.error(error);
  showStatus(`Load failed: ${error.message || 'error'}`);
});
