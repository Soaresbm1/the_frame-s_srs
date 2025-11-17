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

/**********************
 *  OUTILS
 **********************/
function slugifyPath(text) {
  return text
    .trim()
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

/**
 * Détermine le type de dossier : "match", "entrainement" ou null
 */
function getMatchTypeFromFolder(folderName) {
  const normalized = folderName
    .toLowerCase()
    .replaceAll("é", "e")
    .replaceAll("è", "e");

  if (normalized.startsWith("entrainement")) return "entrainement";
  if (normalized.startsWith("vs"))           return "match";
  return null;
}

/**
 * Crée un joli label pour la liste des matchs / entraînements
 * ex: "vs_FC_X_2025-11-01" → "Match vs FC X 2025-11-01"
 *     "entrainement_2025-11-01" → "Entraînement 2025-11-01"
 */
function labelFromFolderName(folderName) {
  const type = getMatchTypeFromFolder(folderName);
  const cleaned = folderName.replaceAll("_", " ");

  if (type === "entrainement") {
    const base = "entrainement";
    const idx = cleaned.toLowerCase().indexOf(base);
    const rest = idx >= 0 ? cleaned.slice(idx + base.length).trim() : "";
    return rest ? `Entraînement ${rest}` : "Entraînement";
  }

  if (type === "match") {
    const base = "vs";
    const idx = cleaned.toLowerCase().indexOf(base);
    const rest = idx >= 0 ? cleaned.slice(idx + base.length).trim() : "";
    return rest ? `Match vs ${rest}` : "Match";
  }

  // fallback
  return cleaned;
}

async function githubList(path) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Création d'une carte photo
 * kind = "match" | "entrainement" | null
 */
function makeCard({ club, team, filename, rawUrl, badge, kind }) {
  const fig = document.createElement('figure');
  fig.className = 'card photo';
  if (club) fig.dataset.club = club;
  if (team) fig.dataset.team = team;
  if (kind) fig.dataset.kind = kind;

  // si badge non fourni, on peut en déduire un depuis kind
  let finalBadge = badge;
  if (!finalBadge && kind === "match") finalBadge = "Match";
  if (!finalBadge && kind === "entrainement") finalBadge = "Entraînement";

  fig.innerHTML = `
    <img src="${rawUrl}" alt="${club ? club : 'Favoris'} ${team || ''}" loading="lazy">
    <figcaption>
      <div>
        <strong>${club ? `${club} – ${team}` : 'Favoris'}</strong>
        ${finalBadge ? `<span style="margin-left:.4rem;font-size:.8rem;opacity:.7">${finalBadge}</span>` : ""}
      </div>
      <a class="btn-sm" href="${rawUrl}" download>Télécharger</a>
    </figcaption>
  `;
  return fig;
}

function clearGallery() {
  galleryEl.innerHTML = "";
}

function showInfoMessage(html) {
  galleryEl.innerHTML = `
    <div style="grid-column:1/-1; padding:1rem; border:1px dashed #c0b28a; border-radius:8px; background:#fff;">
      ${html}
    </div>`;
}

/**********************
 *  FAVORIS
 **********************/
async function loadFavorites() {
  const favPath = `full/favorites`;
  const files = await githubList(favPath);
  const images = files.filter(f => f.type === 'file' && isImage(f.name));
  images.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  return images.map(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${favPath}/${img.name}`;
    return makeCard({ club: null, team: null, filename: img.name, rawUrl: raw, badge: "⭐", kind: null });
  });
}

/**********************
 *  CHARGEMENT D'ÉQUIPE / MATCHS
 **********************/
async function loadTeamAllMatches(clubLabel, teamLabel) {
  const clubPath = slugifyPath(clubLabel);
  const teamPath = slugifyPath(teamLabel);
  const base = `full/${clubPath}/${teamPath}`;

  const entries = await githubList(base);
  const matchDirs = entries.filter(e => e.type === 'dir');

  let cards = [];

  // images à la racine de l'équipe
  const rootImages = entries.filter(e => e.type === 'file' && isImage(e.name));
  rootImages.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  rootImages.forEach(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${img.name}`;
    cards.push(
      makeCard({
        club: clubLabel,
        team: teamLabel,
        filename: img.name,
        rawUrl: raw,
        kind: null
      })
    );
  });

  // sous-dossiers (matchs + entraînements)
  for (const d of matchDirs) {
    const folderType = getMatchTypeFromFolder(d.name); // "match" / "entrainement" / null
    const files = await githubList(`${base}/${d.name}`);
    const images = files.filter(f => f.type === 'file' && isImage(f.name));
    images.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
    images.forEach(img => {
      const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${d.name}/${img.name}`;
      cards.push(
        makeCard({
          club: clubLabel,
          team: teamLabel,
          filename: img.name,
          rawUrl: raw,
          kind: folderType
        })
      );
    });
  }

  return cards;
}

async function loadTeamOneMatch(clubLabel, teamLabel, matchFolder) {
  const clubPath = slugifyPath(clubLabel);
  const teamPath = slugifyPath(teamLabel);
  const folder   = `full/${clubPath}/${teamPath}/${matchFolder}`;

  const files  = await githubList(folder);
  const images = files.filter(f => f.type === 'file' && isImage(f.name));
  images.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  const folderType = getMatchTypeFromFolder(matchFolder);

  return images.map(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${folder}/${img.name}`;
    return makeCard({
      club: clubLabel,
      team: teamLabel,
      filename: img.name,
      rawUrl: raw,
      kind: folderType
    });
  });
}

/**********************
 *  REMPLISSAGE DU SELECT "MATCH"
 **********************/
async function fillMatchSelect(clubLabel, teamLabel) {
  if (!matchWrap || !matchSelect) return;

  matchSelect.innerHTML = `<option value="_all_">Tous les matchs / entraînements</option>`;

  if (clubLabel === 'all' || teamLabel === 'all') {
    matchWrap.style.display = 'none';
    return;
  }

  const clubPath = slugifyPath(clubLabel);
  const teamPath = slugifyPath(teamLabel);
  const base     = `full/${clubPath}/${teamPath}`;

  const entries  = await githubList(base);
  const matchDirs = entries.filter(e => e.type === 'dir');

  if (matchDirs.length === 0) {
    matchWrap.style.display = 'none';
    return;
  }

  matchDirs.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  for (const d of matchDirs) {
    const opt = document.createElement('option');
    opt.value = d.name;
    opt.textContent = labelFromFolderName(d.name);
    matchSelect.appendChild(opt);
  }

  matchWrap.style.display = 'block';
}

/**********************
 *  AFFICHAGE DES PHOTOS
 **********************/
async function showDefault() {
  clearGallery();
  const favCards = await loadFavorites();
  if (favCards.length) {
    favCards.forEach(c => galleryEl.appendChild(c));
  } else {
    showInfoMessage(`
      Aucune image détectée.<br>
      Ajoute des photos dans <code>full/favorites</code> ou dans
      <code>full/&lt;Club&gt;/&lt;Équipe&gt;/vs_Adversaire_YYYY-MM-DD</code>
      ou <code>entrainement_YYYY-MM-DD</code>.
    `);
  }
}

async function applyFilters() {
  const club  = clubSelect ? clubSelect.value : 'all';
  const team  = teamSelect ? teamSelect.value : 'all';
  const match = matchSelect ? matchSelect.value : '_all_';

  clearGallery();

  // Aucun filtre → favoris
  if (club === 'all' && team === 'all') {
    await showDefault();
    return;
  }

  // Club choisi, équipe = toutes
  if (club !== 'all' && team === 'all') {
    await fillMatchSelect('all','all');
    let total = 0;
    const teams = STRUCTURE[club] || [];
    for (const t of teams) {
      const cards = await loadTeamAllMatches(club, t);
      cards.forEach(c => galleryEl.appendChild(c));
      total += cards.length;
    }
    if (total === 0) showInfoMessage(`Aucune photo trouvée pour ce club.`);
    return;
  }

  // Club + équipe
  if (club !== 'all' && team !== 'all') {
    if (match !== '_all_') {
      const cards = await loadTeamOneMatch(club, team, match);
      if (cards.length === 0) {
        showInfoMessage(`Aucune photo trouvée pour ce match ou cet entraînement.`);
      } else {
        cards.forEach(c => galleryEl.appendChild(c));
      }
    } else {
      const cards = await loadTeamAllMatches(club, team);
      if (cards.length === 0) {
        showInfoMessage(`Aucune photo trouvée pour cette équipe.`);
      } else {
        cards.forEach(c => galleryEl.appendChild(c));
      }
    }
    return;
  }

  // Équipe choisie, club = tous
  if (club === 'all' && team !== 'all') {
    await fillMatchSelect('all','all');
    let total = 0;
    for (const c of Object.keys(STRUCTURE)) {
      if ((STRUCTURE[c] || []).includes(team)) {
        const cards = await loadTeamAllMatches(c, team);
        cards.forEach(card => galleryEl.appendChild(card));
        total += cards.length;
      }
    }
    if (total === 0) showInfoMessage(`Aucune photo trouvée pour cette équipe.`);
  }
}

/**********************
 *  INIT
 **********************/
async function init() {
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

// Année footer
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();
