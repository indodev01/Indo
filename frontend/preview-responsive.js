import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const canvas = document.getElementById('previewCanvas');
const params = new URLSearchParams(location.search);
const projectId = params.get('projectId');
const pageValue = params.get('page') || 'home';

function deviceForViewport() {
  if (window.innerWidth <= 767) return 'mobile';
  if (window.innerWidth <= 1023) return 'tablet';
  return 'desktop';
}

function resolvePage(definition) {
  if (definition?.pages?.[pageValue]) return definition.pages[pageValue];
  const wanted = String(pageValue).toLowerCase();
  return Object.entries(definition?.pages || {}).find(([id, page]) => id.toLowerCase() === wanted || String(page.name || '').toLowerCase() === wanted)?.[1] || null;
}

async function applyResponsive() {
  if (!canvas || !projectId) return;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages').eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle();
  if (result.error || !result.data) return;
  const definition = normalizeDefinition(result.data);
  const page = resolvePage(definition);
  if (!page) return;
  const device = deviceForViewport();
  const nodes = [...canvas.children];
  nodes.forEach((node, index) => {
    const component = page.components?.[index];
    if (!component) return;
    const bucket = component.props?.deviceStyles?.[device];
    if (!bucket) return;
    const pos = bucket.position;
    if (pos) {
      node.style.left = `${Number(pos.x) || 0}px`;
      node.style.top = `${Number(pos.y) || 0}px`;
      if (Number(pos.width) > 0) node.style.width = `${Number(pos.width)}px`;
      if (Number(pos.height) > 0) node.style.height = `${Number(pos.height)}px`;
    }
    if (component.type === 'Header') {
      const title = node.querySelector('.header-title-wrap');
      const menu = node.querySelector('.header-menu-toggle');
      if (title && bucket.titlePosition) title.style.transform = `translate(${Number(bucket.titlePosition.x) || 0}px,${Number(bucket.titlePosition.y) || 0}px)`;
      if (menu && bucket.menuPosition) menu.style.transform = `translate(${Number(bucket.menuPosition.x) || 0}px,${Number(bucket.menuPosition.y) || 0}px)`;
    }
  });
}

let timer = 0;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => applyResponsive().catch(() => {}), 120);
}

window.addEventListener('resize', schedule);
setTimeout(schedule, 650);
