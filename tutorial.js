/* ============================================================
   🎓 Tutoriel interactif sombre (v3 - auto au premier lancement)
   ============================================================ */
   (function () {
    const TUTORIAL_KEY = "tutorialSeen";
  
    // --- Crée la bulle du tutoriel
    const tutorial = document.createElement("div");
    tutorial.id = "tutorialBox";
    tutorial.innerHTML = `
      <div class="tutorial-content">
        <h3>Bienvenue 👋</h3>
        <p>
          Découvrez comment utiliser l'application :<br><br>
          🔍 Recherchez une analyse<br>
          ⭐ Ajoutez des favoris<br>
          🧪 Consultez l’ordre des tubes
        </p>
        <div class="tutorial-actions">
          <button id="closeTutorial">J’ai compris</button>
        </div>
      </div>
    `;
    document.body.appendChild(tutorial);
  
    const closeBtn = tutorial.querySelector("#closeTutorial");
    closeBtn.addEventListener("click", () => {
      tutorial.classList.add("fade-out");
      setTimeout(() => tutorial.remove(), 300);
      localStorage.setItem(TUTORIAL_KEY, "true");
    });
  
    // --- Bouton pour relancer le tutoriel
    const restartBtn = document.createElement("button");
    restartBtn.id = "restartTutorial";
    restartBtn.textContent = "🎓 Voir à nouveau le tutoriel";
    document.body.appendChild(restartBtn);
  
    restartBtn.addEventListener("click", () => {
      localStorage.removeItem(TUTORIAL_KEY);
      location.reload();
    });
  
    // --- Affiche automatiquement au premier lancement
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      window.addEventListener("load", () => {
        setTimeout(() => {
          tutorial.classList.add("visible");
        }, 600);
      });
    } else {
      tutorial.remove();
    }
  })();
  