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

/**********************
 *  NOUVEAU → Type de dossier (match ou entraînement)
 **********************/
function getFolderType(name) {
  const n = name.toLowerCase();
  if (n.startsWith("vs_")) return "match";
  if (n.startsWith("entrainement_")) return "training";
  return null;
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
    return makeCard({ club: null, team: null, filename: img.name, rawUrl: raw, badge: "⭐" });
  });
}

/**********************
 *  CHARGEMENT D'ÉQUIPE / MATCHS / ENTRAÎNEMENTS
 **********************/
async function loadTeamAllMatches(clubLabel, teamLabel) {
  const clubPath = slugifyPath(clubLabel);
  const teamPath = slugifyPath(teamLabel);
  const base = `full/${clubPath}/${teamPath}`;

  const entries = await githubList(base);
  const dirs = entries.filter(e => e.type === 'dir');

  let cards = [];

  // images à la racine
  const rootImages = entries.filter(e => e.type === 'file' && isImage(e.name));
  rootImages.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  rootImages.forEach(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${img.name}`;
    cards.push(makeCard({
      club: clubLabel,
      team: teamLabel,
      filename: img.name,
      rawUrl: raw
    }));
  });

  // sous-dossiers : matchs + entraînements
  for (const d of dirs) {
    const folderType = getFolderType(d.name); // "match" ou "training"
    const files = await githubList(`${base}/${d.name}`);
    const images = files.filter(f => f.type === 'file' && isImage(f.name));

    images.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
    images.forEach(img => {
      const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${d.name}/${img.name}`;
      cards.push(makeCard({
        club: clubLabel,
        team: teamLabel,
        filename: img.name,
        rawUrl: raw,
        badge: folderType === "training" ? "Entraînement" : folderType === "match" ? "Match" : null
      }));
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

  const folderType = getFolderType(matchFolder);

  return images.map(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${folder}/${img.name}`;
    return makeCard({
      club: clubLabel,
      team: teamLabel,
      filename: img.name,
      rawUrl: raw,
      badge: folderType === "training" ? "Entraînement" : folderType === "match" ? "Match" : null
    });
  });
}

/**********************
 *  SELECT MATCH + ENTRAÎNEMENT
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
  const dirs = entries.filter(e => e.type === 'dir');

  if (dirs.length === 0) {
    matchWrap.style.display = 'none';
    return;
  }

  dirs.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  for (const d of dirs) {
    const type = getFolderType(d.name);
    const opt = document.createElement('option');

    opt.value = d.name;

    if (type === "training")
      opt.textContent = d.name.replace("entrainement_", "Entraînement ");
    else if (type === "match")
      opt.textContent = d.name.replace("vs_", "Match vs ").replaceAll("_", " ");
    else
      opt.textContent = d.name.replaceAll("_", " ");

    matchSelect.appendChild(opt);
  }

  matchWrap.style.display = 'block';
}

/**********************
 *  LISTE GITHUB
 **********************/
async function githubList(path) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**********************
 *  CARTE PHOTO
 **********************/
function makeCard({ club, team, filename, rawUrl, badge }) {
  const fig = document.createElement('figure');
  fig.className = 'card photo';

  fig.innerHTML = `
    <img src="${rawUrl}" alt="${filename}" loading="lazy">
    <figcaption>
      <strong>${club ? `${club} – ${team}` : 'Favoris'}</strong>
      ${badge ? `<span>${badge}</span>` : ""}
      <a class="btn-sm" href="${rawUrl}" download>Télécharger</a>
    </figcaption>
  `;
  return fig;
}

/**********************
 *  AFFICHAGE DES PHOTOS
 **********************/
async function showDefault() {
  clearGallery();
  const favCards = await loadFavorites();
  favCards.forEach(c => galleryEl.appendChild(c));
}

function clearGallery() {
  galleryEl.innerHTML = "";
}

async function applyFilters() {
  const club  = clubSelect.value;
  const team  = teamSelect.value;
  const match = matchSelect.value;

  clearGallery();

  if (club === 'all' && team === 'all') {
    await showDefault();
    return;
  }

  if (club !== 'all' && team === 'all') {
    await fillMatchSelect('all','all');
    for (const t of STRUCTURE[club] || []) {
      const cards = await loadTeamAllMatches(club, t);
      cards.forEach(c => galleryEl.appendChild(c));
    }
    return;
  }

  if (club !== 'all' && team !== 'all') {
    if (match !== '_all_') {
      const cards = await loadTeamOneMatch(club, team, match);
      cards.forEach(c => galleryEl.appendChild(c));
    } else {
      const cards = await loadTeamAllMatches(club, team);
      cards.forEach(c => galleryEl.appendChild(c));
    }
    return;
  }

  if (club === 'all' && team !== 'all') {
    await fillMatchSelect('all','all');
    for (const c of Object.keys(STRUCTURE)) {
      if ((STRUCTURE[c] || []).includes(team)) {
        const cards = await loadTeamAllMatches(c, team);
        cards.forEach(card => galleryEl.appendChild(card));
      }
    }
  }
}

/**********************
 *  INIT
 **********************/
async function init() {
  await showDefault();

  if (clubSelect)
    clubSelect.addEventListener('change', async () => {
      matchSelect.value = '_all_';
      await fillMatchSelect(clubSelect.value, teamSelect.value);
      await applyFilters();
    });

  if (teamSelect)
    teamSelect.addEventListener('change', async () => {
      matchSelect.value = '_all_';
      await fillMatchSelect(clubSelect.value, teamSelect.value);
      await applyFilters();
    });

  if (matchSelect)
    matchSelect.addEventListener('change', applyFilters);
}

init();

/* Footer */
document.getElementById('year').textContent = new Date().getFullYear();
