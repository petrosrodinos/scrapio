/* Generic accordion + disclosure controller.
   Markup contract:
   <div class="accordion-item" data-accordion data-open="false">
     <button class="accordion__trigger" data-accordion-trigger>Label <svg data-chevron>...</svg></button>
     <div class="accordion__panel" data-accordion-panel hidden>...</div>
   </div>
   Also drives .disclosure ("Advanced settings") using the same trigger/panel attributes. */
(function () {
  function toggle(item) {
    var isOpen = item.getAttribute("data-open") === "true";
    var panel = item.querySelector(":scope > [data-accordion-panel]") ||
      item.querySelector(":scope > .disclosure__panel");
    item.setAttribute("data-open", String(!isOpen));
    if (panel) panel.hidden = isOpen;
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-accordion-trigger]");
    if (!trigger) return;
    var item = trigger.closest("[data-accordion], .disclosure");
    if (!item) return;
    e.stopPropagation();
    toggle(item);
  });
})();
