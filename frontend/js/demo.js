const loginScreen = document.getElementById('loginScreen');
const workspaceScreen = document.getElementById('workspaceScreen');
const loginForm = document.getElementById('demoLoginForm');
const quickDemo = document.getElementById('quickDemo');
const logoutBtn = document.getElementById('logoutBtn');
const pageTitle = document.getElementById('pageTitle');
const pageView = document.getElementById('pageView');
const sideNav = document.getElementById('sideNav');
const authAction = document.getElementById('authAction');

const pages = {
  dashboard: {
    label: 'Dashboard',
    render: () => `
      <section class="view">
        <span class="eyebrow">YOUR WORKSPACE</span>
        <h2>Build. Preview. Publish.</h2>
        <p class="view-sub">Everything you need to turn an idea into a real app.</p>
        <div class="stats">
          ${stat('▱','purple','Total Apps','12','Projects in workspace')}
          ${stat('✓','green','Active Apps','5','Ready to publish')}
          ${stat('◷','orange','Trial Apps','4','24H remaining')}
          ${stat('◈','red','Expired Apps','3','Needs activation')}
        </div>
        <section class="section" id="projects">
          <div class="section-head"><div><span class="eyebrow">YOUR APPS</span><h3>My Apps</h3></div><a href="#" data-page="templates">View All →</a></div>
          <div class="apps">${apps()}</div>
        </section>
        <section class="lower">
          ${templatesTile()}
          ${buildTile()}
          ${publishTile()}
        </section>
        <section class="lower">
          ${adsTile()}
          ${billingTile()}
          ${activityTile()}
        </section>
      </section>`,
  },
  apps: {label:'My Apps', render: () => `<section class="view"><span class="eyebrow">PROJECTS</span><h2>My Apps</h2><p class="view-sub">Manage, preview and edit everything you have built.</p><div class="apps">${apps(true)}</div></section>`},
  templates: {label:'Templates', render: () => `<section class="view"><span class="eyebrow">START FASTER</span><h2>Choose a Template</h2><p class="view-sub">Use a ready-made starting point and edit it visually.</p><div class="action-grid">${templateCards()}</div></section>`},
  create: {label:'Create App', render: () => `<section class="view"><span class="eyebrow">NEW PROJECT</span><h2>Create your app</h2><p class="view-sub">This demo simulates the create-app flow.</p><form class="form-grid" id="createForm"><input placeholder="App name" required><textarea rows="4" placeholder="What will your app do?"></textarea><select><option>Blank App</option><option>Template</option></select><button class="primary" type="submit">Create App →</button></form></section>`},
  studio: {label:'Design Studio', render: () => `<section class="view"><span class="eyebrow">VISUAL BUILDER</span><h2>Design Studio</h2><p class="view-sub">Drag components into the canvas and edit their properties.</p><div class="studio"><div class="studio-col"><b>Components</b>${['Text','Image','Button','Card','List','Icon','Divider'].map(x=>`<div class="component">${x}</div>`).join('')}</div><div class="studio-col"><div class="canvas"><h4>Foodie Express</h4><p>Delicious food, delivered fast.</p><input style="padding:10px;border:1px solid #ddd;border-radius:8px;width:100%" placeholder="Search food..."><br><br><span class="button">Order Now</span></div></div><div class="studio-col"><b>Inspector</b><p class="view-sub">Select a component to edit content, spacing, color and actions.</p><button class="primary wide" data-page="preview">Preview</button></div></div></section>`},
  preview: {label:'Preview', render: () => `<section class="view"><span class="eyebrow">LIVE PREVIEW</span><h2>App Preview</h2><p class="view-sub">This is the same app shown in the phone preview on the right.</p><div class="phone-preview"><div class="phone" style="width:260px;height:500px"><div class="phone-notch"></div><div class="phone-body"><h4>Foodie Express</h4><p>Delicious food, delivered fast</p><div class="phone-search">⌕ Search food...</div><div class="chips"><span class="active">All</span><span>Pizza</span><span>Burger</span></div><h5>Popular Items</h5><div class="food-row"><article><div>🍔</div><b>Cheese Burger</b><span>$4.99 · ★4.5</span></article><article><div>🍕</div><b>Veg Pizza</b><span>$7.99 · ★4.7</span></article></div><h5>Top Restaurants</h5><div class="restaurant"><span>🍽</span><div><b>Urban Bites</b><small>Fast food · 4.8</small></div></div></div><div class="phone-nav"><span class="active">⌂<small>Home</small></span><span>▤<small>Orders</small></span><span>♡<small>Favorites</small></span><span>♙<small>Profile</small></span></div></div></div></section>`},
  build: {label:'Build & Generate', render: () => `<section class="view"><span class="eyebrow">ANDROID BUILD</span><h2>Build & Generate</h2><p class="view-sub">Your APK build pipeline is being simulated in this demo.</p><div class="tile"><div class="build-ring"><span>75%</span></div><div class="checks"><div class="check">Validating project</div><div class="check">Compiling resources</div><div class="check">Generating APK</div></div><button class="primary wide" id="buildDemo">Generate APK</button></div></section>`},
  publish: {label:'Publish & Share', render: () => `<section class="view"><span class="eyebrow">RELEASE</span><h2>Publish & Share</h2><p class="view-sub">Guide the user through APK download and store publishing.</p><div class="tile"><p>Your APK is ready. Play Store and App Store publishing guides are free in the platform.</p><div class="publish-buttons"><button class="primary" id="downloadDemo">↓ Download APK</button><button>Publish Guide (Free)</button><button>Share App</button></div></div></section>`},
  ads: {label:'Ads Manager', render: () => `<section class="view"><span class="eyebrow">MONETIZATION</span><h2>Ads Manager</h2><p class="view-sub">Control the ad placements used inside user-created apps.</p><div class="tile"><div class="ad-stat"><small>Impressions</small><strong>12.4K</strong><small>↗ 18.6% this month</small></div><div class="ad-row"><span>Banner Ad</span><button class="toggle on"></button></div><div class="ad-row"><span>Interstitial Ad</span><button class="toggle on"></button></div><div class="ad-row"><span>Native Ad</span><button class="toggle"></button></div><button class="primary" style="margin-top:10px" id="newAd">＋ New Ad Unit</button></div></section>`},
  billing: {label:'Billing', render: () => `<section class="view"><span class="eyebrow">SUBSCRIPTION</span><h2>Billing & Activation</h2><p class="view-sub">Users receive a 24-hour free trial before activation is required.</p><div class="action-grid"><div class="action-card"><h4>Free Trial</h4><p>24 hours of full app testing.</p><span class="badge trial-b">ACTIVE</span></div><div class="action-card"><h4>Pro Plan</h4><p>Keep apps active and unlock publishing and premium features.</p><button class="primary" id="upgradeDemo">Upgrade / Activate</button></div></div></section>`},
  settings: {label:'Settings', render: () => `<section class="view"><span class="eyebrow">WORKSPACE</span><h2>Settings</h2><p class="view-sub">Demo preferences and workspace controls.</p><div class="form-grid"><input value="John Doe"><input value="demo@indo.app"><select><option>Dark Theme</option><option>Light Theme</option></select><button class="primary" id="saveSettings">Save Settings</button></div></section>`},
};

