/* ═══════════════════════════════════════════════════════════════
   NAOWEE SIDEBAR STATE — persistencia + sin flicker
   - Lee sessionStorage al cargar (sync, idealmente en <head>) y aplica
     html.naowee-sidebar-collapsed-init para que el sidebar se pinte
     directamente colapsado sin animación de 274 → 72.
   - Al DOMContentLoaded, mueve el estado al .sidebar.collapsed (existente)
     y enlaza el burger para guardar el toggle.
   - Persiste en sessionStorage (vive durante la sesión, se limpia al cerrar
     pestaña — paridad con preferencia transitoria).
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const KEY = 'naoweeSidebarCollapsed';
  const INIT_CLASS = 'naowee-sidebar-collapsed-init';

  /* ─── 1. Sync init: aplica clase al <html> antes del primer paint ─── */
  if (sessionStorage.getItem(KEY) === '1') {
    document.documentElement.classList.add(INIT_CLASS);
  }

  /* ─── 2. Wire post-DOM: traslada estado al .sidebar y persiste toggle ─── */
  function wire(){
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Si veníamos colapsados desde sessionStorage, fija .collapsed en el sidebar.
    // La clase html.naowee-sidebar-collapsed-init aplica el width 72px sin
    // transición; al añadir .collapsed al sidebar el match cambia al rule
    // .sidebar.collapsed (también 72px) sin disparar animación.
    const wasInit = document.documentElement.classList.contains(INIT_CLASS);
    if (wasInit) {
      sidebar.classList.add('collapsed');
      // Quitamos la clase html después del primer paint para reactivar
      // transiciones (toggle manual con burger debe volver a animar).
      setTimeout(() => {
        document.documentElement.classList.remove(INIT_CLASS);
      }, 80);
    }

    // Burger: persiste el toggle
    const burger = sidebar.querySelector('.burger-btn');
    if (!burger) return;

    // Removemos cualquier onclick inline previo y wireamos uno nuevo
    burger.onclick = function(){
      const isNowCollapsed = !sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed');
      if (isNowCollapsed) {
        sessionStorage.setItem(KEY, '1');
      } else {
        sessionStorage.removeItem(KEY);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
