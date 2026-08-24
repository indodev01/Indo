import { supabase } from './auth/supabase-config.js';
import { simulateWorkflow } from './workflow-runtime.js';
import { renderWorkflowTestResult } from './workflow-test-results.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const list = document.getElementById('workflowList');
const message = document.getElementById('message');

async function loadProject() {
  if (!projectId) return null;
  const { data } = await supabase.from('projects').select('id,app_definition').eq('id', projectId).maybeSingle();
  return data || null;
}

function addPanel(card, workflow) {
  if (card.querySelector('.workflow-test-panel')) return;
  const panel = document.createElement('div');
  panel.className = 'workflow-test-panel';
  panel.innerHTML = '<div class="test-controls"><label>Sample form JSON<textarea class="test-form" rows="3">{}</textarea></label><label>Sample event JSON<textarea class="test-event" rows="3">{}</textarea></label><button type="button" class="secondary test-run">Test Workflow</button></div><div class="test-result" aria-live="polite"></div>';
  const result = panel.querySelector('.test-result');
  panel.querySelector('.test-run').onclick = () => {
    let formData = {}, event = {};
    try { formData = JSON.parse(panel.querySelector('.test-form').value || '{}'); } catch { result.textContent = 'Invalid form JSON'; return; }
    try { event = JSON.parse(panel.querySelector('.test-event').value || '{}'); } catch { result.textContent = 'Invalid event JSON'; return; }
    const output = simulateWorkflow(workflow, { formData, event, pageId: 'home' });
    renderWorkflowTestResult(result, output);
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
  if (!workflows.length && message) message.textContent = 'Add a workflow to start testing.';
}

setTimeout(init, 300);
