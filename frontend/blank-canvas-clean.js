import { supabase } from './auth/supabase-config.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');
const canvas = document.getElementById('canvas');
const emptyState = document.getElementById('emptyState');

function isCanvasVisuallyEmpty() {
  if (!canvas) return true;
  return !canvas.querySelector('.canvas-item');
}

function removeLegacyVisuals() {
  if (!canvas) return;
  canvas.querySelectorAll('input,button').forEach((el) => {
    const text = `${el.getAttribute('placeholder') || ''} ${el.textContent || ''}`.trim().toLowerCase();
    if (text.includes('search videos')) {
      el.closest('.canvas-item')?.remove();
      if (!el.closest('.canvas-item')) el.remove();
    }
  });
}

function enforceEmptyCanvas() {
  removeLegacyVisuals();
  if (!emptyState) return;
  if (isCanvasVisuallyEmpty()) {
    emptyState.style.display = 'none';
    emptyState.innerHTML = '';
  }
}

async function initializeBlankProject() {
  if (!projectId) return;
  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;
  if (!user) return;

  const result = await supabase.from('projects')
    .select('id,user_id,start_mode,app_definition,pages')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (result.error || !result.data) return;

  const project = result.data;
  if (String(project.start_mode || '').toLowerCase() !== 'blank') return;

  const appDefinition = project.app_definition && typeof project.app_definition === 'object'
    ? structuredClone(project.app_definition)
    : {};
  const settings = { ...(appDefinition.settings || {}) };
  const alreadyInitialized = settings.blankCanvasInitialized === true;

  if (!alreadyInitialized) {
    const pages = structuredClone(project.pages || appDefinition.pages || {});
    const homeId = pages.home ? 'home' : Object.keys(pages)[0] || 'home';
    if (!pages[homeId]) {
      pages[homeId] = {
        id: homeId,
        name: 'Home',
        slug: 'home',
        components: [],
        styles: { background: '#ffffff', padding: '16px' },
        settings: { title: 'Home' }
      };
    }
    pages[homeId].components = [];
    appDefinition.pages = pages;
    appDefinition.components = {};
    appDefinition.componentsList = [];
    appDefinition.settings = { ...settings, blankCanvasInitialized: true };

    const save = await supabase.from('projects').update({
      pages,
      app_definition: appDefinition,
      updated_at: new Date().toISOString()
    }).eq('id', projectId).eq('user_id', user.id);

    if (!save.error) {
      window.location.reload();
      return;
    }
  }

  enforceEmptyCanvas();
}

enforceEmptyCanvas();
new MutationObserver(() => window.requestAnimationFrame(enforceEmptyCanvas))
  .observe(canvas || document.body, { childList: true, subtree: true });

initializeBlankProject().catch((error) => console.error('Blank canvas initialization failed', error));
