/* ═══════════════════════════════════════════════════════════════
   NAOWEE PAGE TRANSITIONS — fade out/in entre páginas del shell
   Resuelve el "blink" al hacer click en un nav-row o cualquier
   enlace que navegue dentro del mismo shell.
   - Entrada: opacity 0 → 1 al cargar (cubre el frame en blanco que
     aparece tras la navegación clásica window.location.href).
   - Salida: cuando el usuario hace click en .nav-row o un link interno,
     interceptamos, hacemos fade-out de .page (~140ms) y luego navegamos.
   - Solo aplica a .page (no al sidebar) — para mantener el sidebar fijo
     y evitar que su animación de active-bar se sienta como un salto.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const ENTER_MS = 220;
  const EXIT_MS  = 160;

  function enter(){
    const page = document.querySelector('.page');
    if (!page) return;
    page.classList.add('page-fade-enter');
    setTimeout(() => page.classList.remove('page-fade-enter'), ENTER_MS + 80);
  }

  function exit(targetUrl){
    const page = document.querySelector('.page');
    if (!page) { window.location.href = targetUrl; return; }
    page.classList.add('page-fade-exit');
    setTimeout(() => { window.location.href = targetUrl; }, EXIT_MS);
  }

  /* Detecta navegación interna desde sidebar y otros elementos con
     onclick="window.location.href='...'" o data-page-nav. */
  function isInternalLink(href){
    if (!href) return false;
    if (href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('http://') || href.startsWith('https://') ||
        href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    return true;
  }

  function init(){
    enter();

    // Intercepta clicks en .nav-row (sidebar items) que navegan
    document.addEventListener('click', (e) => {
      // Skip si modificadores (Cmd/Ctrl/Shift click → nueva tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0 && e.button !== undefined) return;

      const navRow = e.target.closest('.nav-row');
      if (navRow && navRow.getAttribute('onclick')) {
        const m = navRow.getAttribute('onclick').match(/window\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
        if (m && isInternalLink(m[1])) {
          // No interceptar si es la página activa
          if (navRow.classList.contains('active')) return;
          e.preventDefault();
          e.stopPropagation();
          // Limpiar el onclick para evitar doble-fire
          navRow.onclick = null;
          exit(m[1]);
          return;
        }
      }

      // Soporte para [data-page-nav="url"]
      const dataNav = e.target.closest('[data-page-nav]');
      if (dataNav) {
        const url = dataNav.getAttribute('data-page-nav');
        if (isInternalLink(url)) {
          e.preventDefault();
          exit(url);
        }
      }
    }, true /* capture — antes que onclick inline */);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
