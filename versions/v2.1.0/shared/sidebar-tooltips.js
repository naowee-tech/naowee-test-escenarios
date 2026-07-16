/* ═══════════════════════════════════════════════════════════════
   NAOWEE SIDEBAR TOOLTIPS — para sidebar colapsado
   Portado 1:1 desde naowee-test-sidebar-shell.
   En estado .collapsed, hover sobre un .nav-row muestra el texto
   del .lbl como tooltip flotante a la derecha del sidebar.
   Se monta solo (auto-init en DOMContentLoaded).
   ═══════════════════════════════════════════════════════════════ */
(function(){
  let _tooltipEl = null;

  function ensureTooltip(){
    if (_tooltipEl) return _tooltipEl;
    _tooltipEl = document.createElement('div');
    _tooltipEl.className = 'nav-tooltip';
    document.body.appendChild(_tooltipEl);
    return _tooltipEl;
  }

  function hideTooltip(){
    if (_tooltipEl) _tooltipEl.classList.remove('is-visible');
  }

  function showTooltip(sidebar, row){
    if (!sidebar.classList.contains('collapsed')) return;
    const lbl = row.querySelector('.lbl');
    if (!lbl) return;
    const tip = ensureTooltip();
    tip.textContent = lbl.textContent.trim();
    const rect = row.getBoundingClientRect();
    tip.style.left = (rect.right + 12) + 'px';
    tip.style.top  = (rect.top + rect.height / 2) + 'px';
    tip.classList.add('is-visible');
  }

  function init(){
    const sidebars = document.querySelectorAll('.sidebar');
    sidebars.forEach(sidebar => {
      const rows = sidebar.querySelectorAll('.nav-row');
      rows.forEach(row => {
        row.addEventListener('mouseenter', () => showTooltip(sidebar, row));
        row.addEventListener('mouseleave', hideTooltip);
      });
      // Ocultar al colapsar/expandir (mutación de class)
      const obs = new MutationObserver(hideTooltip);
      obs.observe(sidebar, { attributes:true, attributeFilter:['class'] });
    });
    // Ocultar también al hacer scroll de la página (rect cambia)
    window.addEventListener('scroll', hideTooltip, { passive:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
