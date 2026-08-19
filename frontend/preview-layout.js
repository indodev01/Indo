import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const canvas = document.getElementById('previewCanvas');
const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');
const pageValue = params.get('page') || 'home';

function injectStyle() {
  if (document.getElementById('previewLayoutStyle')) return;
  const style = document.createElement('style');
  style.id = 'previewLayoutStyle';
  style.textContent = '.preview-canvas.preview-freeform{position:relative!important;overflow:auto}.preview-canvas.preview-freeform>.preview-item{position:absolute!important;box-sizing:border-box;margin:0!important}.preview-freeform .preview-item>*{max-width:100%}';
  document.head.appendChild(style);
}
function resolvePage(definition) {
  if (definition?.pages?.[pageValue]) return definition.pages[pageValue];
  const wanted = String(pageValue).toLowerCase();
  return Object.values(definition?.pages || {}).find((page) => String(page.name || '').toLowerCase() === wanted) || null;
}
async function apply() {
  if (!canvas || !projectId) return;
  injectStyle();
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages').eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle();
  if (result.error || !result.data) return;
  const definition = normalizeDefinition(result.data);
  const page = resolvePage(definition);
  const components = page?.components || [];
  const rendered = Array.from(canvas.children);
  let hasLayout = false;
  let maxBottom = canvas.clientHeight;
  rendered.forEach((node, index) => {
    const component = components[index];
    const position = component?.props?.position;
    if (!position) return;
    hasLayout = true;
    const x = Number(position.x) || 0;
    const y = Number(position.y) || 0;
    const width = Number(position.width) || 0;
    const height = Number(position.height) || 0;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    if (width > 0) node.style.width = `${width}px`;
    if (height > 0) node.style.height = `${height}px`;
    maxBottom = Math.max(maxBottom, y + height + 80);
  });
  if (hasLayout) {
    canvas.classList.add('preview-freeform');
    canvas.style.minHeight = `${Math.max(690, maxBottom)}px`;
  }
}

setTimeout(() => apply().catch(() => {}), 450);
