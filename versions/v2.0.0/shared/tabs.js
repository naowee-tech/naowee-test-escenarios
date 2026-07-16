/**
 * Naowee Tabs — sliding indicator
 * ────────────────────────────────────────────────────────────────
 * Uso:
 *   <div class="naowee-tabs naowee-tabs--animated" data-naowee-tabs>
 *     <button class="naowee-tab naowee-tab--selected" data-naowee-tab>Tab 1</button>
 *     <button class="naowee-tab" data-naowee-tab>Tab 2</button>
 *     <span class="naowee-tabs__indicator" aria-hidden="true"></span>
 *   </div>
 *
 * Auto-init al DOMContentLoaded. Para inicializar manualmente tras
 * inyectar tabs dinámicos: window.NaoweeTabs.init(root?).
 *
 * Eventos:
 *   - 'naowee-tab:change' se dispara en el contenedor con
 *     { detail: { tab, index, value } } donde value = tab.dataset.value.
 */
(function () {
  'use strict';

  function moveIndicator(tabsEl, indicator, tab, animate) {
    if (!tab || !indicator) return;
    var tabsRect = tabsEl.getBoundingClientRect();
    var tabRect = tab.getBoundingClientRect();
    var x = tabRect.left - tabsRect.left + tabsEl.scrollLeft;

    if (!animate) {
      var prev = indicator.style.transition;
      indicator.style.transition = 'none';
      indicator.style.width = tabRect.width + 'px';
      indicator.style.transform = 'translateX(' + x + 'px)';
      // reflow para que el próximo cambio sí anime
      void indicator.offsetWidth;
      indicator.style.transition = prev;
      return;
    }
    indicator.style.width = tabRect.width + 'px';
    indicator.style.transform = 'translateX(' + x + 'px)';
  }

  function initTabs(tabsEl) {
    if (tabsEl.__naoweeTabsInit) return;
    tabsEl.__naoweeTabsInit = true;

    var indicator = tabsEl.querySelector('.naowee-tabs__indicator');
    if (!indicator) return;

    var tabs = tabsEl.querySelectorAll('[data-naowee-tab]');
    if (!tabs.length) return;

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        if (tab.classList.contains('naowee-tab--disabled')) return;
        if (tab.classList.contains('naowee-tab--selected')) return;
        tabs.forEach(function (t) { t.classList.remove('naowee-tab--selected'); });
        tab.classList.add('naowee-tab--selected');
        moveIndicator(tabsEl, indicator, tab, true);
        tabsEl.dispatchEvent(new CustomEvent('naowee-tab:change', {
          bubbles: true,
          detail: { tab: tab, index: i, value: tab.dataset.value || null }
        }));
      });
    });

    // Posición inicial (sin animar)
    var initial = tabsEl.querySelector('.naowee-tab--selected') || tabs[0];
    if (initial) {
      if (!initial.classList.contains('naowee-tab--selected')) {
        initial.classList.add('naowee-tab--selected');
      }
      requestAnimationFrame(function () { moveIndicator(tabsEl, indicator, initial, false); });
    }

    // Reacomodar en resize
    var resizeHandler = function () {
      var selected = tabsEl.querySelector('.naowee-tab--selected');
      moveIndicator(tabsEl, indicator, selected, false);
    };
    window.addEventListener('resize', resizeHandler);

    // Recalcular cuando las fonts terminan de cargar (Inter de Google Fonts cambia el ancho)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        var selected = tabsEl.querySelector('.naowee-tab--selected');
        moveIndicator(tabsEl, indicator, selected, false);
      });
    }
  }

  function initAll(root) {
    root = root || document;
    root.querySelectorAll('[data-naowee-tabs]').forEach(initTabs);
  }

  window.NaoweeTabs = { init: initAll, initOne: initTabs };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }
})();
