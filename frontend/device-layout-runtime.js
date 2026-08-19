import { supabase } from './auth/supabase-config.js';

const DEVICE_KEYS=['desktop','tablet','mobile'];
const STATE_KEY='deviceLayouts';
const clone=value=>JSON.parse(JSON.stringify(value??{}));
export function getDeviceLayout(definition,device='desktop'){const layouts=definition?.[STATE_KEY]||{};return clone(layouts[device]||{});}
export function setDeviceLayout(definition,device,state){const next=clone(definition);next[STATE_KEY] ||= {};next[STATE_KEY][device]=clone(state);return next;}
export function captureCanvasLayout(canvas,components,device='desktop'){const rect=canvas?.getBoundingClientRect?.();const items=[...(canvas?.querySelectorAll?.('[data-component-id],.canvas-item')||[])];return {device,viewport:{width:Math.round(rect?.width||0),height:Math.round(rect?.height||0)},items:items.map((el,index)=>{const r=el.getBoundingClientRect();return {id:el.dataset.componentId||components?.[index]?.id||String(index),x:Math.round(r.left-(rect?.left||0)),y:Math.round(r.top-(rect?.top||0)),width:Math.round(r.width),height:Math.round(r.height)};})};}
export function applyCanvasLayout(canvas,layout){if(!canvas||!layout?.items?.length)return;const map=new Map(layout.items.map(item=>[String(item.id),item]));[...canvas.querySelectorAll('[data-component-id],.canvas-item')].forEach((el,index)=>{const id=String(el.dataset.componentId||el.dataset.index||index);const item=map.get(id)||map.get(String(index));if(!item)return;el.style.position='absolute';el.style.left=`${item.x}px`;el.style.top=`${item.y}px`;if(item.width)el.style.width=`${item.width}px`;if(item.height)el.style.height=`${item.height}px`;});}
export async function persistDeviceLayouts(projectId,userId,definition){if(!projectId||!userId)return;const result=await supabase.from('projects').update({app_definition:definition,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',userId);if(result.error)throw result.error;}
export {DEVICE_KEYS,STATE_KEY};
window.IndoDeviceLayout={getDeviceLayout,setDeviceLayout,captureCanvasLayout,applyCanvasLayout,persistDeviceLayouts,DEVICE_KEYS};
