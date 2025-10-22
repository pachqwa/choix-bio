/* ============================================================
   💡 MINI TUTORIEL D’ACCUEIL — Version allégée (modulaire)
   ------------------------------------------------------------
   - Affiche une bulle la première fois uniquement
   - Option "Ne plus afficher"
   - Intégration indépendante du JS principal
   ============================================================ */

   (() => {
    if (localStorage.getItem("tutorialSeen") === "true") return;
  
    const overlay = document.createElement("div");
    overlay.id = "tuto-overlay";
    overlay.innerHTML = `
      <div class="tuto-popup">
        <h3>👋 Bienvenue !</h3>
        <p>Vous pouvez rechercher une analyse, afficher l’ordre des tubes 🧪 et gérer vos favoris ⭐.<br><br>
        Bonne utilisation !</p>
        <div class="tuto-actions">
          <label><input type="checkbox" id="hideTuto"> Ne plus afficher</label>
          <button id="tuto-close">Fermer</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  
    const closeBtn = overlay.querySelector("#tuto-close");
    const hideChk = overlay.querySelector("#hideTuto");
  
    closeBtn.addEventListener("click", () => {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 300);
      if (hideChk.checked) localStorage.setItem("tutorialSeen", "true");
    });
/* ============================================================
   🔁 LIEN "VOIR À NOUVEAU LE TUTORIEL" — VERSION STABLE PWA
   ============================================================ */
   (() => {
    const footerLink = document.createElement("div");
    footerLink.id = "tuto-relaunch";
    footerLink.textContent = "💡 Voir à nouveau le tutoriel";
    footerLink.title = "Relancer la bulle de bienvenue";
    document.body.appendChild(footerLink);
  
    footerLink.addEventListener("click", async () => {
      localStorage.removeItem("tutorialSeen");
  
      // 🔥 Force un vrai refresh complet en contournant le cache SW
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
      }
  
      // Puis recharge après une légère pause
      setTimeout(() => {
        window.location.reload(true);
      }, 300);
    });
  })();
  

  })();
  