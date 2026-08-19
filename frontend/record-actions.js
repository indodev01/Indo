import DataBinding from './data-binding.js';

export async function updateRecord(recordId, data) {
  if (!recordId) throw new Error('Missing record id');
  return DataBinding.update(recordId, data);
}

export async function deleteRecord(recordId, confirmMessage='Delete this record?') {
  if (!recordId) throw new Error('Missing record id');
  if (confirmMessage && !window.confirm(confirmMessage)) return false;
  await DataBinding.remove(recordId);
  return true;
}

export function attachRecordActions(card, record, { onEdit, onDelete } = {}) {
  if (!card || !record?.id) return;
  const actions=document.createElement('div');
  actions.className='indo-record-actions';
  actions.style.cssText='display:flex;gap:8px;margin-top:6px;';
  if(onEdit){const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.onclick=()=>onEdit(record);actions.appendChild(edit);}
  if(onDelete){const del=document.createElement('button');del.type='button';del.textContent='Delete';del.onclick=()=>onDelete(record);actions.appendChild(del);}
  card.appendChild(actions);
}

window.IndoRecordActions={updateRecord,deleteRecord,attachRecordActions};
