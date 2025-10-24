/* ============================================================
   🧠 DEBUG PANEL AVANCÉ — V16 PWA Refactorisée
   ------------------------------------------------------------
   • Bouton flottant "🧠 Debug"
   • Panneau déplaçable, repliable et fermé par défaut
   • Affiche infos Service Worker, cache, réseau, JSON, logs
   ============================================================ */

   (() => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return; // pas sur mobile
  
    // --- Bouton flottant ---
    const btn = document.createElement("button");
    btn.textContent = "🧠 Debug";
    Object.assign(btn.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999,
      background: "rgba(37,99,235,0.85)",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      padding: "8px 14px",
      fontSize: "15px",
      cursor: "pointer",
      boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    });
    document.body.appendChild(btn);
  
    // --- Panneau principal ---
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed",
      bottom: "70px",
      right: "20px",
      width: "340px",
      maxHeight: "70vh",
      background: "rgba(15,23,42,0.95)",
      color: "#e2e8f0",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      padding: "10px 14px",
      overflowY: "auto",
      fontFamily: "system-ui, sans-serif",
      display: "none",
      zIndex: 9998,
    });
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong>🧩 Panneau Debug</strong>
        <button id="closeDbg" style="background:none;border:none;color:#e2e8f0;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div id="dbg-content" style="font-size:13px;line-height:1.5;">
        <p><strong>Statut réseau :</strong> <span id="dbg-net">🔄</span></p>
        <p><strong>Service Worker :</strong> <span id="dbg-sw">—</span></p>
        <p><strong>Données JSON :</strong> <span id="dbg-json">—</span></p>
        <div style="margin:8px 0;">
          <button id="dbg-refresh-sw">♻️ Recharger SW</button>
          <button id="dbg-clear-cache">🧹 Vider Cache</button>
          <button id="dbg-clear-ls">🧽 Vider LocalStorage</button>
          <button id="dbg-clear-hist">📖 Effacer Historique</button>
        </div>
        <div id="dbg-logs" style="background:rgba(30,41,59,0.9);border-radius:6px;padding:6px;max-height:150px;overflow-y:auto;font-family:monospace;"></div>
      </div>
    `;
    document.body.appendChild(panel);
  
    // --- Fonction utilitaire log ---
    const dbgLog = (msg, type = "log") => {
      const logBox = document.getElementById("dbg-logs");
      if (!logBox) return;
      const el = document.createElement("div");
      el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      el.style.color =
        type === "error" ? "#f87171" : type === "warn" ? "#fbbf24" : "#a5f3fc";
      logBox.prepend(el);
    };
  
    // --- État réseau dynamique ---
    const netEl = document.getElementById("dbg-net");
    const updateNet = () => {
      netEl.textContent = navigator.onLine
        ? "🟢 En ligne"
        : "🔴 Hors ligne (cache local)";
    };
    window.addEventListener("online", updateNet);
    window.addEventListener("offline", updateNet);
    updateNet();
  
    // --- Infos JSON ---
    const jsonEl = document.getElementById("dbg-json");
    try {
      const cache = JSON.parse(localStorage.getItem("cachedData") || "[]");
      jsonEl.textContent = `${cache.length} analyses (${(
        JSON.stringify(cache).length / 1024
      ).toFixed(1)} Ko)`;
    } catch {
      jsonEl.textContent = "Aucune donnée locale";
    }
  
    // --- SW infos ---
    const swEl = document.getElementById("dbg-sw");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) {
          swEl.textContent = "Non enregistré";
        } else {
          swEl.textContent = reg.active
            ? "Actif ✅"
            : reg.installing
            ? "Installation en cours..."
            : "En attente";
        }
      });
    }
  
    // --- Boutons actions ---
    document
      .getElementById("dbg-refresh-sw")
      .addEventListener("click", async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
          location.reload();
        } else {
          dbgLog("Aucune mise à jour SW disponible");
        }
      });
  
    document
      .getElementById("dbg-clear-cache")
      .addEventListener("click", async () => {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
        dbgLog("Cache vidé 🧹");
      });
  
    document
      .getElementById("dbg-clear-ls")
      .addEventListener("click", () => {
        localStorage.clear();
        dbgLog("LocalStorage effacé 🧽");
      });
  
    document
      .getElementById("dbg-clear-hist")
      .addEventListener("click", () => {
        localStorage.removeItem("searchHistory");
        dbgLog("Historique effacé 📖");
      });
  
    // --- Réception logs SW ---
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (e) => {
        if (e.data?.type === "LOG") dbgLog(e.data.message);
      });
    }
  
    // --- Ouverture / fermeture ---
    btn.addEventListener("click", () => {
      panel.style.display =
        panel.style.display === "none" ? "block" : "none";
    });
    document.getElementById("closeDbg").addEventListener("click", () => {
      panel.style.display = "none";
    });
  })();
  // 🔧 Fermeture du panneau debug
document.getElementById("debug-close")?.addEventListener("click", () => {
  document.getElementById("debug-panel").style.display = "none";
});

// 🔁 Actualise les infos du panneau
function refreshDebugInfo() {
  document.getElementById("debug-network").textContent = navigator.onLine ? "🟢 En ligne" : "🔴 Hors ligne";
  document.getElementById("debug-sw").textContent = "✅ Service Worker actif";
  document.getElementById("debug-json").textContent = allAnalyses?.length
    ? `${allAnalyses.length} analyses`
    : "—";
}
setInterval(refreshDebugInfo, 2000);
