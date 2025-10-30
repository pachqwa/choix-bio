/* ============================================================
   PWA ANALYSES — app_refactorise_v3_2_PERF.js
============================================================ */

/* ------------------------------------------------------------
   🧠 RÉFÉRENCES DOM
   ------------------------------------------------------------
   On capture ici tous les éléments HTML nécessaires à
   l’interaction : champs de recherche, boutons, conteneurs, etc.
   Les variables sont réutilisées dans tout le script.
------------------------------------------------------------ */
const searchInput    = document.getElementById("searchInput"); // Champ de recherche principal
const resultsList    = document.getElementById("results");     // Liste où s’affichent les résultats
const info           = document.getElementById("info");        // Zone d’information utilisateur (texte)
const clearBtn       = document.getElementById("clearBtn");    // Bouton “Effacer”
const favToggle      = document.getElementById("favToggle");   // Bouton “Favoris”
const ordreBtn       = document.getElementById("ordreBtn");    // Bouton pour afficher l’ordre des tubes
const ordreContainer = document.getElementById("ordreContainer"); // Conteneur du panneau ordre
const voiceBtn       = document.getElementById("voicebtn");    // Bouton vocal 🎙 (HTML direct)


/* ------------------------------------------------------------
   💾 VARIABLES D’ÉTAT (mémoire interne du PWA)
   ------------------------------------------------------------
   Ces variables stockent l’état actuel de l’application :
   - données chargées
   - favoris
   - tri sélectionné
   - vue affichée
------------------------------------------------------------ */
let allAnalyses = [];   // Toutes les analyses du JSON (avec champ _search optimisé)
let favorites   = [];   // Liste des IDs d’analyses ajoutées en favoris
let showingFavs = false; // Indique si la vue “Favoris” est affichée
let sortCriteria = "nom"; // Tri par défaut des favoris (par nom)

/* ------------------------------------------------------------
   🧰 FONCTIONS UTILITAIRES GÉNÉRALES
   ------------------------------------------------------------
   Petites fonctions d’aide utilisées dans tout le script :
   - norm()  : normalise les chaînes (supprime accents, casse)
   - debounce() : améliore les performances des recherches
   - fadeMount() : animation d’apparition douce appliquée aux éléments lors de leur apparition dans la liste
------------------------------------------------------------ */
const norm = (s) => (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const squash = (s) => norm(s).replace(/[^a-z0-9]+/g, '');
const byNom  = (a,b) => norm(a.Analyse_nom).localeCompare(norm(b.Analyse_nom));
const byTube = (a,b) => norm(a.Tube_nom || '').localeCompare(norm(b.Tube_nom || ''));

// Petit debounce pour calmer les frappes nerveuses 😄
const debounce = (fn, delay = 250) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};

const fadeMount = (el) => {
  el.style.opacity = 0;
  el.style.transform = 'scale(0.98)';
  el.style.transition = 'opacity .25s ease, transform .25s ease';
  requestAnimationFrame(() => { el.style.opacity = 1; el.style.transform = 'scale(1)'; });
};

/* ------------------------------------------------------------
      ⭐ GESTION DES FAVORIS
   ------------------------------------------------------------
   Objectif :
   - Permettre à l’utilisateur d’ajouter/supprimer une analyse
     de ses favoris.
   - Conserver ces favoris dans localStorage pour les retrouver
     à chaque visite.
   - Offrir un bouton "Tout effacer" et un compteur visuel.
------------------------------------------------------------ */
/**
 * 🔄 Charge les favoris depuis localStorage au démarrage.
 * Si rien n’est stocké, retourne un tableau vide.
 */
const loadFavorites = () => {
  try { favorites = JSON.parse(localStorage.getItem('favorites')) || []; }
  catch { favorites = []; }
  updateFavBadge();
};
/**
 * 💾 Sauvegarde la liste des favoris dans localStorage.
 * Cette fonction est appelée à chaque ajout/suppression.
 */
