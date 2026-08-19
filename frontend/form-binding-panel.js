import DataBinding from './data-binding.js';

export async function renderFormBindingPanel(container, component, onChange = () => {}) {
  if (!container || !component) return;
  const binding = component.formBinding || {};
  container.innerHTML = `<div class="form-binding-panel"><h3>Form Data</h3><p class="helper">Save submitted form fields into an app table.</p><label>Save to table<select class="form-table"><option value="">Choose a table…</option></select></label><div class="form-fields"></div></div>`;
  const tableSelect = container.querySelector('.form-table');
  const fieldsBox = container.querySelector('.form-fields');
  try {
    const tables = await DataBinding.tables();
    tables.forEach(table => {
      const option = document.createElement('option'); option.value = table.id; option.textContent = table.name; option.selected = table.id === binding.tableId; tableSelect.appendChild(option);
    });
  } catch {
    fieldsBox.textContent = 'Unable to load data tables.';
    return;
  }

  const renderFields = async () => {
    fieldsBox.replaceChildren();
    if (!tableSelect.value) return;
    const tables = await DataBinding.tables();
    const table = tables.find(item => item.id === tableSelect.value);
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    if (!columns.length) { fieldsBox.textContent = 'Add columns to this table in Data Manager first.'; return; }
    const formFields = Array.isArray(component.props?.fields) ? component.props.fields : [];
    columns.forEach(column => {
      const row = document.createElement('div'); row.className='form-binding-row';
      const label = document.createElement('span'); label.textContent = column.name || column.key || 'field';
      const select = document.createElement('select');
      const none = document.createElement('option'); none.value=''; none.textContent='— Not mapped —'; select.appendChild(none);
      formFields.forEach(field => { const option=document.createElement('option'); option.value=field; option.textContent=field; option.selected=binding.fieldMap?.[field]===column.name; select.appendChild(option); });
      select.addEventListener('change',()=>{ const next={...(component.formBinding||{}),tableId:tableSelect.value,fieldMap:{...(component.formBinding?.fieldMap||{})}}; Object.keys(next.fieldMap).forEach(key=>{if(next.fieldMap[key]===column.name)delete next.fieldMap[key];}); if(select.value)next.fieldMap[select.value]=column.name; onChange(next); });
      row.append(label,select); fieldsBox.appendChild(row);
    });
  };
  tableSelect.addEventListener('change',()=>{ const next=tableSelect.value?{tableId:tableSelect.value,fieldMap:{}}:null; onChange(next); renderFields(); });
  await renderFields();
}
