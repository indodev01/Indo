import { supabase } from './auth/supabase-config.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');

function isEmptyLegacyVideo(component) {
  if (!component || component.type !== 'Video') return false;
  const p = component.props || {};
  const url = String(p.url || '').trim();
  const title = String(p.title || '').trim().toLowerCase();
  return !url && (!title || title === 'featured video');
}

async function cleanBlankProject() {
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

    await supabase
      .from('projects')
      .update({
        pages,
        app_definition: appDefinition,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('user_id', user.id);

    window.location.reload();
  } catch (error) {
    console.warn('Blank canvas cleanup skipped:', error);
  }
}

cleanBlankProject();