const saveFavorites = () => { localStorage.setItem('favorites', JSON.stringify(favorites)); updateFavBadge(); };
const isFav = (id) => favorites.includes(id); //⭐ Vérifie si une analyse donnée est déjà dans les favoris.
/**
 * ➕ Ajoute ou retire un favori selon son état actuel.
 * - Si présent → on le supprime
 * - Sinon → on l’ajoute
 */
const toggleFavorite = (id) => {
  if (isFav(id)) favorites = favorites.filter(f => f !== id);
  else favorites = [...favorites, id];
  saveFavorites();
  if (showingFavs) renderFavorites();
};

/**
 * 🧮 Met à jour le badge/indicateur de favoris.
 * (par exemple, nombre de favoris sur le bouton principal)
 */
const updateFavBadge = () => {
  if (!favToggle) return;
  const count = favorites.length;
  const base = favToggle.dataset.base || favToggle.textContent.trim() || '⭐ Favoris';
  if (!favToggle.dataset.base) favToggle.dataset.base = base.replace(/\s*\(\d+\)\s*$/, '');
  favToggle.textContent = `${favToggle.dataset.base} (${count})`;
  favToggle.classList.toggle('active', showingFavs);
};

/* ------------------------------------------------------------
   🔍 Recherche (utilise _search pré-indexé)
------------------------------------------------------------ */
const filterAnalyses = (q) => {
  const t = norm(q).trim();
  if (!t) return [];
  // Cherche dans le champ pré-indexé
  return allAnalyses.filter(a => a._search.includes(t));
};

/* ------------------------------------------------------------
 * 🖼️ Affiche la liste des favoris à l’écran.
 * Cette fonction est déclenchée lorsque l’utilisateur clique
 * sur le bouton "Favoris".
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

  const frag = document.createDocumentFragment();
  const expandedItems = []; // ✅ Pour limiter à 3

  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const fav = isFav(a.Analyse_id);
    const truckFlag =
      ['true', 'vrai'].includes(String(a.Envoi_autre_labo).toLowerCase()) ||
      ['true', 'vrai'].includes(String(a.Envoit_autre_labo).toLowerCase()) ||
      ['true', 'vrai'].includes(String(a.envoi_autre_labo).toLowerCase());

    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
      <div class="result-left">
        <div class="color-dot" style="background:${a.Tube_couleur || '#94a3b8'}"></div>
        <div>
          <div class="result-title">${a.Analyse_nom}${
            truckFlag ? `<span class="external-badge" title="Envoi autre laboratoire">🚚 <span>Autre labo</span></span>` : ''
          }</div>
          <div class="result-sub">${a.Tube_nom ?? ''} — ${a.Tube_ml || '?'} ml (${a.Tube_contenant || 'non spécifié'})</div>
        </div>
      </div>
      <div class="result-right">
        <button class="star ${fav ? 'active' : ''}" aria-label="Favori">☆</button>
      </div>
    `;

    // Clic sur l’étoile → bascule l’état de favori (accessible + haptique)
    const starBtn = li.querySelector('.star');

    // Accessibilité ARIA (switch)
    starBtn.setAttribute('role', 'switch');
    starBtn.setAttribute('aria-checked', fav ? 'true' : 'false');
    starBtn.setAttribute('aria-label', fav ? 'Retirer des favoris' : 'Ajouter aux favoris');

    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(a.Analyse_id);
      const isActive = starBtn.classList.toggle('active');

      // maj ARIA + label clair
      starBtn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      starBtn.setAttribute('aria-label', isActive ? 'Retirer des favoris' : 'Ajouter aux favoris');

      // micro-haptique sur mobile (optionnel mais agréable)
      if (navigator.vibrate) navigator.vibrate(isActive ? 12 : 6);

      // évite l'état focus persistant mobile
      starBtn.blur();
    });


    // ✅ Limiter à 3 détails ouverts + scroll dans vue
    li.addEventListener('click', () => {
      const isExpanded = li.classList.contains('expanded');

      if (!isExpanded) {
        li.classList.add('expanded');

        const details = document.createElement('div');
        details.className = 'details-zone';
        details.innerHTML = `
          <div class="details-content">
            <p><strong>Numéro :</strong> ${a.Analyse_id || '—'}</p>
            <p><strong>Code :</strong> ${a.Code_analyse || '—'}</p>
            <p><strong>Contenant :</strong> ${a.Tube_contenant || '—'}</p>
            <p><strong>Volume :</strong> ${a.Tube_ml || '?'} ml</p>
            <p><strong>Remarques :</strong> ${a.Remarques || 'Aucune'}</p>
          </div>`;
        li.appendChild(details);

        expandedItems.push(li);

        // ✅ Si plus de 3 → on ferme automatiquement le plus ancien
        if (expandedItems.length > 3) {
          const first = expandedItems.shift();
          first.classList.remove('expanded');
          first.querySelector('.details-zone')?.remove();
        }

        // ✅ Scroll automatique vers l’élément ouvert (confort mobile)
        li.scrollIntoView({ behavior: 'smooth', block: 'center' });

      } else {
        li.classList.remove('expanded');
        li.querySelector('.details-zone')?.remove();
        const idx = expandedItems.indexOf(li);
        if (idx >= 0) expandedItems.splice(idx, 1);
      }
    });

    fadeMount(li);
    frag.appendChild(li);
  }

  resultsList.appendChild(frag);
};

/* ------------------------------------------------------------
   ⭐ Vue FAVORIS (batch + tri)
------------------------------------------------------------ */
const getFavObjects = () => {
  const set = new Set(favorites);
  return allAnalyses.filter(a => set.has(a.Analyse_id));
};

