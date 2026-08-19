// Mobile APK build interaction fix.
// The normal click handler remains the source of truth; on touch devices we
// explicitly trigger it from touchend and suppress the synthetic click so the
// build is started exactly once.
(function(){
  function wire(){
    const b=document.getElementById('buildApkButton');
    if(!b || b.dataset.mobileApkFix==='1') return !!b;
    b.dataset.mobileApkFix='1';
    b.style.touchAction='manipulation';
    b.style.pointerEvents='auto';
    let touchTriggered=false;
    b.addEventListener('touchend',function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      touchTriggered=true;
      if(window.IndoApkBuild?.createBuild) window.IndoApkBuild.createBuild();
      setTimeout(()=>{touchTriggered=false},800);
    },{passive:false,capture:true});
    b.addEventListener('click',function(e){
      if(touchTriggered){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    return true;
  }
  if(!wire()){
    const mo=new MutationObserver(()=>{if(wire()) mo.disconnect()});
    mo.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>mo.disconnect(),15000);
  }
})();