function stat(icon, tone, label, number, note){return `<article class="stat"><div class="ico ${tone}">${icon}</div><small>${label}</small><strong>${number}</strong><em>${note}</em></article>`}
function apps(extra=false){return [['🍔','Foodie Express','active-b','Active'],['✦','Daily Quotes','trial-b','Trial'],['▤','Tech News','active-b','Active'],['✚','Fitness Pro','expired-b','Expired']].map(([icon,name,badge,status])=>`<article class="app"><div class="app-icon">${icon}</div><h4>${name}</h4><p>v1.0.0 · Updated recently</p><span class="badge ${badge}">${status}</span><div class="app-actions"><a href="#" data-page="preview">Preview</a><a href="#" data-page="studio">Edit App</a></div></article>`).join('')}
function templateCards(){return [['🍔','Food Delivery'],['📰','News Paper'],['🏋','Fitness'],['🛍','Store']].map(([icon,name])=>`<div class="action-card"><div class="app-icon">${icon}</div><h4>${name}</h4><p>Ready-made starter template with editable screens.</p><button class="primary wide template-use" data-template="${name}">Use Template</button></div>`).join('')}
function templatesTile(){return `<article class="tile"><div class="section-head"><h3>Choose Template</h3><a href="#" data-page="templates">See All</a></div><div class="template-grid">${[['🍔','Food Delivery'],['📰','News'],['🏋','Fitness']].map(([i,n])=>`<div class="template"><div class="pic">${i}</div><span>${n}</span><a class="use" href="#" data-page="create">Use Template</a></div>`).join('')}</div></article>`}
function buildTile(){return `<article class="tile"><div class="section-head"><h3>Build & Generate</h3><span class="badge trial-b">75%</span></div><div class="build-ring"><span>75%</span></div><div class="checks"><div class="check">Validating project</div><div class="check">Compiling resources</div><div class="check">Generating APK</div></div></article>`}
function publishTile(){return `<article class="tile"><div class="section-head"><h3>Publish & Share</h3><span>🎉</span></div><p>Your APK is ready for download and store publishing.</p><div class="publish-buttons"><button class="primary" data-page="publish">↓ Download APK</button><button data-page="publish">Publish Guide (Free)</button><button data-page="publish">Share App</button></div></article>`}
function adsTile(){return `<article class="tile"><div class="section-head"><h3>Ads Manager</h3><a class="primary" href="#" data-page="ads">＋ New Ad Unit</a></div><div class="ad-box"><div class="ad-stat"><small>Impressions</small><strong>12.4K</strong><small>↗ 18.6% this month</small></div><div class="ad-row"><span>Banner Ad</span><button class="toggle on"></button></div><div class="ad-row"><span>Interstitial Ad</span><button class="toggle on"></button></div><div class="ad-row"><span>Native Ad</span><button class="toggle"></button></div></div></article>`}
function billingTile(){return `<article class="tile"><div class="section-head"><h3>Free Trial</h3><span class="badge trial-b">24H</span></div><p>Your first app is free for 24 hours. Upgrade to keep apps active.</p><button class="primary" data-page="billing">Upgrade / Activate</button></article>`}
function activityTile(){return `<article class="tile"><div class="section-head"><h3>Recent Activity</h3><span>Now</span></div><div class="checks"><div class="check">Workspace ready</div><div class="check">Design Studio updated</div><div class="check">Publishing guide available</div></div></article>`}

