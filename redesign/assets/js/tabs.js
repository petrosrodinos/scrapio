/* Generic tab controller.
   Markup contract:
   <div data-tabs>
     <div class="tabs__list" role="tablist">
       <button class="tabs__trigger" data-tab-trigger="json" aria-selected="true">JSON</button>
       <button class="tabs__trigger" data-tab-trigger="interface" aria-selected="false">Interface</button>
     </div>
     <div class="tabs__panel" data-tab-panel="json">...</div>
     <div class="tabs__panel" data-tab-panel="interface" hidden>...</div>
   </div>
   Also used for the Site detail "Site info / Scrapers" tabs. */
(function () {
  function activate(root, key) {
    root.querySelectorAll("[data-tab-trigger]").forEach(function (btn) {
      btn.setAttribute("aria-selected", String(btn.getAttribute("data-tab-trigger") === key));
    });
    root.querySelectorAll("[data-tab-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-tab-panel") !== key;
    });
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-tab-trigger]");
    if (!trigger) return;
    var root = trigger.closest("[data-tabs]");
    if (!root) return;
    activate(root, trigger.getAttribute("data-tab-trigger"));
  });

  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    var active = root.querySelector('[data-tab-trigger][aria-selected="true"]');
    if (active) activate(root, active.getAttribute("data-tab-trigger"));
  });
})();
