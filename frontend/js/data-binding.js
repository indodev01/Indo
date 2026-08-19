import { supabase } from './auth/supabase-config.js';

const params = new URLSearchParams(location.search);
const projectId = params.get('projectId');

const IndoDataBinding = {
  async tables() {
    if (!projectId) return [];
    const { data, error } = await supabase.from('app_data_tables').select('id,name,columns').eq('project_id', projectId).order('created_at');
    if (error) throw error;
    return data || [];
  },
  async records(tableId, limit = 100) {
    const { data, error } = await supabase.from('app_data_records').select('id,data,created_at,updated_at').eq('table_id', tableId).order('created_at', { ascending:false }).limit(limit);
    if (error) throw error;
    return data || [];
  },
  async create(tableId, data) {
    const { data: row, error } = await supabase.from('app_data_records').insert({ table_id: tableId, data }).select().single();
    if (error) throw error;
    return row;
  },
  async update(recordId, data) {
    const { data: row, error } = await supabase.from('app_data_records').update({ data }).eq('id', recordId).select().single();
    if (error) throw error;
    return row;
  },
  async remove(recordId) {
    const { error } = await supabase.from('app_data_records').delete().eq('id', recordId);
    if (error) throw error;
  },
  async bindList(element, tableId, renderer) {
    const rows = await this.records(tableId);
    element.replaceChildren(...rows.map((row, index) => renderer(row.data, row, index)));
    return rows;
  }
};

window.IndoDataBinding = IndoDataBinding;
export default IndoDataBinding;
