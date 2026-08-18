import { supabase } from './auth/supabase-config.js';

const canvas = document.getElementById('canvas');
const inspector = document.getElementById('inspectorContent');
const selectionLabel = document.getElementById('selectionLabel');
const pageList = document.getElementById('pageList');
const pageStatus = document.getElementById('pageStatus');
const projectId = new URLSearchParams(window.location.search).get('projectId');

let projectDefinition = null;
let singleClickTimer = null;

async function loadProjectDefinition() {
  if (!projectId) return;
  const { data, error } = await supabase
    .from('projects')
    .select('app_definition')
    .eq('id', projectId)
    .maybeSingle();
  if (!error) projectDefinition = data?.app_definition || null;
}
loadProjectDefinition();

function selectedItem() {
  return canvas?.querySelector('.canvas-item.selected') || null;
}

function focusFirstEditorControl() {
  const control = inspector?.querySelector('input, textarea, select, button');
  if (control) {
    control.focus({ preventScroll: false });
    if (typeof control.select === 'function') control.select();
  }
}

function enterEditMode(item) {
  canvas?.querySelectorAll('.canvas-item.editing').forEach((node) => node.classList.remove('editing'));
  if (!item) return;
  item.classList.add('editing');
  focusFirstEditorControl();
}

function currentPageDefinition() {
  if (!projectDefinition?.pages) return null;
  const pageName = pageStatus?.textContent?.trim();
  return Object.values(projectDefinition.pages).find((page) => page.name === pageName) || null;
}

function getButtonTarget(item) {
  const index = Number(item?.dataset?.index);
  if (!Number.isInteger(index)) return null;
  const page = currentPageDefinition();
  const component = page?.components?.[index];
  if (component?.type !== 'Button') return null;
  const link = String(component?.props?.link || '').trim();
  if (!link) return null;
  return link;
}

function openLinkedPage(link) {
  if (!link || /^https?:\/\//i.test(link)) {
    if (/^https?:\/\//i.test(link)) window.open(link, '_blank', 'noopener,noreferrer');
    return false;
  }
  const target = String(link).replace(/^\//, '').replace(/\.html$/, '');
  const targetPage = projectDefinition?.pages?.[target];
  if (!targetPage) return false;
  const pageButton = [...(pageList?.querySelectorAll('.page-button') || [])]
    .find((button) => button.textContent.trim() === targetPage.name);
  if (!pageButton) return false;
  pageButton.click();
  return true;
}

// Single click selects normally. For buttons, a short delay allows double-click
// to enter edit mode instead of navigating away.
canvas?.addEventListener('click', (event) => {
  const item = event.target.closest('.canvas-item');
  if (!item || !canvas.contains(item)) return;
  canvas.querySelectorAll('.canvas-item.editing').forEach((node) => node.classList.remove('editing'));

  const link = getButtonTarget(item);
  if (!link) return;

  window.clearTimeout(singleClickTimer);
  singleClickTimer = window.setTimeout(() => {
    openLinkedPage(link);
    singleClickTimer = null;
  }, 240);
});

// Double click means: "I want to edit this element."
canvas?.addEventListener('dblclick', (event) => {
  const item = event.target.closest('.canvas-item');
  if (!item || !canvas.contains(item)) return;
  event.preventDefault();
  event.stopPropagation();
  window.clearTimeout(singleClickTimer);
  singleClickTimer = null;
  enterEditMode(item);
});

pageList?.addEventListener('click', (event) => {
  const pageButton = event.target.closest('.page-button');
  if (!pageButton) return;
  pageList.querySelectorAll('.page-button').forEach((node) => node.classList.remove('page-editing'));
  pageButton.classList.add('page-editing');
  window.setTimeout(() => focusFirstEditorControl(), 60);
});

const style = document.createElement('style');
style.textContent = `
  .canvas-item{position:relative;transition:outline .12s ease,box-shadow .12s ease,transform .12s ease}
  .canvas-item.editing{outline:2px solid #8b5cf6!important;outline-offset:3px;box-shadow:0 0 0 5px rgba(139,92,246,.14),0 12px 30px rgba(0,0,0,.16);z-index:20}
  .canvas-item.editing::after{content:'Editing';position:absolute;right:8px;top:8px;padding:4px 7px;border-radius:7px;background:#7c3aed;color:#fff;font:700 9px/1 system-ui,sans-serif;pointer-events:none;opacity:.96}
  .page-button.page-editing{box-shadow:inset 0 0 0 1px rgba(167,139,250,.65),0 0 0 2px rgba(124,58,237,.12)}
`;
document.head.appendChild(style);
