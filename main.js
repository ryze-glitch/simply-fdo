(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  function setTheme(theme) {
    const html = document.documentElement;
    if (theme === "dark") html.dataset.theme = "dark";
    else delete html.dataset.theme;

    const desktop = $("#theme-toggle-checkbox");
    const mobile = $("#mobile-theme-toggle-checkbox");
    const checked = theme === "dark";
    if (desktop) desktop.checked = checked;
    if (mobile) mobile.checked = checked;

    localStorage.setItem("theme", theme);
  }

  function getInitialTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function formatDateTimeIt(d) {
    const datePart = new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);

    const timePart = new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    return `${cap(datePart)} - ${timePart}`;
  }

  function updateDateTime() {
    const now = new Date();
    const text = formatDateTimeIt(now);
    const a = $("#current-datetime");
    const b = $("#mobile-current-datetime");
    if (a) a.textContent = text;
    if (b) b.textContent = text;
  }

  function setupMobileMenu() {
    const btn = $("#mobile-menu-button");
    const menu = $("#mobile-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", () => menu.classList.toggle("hidden"));
  }

  function setupBackToTop() {
    const btn = $("#back-to-top");
    if (!btn) return;

    const onScroll = () => {
      if (window.scrollY > 300) {
        btn.classList.add("visible");
        btn.classList.remove("opacity-0", "invisible");
      } else {
        btn.classList.remove("visible");
        btn.classList.add("opacity-0", "invisible");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // Serve perché nelle HTML originali c’è uno script inline che la chiama
  window.setupChangelogPopup = function setupChangelogPopup(items = [], version = "0.0.0", force = false) {
    const popup = $("#changelog-popup");
    const list = $("#changelog-list");
    const closeBtn = $("#changelog-close");
    if (!popup || !list || !closeBtn) return;

    const seenKey = "changelogSeenVersion";
    const seen = localStorage.getItem(seenKey);

    list.innerHTML = "";
    (items || []).forEach((txt) => {
      const li = document.createElement("li");
      li.className = "flex items-start";
      li.innerHTML = `
        <span class="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-2"></span>
        <span>${String(txt)}</span>
      `;
      list.appendChild(li);
    });

    const shouldShow = force || !seen || seen !== String(version);
    if (shouldShow) popup.classList.remove("hidden");

    closeBtn.addEventListener(
      "click",
      () => {
        popup.classList.add("hidden");
        localStorage.setItem(seenKey, String(version));
      },
      { once: true }
    );
  };

  document.addEventListener("DOMContentLoaded", () => {
    const loading = $("#loading-indicator");
    if (loading) loading.classList.add("active");
    requestAnimationFrame(() => setTimeout(() => loading && loading.classList.remove("active"), 150));

    setTheme(getInitialTheme());
    updateDateTime();
    setInterval(updateDateTime, 30_000);

    setupMobileMenu();
    setupBackToTop();

    const desktop = $("#theme-toggle-checkbox");
    const mobile = $("#mobile-theme-toggle-checkbox");
    if (desktop) desktop.addEventListener("change", () => setTheme(desktop.checked ? "dark" : "light"));
    if (mobile) mobile.addEventListener("change", () => setTheme(mobile.checked ? "dark" : "light"));
  });
})();
