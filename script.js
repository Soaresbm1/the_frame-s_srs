/**********************
 *  CONFIG GITHUB
 **********************/
const GH_OWNER  = "Soaresbm1";
const GH_REPO   = "the_frame_s_srs";  // <— REPO AVEC UNDERSCORES (celui qui contient /full)
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

function getMatchTypeFromFolder(folderName) {
  const normalized = folderName.toLowerCase();

  if (normalized.startsWith("entrainement")) return "entrainement";
  if (normalized.startsWith("vs")) return "match";
  return null;
}

function labelFromFolderName(folderName) {
  const type = getMatchTypeFromFolder(folderName);
  const cleaned = folderName.replaceAll("_", " ");

  if (type === "entrainement") return "Entraînement " + cleaned.replace(/entrainement/i, "").trim();
  if (type === "match") return "Match " + cleaned.replace(/vs/i, "vs ").trim();

  return cleaned;
}

async function githubList(path) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function makeCard({ club, team, filename, rawUrl, kind }) {
  let badge = "";
  if (kind === "match") badge = "Match";
  if (kind === "entrainement") badge = "Entraînement";

  const fig = document.createElement('figure');
  fig.className = 'card photo';

  fig.innerHTML = `
    <img src="${rawUrl}" loading="lazy">
    <figcaption>
      <div>
        <strong>${club} – ${team}</strong>
        ${badge ? `<span style="margin-left:.4rem;font-size:.8rem;opacity:.7">${badge}</span>` : ""}
      </div>
      <a class="btn-sm" href="${rawUrl}" download>Télécharger</a>
    </figcaption>
  `;

  return fig;
}

/**********************
 *  FAVORIS
 **********************/
async function loadFavorites() {
  const favPath = `full/favorites`;
  const files = await githubList(favPath);

  const images = files.filter(f => f.type === "file" && isImage(f.name));
  return images.map(img => {
    const raw = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${favPath}/${img.name}`;
    return makeCard({ club: "Favoris", team: "", filename: img.name, rawUrl: raw, kind: null });
  });
}

/**********************
 *  CHARGEMENT MATCHS / ENTRAINEMENTS
 **********************/
async function loadTeamAllMatches(clubLabel, teamLabel) {
  const clubPath = slugifyPath(clubLabel);
  const teamPath = slugifyPath(teamLabel);
  const base = `full/${clubPath}/${teamPath}`;

  const entries = await githubList(base);
  const dirs = entries.filter(e => e.type === "dir");

  let cards = [];

  // Photos à la racine
  const rootImages = entries.filter(e => e.type === "file" && isImage(e.name));
  rootImages.forEach(img => {
    cards.push(makeCard({
      club: clubLabel,
      team: teamLabel,
      filename: img.name,
      rawUrl: `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${img.name}`,
      kind: null
    }));
  });

  // Photos dans les dossiers matchs/entrainements
  for (const d of dirs) {
    const folderType = getMatchTypeFromFolder(d.name);
    const imgs = await githubList(`${base}/${d.name}`);

    imgs
      .filter(e => e.type === "file" && isImage(e.name))
      .forEach(img => {
        cards.push(makeCard({
          club: clubLabel,
          team: teamLabel,
          filename: img.name,
          rawUrl: `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${d.name}/${img.name}`,
          kind: folderType
        }));
      });
  }

  return cards;
}

async function loadTeamOneMatch(clubLabel, teamLabel, matchFolder) {
  const clubPath = slugifyPath(clubLabel);
  const teamPath = slugifyPath(teamLabel);
  const base = `full/${clubPath}/${teamPath}/${matchFolder}`;

  const folderType = getMatchTypeFromFolder(matchFolder);
  const imgs = await githubList(base);

  return imgs
    .filter(e => e.type === "file" && isImage(e.name))
    .map(img => makeCard({
      club: clubLabel,
      team: teamLabel,
      filename: img.name,
      rawUrl: `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${base}/${img.name}`,
      kind: folderType
    }));
}

/**********************
 *  SELECT MATCH
 **********************/
async function fillMatchSelect(clubLabel, teamLabel) {
  matchSelect.innerHTML = `<option value="_all_">Tous les matchs / entraînements</option>`;

  if (clubLabel === "all" || teamLabel === "all") {
    matchWrap.style.display = "none";
    return;
  }

  const dirs = await githubList(`full/${slugifyPath(clubLabel)}/${slugifyPath(teamLabel)}`);
  const matchDirs = dirs.filter(e => e.type === "dir");

  if (!matchDirs.length) {
    matchWrap.style.display = "none";
    return;
  }

  for (const d of matchDirs) {
    const opt = document.createElement("option");
    opt.value = d.name;
    opt.textContent = labelFromFolderName(d.name);
    matchSelect.appendChild(opt);
  }

  matchWrap.style.display = "block";
}

/**********************
 *  AFFICHAGE
 **********************/
async function showDefault() {
  clearGallery();
  const favs = await loadFavorites();
  if (favs.length === 0) {
    galleryEl.innerHTML = `<div>Aucune image trouvée dans full/favorites.</div>`;
    return;
  }
  favs.forEach(c => galleryEl.appendChild(c));
}

function clearGallery() {
  galleryEl.innerHTML = "";
}

async function applyFilters() {
  const club = clubSelect.value;
  const team = teamSelect.value;
  const match = matchSelect.value;

  clearGallery();

  // Aucun filtre → favoris
  if (club === "all" && team === "all") {
    await showDefault();
    return;
  }

  // Club choisi, équipe = toutes
  if (club !== "all" && team === "all") {
    let total = 0;
    for (const t of STRUCTURE[club]) {
      const cards = await loadTeamAllMatches(club, t);
      total += cards.length;
      cards.forEach(c => galleryEl.appendChild(c));
    }
    if (total === 0) galleryEl.innerHTML = "<div>Aucune photo trouvée.</div>";
    return;
  }

  // Club + équipe
  if (match !== "_all_") {
    const cards = await loadTeamOneMatch(club, team, match);
    cards.forEach(c => galleryEl.appendChild(c));
  } else {
    const cards = await loadTeamAllMatches(club, team);
    cards.forEach(c => galleryEl.appendChild(c));
  }
}

/**********************
 *  INIT
 **********************/
async function init() {
  await showDefault();

  clubSelect.addEventListener("change", async () => {
    matchSelect.value = "_all_";
    await fillMatchSelect(clubSelect.value, teamSelect.value);
    await applyFilters();
  });

  teamSelect.addEventListener("change", async () => {
    matchSelect.value = "_all_";
    await fillMatchSelect(clubSelect.value, teamSelect.value);
    await applyFilters();
  });

  matchSelect.addEventListener("change", applyFilters);
}

init();

/**********************
 *  FOOTER
 **********************/
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();