function buildNav(){
  sideNav.innerHTML = [
    ['dashboard','⌂','Dashboard'],['apps','▦','My Apps'],['templates','◇','Templates'],['studio','✦','Design Studio'],['build','◉','Build & Generate'],['publish','↗','Publish & Share'],['ads','◒','Ads Manager'],['billing','◫','Billing'],['settings','⚙','Settings']
  ].map(([id,icon,label])=>`<a href="#" class="nav-item" data-page="${id}"><span>${icon}</span>${label}</a>`).join('');
}

function openWorkspace(){loginScreen.hidden=true;workspaceScreen.hidden=false;renderPage('dashboard')}
function renderPage(id){const page=pages[id]||pages.dashboard;pageTitle.textContent=page.label;pageView.innerHTML=page.render();document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===id));bindDynamic()}
function bindDynamic(){
  pageView.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();renderPage(el.dataset.page)}));
  pageView.querySelectorAll('.toggle').forEach(el=>el.addEventListener('click',()=>el.classList.toggle('on')));
  const createForm=document.getElementById('createForm'); if(createForm) createForm.addEventListener('submit',e=>{e.preventDefault();alert('Demo: app created successfully. Opening Design Studio.');renderPage('studio')});
  const build=document.getElementById('buildDemo'); if(build) build.addEventListener('click',()=>alert('Demo build started. APK generation simulated.'));
  const download=document.getElementById('downloadDemo'); if(download) download.addEventListener('click',()=>alert('Demo: APK download is simulated.'));
  const newAd=document.getElementById('newAd'); if(newAd) newAd.addEventListener('click',()=>alert('Demo: new ad unit created.'));
  const upgrade=document.getElementById('upgradeDemo'); if(upgrade) upgrade.addEventListener('click',()=>alert('Demo: Pro activation complete.'));
  const save=document.getElementById('saveSettings'); if(save) save.addEventListener('click',()=>alert('Demo: settings saved.'));
  document.querySelectorAll('.template-use').forEach(el=>el.addEventListener('click',()=>{alert(`${el.dataset.template} template selected.`);renderPage('create')}));
}

loginForm.addEventListener('submit',e=>{e.preventDefault();openWorkspace()});
quickDemo.addEventListener('click',openWorkspace);
logoutBtn.addEventListener('click',()=>{workspaceScreen.hidden=true;loginScreen.hidden=false});
sideNav.addEventListener('click',e=>{const link=e.target.closest('[data-page]');if(!link)return;e.preventDefault();renderPage(link.dataset.page)});
authAction.addEventListener('click',e=>{e.preventDefault();workspaceScreen.hidden=true;loginScreen.hidden=false});
buildNav();
