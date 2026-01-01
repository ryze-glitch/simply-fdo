(() => {
  const normaLinks = new Map();

  // Accetta:
  // - setNormaLinks("art. 7 ...", "https://...")
  // - setNormaLinks("art. 7 ...|https://...")
  window.setNormaLinks = function setNormaLinks(...args) {
    for (let i = 0; i < args.length; i++) {
      const a = String(args[i]);

      if (a.includes("|")) {
        const [label, url] = a.split("|");
        if (label && url) normaLinks.set(label.trim(), url.trim());
        continue;
      }

      const next = args[i + 1];
      if (typeof next === "string" && /^https?:\/\//i.test(next)) {
        normaLinks.set(a.trim(), String(next).trim());
        i++;
      }
    }
  };

  window.apriNorma = function apriNorma(label) {
    const url = normaLinks.get(String(label).trim());
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const selected = new Set();

  function getRowInfo(violazioneId) {
    const icon = document.getElementById(`violazione-icon-${violazioneId}`);
    const row = icon ? icon.closest("tr") : null;
    if (!row) return null;

    const cells = row.querySelectorAll("td");
    const violazione = (cells[1]?.innerText || "").trim();
    const norma = (cells[2]?.innerText || "").trim();
    const categoria = (cells[3]?.innerText || "").trim();
    const sanzione = (cells[4]?.innerText || "").trim();
    const punti = (cells[5]?.innerText || "").trim();
    const accessorie = (cells[6]?.innerText || "").trim();

    return { icon, row, violazione, norma, categoria, sanzione, punti, accessorie };
  }

  function renderRiepilogo() {
    const box = document.getElementById("riepilogo-container");
    if (!box) return;

    if (selected.size === 0) {
      box.innerHTML = `
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-800 dark:text-white">Riepilogo violazioni selezionate</h2>
        </div>
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-exclamation-circle text-4xl mb-2"></i>
          <p>Nessuna violazione selezionata</p>
        </div>
      `;
      return;
    }

    const items = [...selected]
      .map((id) => {
        const info = getRowInfo(id);
        if (!info) return "";
        const accessorie = info.accessorie ? info.accessorie : "-";
        return `
          <div class="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-gray-700 py-3">
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 dark:text-white">${info.violazione}</div>
              <div class="text-sm text-gray-500 dark:text-gray-300">${info.norma} • ${info.categoria}</div>
              <div class="text-sm text-gray-600 dark:text-gray-300">Sanzione: ${info.sanzione} • Punti: ${info.punti}</div>
              <div class="text-sm text-gray-600 dark:text-gray-300">Sanzioni accessorie: ${accessorie}</div>
            </div>
            <button type="button" onclick="toggleViolazione('${id}')" class="text-red-600 hover:text-red-900">
              <i class="far fa-times-circle"></i>
            </button>
          </div>
        `;
      })
      .join("");

    box.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">Riepilogo violazioni selezionate</h2>
        <span class="text-sm text-gray-500">${selected.size} selezionate</span>
      </div>
      <div>${items}</div>
    `;
  }

  window.toggleViolazione = function toggleViolazione(violazioneId) {
    const info = getRowInfo(violazioneId);
    if (!info) return;

    const isSelected = selected.has(violazioneId);
    if (isSelected) {
      selected.delete(violazioneId);
      info.icon.classList.remove("fa-check-square");
      info.icon.classList.add("fa-square");
    } else {
      selected.add(violazioneId);
      info.icon.classList.remove("fa-square");
      info.icon.classList.add("fa-check-square");
    }

    renderRiepilogo();
  };

  window.clearSelected = function clearSelected() {
    [...selected].forEach((id) => {
      const icon = document.getElementById(`violazione-icon-${id}`);
      if (icon) {
        icon.classList.remove("fa-check-square");
        icon.classList.add("fa-square");
      }
      selected.delete(id);
    });
    renderRiepilogo();
  };

  function setupRiepilogoToggle() {
    const btn = document.getElementById("toggle-riepilogo");
    const box = document.getElementById("riepilogo-container");
    const sep = document.getElementById("custom-separator");
    if (!btn || !box) return;

    btn.addEventListener("click", () => {
      const open = btn.getAttribute("data-state") === "1";
      btn.setAttribute("data-state", open ? "0" : "1");
      btn.querySelector("span")?.replaceChildren(document.createTextNode(open ? "Mostra riepilogo" : "Nascondi riepilogo"));
      box.classList.toggle("hidden", open);
      if (sep) sep.classList.toggle("hidden", open);
    });
  }

  function setupSearchAndFilter() {
    const input = document.getElementById("search-input");
    const tbody = document.getElementById("violazioni-tabella");
    const counter = document.getElementById("violazioni-conteggio");
    const resetBtn = document.getElementById("reset-filters");
    const dropdownBtn = document.getElementById("categoria-dropdown-button");
    const dropdownMenu = document.getElementById("categoria-dropdown-menu");

    let categoria = null;

    function apply() {
      if (!tbody) return;
      const q = (input?.value || "").trim().toLowerCase();

      let visible = 0;
      tbody.querySelectorAll("tr").forEach((tr) => {
        const text = tr.innerText.toLowerCase();
        const catCell = tr.querySelectorAll("td")[3]?.innerText?.trim() || "";
        const okQ = !q || text.includes(q);
        const okC = !categoria || catCell === categoria;
        const show = okQ && okC;
        tr.classList.toggle("hidden", !show);
        if (show) visible++;
      });

      if (counter) counter.textContent = `${visible} violazioni trovate. Seleziona le violazioni per aggiungerle al riepilogo.`;
    }

    if (input) input.addEventListener("input", apply);

    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener("click", () => dropdownMenu.classList.toggle("hidden"));
      dropdownMenu.addEventListener("click", (e) => {
        const btn = e.target.closest(".categoria-filter");
        if (!btn) return;
        categoria = btn.getAttribute("data-categoria");
        dropdownBtn.querySelector("span")?.replaceChildren(document.createTextNode(categoria));
        dropdownMenu.classList.add("hidden");
        apply();
      });

      document.addEventListener("click", (e) => {
        if (!dropdownMenu.contains(e.target) && !dropdownBtn.contains(e.target)) dropdownMenu.classList.add("hidden");
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (input) input.value = "";
        categoria = null;
        dropdownBtn?.querySelector("span")?.replaceChildren(document.createTextNode("Filtra per categoria"));
        apply();
      });
    }

    apply();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupRiepilogoToggle();
    setupSearchAndFilter();
    renderRiepilogo();
  });
})();
