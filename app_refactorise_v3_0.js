/* ============================================================
   📱 PWA "MULTI-TUBE ANALYZER"
   Version 3.0 — Favoris enrichis (oct. 2025)
   Auteur : ChatGPT x Pasqua
   ------------------------------------------------------------
   ✅ Inclus dans cette version :
     - Compteur de favoris dynamique dans le bouton ⭐
     - Affichage/gestion des favoris (suppression individuelle 🗑️)
     - Tri des favoris : par Nom / par Tube
     - Suppression totale des favoris (🗑️ Tout supprimer)
     - Animations douces (apparition/réapparition des éléments)
   ⚠️ Compatible avec ta base stable (index.html + CSS + SW originaux)
   ============================================================ */

/* ------------------------------------------------------------
   🔗 Références DOM (garde tes IDs actuels dans index.html)
------------------------------------------------------------ */
const searchInput   = document.getElementById('searchInput');
const resultsList   = document.getElementById('results');
const info          = document.getElementById('info');
const clearBtn      = document.getElementById('clearBtn');
const favToggle     = document.getElementById('favToggle');
const ordreBtn      = document.getElementById('ordreBtn');
const ordreContainer= document.getElementById('ordreContainer');

/* ------------------------------------------------------------
   🧠 État global
------------------------------------------------------------ */
let allAnalyses = [];            // données JSON chargées
let favorites   = [];            // tableau d'IDs (Analyse_id)
let showingFavs = false;         // si la vue "favoris" est active
let sortCriteria= 'nom';         // 'nom' | 'tube'


/* ============================================================
   🔧 ENREGISTREMENT & COMMUNICATION SERVICE WORKER
   ============================================================ */
   if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker-refactorise.js")
        .then((reg) => {
          console.log("✅ [App] SW enregistré :", reg.scope);
  
          // 🔁 Demande la version au SW après l’enregistrement
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" });
          }
  
          // 🧩 Écoute la réponse du SW
          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data?.type === "VERSION") {
              console.log(`🧩 [App] Version SW reçue : ${event.data.version}`);
              const el = document.getElementById("sw-version");
              if (el) el.textContent = `Version SW : ${event.data.version}`;
            }
          });
        })
        .catch((err) => {
          console.error("❌ [App] Erreur SW :", err);
        });
    });
  }  

/* ------------------------------------------------------------
   🧰 Utilitaires
------------------------------------------------------------ */
// Normalise (accents/majuscules) sans toucher aux séparateurs
const norm = (s) => (s ?? '')
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

// Écrase tous les séparateurs (espaces, tirets, underscores, etc.)
const squash = (s) => norm(s).replace(/[^a-z0-9]+/g, '');


const fadeMount = (el) => {
  el.style.opacity = 0;
  el.style.transform = 'scale(0.98)';
  el.style.transition = 'opacity .25s ease, transform .25s ease';
  requestAnimationFrame(() => {
    el.style.opacity = 1;
    el.style.transform = 'scale(1)';
  });
};

const byNom = (a,b)  => norm(a.Analyse_nom).localeCompare(norm(b.Analyse_nom));
const byTube = (a,b) => norm(a.Tube_nom || '').localeCompare(norm(b.Tube_nom || ''));

/* ------------------------------------------------------------
   💾 Favoris (localStorage)
------------------------------------------------------------ */
const loadFavorites = () => {
  try {
    favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  } catch { favorites = []; }
  updateFavBadge();
};

const saveFavorites = () => {
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateFavBadge();
};

const isFav = (id) => favorites.includes(id);

const toggleFavorite = (id) => {
  if (isFav(id)) favorites = favorites.filter(f => f !== id);
  else favorites = [...favorites, id];
  saveFavorites();
  // Si on est dans la vue favoris, on rafraîchit celle-ci
  if (showingFavs) renderFavorites();
};

