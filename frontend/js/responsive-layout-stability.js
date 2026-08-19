const devices=['desktop','tablet','mobile'];
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;

export function normalizeDeviceStyles(component){
 const props=component?.props||(component.props={});
 const styles=props.deviceStyles||(props.deviceStyles={});
 devices.forEach(device=>{
  if(!styles[device]) styles[device]={};
  const p=styles[device].position;
  if(p){
   p.x=Math.max(0,num(p.x));p.y=Math.max(0,num(p.y));
   p.width=Math.max(80,num(p.width,160));p.height=Math.max(36,num(p.height,48));
  }
  ['titlePosition','menuPosition'].forEach(key=>{if(styles[device][key]){styles[device][key].x=num(styles[device][key].x);styles[device][key].y=num(styles[device][key].y)}});
 });
 return component;
}

export function normalizeResponsiveDefinition(definition){
 Object.values(definition?.pages||{}).forEach(page=>(page.components||[]).forEach(normalizeDeviceStyles));
 return definition;
}

export function responsiveSnapshot(definition,pageId){
 const page=definition?.pages?.[pageId];
 return (page?.components||[]).map(component=>({id:component.id,type:component.type,deviceStyles:JSON.parse(JSON.stringify(component.props?.deviceStyles||{}))}));
}

export function restoreDeviceLayout(component,device){
 normalizeDeviceStyles(component);
 const p=component.props.deviceStyles?.[device]?.position;
 return p?{x:Math.max(0,num(p.x)),y:Math.max(0,num(p.y)),width:Math.max(80,num(p.width,160)),height:Math.max(36,num(p.height,48))}:null;
}

window.IndoResponsiveStability={normalizeDeviceStyles,normalizeResponsiveDefinition,responsiveSnapshot,restoreDeviceLayout};