const clearResultsUI = () => { if (resultsList) resultsList.innerHTML = ''; };

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
    </div>`;
  container.appendChild(bar);

  bar.querySelectorAll('.btn-sort').forEach(btn => {
    btn.style.cssText = 'border:1px solid #94a3b8;border-radius:8px;padding:4px 8px;background:transparent;cursor:pointer';
    btn.addEventListener('click', () => { sortCriteria = btn.dataset.sort; renderFavorites(); });
  });

  const clearAll = bar.querySelector('.btn-clear-all');
  clearAll.style.cssText = 'border:1px solid #ef4444;color:#ef4444;border-radius:8px;padding:4px 8px;background:transparent;cursor:pointer';
  clearAll.addEventListener('click', () => {
    if (!favorites.length) return;
      favorites = [];
      saveFavorites();
      renderFavorites();
  });
};

const renderFavorites = () => {
  showingFavs = true;
  updateFavBadge();
  clearResultsUI();

  const favs = getFavObjects().sort(sortCriteria === 'tube' ? byTube : byNom);
  if (!favs.length) { if (info) info.textContent = '⭐ Aucun favori enregistré.'; return; }
  if (info) info.textContent = `⭐ Vos favoris (${favs.length})`;

  renderFavoritesToolbar(resultsList);

  const frag = document.createDocumentFragment();

  for (let i = 0; i < favs.length; i++) {
    const a = favs[i];
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
      </div>`;

    const btnDel = li.querySelector('.btn-remove-fav');
    btnDel.style.cssText = 'border:none;background:transparent;font-size:18px;cursor:pointer;opacity:.85';
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      li.style.transition = 'opacity .2s ease, transform .2s ease';
      li.style.opacity = '0';
      li.style.transform = 'scale(0.98)';
      setTimeout(() => { toggleFavorite(a.Analyse_id); renderFavorites(); }, 220);
    });

    fadeMount(li);
    frag.appendChild(li);
  }

  resultsList.appendChild(frag);
};

