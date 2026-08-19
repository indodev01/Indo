import { getDeviceLayout,setDeviceLayout,captureCanvasLayout,persistDeviceLayouts } from './device-layout-runtime.js';

const projectId=new URLSearchParams(location.search).get('projectId');
let currentDevice='desktop';
let currentDefinition=null;
let currentUserId=null;

export function initResponsiveLayoutRuntime({definition,userId,device='desktop'}={}){currentDefinition=definition;currentUserId=userId;currentDevice=device;return {switchDevice,saveCurrentDevice,loadDevice};}
export function switchDevice(device){currentDevice=['desktop','tablet','mobile'].includes(device)?device:'desktop';return getDeviceLayout(currentDefinition,currentDevice);}
export function saveCurrentDevice(canvas,components){const layout=captureCanvasLayout(canvas,components,currentDevice);currentDefinition=setDeviceLayout(currentDefinition,currentDevice,layout);return currentDefinition;}
export function loadDevice(canvas){const layout=getDeviceLayout(currentDefinition,currentDevice);if(layout?.items?.length){window.IndoDeviceLayout?.applyCanvasLayout(canvas,layout);}return layout;}
export async function saveAllDeviceLayouts(canvas,components){saveCurrentDevice(canvas,components);await persistDeviceLayouts(projectId,currentUserId,currentDefinition);return currentDefinition;}
window.IndoResponsiveLayoutRuntime={initResponsiveLayoutRuntime,switchDevice,saveCurrentDevice,loadDevice,saveAllDeviceLayouts};
