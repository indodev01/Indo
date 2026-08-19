import DataBinding from './data-binding.js';

export async function renderListBindingPanel(container, component, onChange = () => {}) {
  if (!container || !component) return;
  const current = component.listBinding || {};
  container.innerHTML = '<div class="list-binding-panel"><h3>Dynamic Data</h3><p class="helper">Show records from an app table in this component.</p><label>Table<select class="list-table"><option value="">Choose a table…</option></select></label><div class="list-mappings"></div></div>';
  const tableSelect = container.querySelector('.list-table');
  const mappings = container.querySelector('.list-mappings');
  let tables = [];
  try { tables = await DataBinding.tables(); } catch { mappings.textContent = 'Unable to load app tables.'; return; }
  tables.forEach(table => { const o=document.createElement('option');o.value=table.id;o.textContent=table.name;o.selected=table.id===current.tableId;tableSelect.appendChild(o); });

  async function drawFields() {
    mappings.replaceChildren();
    const table = tables.find(t=>t.id===tableSelect.value);
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    if (!columns.length) { mappings.textContent='Add columns to this table in Data Manager first.'; return; }
    const labels=['Title','Description','Image','Link'];
    labels.forEach(label => {
      const row=document.createElement('div');row.className='list-map-row';
      const l=document.createElement('label');l.textContent=label;
      const select=document.createElement('select');
      const none=document.createElement('option');none.value='';none.textContent='— None —';select.appendChild(none);
      columns.forEach(column=>{const o=document.createElement('option');o.value=column.name||column.key;o.textContent=column.name||column.key;o.selected=current.fields?.[label.toLowerCase()]===o.value;select.appendChild(o);});
      select.addEventListener('change',()=>{const next={tableId:tableSelect.value,fields:{...(component.listBinding?.fields||{})},limit:Number(component.listBinding?.limit)||50};next.fields[label.toLowerCase()]=select.value;onChange(next);});
      row.append(l,select);mappings.appendChild(row);
    });
    const limit=document.createElement('input');limit.type='number';limit.min='1';limit.max='100';limit.value=current.limit||50;limit.placeholder='50';limit.addEventListener('change',()=>onChange({...component.listBinding,tableId:tableSelect.value,limit:Math.min(100,Math.max(1,Number(limit.value)||50))}));
    const limitWrap=document.createElement('div');limitWrap.className='list-limit';const ll=document.createElement('label');ll.textContent='Records';limitWrap.append(ll,limit);mappings.appendChild(limitWrap);
  }
  tableSelect.addEventListener('change',()=>{const next=tableSelect.value?{tableId:tableSelect.value,fields:{},limit:50}:null;onChange(next);Object.assign(component,{listBinding:next});drawFields();});
  await drawFields();
}
