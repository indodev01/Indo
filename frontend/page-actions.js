import { supabase } from './auth/supabase-config.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const pageList = document.getElementById('pageList');
const pageStatus = document.getElementById('pageStatus');

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

async function loadProject() {
  if (!projectId) throw new Error('Missing project id');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Please sign in again');
  const { data, error } = await supabase.from('projects').select('id,user_id,name,pages,app_definition').eq('id', projectId).eq('user_id', userData.user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project not found');
  const definition = clone(data.app_definition || { pages: data.pages || {} });
  definition.pages = definition.pages || data.pages || {};
  return { project: data, definition };
}

async function saveDefinition(definition) {
  const { error } = await supabase.from('projects').update({ pages: definition.pages || {}, app_definition: definition, updated_at: new Date().toISOString() }).eq('id', projectId);
  if (error) throw error;
}

function currentPageId(definition) {
  const wanted = String(pageStatus?.textContent || '').trim().toLowerCase();
  return Object.entries(definition.pages).find(([id, page]) => id.toLowerCase() === wanted || String(page.name || '').toLowerCase() === wanted)?.[0] || Object.keys(definition.pages)[0];
}

async function duplicatePage() {
  try {
    const { definition } = await loadProject();
    const sourceId = currentPageId(definition);
    const source = definition.pages[sourceId];
    if (!source) return;
    const baseName = `${source.name || 'Page'} Copy`;
    let name = baseName, base = slugify(name), id = base, n = 2;
    while (definition.pages[id]) { id = `${base}-${n++}`; name = `${baseName} ${n - 1}`; }
    const page = clone(source);
    page.id = id; page.name = name; page.slug = id;
    definition.pages[id] = page;
    Object.values(definition.pages).forEach((p) => (p.components || []).forEach((component) => {
      if (component.type === 'Header' && Array.isArray(component.props?.items) && !component.props.items.includes(id)) component.props.items.push(id);
    }));
    await saveDefinition(definition);
    location.reload();
  } catch (error) { console.error(error); window.alert(`Could not duplicate page: ${error.message || 'Please try again.'}`); }
}

async function deleteCurrentPage() {
  try {
    const { definition } = await loadProject();
    const ids = Object.keys(definition.pages);
    if (ids.length <= 1) { window.alert('Your app needs at least one page.'); return; }
    const id = currentPageId(definition);
    const page = definition.pages[id];
    if (!page) return;
    if (!window.confirm(`Delete “${page.name || id}”? This cannot be undone.`)) return;
    delete definition.pages[id];
    Object.values(definition.pages).forEach((p) => (p.components || []).forEach((component) => {
      if (component.type === 'Header' && Array.isArray(component.props?.items)) component.props.items = component.props.items.filter((item) => item !== id);
    }));
    await saveDefinition(definition);
    location.reload();
  } catch (error) { console.error(error); window.alert(`Could not delete page: ${error.message || 'Please try again.'}`); }
}

function addPageActions() {
  if (!pageList) return;
  const buttons = [...pageList.querySelectorAll('.page-button')];
  if (!buttons.length) return;
  buttons.forEach((button) => {
    if (button.dataset.pageActionsReady) return;
    button.dataset.pageActionsReady = '1';
    button.title = `${button.textContent} • Double-click to rename • Shift-click to duplicate • Alt-click to delete`;
    button.addEventListener('click', (event) => {
      if (event.shiftKey) { event.preventDefault(); event.stopImmediatePropagation(); duplicatePage(); }
      else if (event.altKey) { event.preventDefault(); event.stopImmediatePropagation(); deleteCurrentPage(); }
    }, true);
  });
}

new MutationObserver(addPageActions).observe(pageList, { childList: true });
addPageActions();

window.addEventListener('keydown', (event) => {
  if (!event.altKey || event.key !== 'Backspace') return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  event.preventDefault(); deleteCurrentPage();
});
