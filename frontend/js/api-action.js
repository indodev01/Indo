export async function runApiAction(config={}, context={}) {
  const method=(config.method||'GET').toUpperCase();
  if(!config.url) throw new Error('API URL is required');
  const headers={...(config.headers||{})};
  if(config.body && !headers['Content-Type']) headers['Content-Type']='application/json';
  const body=config.body ? JSON.stringify(resolve(config.body,context)) : undefined;
  const response=await fetch(resolve(config.url,context),{method,headers,body});
  const text=await response.text();
  let data=text;try{data=text?JSON.parse(text):null}catch{}
  if(!response.ok) throw new Error(`API request failed (${response.status})`);
  return {status:response.status,data};
}
function resolve(value,context){if(typeof value!=='string')return value;return value.replace(/\{\{([^}]+)\}\}/g,(_,path)=>path.trim().split('.').reduce((v,k)=>v?.[k],context)??'');}
window.IndoApiAction={runApiAction};
