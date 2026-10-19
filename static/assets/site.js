// SamPay — small progressive enhancements. Every page works without this file.
(function () {
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // Theme toggle (initial theme is set inline in <head> to avoid a flash).
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("sampay-theme", next);
    });
  });

  // Remember the language the visitor picked.
  document.querySelectorAll("[data-lang]").forEach(function (a) {
    a.addEventListener("click", function () { store("sampay-lang", a.getAttribute("data-lang")); });
  });

  // Mobile menu.
  var header = document.querySelector(".site-header");
  var menuBtn = document.querySelector(".menu-btn");
  if (header && menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = header.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelectorAll(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { header.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); });
    });
  }

  // Tabs: [data-tabs] holds .tab buttons whose aria-controls point at panels.
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
      var label = document.querySelector("[data-tab-label]");
      if (label) label.textContent = tab.getAttribute("data-fig") || "";
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = null;
        if (k === "ArrowDown" || k === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (k === "ArrowUp" || k === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); n.focus(); select(n); }
      });
    });
  });

  // Auto-playing transfer demo.
  document.querySelectorAll("[data-demo]").forEach(function (demo) {
    var frames = demo.querySelectorAll("[data-frame]");
    var bars = demo.querySelectorAll(".demo-bars span");
    var cap = demo.querySelector("[data-caption]");
    var btn = demo.querySelector("[data-demo-toggle]");
    var steps = document.querySelectorAll("[data-step]");
    var caps = JSON.parse(demo.getAttribute("data-caps") || "[]");
    var i = 0, playing = !reduced;
    function show(n) {
      i = n;
      frames.forEach(function (f, k) { f.hidden = k !== n; });
      bars.forEach(function (b, k) { b.classList.toggle("on", k <= n); });
      steps.forEach(function (s, k) { s.classList.toggle("on", k === n); });
      if (cap) cap.textContent = caps[n] || "";
    }
    function label() { if (btn) btn.textContent = playing ? btn.getAttribute("data-pause") : btn.getAttribute("data-play"); }
    if (btn) btn.addEventListener("click", function () { playing = !playing; label(); });
    steps.forEach(function (s, k) { s.addEventListener("click", function () { playing = false; label(); show(k); }); });
    show(0); label();
    setInterval(function () { if (playing) show((i + 1) % frames.length); }, 2600);
  });

  // Countries explorer.
  document.querySelectorAll("[data-countries]").forEach(function (box) {
    var ctrls = box.querySelectorAll("[data-c]");
    var panels = box.querySelectorAll("[data-cpanel]");
    var names = box.querySelectorAll("[data-cname]");
    function pick(id) {
      ctrls.forEach(function (c) {
        var on = c.getAttribute("data-c") === id;
        c.classList.toggle("sel", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      var live = box.querySelector('[data-c="' + id + '"]').hasAttribute("data-live");
      panels.forEach(function (p) {
        var kind = p.getAttribute("data-cpanel");
        p.hidden = live ? kind !== "live" : kind === "live";
      });
      var nm = box.querySelector('[data-c="' + id + '"]').getAttribute("data-name");
      names.forEach(function (n) { n.textContent = nm; });
      box.setAttribute("data-current", id);
    }
    ctrls.forEach(function (c) { c.addEventListener("click", function () { pick(c.getAttribute("data-c")); }); });
    pick(box.getAttribute("data-current") || "cd");
  });

  // Forms: no backend yet — show a confirmation in place.
  document.querySelectorAll("form[data-local]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      f.classList.add("sent");
      var ok = f.nextElementSibling; if (ok) { ok.setAttribute("tabindex", "-1"); ok.focus(); }
    });
    var again = f.nextElementSibling && f.nextElementSibling.querySelector("[data-again]");
    if (again) again.addEventListener("click", function () { f.reset(); f.classList.remove("sent"); });
  });

  // Reveal on scroll.
  if (!reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("[data-reveal]").forEach(function (el, k) {
      if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add("in"); return; }
      el.style.transitionDelay = (k % 3) * 80 + "ms";
      io.observe(el);
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
  }
})();
