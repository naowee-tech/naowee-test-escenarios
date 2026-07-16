/* ═══════════════════════════════════════════════════════════════
   WIZARD SHELL — sticky header scroll detection
   Adds .is-stuck to .auth-header once the user has scrolled past
   a tiny sentinel element at the top of the shell.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  function init(){
    const header = document.querySelector('.auth-header');
    if(!header) return;

    // Scroll listener — toggle .is-stuck for compact style
    // (sticky positioning handled by CSS directly)
    const onScroll = () => {
      const scrolled = (window.scrollY || document.documentElement.scrollTop) > 20;
      if(scrolled){
        header.classList.add('is-stuck');
      } else {
        header.classList.remove('is-stuck');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
