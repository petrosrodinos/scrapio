/* Prototype-only: fakes a live progress feel on runs/progress.html and
   scrapers/generation-progress.html by periodically revealing the next
   step in a list and nudging a progress label. Not representative of
   real polling logic — purely a demo affordance. */
(function () {
  var track = document.querySelector("[data-simulate-progress]");
  if (!track) return;

  var steps = Array.prototype.slice.call(track.querySelectorAll("[data-sim-step]"));
  var label = document.querySelector("[data-sim-label]");
  var revealed = parseInt(track.getAttribute("data-sim-revealed") || "0", 10);

  function reveal(index) {
    var step = steps[index];
    if (!step) return;
    step.classList.add("is-active");
    step.removeAttribute("hidden");
    steps.forEach(function (s, i) {
      s.classList.toggle("is-active", i === index);
    });
    if (label) {
      label.textContent = "Step " + (index + 1) + " of " + steps.length;
    }
  }

  if (steps.length === 0) return;
  reveal(Math.min(revealed, steps.length - 1));

  var i = revealed;
  var timer = window.setInterval(function () {
    i += 1;
    if (i >= steps.length) {
      window.clearInterval(timer);
      var banner = document.querySelector("[data-sim-complete-banner]");
      if (banner) banner.hidden = false;
      return;
    }
    reveal(i);
  }, 2200);
})();
