import { normalizeDefinition } from './app-definition.js';

export function applyPreviewMode(project,definition){
 const type=String(definition?.metadata?.projectType||project?.start_mode||'app').toLowerCase();
 const isWebsite=type==='website';
 document.body.dataset.projectType=isWebsite?'website':'app';
 const page=document.getElementById('previewCanvas');
 const frame=document.querySelector('.preview-frame');
 const title=document.querySelector('.page-header h1');
 if(isWebsite){
   if(title) title.textContent='Live Website Preview';
   frame?.classList.add('website-preview');
   page?.classList.add('website-canvas');
 }else{
   if(title) title.textContent='Live App Preview';
   frame?.classList.remove('website-preview');
   page?.classList.remove('website-canvas');
 }
 return {type:isWebsite?'website':'app',isWebsite};
}

export function previewDeviceWidth(type){return String(type).toLowerCase()==='website'?'100%':'430px'}