/* ------------------------------------------------------------
   ⭐ Badge de compteur sur le bouton favoris
------------------------------------------------------------ */
const updateFavBadge = () => {
  if (!favToggle) return;
  const count = favorites.length;
  // On conserve le texte d'origine si présent
  const base = favToggle.dataset.base || favToggle.textContent.trim() || '⭐ Favoris';
  if (!favToggle.dataset.base) favToggle.dataset.base = base.replace(/\s*\(\d+\)\s*$/,'');
  favToggle.textContent = `${favToggle.dataset.base} (${count})`
  favToggle.classList.toggle('active', showingFavs);
};

/* ------------------------------------------------------------
   🔍 Recherche
------------------------------------------------------------ */
const filterAnalyses = (q) => {
  const t = norm(q).trim();
  const tSquash = squash(q);
  if (!t) return [];

  return allAnalyses.filter(a => {
    const fields = [
      a.Analyse_nom,
      a.Analyse_mnemonique,
      a.Analyseur,
      a.Tube_nom
    ].map(v => v ?? '');

    // Match "classique" (avec espaces/tirets conservés)
    const normHit = fields.some(f => norm(f).includes(t));

    // Match "tolérant" (espaces/tirets/underscore/ponctuation = équivalents)
    const squashHit = fields.some(f => squash(f).includes(tSquash));

    return normHit || squashHit;
  });
};


