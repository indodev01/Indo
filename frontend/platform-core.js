import { supabase } from './auth/supabase-config.js';

export const TRIAL_HOURS = 24;
export const VERSION_STATUSES = ['draft', 'testing', 'frozen', 'live'];

export function trialWindow(startedAt) {
  const start = startedAt ? new Date(startedAt) : new Date();
  const expires = new Date(start.getTime() + TRIAL_HOURS * 60 * 60 * 1000);
  return { startedAt: start.toISOString(), expiresAt: expires.toISOString() };
}

export function trialState(project) {
  if (project?.status === 'live' || project?.status === 'active') return { state: 'active', remainingMs: Infinity };
  if (!project?.trial_expires_at) return { state: 'not_started', remainingMs: 0 };
  const remainingMs = Math.max(0, new Date(project.trial_expires_at).getTime() - Date.now());
  return { state: remainingMs > 0 ? 'trial' : 'expired', remainingMs };
}

export function formatRemaining(ms) {
  if (!Number.isFinite(ms)) return 'Active';
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function defaultWorkflow(action = { type: 'none', target: '' }) {
  return { trigger: 'click', action };
}

export function normalizeAction(action) {
  const value = action && typeof action === 'object' ? action : {};
  const type = ['page', 'url', 'submit', 'none'].includes(value.type) ? value.type : 'none';
  return { type, target: typeof value.target === 'string' ? value.target : '' };
}

export function runClientAction(action, { pages = {}, navigate = window.location } = {}) {
  const next = normalizeAction(action);
  if (next.type === 'page' && pages[next.target]) {
    navigate.href = `?page=${encodeURIComponent(next.target)}`;
    return { ok: true, type: 'page' };
  }
  if (next.type === 'url' && next.target) {
    window.open(next.target, '_blank', 'noopener,noreferrer');
    return { ok: true, type: 'url' };
  }
  return { ok: true, type: next.type };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user || null;
}

export async function loadOwnedProject(projectId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Authentication required');
  const { data, error } = await supabase.from('projects')
    .select('*').eq('id', projectId).eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project not found or access denied');
  return { user, project: data };
}

export async function saveDefinition(projectId, definition) {
  const { user } = await loadOwnedProject(projectId);
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('projects').update({
    app_definition: definition,
    pages: definition.pages || {},
    theme: definition.metadata?.theme || {},
    updated_at: now
  }).eq('id', projectId).eq('user_id', user.id)
    .select('id,user_id,app_definition,pages,updated_at').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project was not updated');
  return data;
}

export async function createVersion(projectId, definition, versionName, status = 'draft') {
  const { user } = await loadOwnedProject(projectId);
  if (!VERSION_STATUSES.includes(status)) throw new Error('Invalid version status');
  const { data, error } = await supabase.from('app_versions').insert({
    project_id: projectId,
    user_id: user.id,
    version_name: versionName,
    status,
    definition
  }).select('*').single();
  if (error) throw error;
  await supabase.from('projects').update({ current_version: versionName, status: status === 'live' ? 'live' : 'draft', updated_at: new Date().toISOString() }).eq('id', projectId).eq('user_id', user.id);
  return data;
}

export async function beginTrial(projectId) {
  const { user, project } = await loadOwnedProject(projectId);
  if (project.trial_started_at && project.trial_expires_at) return project;
  const window = trialWindow();
  const { data, error } = await supabase.from('projects').update({
    trial_started_at: window.startedAt,
    trial_expires_at: window.expiresAt,
    status: 'trial',
    updated_at: new Date().toISOString()
  }).eq('id', projectId).eq('user_id', user.id).select('*').single();
  if (error) throw error;
  await supabase.from('app_subscriptions').insert({
    project_id: projectId,
    user_id: user.id,
    status: 'trial',
    started_at: window.startedAt,
    expires_at: window.expiresAt
  });
  return data;
}

export async function activateProject(projectId, provider = 'manual', externalId = null) {
  const { user } = await loadOwnedProject(projectId);
  const { data, error } = await supabase.from('projects').update({
    status: 'active',
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', projectId).eq('user_id', user.id).select('*').single();
  if (error) throw error;
  await supabase.from('app_subscriptions').insert({ project_id: projectId, user_id: user.id, status: 'active', provider, external_id });
  return data;
}

export async function createBuild(projectId, platform = 'android') {
  const { user } = await loadOwnedProject(projectId);
  const { data, error } = await supabase.from('app_builds').insert({
    project_id: projectId,
    user_id: user.id,
    platform,
    status: 'queued'
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateBuild(buildId, patch) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Authentication required');
  const { data, error } = await supabase.from('app_builds').update(patch)
    .eq('id', buildId).eq('user_id', user.id).select('*').single();
  if (error) throw error;
  return data;
}

export async function saveFormSubmission(projectId, formName, data) {
  const { user } = await loadOwnedProject(projectId);
  const cleanData = data && typeof data === 'object' ? data : {};
  const { data: row, error } = await supabase.from('app_submissions').insert({
    project_id: projectId,
    user_id: user.id,
    form_name: formName,
    data: cleanData
  }).select('*').single();
  if (error) throw error;
  return row;
}

export async function listFormSubmissions(projectId, formName = null) {
  const { user } = await loadOwnedProject(projectId);
  let query = supabase.from('app_submissions').select('*').eq('project_id', projectId).eq('user_id', user.id).order('created_at', { ascending: false });
  if (formName) query = query.eq('form_name', formName);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function registerAsset(projectId, asset) {
  const { user } = await loadOwnedProject(projectId);
  const { data, error } = await supabase.from('app_assets').insert({
    project_id: projectId,
    user_id: user.id,
    path: asset.path,
    public_url: asset.publicUrl || null,
    mime_type: asset.mimeType || null,
    size_bytes: asset.sizeBytes || null
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function addEarning(projectId, source, amount, metadata = {}) {
  const { user } = await loadOwnedProject(projectId);
  const { data, error } = await supabase.from('app_earnings').insert({
    project_id: projectId,
    user_id: user.id,
    source,
    amount,
    metadata
  }).select('*').single();
  if (error) throw error;
  return data;
}

export function buildRuntimeManifest(definition, project) {
  return {
    schemaVersion: definition?.schemaVersion || 1,
    metadata: definition?.metadata || {},
    pages: definition?.pages || {},
    navigation: definition?.navigation || { items: [] },
    workflows: definition?.workflows || {},
    database: definition?.database || { bindings: {} },
    assets: definition?.assets || { files: [] },
    settings: definition?.settings || {},
    trial: {
      status: trialState(project),
      hours: TRIAL_HOURS
    },
    branding: {
      poweredBy: false,
      appName: project?.name || definition?.metadata?.title || 'Indo Dev App'
    }
  };
}

export async function requestAndroidBuild(projectId) {
  const build = await createBuild(projectId, 'android');
  return { ...build, nextStep: 'Connect an Android build worker/edge function to process queued builds.' };
}

export async function publishProject(projectId, definition) {
  const { user } = await loadOwnedProject(projectId);
  const version = `v${Date.now()}`;
  const created = await createVersion(projectId, definition, version, 'live');
  await supabase.from('projects').update({ published_at: new Date().toISOString(), frozen_at: new Date().toISOString() }).eq('id', projectId).eq('user_id', user.id);
  return created;
}

export const platformFeatureChecklist = {
  forms: true,
  databaseBindingModel: true,
  workflows: true,
  nestedLayoutModel: true,
  responsiveModel: true,
  assetsModel: true,
  templates: true,
  appSettings: true,
  versioning: true,
  trial24h: true,
  activation: true,
  androidBuildQueue: true,
  publishing: true,
  adsEarningsModel: true,
  securityRls: true,
  qaHooks: true
};
