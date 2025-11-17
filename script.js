/**********************
 *  CONFIG GITHUB
 **********************/
const GH_OWNER  = "Soaresbm1";
const GH_REPO   = "the_frame-s_srs";
const GH_BRANCH = "main";

/**********************
 *  ACCORDÉON (si présent)
 **********************/
const acc   = document.querySelector('.accordion');
const panel = document.querySelector('.panel');
if (acc && panel) {
  acc.addEventListener('click', () => {
    acc.classList.toggle('active');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  });
}

/**********************
 *  STRUCTURE CLUBS/ÉQUIPES
 **********************/
const STRUCTURE = {
  "FC Le Parc": ["Inter A", "Juniors B", "2ème Futsal"],
  "FC La Chaux-de-Fonds": ["Inter A", "Juniors B"]
};

/**********************
 *  SÉLECTEURS
 **********************/
const clubSelect  = document.getElementById('club-select');
const teamSelect  = document.getElementById('team-select');
const matchWrap   = document.getElementById('match-container');
const matchSelect = document.getElementById('match-select');
const galleryEl   = document.getElementById('gallery');
const toggleFavsBtn = document.getElementById('toggle-user-favs');

/**********************
 *  OUTILS GÉNÉRAUX
 **********************/
function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_")
    .replaceAll("’", "")
    .replaceAll("'", "")
    .replaceAll("é", "e")
    .replaceAll("è", "e")
    .replaceAll("ê", "e")
    .replaceAll("à", "a")
    .replaceAll("â", "a")
    .replaceAll("î", "i")
    .replaceAll("ï", "i")
    .replaceAll("ô", "o")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