/* ------------------------------------------------------------
     💾 CHARGEMENT DU FICHIER JSON
   ------------------------------------------------------------
   Objectif :
   - Charger la base de données locale (Liste-analyse-correspondance.json)
   - Construire le champ _search pour accélérer les recherches
   - Mettre en cache localStorage pour fonctionnement hors-ligne
------------------------------------------------------------ */
const loadData = async () => { //Charge le JSON principal et prépare la recherche
  try {
    if (info) info.textContent = '⏳ Chargement des données...';

    // 1) Essaye réseau normal (laisse le SW gérer son cache)
    const res = await fetch('Liste-analyse-correspondance.json');
    let data = await res.json();

    // 2) Pré-indexation pour recherches rapides
    data = data.map(a => ({
      ...a,
      _search: norm(
        `${a.Analyse_nom ?? ''} 
         ${a.Analyse_mnemonique ?? ''} 
         ${a.Analyseur ?? ''} 
         ${a.Tube_nom ?? ''} 
         ${a.Analyse_id ?? ''}`
      )
    }));

    allAnalyses = data;
    // 3) Sauvegarde fallback local
    localStorage.setItem('cachedData', JSON.stringify(allAnalyses));

    if (info) info.textContent = 'Tapez un mot-clé pour lancer la recherche.';
  } catch (e) {
    console.warn('⚠️ Réseau indisponible, chargement du cache local.', e);
    try {
      allAnalyses = JSON.parse(localStorage.getItem('cachedData') || '[]');
      if (info) info.textContent = 'Mode hors-ligne — données locales chargées.';
    } catch {
      allAnalyses = [];
      if (info) info.textContent = 'Erreur de chargement des données.';
    }
  }
};

/* ------------------------------------------------------------
   🎙️ RECHERCHE VOCALE — Web Speech API
   ------------------------------------------------------------
   Objectif :
   - Permet la saisie vocale pour le champ de recherche
   - Donne un retour visuel et gère les erreurs micro
------------------------------------------------------------ */
function setupVoiceSearch() {
  if (!searchInput || !voiceBtn) return;

  const showVoiceAlert = (msg) => {
    const old = document.getElementById('voice-alert'); if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'voice-alert';
    toast.textContent = msg;
    toast.style.cssText = `position:fixed;bottom:1rem;right:1rem;background:rgba(239,68,68,0.95);color:#fff;
      padding:.7rem 1rem;border-radius:.6rem;font-size:.9rem;box-shadow:0 4px 10px rgba(0,0,0,.3);
      z-index:9999;opacity:0;transform:translateY(20px);transition:opacity .4s, transform .4s;`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 50);
    setTimeout(() => toast.remove(), 4500);
  };

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showVoiceAlert('🎙️ Recherche vocale non supportée par ce navigateur');
    voiceBtn.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listening = false;

  voiceBtn.addEventListener('click', () => {
    if (!listening) {
      try {
        recognition.start();
        listening = true;
        voiceBtn.textContent = '🎧 En écoute...';
        voiceBtn.classList.add('listening');
      } catch (err) {
        console.warn('🎙️ Erreur micro :', err);
        showVoiceAlert('🚫 Micro désactivé ou inaccessible !');
        listening = false;
      }
    } else {
      recognition.stop();
    }
  });

  recognition.onresult = (event) => {
    const result = event.results[0][0].transcript.trim();
    searchInput.value = result;

    // ✅ On force l'affichage des résultats directement
    showingFavs = false;
    updateFavBadge();
    renderResults(filterAnalyses(result));
    
    // ✅ On ajoute à l'historique si possible
    if (typeof addToHistory === 'function') {
      addToHistory(result);
    }
    
    console.log('🎙️ Reçu :', result);
    
    
  };

  recognition.onend = () => {
    listening = false;
    voiceBtn.textContent = '🎙 Vocal';
    voiceBtn.classList.remove('listening');
  };

  recognition.onerror = (event) => {
    console.warn('Erreur vocale :', event.error);
    listening = false;
    voiceBtn.textContent = '🎙 Vocal';
    voiceBtn.classList.remove('listening');
    if (event.error === 'not-allowed')      showVoiceAlert('🚫 Micro non autorisé — activez-le dans votre navigateur !');
    else if (event.error === 'no-speech')   showVoiceAlert('🤔 Aucun son détecté...');
    else if (event.error === 'network')     showVoiceAlert('🌐 Problème de connexion réseau');
    else                                    showVoiceAlert('⚠️ Erreur inattendue du micro');
  };
}

