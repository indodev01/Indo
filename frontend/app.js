import { supabase } from './auth/supabase-config.js';

const authAction = document.getElementById('authAction');
const createAction = document.getElementById('createAction');
const workspaceMessage = document.getElementById('workspaceMessage');
const projectList = document.getElementById('projectList');

function setLoggedOutState() {
  authAction.textContent = 'Sign In';
  authAction.href = 'auth/sign-in.html';
  authAction.classList.remove('logout-button');
  createAction.textContent = 'Create App';
  createAction.href = 'create-app.html';
  workspaceMessage.textContent = 'Create and customize apps without writing complicated code.';
}

function setLoggedInState(user, profile) {
  const name = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'there';
  authAction.textContent = 'Logout';
  authAction.href = '#logout';
  authAction.classList.add('logout-button');
  createAction.textContent = 'Create App';
  createAction.href = 'create-app.html';
  workspaceMessage.textContent = `Welcome back, ${name}. Create and customize your apps without writing complicated code.`;

  authAction.onclick = async function (event) {
    event.preventDefault();
    authAction.textContent = 'Logging out...';
    authAction.style.pointerEvents = 'none';
    const { error } = await supabase.auth.signOut();
    if (error) {
      authAction.textContent = 'Logout';
      authAction.style.pointerEvents = '';
      workspaceMessage.textContent = 'Could not log out. Please try again.';
      return;
    }
    window.location.replace('landing/index.html');
  };
}

function renderProjects(projects) {
  projectList.innerHTML = '';
  if (!projects.length) {
    const empty = document.createElement('div');
    empty.className = 'project-card empty-project-card';
    empty.innerHTML = '<h3>No projects yet</h3><p>Your first app will appear here after you create it.</p><a class="card-button" href="create-app.html">Create Your First App</a>';
    projectList.appendChild(empty);
    return;
  }

  projects.forEach((project) => {
    const card = document.createElement('article');
    card.className = 'project-card';

    const info = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = project.name || 'Untitled App';
    const description = document.createElement('p');
    description.textContent = project.description || `${project.start_mode === 'template' ? 'Template' : 'Blank'} project • ${project.status || 'draft'}`;
    info.append(heading, description);

    const actions = document.createElement('div');
    actions.className = 'project-actions';

    const open = document.createElement('a');
    open.className = 'card-button';
    open.textContent = 'Open Builder';
    open.href = `builder-v2.html?projectId=${encodeURIComponent(project.id)}`;

    const preview = document.createElement('a');
    preview.className = 'app-link-button';
    preview.textContent = 'Preview';
    preview.href = `preview.html?projectId=${encodeURIComponent(project.id)}`;

    actions.append(open, preview);
    card.append(info, actions);
    projectList.appendChild(card);
  });
}

async function loadProjects(userId) {
  projectList.innerHTML = '<div class="project-card empty-project-card"><h3>Loading your projects...</h3><p>Please wait while your workspace loads.</p></div>';
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id,name,description,start_mode,status,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  renderProjects(projects || []);
}

async function initHome() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    setLoggedOutState();
    renderProjects([]);
    return;
  }

  const { data: profile } = await supabase
    .from('users')
    .select('name,email')
    .eq('id', data.user.id)
    .maybeSingle();

  setLoggedInState(data.user, profile);

  try {
    await loadProjects(data.user.id);
  } catch (projectError) {
    console.error(projectError);
    projectList.innerHTML = '<div class="project-card empty-project-card"><h3>Could not load projects</h3><p>Please refresh and try again.</p></div>';
  }
}

initHome().catch((error) => {
  console.error(error);
  setLoggedOutState();
  renderProjects([]);
});
