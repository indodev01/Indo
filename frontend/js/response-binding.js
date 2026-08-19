function getPath(value,path){return String(path||'').split('.').filter(Boolean).reduce((v,k)=>v?.[k],value)}
export function bindApiResponse(root=document, result){
  if(!result)return;
  root.querySelectorAll('[data-indo-bind]').forEach(el=>{
    const value=getPath(result.data,resultPath(el.dataset.indoBind));
    if(value==null)return;
    if(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement||el instanceof HTMLSelectElement)el.value=String(value);
    else if(el instanceof HTMLImageElement)el.src=String(value);
    else el.textContent=String(value);
  });
}
function resultPath(path){return String(path||'').replace(/^response\.?/,'')}
window.IndoResponseBinding={bindApiResponse};
