import { supabase } from './auth/supabase-config.js';
import { simulateWorkflow } from './workflow-runtime.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const list = document.getElementById('workflowList');
const message = document.getElementById('message');

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
}

async function loadProject() {
  if (!projectId) return null;
  const { data } = await supabase.from('projects').select('id,app_definition').eq('id', projectId).maybeSingle();
  return data || null;
}

function addPanel(card, workflow) {
  const panel = document.createElement('div');
  panel.className = 'workflow-test-panel';
  panel.innerHTML = '<div class="test-controls"><label>Sample form JSON<textarea class="test-form" rows="3">{}</textarea></label><label>Sample event JSON<textarea class="test-event" rows="3">{}</textarea></label><button type="button" class="secondary test-run">Test Workflow</button></div><pre class="test-result" aria-live="polite"></pre>';
  const result = panel.querySelector('.test-result');
  panel.querySelector('.test-run').onclick = () => {
    let formData = {}, event = {};
    try { formData = JSON.parse(panel.querySelector('.test-form').value || '{}'); } catch { result.textContent = 'Invalid form JSON'; return; }
    try { event = JSON.parse(panel.querySelector('.test-event').value || '{}'); } catch { result.textContent = 'Invalid event JSON'; return; }
    const output = simulateWorkflow(workflow, { formData, event, pageId: 'home' });
    result.textContent = JSON.stringify(output, null, 2);
  };
  card.appendChild(panel);
}

async function init() {
  const project = await loadProject();
  if (!project || !list) return;
  const workflows = Array.isArray(project.app_definition?.workflows) ? project.app_definition.workflows : [];
  const cards = [...list.querySelectorAll('.workflow-card')];
  workflows.forEach((workflow, index) => {
    const card = cards[index];
    if (card) addPanel(card, workflow);
  });
}

setTimeout(init, 300);