/* ------------------------------------------------------------
   🧪 Rendu des résultats (mode recherche classique)
------------------------------------------------------------ */
const renderResults = (list) => {
  if (!resultsList || !info) return;
  resultsList.innerHTML = '';

  if (!list.length) {
    info.textContent = showingFavs ? '⭐ Aucun favori enregistré.' : '🙁 Aucun résultat trouvé.';
    return;
  }
  info.textContent = showingFavs
    ? `⭐ Vos favoris (${list.length})`
    : `🔍 ${list.length} résultat${list.length>1?'s':''} trouvé${list.length>1?'s':''}`;

  list.forEach(a => {
    const fav = isFav(a.Analyse_id);
    const truckFlag =
      String(a.Envoi_autre_labo).toLowerCase() === 'true' ||
      String(a.Envoit_autre_labo).toLowerCase() === 'true' ||
      String(a.envoi_autre_labo).toLowerCase() === 'true' ||
      String(a.Envoi_autre_labo).toLowerCase() === 'vrai' ||
      String(a.Envoit_autre_labo).toLowerCase() === 'vrai';
    // ✅ Badge "Autre labo" plus visible
      const truck = truckFlag
      ? `<span class="external-badge" title="Envoi autre laboratoire">
          🚚 <span>Autre labo</span>
        </span>`
      : '';


    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
      <div class="result-left">
        <div class="color-dot" style="background:${a.Tube_couleur || '#94a3b8'}"></div>
        <div>
          <div class="result-title">${a.Analyse_nom}${truck}</div>
          <div class="result-sub">${a.Tube_nom ?? ''} — ${a.Tube_ml || '?'} ml (${a.Tube_contenant || 'non spécifié'})</div>
        </div>
      </div>
      <div class="result-right">
        <button class="star ${fav ? 'active' : ''}" aria-label="Favori">${fav ? '⭐' : '☆'}</button>
      </div>
    `;

    li.querySelector('.star').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(a.Analyse_id);
      // Mise à jour immédiate de la ligne
      e.currentTarget.classList.toggle('active');
      e.currentTarget.textContent = e.currentTarget.classList.contains('active') ? '⭐' : '☆';
    });

    // --- Affichage extensible de la carte au clic ---
li.addEventListener('click', () => {
  const expanded = li.classList.toggle('expanded');

  if (expanded) {
    const details = document.createElement('div');
    details.className = 'details-zone';
    details.innerHTML = `
      <div class="details-content">
        <p><strong>Numéro :</strong> ${a.Analyse_id || '—'}</p>
        <p><strong>Code :</strong> ${a.Code_analyse || '—'}</p>
        <p><strong>Contenant :</strong> ${a.Tube_contenant || '—'}</p>
        <p><strong>Volume :</strong> ${a.Tube_ml || '?'} ml</p>
        <p><strong>Remarques :</strong> ${a.Remarques || 'Aucune'}</p>
      </div>
    `;
    li.appendChild(details);
  } else {
    const existing = li.querySelector('.details-zone');
    if (existing) existing.remove();
  }
});


    fadeMount(li);
    resultsList.appendChild(li);
  });
};

/* ------------------------------------------------------------
   ⭐ Rendu des FAVORIS enrichis
------------------------------------------------------------ */
const getFavObjects = () => {
  const set = new Set(favorites);
  return allAnalyses.filter(a => set.has(a.Analyse_id));
};

const clearResultsUI = () => {
  if (resultsList) resultsList.innerHTML = '';
};

const renderFavoritesToolbar = (container) => {
  const bar = document.createElement('div');
  bar.className = 'fav-toolbar';
  bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin:6px 0 10px 0;gap:10px;flex-wrap:wrap;';
  bar.innerHTML = `
    <div class="fav-sorts" style="display:flex;gap:8px;">
      <span style="opacity:.8">Trier par :</span>
      <button type="button" class="btn-sort" data-sort="nom">Nom</button>
      <button type="button" class="btn-sort" data-sort="tube">Tube</button>
    </div>
    <div class="fav-actions" style="display:flex;gap:8px;">
      <button type="button" class="btn-clear-all" title="Supprimer tous les favoris">🗑️ Tout supprimer</button>
    </div>
  `;
  container.appendChild(bar);

  bar.querySelectorAll('.btn-sort').forEach(btn => {
    btn.style.cssText = 'border:1px solid #94a3b8;border-radius:8px;padding:4px 8px;background:transparent;cursor:pointer';
    btn.addEventListener('click', () => {
      sortCriteria = btn.dataset.sort;
      renderFavorites(); // re-render selon nouveau tri
    });
  });

  const clearAll = bar.querySelector('.btn-clear-all');
  clearAll.style.cssText = 'border:1px solid #ef4444;color:#ef4444;border-radius:8px;padding:4px 8px;background:transparent;cursor:pointer';
  clearAll.addEventListener('click', () => {
    if (!favorites.length) return;
    if (confirm('Supprimer tous les favoris ?')) {
      favorites = [];
      saveFavorites();
      renderFavorites();
    }
  });
};

const renderFavorites = () => {
  showingFavs = true;
  updateFavBadge();
  clearResultsUI();

  const favs = getFavObjects().sort(sortCriteria === 'tube' ? byTube : byNom);
  if (!favs.length) {
    if (info) info.textContent = '⭐ Aucun favori enregistré.';
    return;
  }
  if (info) info.textContent = `⭐ Vos favoris (${favs.length})`;

  // Barre tri + actions
  renderFavoritesToolbar(resultsList);

  // Liste
  favs.forEach(a => {
    const li = document.createElement('li');
    li.className = 'result-item';
    li.style.position = 'relative';
    li.innerHTML = `
      <div class="result-left">
        <div class="color-dot" style="background:${a.Tube_couleur || '#94a3b8'}"></div>
        <div>
          <div class="result-title">${a.Analyse_nom}</div>
          <div class="result-sub">${a.Tube_nom ?? ''} — ${a.Tube_ml || '?'} ml</div>
        </div>
      </div>
      <div class="result-right">
        <button class="btn-remove-fav" title="Retirer des favoris">🗑️</button>
      </div>
    `;

    // Style bouton suppression rapide
    const btnDel = li.querySelector('.btn-remove-fav');
    btnDel.style.cssText = 'border:none;background:transparent;font-size:18px;cursor:pointer;opacity:.85';

    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      // petite animation de retrait
      li.style.transition = 'opacity .2s ease, transform .2s ease';
      li.style.opacity = '0';
      li.style.transform = 'scale(0.98)';
      setTimeout(() => {
        toggleFavorite(a.Analyse_id); // met à jour le store
        renderFavorites();            // re-render propre
      }, 220);
    });

    fadeMount(li);
    resultsList.appendChild(li);
  });
};

/* ------------------------------------------------------------
   🌐 Chargement des données
------------------------------------------------------------ */
const loadData = async () => {
  try {
    if (info) info.textContent = '⏳ Chargement des données...';
    const res = await fetch('Liste-analyse-correspondance.json', { cache: 'no-store' });
    allAnalyses = await res.json();
    if (info) info.textContent = 'Tapez un mot-clé pour lancer la recherche.';
  } catch (e) {
    console.error('Erreur chargement JSON :', e);
    if (info) info.textContent = 'Erreur de chargement des données.';
  }
};

/* ------------------------------------------------------------
   🎛️ Événements UI
------------------------------------------------------------ */
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    showingFavs = false;
    updateFavBadge();
    renderResults(filterAnalyses(e.target.value));
  });
}

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (resultsList) resultsList.innerHTML = '';
    if (info) info.textContent = 'Tapez un mot-clé pour lancer la recherche.';
    showingFavs = false;
    updateFavBadge();
  });
}

/* ============================================================
   🎙️ RECHERCHE VOCALE — Web Speech API
   ============================================================ */

   (() => {
    const input = document.getElementById("searchInput");
    if (!input) return;
  
    // Vérifie la compatibilité API
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
  
    if (!SpeechRecognition) {
      console.log("🎙️ API non supportée sur ce navigateur.");
      return;
    }
  
    // Crée le bouton micro
    const micBtn = document.createElement("button");
    micBtn.id = "voiceSearchBtn";
    micBtn.title = "Recherche vocale";
    micBtn.innerHTML = "🎤";
    micBtn.style.cssText = `
      margin-left: 6px;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid rgba(59,130,246,0.4);
      background: rgba(59,130,246,0.15);
      color: #e2e8f0;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    input.insertAdjacentElement("afterend", micBtn);
  
    // Configuration de la reconnaissance vocale
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  
    let listening = false;
  
    micBtn.addEventListener("click", () => {
      if (!listening) {
        recognition.start();
        listening = true;
        micBtn.textContent = "🎧";
        micBtn.style.background = "rgba(59,130,246,0.4)";
        micBtn.title = "En écoute...";
      } else {
        recognition.stop();
      }
    });
  
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript.trim();
      input.value = result;
      input.dispatchEvent(new Event("input"));
    
      // Ajout automatique à l’historique si dispo
      if (typeof addToHistory === "function") {
        addToHistory(result);
      } else {
        // si addToHistory est dans une IIFE, on déclenche le même event
        input.dispatchEvent(new Event("change"));
      }
    
      console.log("🎙️ Reçu :", result);
    };    
  
    recognition.onend = () => {
      listening = false;
      micBtn.textContent = "🎤";
      micBtn.style.background = "rgba(59,130,246,0.15)";
      micBtn.title = "Recherche vocale";
    };
  
    recognition.onerror = (event) => {
      console.warn("Erreur vocale :", event.error);
      listening = false;
      micBtn.textContent = "🎤";
      micBtn.style.background = "rgba(59,130,246,0.15)";
    };
  })();
  