function isImage(name) {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

function matchFolder(entries, expectedSlug) {
  for (const entry of entries) {
    const realSlug = slugify(entry.name);
    if (realSlug === expectedSlug) {
      return entry.name;
    }
  }
  return null;
}

/**********************
 *  GESTION FAVORIS UTILISATEUR (localStorage)
 **********************/
const LS_FAV_KEY = "tfs_user_favorites";
let userFavorites = new Set();
let showOnlyFavs = false;

function loadUserFavorites() {
  try {
    const raw = localStorage.getItem(LS_FAV_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      userFavorites = new Set(arr);
    }
  } catch (e) {
    console.warn("Impossible de charger les favoris", e);
  }
}

function saveUserFavorites() {
  try {
    localStorage.setItem(LS_FAV_KEY, JSON.stringify([...userFavorites]));
  } catch (e) {
    console.warn("Impossible d’enregistrer les favoris", e);
  }
}

function isFavorite(id) {
  return userFavorites.has(id);
}

/**********************
 *  TYPE DE DOSSIER (MATCH / ENTRAÎNEMENT)
 **********************/
function getFolderType(name) {
  const s = slugify(name);
  if (s.startsWith("vs_")) return "match";
  if (s.startsWith("entrainement_")) return "training";
  return null;
}

function labelFromFolderName(name) {
  const type = getFolderType(name);
  const pretty = name.replaceAll("_", " ");

  if (type === "match") {
    return pretty.replace(/^vs\s*/i, "Match vs ");
  }
  if (type === "training") {
    return pretty.replace(/^entrainement\s*/i, "Entraînement ");
  }
  return pretty;
}

/**********************
 *  APPEL API GITHUB
 **********************/
async function githubList(path) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**********************
 *  RÉSO CLUB & ÉQUIPE
 **********************/
async function resolveClubFolder(clubLabel) {
  const clubs = await githubList("full");
  const expectedSlug = slugify(clubLabel);
  return matchFolder(clubs, expectedSlug);
}

async function resolveTeamFolder(clubLabel, teamLabel) {
  const realClub = await resolveClubFolder(clubLabel);
  if (!realClub) return { realClub: null, realTeam: null };

  const teams = await githubList(`full/${realClub}`);
  const expectedTeamSlug = slugify(teamLabel);
  const realTeam = matchFolder(teams, expectedTeamSlug);

  return { realClub, realTeam };
}

/**********************
 *  CARTE PHOTO
 **********************/
function makeCard({ club, team, rawUrl, badge, kind }) {
  let finalBadge = badge;
  if (!finalBadge && kind === "match") finalBadge = "Match";
  if (!finalBadge && kind === "training") finalBadge = "Entraînement";

  const fig = document.createElement('figure');
  fig.className = 'card photo';
  fig.dataset.id = rawUrl;

  const title = club && team ? `${club} – ${team}` : (club || "Favoris");
  const favActive = isFavorite(rawUrl);

  fig.innerHTML = `
    <img src="${rawUrl}" alt="${title}" loading="lazy">
    <figcaption>
      <div>
        <strong>${title}</strong>
        ${finalBadge ? `<span style="margin-left:.4rem;font-size:.8rem;opacity:.7">${finalBadge}</span>` : ""}
      </div>
      <div class="photo-actions">
        <a class="btn-sm" href="${rawUrl}" download>Télécharger</a>
        <button 
          class="fav-btn ${favActive ? "is-active" : ""}" 
          type="button" 
          data-id="${rawUrl}" 
          data-club="${club || ""}" 
          data-team="${team || ""}"
          aria-label="Ajouter aux favoris"
        >
          ${favActive ? "❤️" : "🤍"}
        </button>
      </div>
    </figcaption>
  `;
  return fig;
}

/**********************
 *  FAVORIS (dossier full/favorites)
 **********************/
async function loadFavorites() {
  const favPath = `full/favorites`;
  const files = await githubList(favPath);
  const images = files.filter(f => f.type === 'file' && isImage(f.name));
  images.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  return images.map(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${favPath}/${img.name}`;
    return makeCard({ club: "Favoris", team: "", rawUrl: raw, badge: "⭐", kind: null });
  });
}

/**********************
 *  CHARGEMENT D'ÉQUIPE (TOUS MATCHS)
 **********************/
async function loadTeamAllMatches(clubLabel, teamLabel) {
  const { realClub, realTeam } = await resolveTeamFolder(clubLabel, teamLabel);
  if (!realClub || !realTeam) return [];

  const base = `full/${realClub}/${realTeam}`;
  const entries = await githubList(base);

  const cards = [];

  const rootImages = entries.filter(e => e.type === 'file' && isImage(e.name));
  rootImages.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  rootImages.forEach(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${img.name}`;
    cards.push(makeCard({ club: clubLabel, team: teamLabel, rawUrl: raw, kind: null }));
  });

  const dirs = entries.filter(e => e.type === 'dir');
  for (const d of dirs) {
    const folderType = getFolderType(d.name);
    const files = await githubList(`${base}/${d.name}`);
    const images = files.filter(f => f.type === 'file' && isImage(f.name));
    images.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

    images.forEach(img => {
      const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${d.name}/${img.name}`;
      cards.push(makeCard({
        club: clubLabel,
        team: teamLabel,
        rawUrl: raw,
        kind: folderType
      }));
    });
  }

  return cards;
}

/**********************
 *  CHARGEMENT D'UN MATCH / ENTRAÎNEMENT
 **********************/
async function loadTeamOneMatch(clubLabel, teamLabel, matchFolder) {
  const { realClub, realTeam } = await resolveTeamFolder(clubLabel, teamLabel);
  if (!realClub || !realTeam) return [];

  const base = `full/${realClub}/${realTeam}/${matchFolder}`;
  const files = await githubList(base);
  const images = files.filter(f => f.type === 'file' && isImage(f.name));
  images.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  const folderType = getFolderType(matchFolder);

  return images.map(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${img.name}`;
    return makeCard({
      club: clubLabel,
      team: teamLabel,
      rawUrl: raw,
      kind: folderType
    });
  });
}

/**********************
 *  SELECT MATCH
 **********************/
async function fillMatchSelect(clubLabel, teamLabel) {
  if (!matchWrap || !matchSelect) return;

  matchSelect.innerHTML = `<option value="_all_">Tous les matchs / entraînements</option>`;

  if (clubLabel === 'all' || teamLabel === 'all') {
    matchWrap.style.display = 'none';
    return;
  }

  const { realClub, realTeam } = await resolveTeamFolder(clubLabel, teamLabel);
  if (!realClub || !realTeam) {
    matchWrap.style.display = 'none';
    return;
  }

  const base = `full/${realClub}/${realTeam}`;
  const entries = await githubList(base);
  const dirs = entries.filter(e => e.type === 'dir');

  if (!dirs.length) {
    matchWrap.style.display = 'none';
    return;
  }

  dirs.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  dirs.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.name;
    opt.textContent = labelFromFolderName(d.name);
    matchSelect.appendChild(opt);
  });

  matchWrap.style.display = 'block';
}

