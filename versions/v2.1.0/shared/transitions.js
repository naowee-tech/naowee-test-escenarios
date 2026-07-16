/* ═══════════════════════════════════════════════════════════════
   WIZARD PAGE TRANSITIONS — runtime
   - Adds .wizard-page-enter on DOMContentLoaded
   - Intercepts data-wizard-nav="target.html" clicks to animate exit
     before navigating (~240ms)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const EXIT_MS = 240;

  // Entrance on load — remove class after animation completes
  // so the matrix transform doesn't break position:sticky descendants
  function enter(){
    document.body.classList.add('wizard-page-enter');
    setTimeout(() => {
      document.body.classList.remove('wizard-page-enter');
    }, 500);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', enter);
  } else {
    enter();
  }

  // Click interceptor for any element with data-wizard-nav attribute
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-wizard-nav]');
    if(!target) return;
    const url = target.getAttribute('data-wizard-nav');
    if(!url) return;
    e.preventDefault();
    navigate(url);
  });

  function navigate(url){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      window.location.href = url;
      return;
    }
    document.body.classList.remove('wizard-page-enter');
    // Force reflow so the class change takes effect before adding exit
    void document.body.offsetHeight;
    document.body.classList.add('wizard-page-exit');
    setTimeout(() => { window.location.href = url; }, EXIT_MS);
  }

  // Expose for programmatic calls (e.g. after form validation)
  window.wizardNavigate = navigate;
})();
