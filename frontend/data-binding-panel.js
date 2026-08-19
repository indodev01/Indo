import DataBinding from './data-binding.js';

export async function renderDataBindingPanel(container, selectedComponent, onChange = () => {}) {
  if (!container) return;
  container.innerHTML = '<div class="binding-panel"><h3>Data</h3><p class="helper">Connect this component to an app table.</p><label>Table<select class="binding-table"><option value="">Choose a table…</option></select></label><button class="primary binding-refresh" type="button">Refresh</button></div>';
  const select = container.querySelector('.binding-table');
  try {
    const tables = await DataBinding.tables();
    tables.forEach(table => {
      const option = document.createElement('option'); option.value = table.id; option.textContent = table.name; select.appendChild(option);
    });
    select.value = selectedComponent?.dataBinding?.tableId || '';
  } catch (error) {
    const p = document.createElement('p'); p.className='helper'; p.textContent='Unable to load tables.'; container.querySelector('.binding-panel').appendChild(p);
  }
  select.addEventListener('change', () => {
    const binding = select.value ? { tableId: select.value, mode:'list' } : null;
    onChange(binding);
  });
}
