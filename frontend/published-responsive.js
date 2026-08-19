function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function deviceForWidth(width){if(width<=640)return'mobile';if(width<=1024)return'tablet';return'desktop'}
function posFor(component,device){const styles=component?.props?.deviceStyles||{};const own=styles[device]?.position;if(own&&Number.isFinite(Number(own.width))&&Number.isFinite(Number(own.height)))return own;return styles.desktop?.position||component?.props?.position||null}
export function applyPublishedResponsive(root,components){
 const device=deviceForWidth(window.innerWidth);root.dataset.device=device;
 root.querySelectorAll('.published-component').forEach((node,index)=>{
  const component=components[index];const p=posFor(component,device);if(!p)return;
  const shell=node.parentElement; if(!shell)return;
  shell.style.position='relative';
  node.style.position='absolute';
  node.style.left=`${Number(p.x)||0}px`;
  node.style.top=`${Number(p.y)||0}px`;
  node.style.width=`${clamp(Number(p.width)||160,80,window.innerWidth)}px`;
  node.style.height=`${Math.max(36,Number(p.height)||48)}px`;
  node.style.maxWidth='none';
 });
}
