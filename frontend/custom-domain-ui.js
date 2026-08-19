import { saveCustomDomain, verifyCustomDomain } from './custom-domain.js';

export function mountCustomDomainUI({mountId='customDomainSettings',projectId}={}){
 const host=document.getElementById(mountId); if(!host||!projectId)return;
 host.innerHTML=`<div class="custom-domain-card"><h3>Custom domain</h3><p>Connect your own domain to this published app.</p><form id="customDomainForm"><input id="customDomainInput" type="text" placeholder="www.example.com" autocomplete="off"><button type="submit">Connect domain</button></form><div id="customDomainStatus" aria-live="polite"></div><div id="customDomainDns" hidden></div><button id="verifyDomainButton" type="button" hidden>Verify DNS</button></div>`;
 const form=host.querySelector('#customDomainForm'); const input=host.querySelector('#customDomainInput'); const status=host.querySelector('#customDomainStatus'); const dns=host.querySelector('#customDomainDns'); const verify=host.querySelector('#verifyDomainButton');
 const showDns=(result)=>{dns.hidden=false;dns.innerHTML=`<p>Status: <strong>${result.status||'pending'}</strong></p><p>Add this DNS record:</p><code>${result.dnsRecord?.type||'CNAME'} ${result.dnsRecord?.name||'www'} → ${result.dnsRecord?.value||'your-host.example'}</code>`;verify.hidden=false;};
 form.addEventListener('submit',async e=>{e.preventDefault();status.textContent='Saving domain…';try{const result=await saveCustomDomain(projectId,input.value);status.textContent=`Domain ${result.domain} saved.`;showDns(result);}catch(error){status.textContent=error.message||'Could not save domain.';}});
 verify.addEventListener('click',async()=>{status.textContent='Checking DNS…';try{const result=await verifyCustomDomain(projectId);status.textContent=`Verification: ${result.status}`;showDns(result);}catch(error){status.textContent=error.message||'Verification failed.';}});
}
