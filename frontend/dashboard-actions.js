document.addEventListener('click',(event)=>{
  const profileEdit=event.target.closest?.('[data-profile-edit]');
  if(profileEdit){event.preventDefault();event.stopPropagation();window.location.href='account-settings.html';}
});