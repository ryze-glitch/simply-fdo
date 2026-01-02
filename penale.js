(() => {
  const normaLinks = new Map();
  const selected = new Set();

  // ---- Helpers: parsing importi e tempi ----
  function parseEuro(str) {
    const s = String(str || "").trim();
    if (!s || s === "-" ) return 0;
    // Gestisce "8.000,00" -> 8000
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  function formatEuro(n) {
    try {
      return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
    } catch {
      // fallback
      return `€ ${Number(n || 0).toFixed(2).replace(".", ",")}`;
    }
  }

  function parseMonthsFromCell(str) {
    const s = String(str || "").trim().toLowerCase();
    if (!s || s === "-" ) return 0;

    // Supporta: "15 mesi", "23 min", "Fino a 1 anno" (molto semplice)
    const mMesi = s.match(/(\d+)\s*(mesi|mese)/);
    if (mMesi) return Number(mMesi[1]) || 0;

    const mMin = s.match(/(\d+)\s*(min|mins|minuti)/);
    if (mMin) return Math.max(1, Math.round((Number(mMin[1]) || 0) / 30)); // approx

    const mAnno = s.match(/(\d+)\s*(anni|anno)/);
    if (mAnno) return (Number(mAnno[1]) || 0) * 12;

    if (s.includes("fino a 1 anno")) return 12;

    return 0;
  }

  function formatReclusioneTotal(months) {
    // Nello screenshot vuoi "23 min" ecc. Qui facciamo:
    // - se < 1 mese -> "x min"
    // - altrimenti -> "x mesi"
    if (months <= 0) return "0 min";
    if (months < 1) return "1 min";
    return `${months} mesi`;
  }

  async function copyText(text) {
    const t = String(text ?? "");
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      // fallback vecchio stile
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  // ---- Navbar hook (opzionale) ----
  function setupBackToDashboard() {
    const btn = document.getElementById("back-to-dashboard");
    if (!btn) return;
  }

  // ---- Norma links helpers ----
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

  // ---- Selezione reati (checkbox FontAwesome nel tuo HTML) ----
  function getRowInfo(reatoId) {
    const icon = document.getElementById(`reato-icon-${reatoId}`);
    const row = icon ? icon.closest("tr") : null;
    if (!row) return null;

    const cells = row.querySelectorAll("td");

    const reato = (cells[1]?.innerText || "").trim();
    const norma = (cells[2]?.innerText || "").trim(); // es. "art. 277 c.p."
    const categoria = (cells[3]?.innerText || "").trim();
    const sanzione = (cells[4]?.innerText || "").trim();
    const reclusione = (cells[5]?.innerText || "").trim();

    return { icon, row, reato, norma, categoria, sanzione, reclusione };
  }

  function renderRiepilogo() {
    const box = document.getElementById("riepilogo-container");
    if (!box) return;

    // Se vuoto: layout semplice (come prima)
    if (selected.size === 0) {
      box.innerHTML = `
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-800 dark:text-white">Riepilogo reati selezionati</h2>
        </div>

        <div class="text-center py-10 text-gray-500">
          <i class="fas fa-exclamation-circle text-4xl mb-2"></i>
          <p>Nessun reato selezionato</p>
        </div>
      `;
      return;
    }

    // Totali
    let totalEuro = 0;
    let totalMonths = 0;

    const rows = [...selected].map((id) => {
      const info = getRowInfo(id);
      if (!info) return null;

      totalEuro += parseEuro(info.sanzione);
      totalMonths += parseMonthsFromCell(info.reclusione);

      return {
        id,
        reato: info.reato,
        norma: info.norma,
        sanzione: info.sanzione || "-",
        reclusione: info.reclusione || "-",
      };
    }).filter(Boolean);

    const totalEuroText = formatEuro(totalEuro);
    const totalReclText = formatReclusioneTotal(totalMonths);

    // HTML stile screenshot
    box.innerHTML = `
      <div class="mb-4">
        <h2 class="text-xl font-bold text-gray-200">Riepilogo reati selezionati</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Totale sanzioni -->
        <div class="bg-slate-800/60 border border-slate-700 rounded-lg p-5 flex items-center justify-between">
          <div>
            <div class="text-slate-300 text-sm mb-2">Totale sanzioni</div>
            <div class="text-4xl font-bold text-white">${totalEuroText}</div>
          </div>
          <button type="button" id="copy-sanzioni"
            class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
            <i class="fas fa-copy"></i>
            Copia
          </button>
        </div>

        <!-- Totale reclusione -->
        <div class="bg-slate-800/60 border border-slate-700 rounded-lg p-5 flex items-center justify-between">
          <div>
            <div class="text-slate-300 text-sm mb-2">Totale reclusione</div>
            <div class="text-4xl font-bold text-white">${totalReclText}</div>
          </div>
          <button type="button" id="copy-reclusione"
            class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
            <i class="fas fa-copy"></i>
            Copia
          </button>
        </div>
      </div>

      <div class="overflow-x-auto bg-slate-900/40 border border-slate-700 rounded-lg">
        <table class="min-w-full divide-y divide-slate-700">
          <thead class="bg-slate-800/60">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Reato</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Norma</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Sanzione</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Reclusione</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Azioni</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-800">
            ${rows.map(r => `
              <tr class="hover:bg-slate-800/40">
                <td class="px-4 py-4 text-sm text-white font-semibold">${escapeHtml(r.reato)}</td>
                <td class="px-4 py-4 text-sm">
                  <button type="button"
                    class="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-2"
                    onclick="apriNorma('${escapeAttr(r.norma)}')">
                    <i class="fas fa-book"></i>
                    ${escapeHtml(r.norma)}
                  </button>
                </td>
                <td class="px-4 py-4 text-sm text-slate-200">${escapeHtml(r.sanzione)}</td>
                <td class="px-4 py-4 text-sm text-slate-200">${escapeHtml(r.reclusione)}</td>
                <td class="px-4 py-4 text-right">
                  <button type="button" class="text-red-500 hover:text-red-400"
                    onclick="toggleReato('${escapeAttr(r.id)}')" title="Rimuovi">
                    <i class="fas fa-times"></i>
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    // Hook copia
    const btnCopyS = document.getElementById("copy-sanzioni");
    const btnCopyR = document.getElementById("copy-reclusione");

    btnCopyS?.addEventListener("click", async () => {
      await copyText(totalEuroText);
      btnCopyS.blur();
    });

    btnCopyR?.addEventListener("click", async () => {
      await copyText(totalReclText);
      btnCopyR.blur();
    });
  }

  // escaping semplice
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(s) {
    return String(s ?? "").replaceAll("'", "\\'");
  }

  window.toggleReato = function toggleReato(reatoId) {
    const info = getRowInfo(reatoId);
    if (!info) return;

    const isSelected = selected.has(reatoId);

    if (isSelected) {
      selected.delete(reatoId);
      info.icon.classList.remove("fa-check-square");
      info.icon.classList.add("fa-square");
    } else {
      selected.add(reatoId);
      info.icon.classList.remove("fa-square");
      info.icon.classList.add("fa-check-square");
    }

    renderRiepilogo();
  };

  window.clearSelected = function clearSelected() {
    [...selected].forEach((id) => {
      const icon = document.getElementById(`reato-icon-${id}`);
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

    // auto-open se query ?riepilogo=1
    const params = new URLSearchParams(window.location.search);
    const wantOpen = params.get("riepilogo") === "1";

    if (wantOpen) {
      btn.setAttribute("data-state", "1");
      btn.querySelector("span")?.replaceChildren(document.createTextNode("Nascondi riepilogo"));
      box.classList.remove("hidden");
      if (sep) sep.classList.remove("hidden");
    }

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
    const tbody = document.getElementById("reati-tabella");
    const counter = document.getElementById("reati-conteggio");
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

      if (counter) counter.textContent = `${visible} reati trovati. Seleziona i reati per aggiungerli al riepilogo.`;
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
    setupBackToDashboard();
    setupRiepilogoToggle();
    setupSearchAndFilter();
    renderRiepilogo();
  });
})();
