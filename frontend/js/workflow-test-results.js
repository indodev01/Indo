export function renderWorkflowTestResult(container, result) {
  if (!container) return;
  container.replaceChildren();
  const summary = document.createElement('div');
  summary.className = 'workflow-test-summary';
  summary.innerHTML = `<strong>${result?.matched ? '✓ Workflow matched' : '✗ Workflow did not match'}</strong>`;
  container.appendChild(summary);

  const conditions = Array.isArray(result?.conditions) ? result.conditions : [];
  if (conditions.length) {
    const section = document.createElement('section');
    section.innerHTML = '<h4>Conditions</h4>';
    const list = document.createElement('div');
    list.className = 'workflow-test-list';
    conditions.forEach((condition, index) => {
      const row = document.createElement('div');
      row.className = `workflow-test-row ${result?.matched ? 'pass' : 'fail'}`;
      row.textContent = `${result?.matched ? '✓' : '✗'} Condition ${index + 1}: ${condition?.operator || 'equals'} ${condition?.field || condition?.value || ''}`;
      list.appendChild(row);
    });
    section.appendChild(list);
    container.appendChild(section);
  }

  const actions = Array.isArray(result?.actions) ? result.actions : [];
  const actionSection = document.createElement('section');
  actionSection.innerHTML = '<h4>Actions</h4>';
  const actionList = document.createElement('div');
  actionList.className = 'workflow-test-list';
  actions.forEach(action => {
    const row = document.createElement('div');
    const blocked = result?.blockedSideEffects?.includes(action.index);
    row.className = `workflow-test-row ${blocked ? 'blocked' : 'pass'}`;
    row.textContent = `${blocked ? '⏸' : '✓'} ${action.summary || action.type || 'Action'}`;
    if (blocked) row.title = 'Dry-run: side effect blocked';
    actionList.appendChild(row);
  });
  if (!actions.length) {
    const empty = document.createElement('div');
    empty.className = 'workflow-test-empty';
    empty.textContent = 'No actions configured.';
    actionList.appendChild(empty);
  }
  actionSection.appendChild(actionList);
  container.appendChild(actionSection);
}
