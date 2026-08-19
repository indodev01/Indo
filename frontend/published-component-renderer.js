function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeField(value,index){const raw=String(value??`field${index+1}`).trim();return {label:raw||`Field ${index+1}`,name:raw.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||`field_${index+1}`}}
function visibilityAttr(props){const mode=String(props?.authVisibility||'always').toLowerCase();return ` data-auth-visible="${mode==='signed-in'||mode==='signed-out'?mode:'always'}"`}
export function renderPublishedComponent(component){
 const type=String(component?.type||'Text').toLowerCase();const p=component?.props||{};const vis=visibilityAttr(p);const text=esc(p.text??p.label??p.content??'');
 if(type==='login')return `<form class="pub-form" data-auth="login"${vis}><h2>${esc(p.title||'Log in')}</h2><label class="pub-field"><span>Email</span><input name="email" type="email" required placeholder="Email"></label><label class="pub-field"><span>Password</span><input name="password" type="password" required minlength="6" placeholder="Password"></label><button class="pub-button" type="submit">${esc(p.buttonLabel||'Log in')}</button><small class="pub-form-message" aria-live="polite"></small></form>`;
 if(type==='signup')return `<form class="pub-form" data-auth="signup"${vis}><h2>${esc(p.title||'Create account')}</h2><label class="pub-field"><span>Email</span><input name="email" type="email" required placeholder="Email"></label><label class="pub-field"><span>Password</span><input name="password" type="password" required minlength="6" placeholder="Password"></label><button class="pub-button" type="submit">${esc(p.buttonLabel||'Sign up')}</button><small class="pub-form-message" aria-live="polite"></small></form>`;
 if(type==='logout')return `<button class="pub-button" type="button" data-auth="logout"${vis}>${esc(p.label||'Log out')}</button>`;
 if(type==='user')return `<div class="pub-user" data-auth="user"${vis}>Loading user…</div>`;
 if(type==='text'||type==='heading'||type==='paragraph')return `<div class="pub-text"${vis}>${text}</div>`;
 if(type==='button'||type==='cta')return `<button class="pub-button" type="button" data-indo-action${vis}>${text||'Button'}</button>`;
 if(type==='image')return `<img class="pub-image"${vis} src="${esc(p.src||p.url||'')}" alt="${esc(p.alt||'')}" loading="lazy">`;
 if(type==='video'||type==='videoplayer')return `<video class="pub-video"${vis} controls preload="metadata" src="${esc(p.src||p.url||'')}"></video>`;
 if(type==='divider')return `<hr class="pub-divider"${vis}>`;
 if(type==='spacer')return `<div${vis} style="height:${Number(p.height)||32}px"></div>`;
 if(type==='link')return `<a class="pub-link"${vis} href="${esc(p.href||p.url||'#')}">${text||'Link'}</a>`;
 if(type==='forms'||type==='form'){const fields=Array.isArray(p.fields)&&p.fields.length?p.fields:['Name','Email','Message'];const inputs=fields.map((field,index)=>{const f=safeField(field,index);const tag=f.name==='message'||f.name==='description'?'textarea':'input';const attrs=tag==='textarea'?`name="${esc(f.name)}" rows="4" placeholder="${esc(f.label)}"`:`name="${esc(f.name)}" type="${f.name==='email'?'email':'text'}" placeholder="${esc(f.label)}"`;return `<label class="pub-field"><span>${esc(f.label)}</span><${tag} ${attrs} required></${tag}></label>`}).join('');return `<form class="pub-form"${vis}><h2>${esc(p.title||'Contact us')}</h2>${inputs}<button class="pub-button" type="submit">${esc(p.submitLabel||'Submit')}</button><small class="pub-form-message" aria-live="polite"></small></form>`}
 if(type==='input')return `<input class="pub-input"${vis} name="${esc(p.name||'value')}" placeholder="${esc(p.placeholder||p.label||'')}" type="${esc(p.inputType||'text')}">`;
 return `<div class="pub-card"${vis}><strong>${esc(component?.type||'Component')}</strong>${text?`<div>${text}</div>`:''}</div>`;
}
