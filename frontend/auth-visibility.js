export function authVisibilityProps(mode='always'){
 const value=String(mode||'always').toLowerCase();
 return value==='signed-in'||value==='signed-out'?{'data-auth-visible':value}:{'data-auth-visible':'always'};
}
export function applyAuthVisibilityToElement(element,mode){if(!element)return element;Object.entries(authVisibilityProps(mode)).forEach(([key,value])=>element.setAttribute(key,value));return element;}
