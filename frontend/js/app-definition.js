// Indo Dev canonical App Definition Engine (full current app state).
export const APP_DEFINITION_VERSION = 1;

export function makeEmptyPage(name = 'Home') {
  return {
    id: 'home',
    name,
    slug: 'home',
    components: [],
    styles: {
      background: '#ffffff',
      padding: '16px'
    },
    settings: {
      title: name
    }
  };
}

export function makeEmptyDefinition() {
  return {
    schemaVersion: APP_DEFINITION_VERSION,
    metadata: {
      title: '',
      description: '',
      theme: {
        primaryColor: '#5b45f4',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '12px'
      }
    },
    pages: {
      home: makeEmptyPage('Home')
    },
    navigation: {
      items: [{ label: 'Home', pageId: 'home' }]
    },
    workflows: {},
    database: {
      bindings: {}
    },
    assets: {
      files: []
    },
    settings: {
      responsive: {
        desktop: true,
        tablet: true,
        mobile: true
      },
      status: 'draft'
    }
  };
}

export function normalizeComponent(component, index = 0) {
  if (typeof component === 'string') {
    return {
      id: `${component.toLowerCase()}-${index + 1}-${Date.now()}`,
      type: component,
      props: {}
    };
  }

  if (!component || typeof component !== 'object') return null;

  const props = component.props && typeof component.props === 'object'
    ? component.props
    : {};

  return {
    ...component,
    id: component.id || `component-${index + 1}-${Date.now()}`,
    type: component.type || 'Text',
    props
  };
}

export function normalizeComponents(values) {
  return Array.isArray(values)
    ? values.map((item, index) => normalizeComponent(item, index)).filter(Boolean)
    : [];
}

export function normalizeDefinition(project) {
  const base = makeEmptyDefinition();
  const raw = project?.app_definition && typeof project.app_definition === 'object'
    ? project.app_definition
    : {};

  const pagesSource = project?.pages && typeof project.pages === 'object'
    ? project.pages
    : raw.pages && typeof raw.pages === 'object'
      ? raw.pages
      : {};

  const pageEntries = Object.entries(pagesSource);
  if (pageEntries.length) {
    base.pages = {};
    pageEntries.forEach(([id, page]) => {
      base.pages[id] = {
        ...makeEmptyPage(page?.name || id),
        ...page,
        id,
        slug: page?.slug || id,
        components: normalizeComponents(page?.components || [])
      };
    });
  } else {
    base.pages.home.components = normalizeComponents(raw.componentsList || []);
  }

  base.metadata = {
    ...base.metadata,
    ...(raw.metadata || {})
  };
  base.navigation = raw.navigation && typeof raw.navigation === 'object'
    ? raw.navigation
    : base.navigation;
  base.workflows = raw.workflows && typeof raw.workflows === 'object'
    ? raw.workflows
    : {};
  base.database = raw.database && typeof raw.database === 'object'
    ? raw.database
    : base.database;
  base.assets = raw.assets && typeof raw.assets === 'object'
    ? raw.assets
    : base.assets;
  base.settings = raw.settings && typeof raw.settings === 'object'
    ? { ...base.settings, ...raw.settings }
    : base.settings;
  base.schemaVersion = Number(raw.schemaVersion) || APP_DEFINITION_VERSION;

  return base;
}

export function syncLegacyFields(definition) {
  const homeComponents = normalizeComponents(definition.pages?.home?.components || []);
  return {
    pages: definition.pages,
    appDefinition: {
      ...definition,
      components: {},
      componentsList: homeComponents
    }
  };
}