/**********************
 *  AFFICHAGE GALERIE
 **********************/
function clearGallery() {
  galleryEl.innerHTML = "";
}

function showInfoMessage(html) {
  galleryEl.innerHTML = `
    <div style="grid-column:1/-1; padding:1rem; border:1px dashed #c0b28a; background:#fff; border-radius:8px;">
      ${html}
    </div>`;
}

async function showDefault() {
  clearGallery();
  const fav = await loadFavorites();
  if (!fav.length) {
    showInfoMessage(`
      Aucune image pour l’instant.<br>
      Mets des photos dans <code>full/favorites</code>.
    `);
    afterGalleryRender();
    return;
  }
  fav.forEach(c => galleryEl.appendChild(c));
  afterGalleryRender();
}

/**********************
 *  LIGHTBOX
 **********************/
let lightbox = document.getElementById("lightbox");
let lightboxImg = document.getElementById("lightbox-img");
let btnClose = document.getElementById("lightbox-close");
let btnPrev = document.getElementById("lightbox-prev");
let btnNext = document.getElementById("lightbox-next");

let galleryImages = [];
let currentIndex = 0;

function enableLightbox() {
  galleryImages = Array.from(document.querySelectorAll(".gallery-grid img"));
  galleryImages.forEach((img, index) => {
    img.addEventListener("click", () => {
      currentIndex = index;
      openLightbox(img.src);
    });
  });
}

function openLightbox(src) {
  if (!lightbox) return;
  lightbox.style.display = "flex";
  lightboxImg.src = src;
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.style.display = "none";
}

function showNext() {
  if (!galleryImages.length) return;
  currentIndex = (currentIndex + 1) % galleryImages.length;
  lightboxImg.src = galleryImages[currentIndex].src;
}

function showPrev() {
  if (!galleryImages.length) return;
  currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  lightboxImg.src = galleryImages[currentIndex].src;
}

if (btnClose) btnClose.onclick = closeLightbox;
if (btnNext) btnNext.onclick = showNext;
if (btnPrev) btnPrev.onclick = showPrev;

if (lightbox) {
  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) closeLightbox();
  });
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") showNext();
  if (e.key === "ArrowLeft") showPrev();
});

/**********************
 *  FAVORIS UTILISATEUR : UI
 **********************/
function wireFavoriteButtons() {
  const buttons = document.querySelectorAll(".fav-btn");
  buttons.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation(); // ne pas déclencher la lightbox
      const id = btn.dataset.id;
      if (!id) return;

      if (userFavorites.has(id)) {
        userFavorites.delete(id);
      } else {
        userFavorites.add(id);
      }
      saveUserFavorites();
      updateFavoriteButtonVisual(btn, userFavorites.has(id));
      if (showOnlyFavs) {
        applyUserFavFilter();
      }
    };
  });
}

