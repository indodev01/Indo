import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, syncLegacyFields } from './app-definition.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');
const designIds = [
  'left-menu-right',
  'left-menu-left',
  'center-menu-right',
  'menu-left-center',
  'dark-left-right',
  'minimal-center',
  'right-brand',
  'soft-purple'
];

function selectedDesignId() {
  const cards = Array.from(document.querySelectorAll('#headerDesignGrid .header-design-card'));
  const index = Math.max(0, cards.findIndex((card) => card.classList.contains('selected')));
  return designIds[index] || designIds[0];
}

function buildHeader(project, pages, designId) {
  const designs = {
    'left-menu-right': { brandSide:'left', menuSide:'right', bg:'#ffffff', color:'#111827' },
    'left-menu-left': { brandSide:'left', menuSide:'left', bg:'#ffffff', color:'#111827' },
    'center-menu-right': { brandSide:'center', menuSide:'right', bg:'#ffffff', color:'#111827' },
    'menu-left-center': { brandSide:'center', menuSide:'left', bg:'#ffffff', color:'#111827' },
    'dark-left-right': { brandSide:'left', menuSide:'right', bg:'#0f172a', color:'#ffffff' },
    'minimal-center': { brandSide:'center', menuSide:'right', bg:'#f8fafc', color:'#0f172a' },
    'right-brand': { brandSide:'right', menuSide:'left', bg:'#ffffff', color:'#111827' },
    'soft-purple': { brandSide:'left', menuSide:'right', bg:'#f5f3ff', color:'#312e81' }
  };
  const d = designs[designId] || designs['left-menu-right'];
  return {
    id:`header-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    type:'Header',
    props:{
      designId,
      title:project?.name || 'My App',
      fontFamily:'Inter',
      fontSize:20,
      fontWeight:'800',
      titleColor:d.color,
      menuIcon:'☰',
      menuIconColor:d.color,
      menuIconSize:22,
      menuBackground:d.bg,
      menuPanelBackground:'#0f172a',
      menuPanelColor:'#ffffff',
      menuSide:d.menuSide,
      brandSide:d.brandSide,
      items:Object.keys(pages || {})
    }
  };
}

async function addHeaderDirectly() {
  if (!projectId) return;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) throw auth.error || new Error('Not signed in');
  const result = await supabase.from('projects')
    .select('id,user_id,name,description,app_definition,pages,updated_at')
    .eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Project not found');

  const project = result.data;
  const definition = normalizeDefinition(project);
  const homeId = definition.pages.home ? 'home' : (Object.keys(definition.pages)[0] || 'home');
  if (!definition.pages[homeId]) throw new Error('Home page not found');

  const designId = selectedDesignId();
  definition.pages[homeId].components = Array.isArray(definition.pages[homeId].components)
    ? definition.pages[homeId].components
    : [];
  definition.pages[homeId].components.push(buildHeader(project, definition.pages, designId));

  const synced = syncLegacyFields(definition);
  const save = await supabase.from('projects').update({
    pages:synced.pages,
    app_definition:synced.appDefinition,
    updated_at:new Date().toISOString()
  }).eq('id', projectId).eq('user_id', auth.data.user.id);
  if (save.error) throw save.error;
}

function install() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('[data-header-lib-add]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    button.disabled = true;
    button.textContent = 'Adding…';
    try {
      await addHeaderDirectly();
      window.location.reload();
    } catch (error) {
      console.error('Header add failed', error);
      button.disabled = false;
      button.textContent = 'Add to App';
      window.alert(`Could not add header. ${error.message || 'Please try again.'}`);
    }
  }, true);
}

install();
