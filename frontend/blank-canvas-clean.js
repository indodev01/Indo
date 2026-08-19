import { supabase } from './auth/supabase-config.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');
const canvas = document.getElementById('canvas');
const emptyState = document.getElementById('emptyState');

function isEmptyLegacyVideo(component) {
  if (!component || !['Video', 'Videos'].includes(component.type)) return false;
  const p = component.props || {};
  const url = String(p.url || p.src || '').trim();
  const title = String(p.title || '').trim().toLowerCase();
  return !url && (!title || title === 'featured video' || title === 'video');
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
  if (!canvas?.querySelector('.canvas-item')) {
    emptyState.style.display = 'none';
    emptyState.innerHTML = '';
  }
}

async function cleanStoredLegacyContent() {
  if (!projectId) return;
  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data?.user;
    if (!user) return;

    const result = await supabase
      .from('projects')
      .select('id,user_id,start_mode,app_definition,pages')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (result.error || !result.data) return;
    const project = result.data;
    if (String(project.start_mode || '').toLowerCase() !== 'blank') return;

    const pages = structuredClone(project.pages || project.app_definition?.pages || {});
    let changed = false;

    for (const page of Object.values(pages)) {
      if (!Array.isArray(page?.components)) continue;
      const filtered = page.components.filter((component) => !isEmptyLegacyVideo(component));
      if (filtered.length !== page.components.length) {
        page.components = filtered;
        changed = true;
      }
    }

    if (!changed) return;

    const appDefinition = {
      ...(project.app_definition && typeof project.app_definition === 'object' ? project.app_definition : {}),
      pages
    };

    const save = await supabase
      .from('projects')
      .update({ pages, app_definition: appDefinition, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (!save.error) window.location.reload();
  } catch (error) {
    console.warn('Blank canvas cleanup skipped:', error);
  }
}

enforceEmptyCanvas();
new MutationObserver(() => window.requestAnimationFrame(enforceEmptyCanvas))
  .observe(canvas || document.body, { childList: true, subtree: true });

cleanStoredLegacyContent();