/* ==========================================================
   🔎 HISTORIQUE DE RECHERCHE — v1.0 by ChatGPT + Pasqua
   ========================================================== */

   (() => {
    const input = document.getElementById("searchInput");
    const results = document.getElementById("results");
    const MAX_HISTORY = 8;       // nombre max d’entrées
    const EXPIRATION_DAYS = 7;   // suppression auto après X jours
  
    // Crée le conteneur visuel
    const histWrap = document.createElement("div");
    histWrap.id = "search-history";
    histWrap.innerHTML = `<div class="hist-header">
        <span>🕓 Recherches récentes</span>
        <button id="clearHistoryBtn" title="Effacer l'historique">🗑️</button>
      </div>
      <ul class="hist-list"></ul>`;
    results.parentNode.insertBefore(histWrap, results); // juste avant la zone de résultats
    histWrap.style.display = "none";
  
    const listEl = histWrap.querySelector(".hist-list");
  
    // 🔹 Charger depuis localStorage
    function loadHistory() {
      const data = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      const now = Date.now();
      const valid = data.filter(i => now - i.time < EXPIRATION_DAYS * 86400000);
      if (valid.length !== data.length) saveHistory(valid); // purge auto
      return valid;
    }
  
    // 🔹 Sauvegarder
    function saveHistory(arr) {
      localStorage.setItem("searchHistory", JSON.stringify(arr));
    }
  
    // 🔹 Ajouter une nouvelle recherche
    function addToHistory(term) {
      if (!term) return;
      let arr = loadHistory();
      const normalized = term.trim().toLowerCase();
      arr = arr.filter(i => i.term.toLowerCase() !== normalized); // pas de doublon
      arr.unshift({ term, time: Date.now() });
      if (arr.length > MAX_HISTORY) arr.pop();
      saveHistory(arr);
    }
  
    // 🔹 Afficher la liste
    function renderHistory() {
      const arr = loadHistory();
      if (!arr.length) {
        histWrap.style.display = "none";
        return;
      }
      listEl.innerHTML = "";
      arr.forEach((i, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${i.term}</span>
                        <button class="delOne" data-idx="${idx}" title="Supprimer">✕</button>`;
        listEl.appendChild(li);
      });
      histWrap.style.display = "block";
    }
  
    // 🔹 Écouteurs
    input.addEventListener("focus", renderHistory);
  
    listEl.addEventListener("click", (e) => {
      if (e.target.matches("span")) {
        input.value = e.target.textContent;
        histWrap.style.display = "none";
        input.dispatchEvent(new Event("input"));
      } else if (e.target.matches(".delOne")) {
        const arr = loadHistory();
        arr.splice(e.target.dataset.idx, 1);
        saveHistory(arr);
        renderHistory();
      }
    });
  
    histWrap.querySelector("#clearHistoryBtn").addEventListener("click", () => {
      localStorage.removeItem("searchHistory");
      histWrap.style.display = "none";
    });
  
    // 🔹 Sauvegarde auto à chaque recherche valide
    input.addEventListener("change", (e) => {
      const val = e.target.value.trim();
      if (val.length >= 2) addToHistory(val);
    });
  })();
  

if (favToggle) {
  favToggle.addEventListener('click', () => {
    // Toggle vue favoris
    if (showingFavs) {
      showingFavs = false;
      updateFavBadge();
      // Affiche vide (attend saisie user)
      if (resultsList) resultsList.innerHTML = '';
      if (info) info.textContent = 'Tapez un mot-clé pour lancer la recherche.';
    } else {
      renderFavorites();
    }
  });
}

/* ------------------------------------------------------------
   🧪 Panneau "Ordre des tubes" — (inchangé vs. base stable)
   -> On garde ton comportement actuel pour éviter tout conflit
------------------------------------------------------------ */
(function () {
  if (!ordreBtn || !ordreContainer) return;
  // On évite tout double-wire : on remplace le bouton par son clone (supprime anciens listeners)
  ordreBtn.replaceWith(ordreBtn.cloneNode(true));
  const btn = document.getElementById('ordreBtn');
  let isTransitioning = false;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isTransitioning) return;
    isTransitioning = true;

    const isHidden = ordreContainer.hasAttribute('hidden');
    if (isHidden) {
      ordreContainer.removeAttribute('hidden');
      void ordreContainer.offsetWidth; // reflow pour animer correctement
      ordreContainer.classList.add('active');
      setTimeout(() => (isTransitioning = false), 350);
    } else {
      ordreContainer.classList.remove('active');
      setTimeout(() => {
        ordreContainer.setAttribute('hidden','');
        isTransitioning = false;
      }, 350);
    }
  }, { passive: true });
})();

/* ------------------------------------------------------------
   🚀 Initialisation
------------------------------------------------------------ */
window.addEventListener('DOMContentLoaded', async () => {
  loadFavorites();
  await loadData();
  updateFavBadge();
});
/* ============================================================
   🧠 MODE HORS LIGNE INTELLIGENT — Notification d’état
   ============================================================ */

// Création du bandeau
const offlineBanner = document.createElement('div');
offlineBanner.id = 'offline-banner';
offlineBanner.textContent = '🧩 Vous êtes hors ligne — données locales actives';
document.body.appendChild(offlineBanner);

// Style intégré
offlineBanner.style.cssText = `
  position: fixed;
  bottom: -50px;
  left: 0;
  width: 100%;
  background: rgba(59,130,246,0.25);
  color: #e2e8f0;
  text-align: center;
  padding: 10px 0;
  font-size: 0.95rem;
  transition: bottom 0.4s ease;
  z-index: 9999;
`;

// Détection réseau
function updateNetworkStatus() {
  if (navigator.onLine) {
    offlineBanner.style.bottom = '-50px';
  } else {
    offlineBanner.style.bottom = '0';
  }
}

/* ============================================================
   🔌 INDICATEUR FIXE D’ÉTAT RÉSEAU
   ============================================================ */

// Création du message permanent (dans la zone recherche ou info)
const infoZone = document.getElementById("info") || document.querySelector(".search-wrap");
const netStatus = document.createElement("div");
netStatus.id = "network-status";
netStatus.textContent = navigator.onLine
  ? "🟢 En ligne — données à jour"
  : "🔴 Hors ligne — cache local actif";
if (infoZone) infoZone.insertAdjacentElement("afterend", netStatus);

// Style minimal intégré
netStatus.style.cssText = `
  margin-top: 6px;
  margin-bottom: 10px;
  text-align: center;
  font-size: 0.9rem;
  color: ${navigator.onLine ? "#86efac" : "#f87171"};
  opacity: 0.9;
  transition: color 0.3s ease, opacity 0.3s ease;
`;

// Synchronisation avec l'état réseau
function updateNetworkLabel() {
  if (navigator.onLine) {
    netStatus.textContent = "🟢 En ligne — données à jour";
    netStatus.style.color = "#86efac";
  } else {
    netStatus.textContent = "🔴 Hors ligne — cache local actif";
    netStatus.style.color = "#f87171";
  }
}

// Mises à jour auto
window.addEventListener("online", updateNetworkLabel);
window.addEventListener("offline", updateNetworkLabel);


// Exécution initiale
updateNetworkStatus();


/* ============================================================
   🧠 MISE À JOUR SERVICE WORKER — AUTOMATIQUE EN SILENCE
   ------------------------------------------------------------
   - Si PWA installée : update silencieuse
   - Si ouverte dans le navigateur : toast visible
   ============================================================ */
   if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (window.matchMedia('(display-mode: standalone)').matches) {
              // ✅ Mode application (installée)
              reg.waiting?.postMessage({ type: "SKIP_WAITING" });
              console.log("🔄 Mise à jour silencieuse du SW (mode PWA)");
              window.location.reload(true);
            } else {
              // 🌐 Mode navigateur — affiche le toast
              showUpdateToast();
            }
          }
        });
      });
    });
  }
// Vérifie et force la mise à jour du service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const reg of registrations) {
      reg.update(); // Force la vérification d'une nouvelle version
    }
  });
}

  
  /* ============================================================
     🍞 TOAST VISUEL (affiché uniquement si non installé)
     ============================================================ */
  function showUpdateToast() {
    const toast = document.createElement("div");
    toast.id = "update-toast";
    toast.innerHTML = `
      🔄 Nouvelle version disponible<br>
      <button id="refreshApp">Recharger</button>
    `;
    document.body.appendChild(toast);
  
    document.getElementById("refreshApp").addEventListener("click", () => {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      });
      window.location.reload(true);
    });
  }
  /* ============================================================
   🧩 PANNEAU DE DEBUG PWA — version repliable et discrète
   ------------------------------------------------------------
   - Visible uniquement sur PC
   - Mode réduit / étendu toggle
   - Actions : voir caches, vider caches, recharger SW
   ============================================================ */
(function () {
  if (window.matchMedia("(display-mode: standalone)").matches || window.innerWidth < 768) return;

  const panel = document.createElement("div");
  panel.id = "debug-panel";
  panel.innerHTML = `
    <div id="debug-toggle" title="Ouvrir / réduire le panneau">🧩 Debug</div>
    <div id="debug-content" hidden>
      <div class="debug-header">PWA Debug Panel</div>
      <div id="sw-version">Chargement version SW...</div>
      <button id="btn-list-caches">📋 Voir les caches</button>
      <button id="btn-clear-caches">🧹 Vider les caches</button>
      <button id="btn-reload-sw">🔁 Recharger SW</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Style du panneau
  const style = document.createElement("style");
  style.textContent = `
    #debug-panel {
      position: fixed;
      bottom: 15px;
      right: 20px;
      font-size: 0.9rem;
      z-index: 99999;
      color: #e2e8f0;
      text-align: center;
      user-select: none;
      font-family: system-ui, sans-serif;
    }

    #debug-toggle {
      background: rgba(37,99,235,0.9);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      transition: background 0.2s ease, transform 0.2s ease;
    }

    #debug-toggle:hover {
      background: rgba(29,78,216,0.95);
      transform: translateY(-1px);
    }

    #debug-content {
      margin-top: 8px;
      background: rgba(15,23,42,0.95);
      border: 1px solid rgba(59,130,246,0.4);
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
      backdrop-filter: blur(6px);
      min-width: 240px;
      animation: fadeInUp 0.3s ease;
    }

    #debug-content button {
      width: 100%;
      margin-top: 6px;
      background: rgba(59,130,246,0.2);
      border: 1px solid rgba(59,130,246,0.3);
      border-radius: 6px;
      padding: 6px;
      color: #93c5fd;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    #debug-content button:hover {
      background: rgba(59,130,246,0.4);
      color: #fff;
    }

    .debug-header {
      font-weight: bold;
      color: #38bdf8;
      margin-bottom: 4px;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  // 🔁 Toggle du panneau
  const toggleBtn = panel.querySelector("#debug-toggle");
  const content = panel.querySelector("#debug-content");
  toggleBtn.addEventListener("click", () => {
    const isHidden = content.hasAttribute("hidden");
    if (isHidden) {
      content.removeAttribute("hidden");
      toggleBtn.textContent = "🧩 Fermer Debug";
    } else {
      content.setAttribute("hidden", "");
      toggleBtn.textContent = "🧩 Debug";
    }
  });

  // Récupération de la version SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (!reg) return;
      const sw = reg.active;
      if (sw) {
        const version = await caches.keys();
        document.getElementById("sw-version").textContent =
          `SW actif : ${sw.scriptURL.split("/").pop()} (${version[0] || "aucun cache"})`;
      }
    });
  }

  // Boutons actions
  document.getElementById("btn-list-caches").addEventListener("click", async () => {
    const keys = await caches.keys();
    alert("📋 Caches actuels :\\n" + keys.join("\\n"));
  });

  document.getElementById("btn-clear-caches").addEventListener("click", async () => {
    const keys = await caches.keys();
    for (const k of keys) await caches.delete(k);
    alert("🧹 Caches supprimés. Rechargez la page !");
  });

  document.getElementById("btn-reload-sw").addEventListener("click", async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
      alert("🔁 SW désenregistré. Rechargez la page !");
      location.reload(true);
    }
  });
  /* ============================================================
     🧠 DEMANDE & RÉCEPTION DE LA VERSION SW (corrigé)
     ============================================================ */
     if ('serviceWorker' in navigator) {
      // 📨 Demande la version au SW actif
      function requestSWVersion() {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
        }
      }
  
      // 🔊 Réception de la version depuis le SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'VERSION') {
          console.log(`🧩 Version reçue du SW : ${event.data.version}`);
          const versionEl = document.getElementById('sw-version');
          if (versionEl) versionEl.textContent = `Version SW : ${event.data.version}`;
        }
      });
  
      // 🔁 Relance la demande si le contrôleur change
      if (navigator.serviceWorker.controller) {
        requestSWVersion();
      } else {
        navigator.serviceWorker.addEventListener('controllerchange', requestSWVersion);
      }
    }

/* ============================================================
   ⚡ Gestion intelligente du mode hors ligne
   ============================================================ */
(function() {
  const banner = document.getElementById('offlineBanner');

  // Fonction d'affichage
  function updateOnlineStatus() {
    if (navigator.onLine) {
      banner.setAttribute('hidden', '');
      console.log('🟢 En ligne');
    } else {
      banner.removeAttribute('hidden');
      console.warn('🔴 Hors ligne');
    }
  }

  // État initial + écouteurs
  window.addEventListener('load', updateOnlineStatus);
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
})();

  })();
  