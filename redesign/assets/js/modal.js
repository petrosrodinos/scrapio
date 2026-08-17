/* Generic modal open/close controller. Powers confirmation dialogs, the
   version-compare modal, and the shared expand-preview modal (JSON /
   Markdown / Interface).
   Markup contract:
   <button data-modal-open="delete-site">Delete</button>
   <div class="modal-backdrop" id="delete-site" data-modal hidden>
     <div class="modal" role="dialog" aria-modal="true">
       ...
       <button data-modal-close>Cancel</button>
     </div>
   </div>
   Optional: data-modal-open can carry data-modal-source="#tpl-id" to clone
   content into a shared expand modal (used by preview panels). */
(function () {
  var lastTrigger = null;

  function openModal(backdrop) {
    lastTrigger = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    var focusable = backdrop.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  }

  function closeModal(backdrop) {
    backdrop.hidden = true;
    document.body.style.overflow = "";
    if (lastTrigger) lastTrigger.focus();
  }

  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-modal-open]");
    if (opener) {
      var id = opener.getAttribute("data-modal-open");
      var backdrop = document.getElementById(id);
      if (!backdrop) return;

      var sourceSel = opener.getAttribute("data-modal-source");
      if (sourceSel) {
        var source = document.querySelector(sourceSel);
        var target = backdrop.querySelector("[data-modal-clone-target]");
        if (source && target) target.innerHTML = source.innerHTML;
      }
      var titleAttr = opener.getAttribute("data-modal-title");
      if (titleAttr) {
        var titleEl = backdrop.querySelector("[data-modal-title-target]");
        if (titleEl) titleEl.textContent = titleAttr;
      }

      openModal(backdrop);
      return;
    }

    var closer = e.target.closest("[data-modal-close]");
    if (closer) {
      var owningBackdrop = closer.closest("[data-modal]");
      if (owningBackdrop) closeModal(owningBackdrop);
      return;
    }

    if (e.target.matches("[data-modal]")) {
      closeModal(e.target);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = document.querySelector("[data-modal]:not([hidden])");
    if (open) closeModal(open);
  });
})();
