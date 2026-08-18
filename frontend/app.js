import { supabase } from './auth/supabase-config.js';

const authAction = document.getElementById('authAction');
const createAction = document.getElementById('createAction');
const workspaceMessage = document.getElementById('workspaceMessage');
const projectList = document.getElementById('projectList');
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statTrial = document.getElementById('statTrial');
const statExpired = document.getElementById('statExpired');

function getProjectStatus(project) {
  const rawStatus = String(project.status || 'draft').toLowerCase();
  if (rawStatus.includes('expired')) return 'expired';
  if (rawStatus.includes('trial')) return 'trial';
  return 'active';
}

function setLoggedOutState() {
  authAction.textContent = 'Sign In';
  authAction.href = 'auth/sign-in.html';
  authAction.classList.remove('logout-button');
  createAction.textContent = 'Create App';
  createAction.href = 'create-app-v2.html';
  workspaceMessage.textContent = 'Create Android apps from templates or a blank canvas — without writing complicated code.';
}

function setLoggedInState(user, profile) {
  const name = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'there';

  authAction.textContent = 'Logout';
  authAction.href = '#logout';
  authAction.classList.add('logout-button');
  createAction.textContent = 'Create App';
  createAction.href = 'create-app-v2.html';
  workspaceMessage.textContent = `Welcome back, ${name}. Create, preview and publish your apps from one workspace.`;

  authAction.onclick = async (event) => {
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

function updateStats(projects) {
  const counts = projects.reduce(
    (result, project) => {
      const status = getProjectStatus(project);
      result.total += 1;
      result[status] += 1;
      return result;
    },
    { total: 0, active: 0, trial: 0, expired: 0 },
  );

  if (statTotal) statTotal.textContent = String(counts.total);
  if (statActive) statActive.textContent = String(counts.active);
  if (statTrial) statTrial.textContent = String(counts.trial);
  if (statExpired) statExpired.textContent = String(counts.expired);
}

function createProjectIcon(project) {
  const icon = document.createElement('div');
  icon.className = 'project-icon';
  icon.textContent = (project.name || 'A').trim().slice(0, 1).toUpperCase();
  return icon;
}

function createProjectCard(project) {
  const status = getProjectStatus(project);
  const card = document.createElement('article');
  card.className = 'project-card';

  const row = document.createElement('div');
  row.className = 'project-row';

  const info = document.createElement('div');
  info.className = 'project-info';
  info.appendChild(createProjectIcon(project));

  const main = document.createElement('div');
  main.className = 'project-main';

  const titleLine = document.createElement('div');
  titleLine.className = 'project-title-line';

  const heading = document.createElement('h3');
  heading.textContent = project.name || 'Untitled App';

  const pill = document.createElement('span');
  pill.className = `status-pill status-${status}`;
  pill.textContent = status === 'trial' ? 'Trial' : status === 'expired' ? 'Expired' : 'Active';

  titleLine.append(heading, pill);

  const description = document.createElement('p');
  description.textContent = project.description || `${project.start_mode === 'template' ? 'Template' : 'Blank'} project ready for editing.`;

  const meta = document.createElement('div');
  meta.className = 'project-meta';
  const type = document.createElement('span');
  type.textContent = project.start_mode === 'template' ? 'Template' : 'Blank';
  const version = document.createElement('span');
  version.textContent = 'v1.0.0';
  meta.append(type, version);

  main.append(titleLine, description, meta);
  info.appendChild(main);

  const actions = document.createElement('div');
  actions.className = 'project-actions';

  const preview = document.createElement('a');
  preview.className = 'app-link-button';
  preview.textContent = 'Preview';
  preview.href = `preview.html?projectId=${encodeURIComponent(project.id)}`;

  const open = document.createElement('a');
  open.className = 'app-primary-button';
  open.textContent = status === 'expired' ? 'Renew App' : 'Edit App';
  open.href = `builder-v2.html?projectId=${encodeURIComponent(project.id)}`;

  actions.append(preview, open);
  row.append(info, actions);
  card.appendChild(row);

  return card;
}

function renderProjects(projects) {
  projectList.innerHTML = '';
  updateStats(projects);

  if (!projects.length) {
    const empty = document.createElement('div');
    empty.className = 'project-card empty-project-card';
    empty.innerHTML = `
      <div>
        <h3>No projects yet</h3>
        <p>Your first app will appear here after you create it.</p>
        <a class="card-button" href="create-app-v2.html">Create Your First App →</a>
      </div>
    `;
    projectList.appendChild(empty);
    return;
  }

  projects.slice(0, 8).forEach((project) => {
    projectList.appendChild(createProjectCard(project));
  });
}

async function loadProjects(userId) {
  projectList.innerHTML = `
    <div class="project-card loading-card"><div class="skeleton skeleton-icon"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line"></div></div>
    <div class="project-card loading-card"><div class="skeleton skeleton-icon"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line"></div></div>
    <div class="project-card loading-card"><div class="skeleton skeleton-icon"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line"></div></div>
  `;

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id,name,description,start_mode,status,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  renderProjects(projects || []);
}

async function initWorkspace() {
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
    projectList.innerHTML = `
      <div class="project-card empty-project-card">
        <div>
          <h3>Could not load projects</h3>
          <p>Please refresh and try again.</p>
        </div>
      </div>
    `;
    updateStats([]);
  }
}

initWorkspace().catch((error) => {
  console.error(error);
  setLoggedOutState();
  renderProjects([]);
});