/* ------------------------------------------------------------
      🕓 HISTORIQUE DES RECHERCHES
   ------------------------------------------------------------
   Objectif :
   - Sauvegarde les recherches récentes dans localStorage
   - Affiche une barre cliquable sous la recherche
   - Efface l’historique sur demande
------------------------------------------------------------ */
function setupHistory() {
  const input = searchInput;
  const results = resultsList;
  if (!input || !results) return;

  const MAX_HISTORY = 8;
  const EXPIRATION_DAYS = 7;

  const histWrap = document.createElement('div');
  histWrap.id = 'search-history';
  histWrap.innerHTML = `<div class="hist-header">
      <span>🕓 Recherches récentes</span>
      <button id="clearHistoryBtn" title="Effacer l'historique">🗑️</button>
    </div>
    <ul class="hist-list"></ul>`;
  results.parentNode.insertBefore(histWrap, results);
  histWrap.style.display = 'none';

  const listEl = histWrap.querySelector('.hist-list');

  function loadHistory() {
    const data = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const now = Date.now();
    const valid = data.filter(i => now - i.time < EXPIRATION_DAYS * 86400000);
    if (valid.length !== data.length) saveHistory(valid);
    return valid;
  }
  function saveHistory(arr) { localStorage.setItem('searchHistory', JSON.stringify(arr)); }
  function addToHistory(term) {
    if (!term) return;
    let arr = loadHistory();
    const normalized = term.trim().toLowerCase();
    arr = arr.filter(i => i.term.toLowerCase() !== normalized);
    arr.unshift({ term, time: Date.now() });
    if (arr.length > MAX_HISTORY) arr.pop();
    saveHistory(arr);
  }
  function renderHistory() {
    const arr = loadHistory();
    if (!arr.length) { histWrap.style.display = 'none'; return; }
    listEl.innerHTML = '';
    arr.forEach((i, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${i.term}</span>
                      <button class="delOne" data-idx="${idx}" title="Supprimer">✕</button>`;
      listEl.appendChild(li);
    });
    histWrap.style.display = 'block';
  }

  input.addEventListener('focus', renderHistory);
  listEl.addEventListener('click', (e) => {
    if (e.target.matches('span')) {
      input.value = e.target.textContent;
      histWrap.style.display = 'none';
      input.dispatchEvent(new Event('input'));
    } else if (e.target.matches('.delOne')) {
      const arr = loadHistory();
      arr.splice(e.target.dataset.idx, 1);
      saveHistory(arr);
      renderHistory();
    }
  });
  histWrap.querySelector('#clearHistoryBtn').addEventListener('click', () => {
    localStorage.removeItem('searchHistory');
    histWrap.style.display = 'none';
  });
  input.addEventListener('change', (e) => {
    const val = e.target.value.trim();
    if (val.length >= 2) addToHistory(val);
  });

  // expose pour la voix si besoin
  window.addToHistory = addToHistory;
}

/* ------------------------------------------------------------
      🧪 ORDRE DE PRÉLÈVEMENT DES TUBES
   ------------------------------------------------------------
   Objectif :
   - Montrer la séquence des tubes à prélever
   - Panneau repliable/affichable via un bouton
------------------------------------------------------------ */
function setupOrdreTubes() {
  if (!ordreBtn || !ordreContainer) return;
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
      void ordreContainer.offsetWidth;
      ordreContainer.classList.add('active');
      setTimeout(() => (isTransitioning = false), 350);
    } else {
      ordreContainer.classList.remove('active');
      setTimeout(() => { ordreContainer.setAttribute('hidden',''); isTransitioning = false; }, 350);
    }
  }, { passive: true });
}

/* ------------------------------------------------------------
      🌐 INDICATEUR DE RÉSEAU
   ------------------------------------------------------------
   Objectif :
   - Afficher une bannière lors du changement d’état réseau
   - Indiquer si le mode hors-ligne est actif
------------------------------------------------------------ */
function setupNetworkUI() {
  const offlineBanner = document.createElement('div');
  offlineBanner.id = 'offline-banner';
  offlineBanner.textContent = '🧩 Vous êtes hors ligne — données locales actives';
  document.body.appendChild(offlineBanner);
  offlineBanner.style.cssText = 'position:fixed;bottom:-50px;left:0;width:100%;background:rgba(59,130,246,0.25);color:#e2e8f0;text-align:center;padding:10px 0;font-size:.95rem;transition:bottom .4s ease;z-index:9999;';

  const updateBanner = () => { offlineBanner.style.bottom = navigator.onLine ? '-50px' : '0'; };

  const infoZone = document.getElementById('info') || document.querySelector('.search-wrap');
  const netStatus = document.createElement('div');
  netStatus.id = 'network-status';
  netStatus.textContent = navigator.onLine ? '🟢 En ligne — données à jour' : '🔴 Hors ligne — cache local actif';
  if (infoZone) infoZone.insertAdjacentElement('afterend', netStatus);
  netStatus.style.cssText = `margin-top:6px;margin-bottom:10px;text-align:center;font-size:.9rem;color:${navigator.onLine ? '#86efac' : '#f87171'};opacity:.9;transition:color .3s ease, opacity .3s ease;`;

  const updateLabel = () => {
    if (navigator.onLine) { netStatus.textContent = '🟢 En ligne — données à jour'; netStatus.style.color = '#86efac'; }
    else { netStatus.textContent = '🔴 Hors ligne — cache local actif'; netStatus.style.color = '#f87171'; }
  };

  window.addEventListener('online',  () => { updateBanner(); updateLabel(); });
  window.addEventListener('offline', () => { updateBanner(); updateLabel(); });
  updateBanner();
}

/* ------------------------------------------------------------
   🎛️ Événements UI de base (avec debounce)
------------------------------------------------------------ */
function setupUIEvents() {
  if (searchInput) {
    const debouncedSearch = debounce((value) => {
      showingFavs = false;
      updateFavBadge();
      renderResults(filterAnalyses(value));
    }, 250);

    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
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
  if (favToggle) {
    favToggle.addEventListener('click', () => {
      if (showingFavs) {
        showingFavs = false;
        updateFavBadge();
        if (resultsList) resultsList.innerHTML = '';
        if (info) info.textContent = 'Tapez un mot-clé pour lancer la recherche.';
      } else {
        renderFavorites();
      }
    });
  }
}
/* ============================================================
  SERVICE WORKER
   ------------------------------------------------------------*/

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker-refactorise.js')
        .then(reg => {
          console.log('✅ Service Worker enregistré avec succès:', reg.scope);
        })
        .catch(err => {
          console.warn('❌ Échec de l’enregistrement du Service Worker:', err);
        });
    });
  } else {
    console.log('⚠️ Service Worker non supporté par ce navigateur');
  }
}

/* ------------------------------------------------------------
   /* ============================================================
   🚀 INITIALISATION GLOBALE DU PWA
   ------------------------------------------------------------
   Objectif :
   - Charger les données
   - Initialiser la recherche, favoris, historique et SW
------------------------------------------------------------ */
window.addEventListener('DOMContentLoaded', async () => {
  loadFavorites();
  await loadData();
  setupUIEvents();
  setupOrdreTubes();
  setupVoiceSearch();
  setupHistory();
  setupNetworkUI();
  setupServiceWorker();
  updateFavBadge();
});

