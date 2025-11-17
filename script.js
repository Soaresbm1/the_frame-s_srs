/**********************
 *  CONFIG GITHUB
 **********************/
const GH_OWNER  = "Soaresbm1";
const GH_REPO   = "the_frame_srs";
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

async function githubList(path) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function makeCard({ club, team, filename, rawUrl, badge }) {
  const fig = document.createElement('figure');
  fig.className = 'card photo';
  if (club) fig.dataset.club = club;
  if (team) fig.dataset.team = team;
  fig.innerHTML = `
    <img src="${rawUrl}" alt="${club ? club : 'Favoris'} ${team || ''}" loading="lazy">
    <figcaption>
      <div>
        <strong>${club ? `${club} – ${team}` : 'Favoris'}</strong>
        ${badge ? `<span style="margin-left:.4rem;font-size:.8rem;opacity:.7">${badge}</span>` : ""}
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
    return makeCard({ club: null, team: null, filename: img.name, rawUrl: raw, badge: "⭐" });
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

  const rootImages = entries.filter(e => e.type === 'file' && isImage(e.name));
  rootImages.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  rootImages.forEach(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${img.name}`;
    cards.push(makeCard({ club: clubLabel, team: teamLabel, filename: img.name, rawUrl: raw }));
  });

  for (const d of matchDirs) {
    const files = await githubList(`${base}/${d.name}`);
    const images = files.filter(f => f.type === 'file' && isImage(f.name));
    images.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
    images.forEach(img => {
      const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${d.name}/${img.name}`;
      cards.push(makeCard({ club: clubLabel, team: teamLabel, filename: img.name, rawUrl: raw }));
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

  return images.map(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${folder}/${img.name}`;
    return makeCard({ club: clubLabel, team: teamLabel, filename: img.name, rawUrl: raw });
  });
}

/**********************
 *  REMPLISSAGE DU SELECT "MATCH"
 **********************/
async function fillMatchSelect(clubLabel, teamLabel) {
  if (!matchWrap || !matchSelect) return;

  matchSelect.innerHTML = `<option value="_all_">Tous les matchs</option>`;

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
    const label = d.name.replaceAll("_", " ");
    const opt = document.createElement('option');
    opt.value = d.name;
    opt.textContent = label;
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
      <code>full/&lt;Club&gt;/&lt;Équipe&gt;/vs_Adversaire_YYYY-MM-DD</code>.
    `);
  }
}

async function applyFilters() {
  const club = clubSelect ? clubSelect.value : 'all';
  const team = teamSelect ? teamSelect.value : 'all';
  const match = matchSelect ? matchSelect.value : '_all_';

  clearGallery();

  if (club === 'all' && team === 'all') {
    await showDefault();
    return;
  }

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

  if (club !== 'all' && team !== 'all') {
    if (match !== '_all_') {
      const cards = await loadTeamOneMatch(club, team, match);
      if (cards.length === 0) {
        showInfoMessage(`Aucune photo trouvée pour ce match ou cette équipe.`);
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
