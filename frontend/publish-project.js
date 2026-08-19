import { supabase } from './auth/supabase-config.js';

const publishButton = document.getElementById('publishButton');
const saveButton = document.getElementById('saveButton');
const status = document.getElementById('projectStatus');
const projectId = new URLSearchParams(window.location.search).get('projectId');

function setStatus(text) {
  if (status) status.textContent = text;
}

async function publishProject() {
  if (!projectId) return;
  publishButton.disabled = true;
  setStatus('Saving changes...');

  try {
    const before = await supabase.from('projects').select('updated_at').eq('id', projectId).maybeSingle();
    const beforeUpdated = before.data?.updated_at || '';

    saveButton?.click();

    let saved = false;
    for (let i = 0; i < 12; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const check = await supabase.from('projects').select('updated_at').eq('id', projectId).maybeSingle();
      if (check.error) throw check.error;
      if (check.data?.updated_at && check.data.updated_at !== beforeUpdated) {
        saved = true;
        break;
      }
    }

    if (!saved && beforeUpdated) {
      throw new Error('Could not confirm the latest changes were saved. Please click Save and try Publish again.');
    }

    setStatus('Publishing...');
    const { error } = await supabase.from('projects').update({
      status: 'published',
      updated_at: new Date().toISOString()
    }).eq('id', projectId);
    if (error) throw error;

    setStatus('Published');
    window.setTimeout(() => {
      const previewUrl = new URL('preview.html', window.location.href);
      previewUrl.searchParams.set('projectId', projectId);
      previewUrl.searchParams.set('page', 'home');
      window.location.assign(previewUrl.href);
    }, 300);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Publish failed');
    publishButton.disabled = false;
  }
}

publishButton?.addEventListener('click', publishProject);
