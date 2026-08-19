import { mountWorkflowRuntime } from './workflow-runtime.js';

let cleanup=()=>{};
export function mountPublishedWorkflows(definition){
  window.IndoAppDefinition=definition||{};
  cleanup();
  cleanup=mountWorkflowRuntime(`published-${definition?.publishing?.slug||Date.now()}`);
  return cleanup;
}
window.IndoPublishedWorkflows={mountPublishedWorkflows};
