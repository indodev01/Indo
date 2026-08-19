import { supabase } from '../auth/supabase-config.js';

const projectId=new URLSearchParams(location.search).get('projectId');
const DEVICES=['desktop','tablet','mobile'];
let activeDevice='desktop';
let projectDefinition=null;
let projectUser=null;

function clone(v){return JSON.parse(JSON.stringify(v??{}))}
function ensure(def){def.layoutByDevice=def.layoutByDevice||{};for(const d of DEVICES){def.layoutByDevice[d]=def.layoutByDevice[d]||{pages:{}};for(const [id,page] of Object.entries(def.pages||{})){def.layoutByDevice[d].pages[id]=def.layoutByDevice[d].pages[id]||{components:clone(page.components||[]),styles:clone(page.styles||{})};}}return def}
export function initDeviceLayouts(definition){projectDefinition=ensure(clone(definition));return projectDefinition}
export function setActiveDevice(device){if(DEVICES.includes(device))activeDevice=device;return activeDevice}
export function getActiveDevice(){return activeDevice}
export function loadDevicePage(pageId){if(!projectDefinition)return null;const d=ensure(projectDefinition);const stored=d.layoutByDevice?.[activeDevice]?.pages?.[pageId];return stored?clone(stored):{components:clone(d.pages?.[pageId]?.components||[]),styles:clone(d.pages?.[pageId]?.styles||{})}}
export function saveDevicePage(pageId,pageState){if(!projectDefinition)return;const d=ensure(projectDefinition);d.layoutByDevice[activeDevice].pages[pageId]=clone(pageState);}
export async function persistDeviceLayouts(definition){const auth=await supabase.auth.getUser();if(auth.error)throw auth.error;projectUser=auth.data.user;if(!projectUser)throw new Error('Not signed in');if(!projectId)throw new Error('Missing project ID');const d=ensure(clone(definition));const merged={...d,layoutByDevice:d.layoutByDevice};const result=await supabase.from('projects').update({app_definition:merged,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',projectUser.id).select('id').maybeSingle();if(result.error)throw result.error;if(!result.data)throw new Error('No project was updated');projectDefinition=merged;return merged}
window.IndoDeviceLayouts={initDeviceLayouts,setActiveDevice,getActiveDevice,loadDevicePage,saveDevicePage,persistDeviceLayouts};