function updateFavoriteButtonVisual(btn, active) {
  if (active) {
    btn.classList.add("is-active");
    btn.textContent = "❤️";
  } else {
    btn.classList.remove("is-active");
    btn.textContent = "🤍";
  }
}

function applyUserFavFilter() {
  const cards = document.querySelectorAll(".gallery-grid .card.photo");
  cards.forEach(card => {
    const img = card.querySelector("img");
    const id = img ? img.src : card.dataset.id;
    if (!showOnlyFavs) {
      card.style.display = "";
    } else {
      card.style.display = isFavorite(id) ? "" : "none";
    }
  });
}

function wireToggleFavsButton() {
  if (!toggleFavsBtn) return;
  toggleFavsBtn.addEventListener("click", () => {
    showOnlyFavs = !showOnlyFavs;
    if (showOnlyFavs) {
      toggleFavsBtn.classList.add("btn-toggle-favs-active");
      toggleFavsBtn.textContent = "Afficher toutes les photos";
    } else {
      toggleFavsBtn.classList.remove("btn-toggle-favs-active");
      toggleFavsBtn.textContent = "Afficher mes favoris ❤️";
    }
    applyUserFavFilter();
  });
}

/**********************
 *  À APPELER APRÈS CHAQUE RENDU GALERIE
 **********************/
function afterGalleryRender() {
  wireFavoriteButtons();
  enableLightbox();
  applyUserFavFilter();
}

/**********************
 *  FILTRES PRINCIPAUX
 **********************/
async function applyFilters() {
  const club  = clubSelect ? clubSelect.value : 'all';
  const team  = teamSelect ? teamSelect.value : 'all';
  const match = matchSelect ? matchSelect.value : '_all_';

  clearGallery();

  if (club === 'all' && team === 'all') {
    await showDefault();
    return;
  }

  if (club !== 'all' && team === 'all') {
    let total = 0;
    const teams = STRUCTURE[club] || [];
    for (const t of teams) {
      const cards = await loadTeamAllMatches(club, t);
      cards.forEach(c => galleryEl.appendChild(c));
      total += cards.length;
    }
    if (!total) showInfoMessage("Aucune photo pour ce club.");
    afterGalleryRender();
    return;
  }

  if (club !== 'all' && team !== 'all') {
    if (match !== '_all_') {
      const cards = await loadTeamOneMatch(club, team, match);
      if (!cards.length) showInfoMessage("Aucune photo pour ce match.");
      cards.forEach(c => galleryEl.appendChild(c));
    } else {
      const cards = await loadTeamAllMatches(club, team);
      if (!cards.length) showInfoMessage("Aucune photo pour cette équipe.");
      cards.forEach(c => galleryEl.appendChild(c));
    }
    afterGalleryRender();
    return;
  }

  if (club === 'all' && team !== 'all') {
    let total = 0;
    for (const c of Object.keys(STRUCTURE)) {
      if (STRUCTURE[c].includes(team)) {
        const cards = await loadTeamAllMatches(c, team);
        cards.forEach(card => galleryEl.appendChild(card));
        total += cards.length;
      }
    }
    if (!total) showInfoMessage("Aucune photo pour cette équipe.");
    afterGalleryRender();
  }
}

/**********************
 *  INIT
 **********************/
async function init() {
  loadUserFavorites();
  wireToggleFavsButton();

  await showDefault();

  if (clubSelect) clubSelect.addEventListener('change', async () => {
    if (matchSelect) matchSelect.value = '_all_';
    await fillMatchSelect(clubSelect.value, teamSelect.value);
    await applyFilters();
  });

  if (teamSelect) teamSelect.addEventListener('change', async () => {
    if (matchSelect) matchSelect.value = '_all_';
    await fillMatchSelect(clubSelect.value, teamSelect.value);
    await applyFilters();
  });

  if (matchSelect) matchSelect.addEventListener('change', applyFilters);
}

init();

/**********************
 *  FOOTER ANNÉE
 **********************/
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();
