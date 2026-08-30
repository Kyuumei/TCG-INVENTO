#!/usr/bin/env node
/**
 * Fiche d'atelier.
 *
 * Produit une page autonome listant les 158 illustrations à produire : pour
 * chacune, le nom de fichier attendu, l'illustration procédurale actuelle en
 * référence de cadrage, et la requête complète prête à copier.
 *
 * Elle existe parce que générer un set à la main sans feuille de route revient
 * à improviser 158 fois : la cohérence se perd, et l'on ne sait plus où l'on en
 * est. La page suit l'avancement dans le stockage local du navigateur.
 */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chargerDonnees } from './charger-donnees.mjs';

const STYLE_COMMUN =
  'trading card creature illustration, painted digital artwork in a bright collectible-card style, ' +
  'clean confident ink outline around the subject, cel-shaded forms with two or three flat value steps, ' +
  'bold saturated colours, coloured shadows rather than grey, soft key light from the upper left with a warm rim light, ' +
  'one single subject centred and fully within the frame, simple background suggesting its habitat with soft depth of field, ' +
  'a few sparkle particles, 4:3 landscape composition, ' +
  'no text, no lettering, no logo, no card frame, no border, no watermark, no signature';

const AMBIANCE = {
  sylve: 'lush verdant palette, dappled forest light',
  flamme: 'ember and molten palette, glowing heat haze',
  maree: 'deep blue and teal palette, wet reflective surfaces',
  foudre: 'violet and electric blue palette, crackling arcs',
  roc: 'ochre and stone palette, dusty sunlit air',
  ombre: 'deep violet and near-black palette, cold rim light',
  neutre: 'muted earthy palette, overcast daylight',
};

const LABEL_ELEMENT = {
  sylve: 'Sylve', flamme: 'Flamme', maree: 'Marée', foudre: 'Foudre',
  roc: 'Roc', ombre: 'Ombre', neutre: 'Neutre',
};

const COULEUR = {
  sylve: '#6fae4e', flamme: '#e2622a', maree: '#3fa5c8', foudre: '#9a86ff',
  roc: '#c2a06a', ombre: '#9364c8', neutre: '#9c9689',
};

const ech = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function vignette(id) {
  try {
    const brut = await readFile(join(process.cwd(), 'public', 'art', `${id}.webp`));
    const petit = await sharp(brut).resize(120, 90, { kernel: 'lanczos3' }).webp({ quality: 62 }).toBuffer();
    return `data:image/webp;base64,${petit.toString('base64')}`;
  } catch {
    return '';
  }
}

async function principal() {
  const { TOUTES_LES_CARTES, TERRAINS } = await chargerDonnees();

  const entrees = [
    ...TOUTES_LES_CARTES.map((c) => ({
      id: c.id, nom: c.nom, element: c.element, artPrompt: c.artPrompt,
      detail: c.kind === 'creature' ? `${c.cout} cristaux · ${c.atq}/${c.pv}` : `${c.cout} cristaux · ${c.kind}`,
      rarete: c.rarete,
    })),
    ...TERRAINS.map((t) => ({
      id: t.id, nom: t.nom, element: t.element, artPrompt: t.artPrompt,
      detail: 'Terrain', rarete: 'terrain',
    })),
  ];

  const lignes = [];
  for (const e of entrees) {
    const img = await vignette(e.id);
    const complet = [e.artPrompt, AMBIANCE[e.element], STYLE_COMMUN].filter(Boolean).join(', ');
    lignes.push(`<article class="fiche" data-el="${e.element}" data-id="${ech(e.id)}">
      <label class="fiche__coche">
        <input type="checkbox" data-fait="${ech(e.id)}">
        <span></span>
      </label>
      <div class="fiche__vignette">${img ? `<img src="${img}" alt="" width="120" height="90" loading="lazy">` : '<div class="fiche__absente">—</div>'}</div>
      <div class="fiche__corps">
        <h3 class="fiche__nom">${ech(e.nom)}</h3>
        <p class="fiche__meta"><span class="pastille" style="--c:${COULEUR[e.element]}">${LABEL_ELEMENT[e.element]}</span> ${ech(e.detail)}</p>
        <p class="fiche__fichier"><code>${ech(e.id)}.webp</code></p>
        <p class="fiche__scene">${ech(e.artPrompt)}</p>
      </div>
      <button class="copier" data-requete="${ech(complet)}">Copier la requête</button>
    </article>`);
  }

  const page = `<title>Atelier d'illustration INVENTO</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Spectral:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* La page appartient au monde du jeu : or sur noir, Cinzel et Spectral. Elle
   assume donc un seul thème, comme le jeu lui-même, et peint explicitement son
   fond pour tenir sur n'importe quel hôte. */
:root {
  --fond: #0a0c11;
  --panneau: #151a23;
  --panneau-2: #1d2430;
  --bord: #2b3341;
  --texte: #e9e5da;
  --attenue: #98a0af;
  --or: #d7b463;
  --or-sombre: #8e7333;
  --succes: #6fbf73;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--fond); color: var(--texte);
  font-family: 'Spectral', Georgia, serif; font-size: 16px; line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: 'Cinzel', Georgia, serif; margin: 0; text-wrap: balance; }
code, .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

.enveloppe { max-width: 900px; margin: 0 auto; padding: 0 18px 64px; }

.tete { padding: 40px 0 22px; border-bottom: 1px solid var(--bord); }
.tete h1 { font-size: clamp(1.7rem, 5vw, 2.4rem); letter-spacing: .04em; color: var(--or); }
.tete p { color: var(--attenue); max-width: 62ch; }

.mode-emploi {
  margin-top: 22px; padding: 18px 20px; border-radius: 12px;
  background: var(--panneau); border: 1px solid var(--bord);
}
.mode-emploi h2 { font-size: 1rem; letter-spacing: .05em; color: var(--or); margin-bottom: 10px; }
.mode-emploi ol { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
.mode-emploi code { background: var(--panneau-2); padding: 1px 6px; border-radius: 5px; font-size: .86em; }

/* Le bloc de style est mis en avant parce qu'il est la vraie clé de voûte :
   c'est lui, répété à l'identique, qui fait tenir un set de 158 images. */
.socle {
  margin-top: 18px; padding: 18px 20px; border-radius: 12px;
  background: linear-gradient(180deg, rgb(215 180 99 / 10%), transparent), var(--panneau);
  border: 1px solid var(--or-sombre);
}
.socle h2 { font-size: 1rem; letter-spacing: .05em; color: var(--or); }
.socle p { color: var(--attenue); font-size: .9rem; margin: 8px 0 12px; }
.socle pre {
  margin: 0 0 12px; padding: 12px; border-radius: 8px; overflow-x: auto;
  background: #080a0e; border: 1px solid var(--bord);
  font-family: 'JetBrains Mono', monospace; font-size: .76rem; line-height: 1.55; color: #cfd6e2;
  white-space: pre-wrap; word-break: break-word;
}

.barre {
  position: sticky; top: 0; z-index: 5;
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  padding: 12px 0; margin-top: 26px;
  background: linear-gradient(180deg, var(--fond) 72%, transparent);
}
.jauge { flex: 1 1 200px; min-width: 180px; }
.jauge__texte { font-size: .82rem; color: var(--attenue); font-variant-numeric: tabular-nums; }
.jauge__piste { height: 6px; margin-top: 6px; border-radius: 3px; background: var(--panneau-2); overflow: hidden; }
.jauge__piste i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, var(--or-sombre), var(--or)); transition: width 240ms ease; }

.filtres { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0; }
.puce {
  flex: none; height: 32px; padding: 0 12px; border-radius: 16px;
  border: 1px solid var(--bord); background: var(--panneau); color: var(--attenue);
  font: inherit; font-size: .82rem; cursor: pointer;
}
.puce[aria-pressed="true"] { border-color: var(--or); color: var(--or); background: rgb(215 180 99 / 12%); }
.puce:focus-visible, .copier:focus-visible, .fiche__coche input:focus-visible + span { outline: 2px solid var(--or); outline-offset: 2px; }

.liste { display: grid; gap: 10px; margin-top: 6px; }

.fiche {
  display: grid;
  grid-template-columns: auto 120px 1fr auto;
  gap: 14px; align-items: center;
  padding: 12px; border-radius: 12px;
  background: var(--panneau); border: 1px solid var(--bord);
}
.fiche.est-faite { opacity: .42; }
.fiche[hidden] { display: none; }

.fiche__coche { display: grid; place-items: center; cursor: pointer; }
.fiche__coche input { position: absolute; opacity: 0; width: 0; height: 0; }
.fiche__coche span {
  display: block; width: 22px; height: 22px; border-radius: 6px;
  border: 1.5px solid var(--bord); background: var(--panneau-2);
}
.fiche__coche input:checked + span {
  background: var(--succes); border-color: var(--succes);
  background-image: linear-gradient(45deg, transparent 42%, #0a0c11 42% 48%, transparent 48%),
                    linear-gradient(-45deg, transparent 52%, #0a0c11 52% 58%, transparent 58%);
}

.fiche__vignette { width: 120px; aspect-ratio: 4/3; border-radius: 8px; overflow: hidden; background: #080a0e; }
.fiche__vignette img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fiche__absente { display: grid; place-items: center; height: 100%; color: var(--attenue); }

.fiche__corps { min-width: 0; }
.fiche__nom { font-size: 1rem; }
.fiche__meta { margin: 3px 0; font-size: .8rem; color: var(--attenue); font-variant-numeric: tabular-nums; }
.pastille {
  display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: .74rem;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 40%, transparent);
}
.fiche__fichier { margin: 5px 0; }
.fiche__fichier code { font-size: .8rem; color: var(--or); background: #080a0e; padding: 2px 7px; border-radius: 5px; }
.fiche__scene { margin: 5px 0 0; font-size: .84rem; color: var(--attenue); font-style: italic; }

.copier {
  align-self: center; white-space: nowrap;
  min-height: 40px; padding: 0 16px; border-radius: 9px;
  border: 1px solid var(--or-sombre); background: var(--panneau-2); color: var(--texte);
  font: inherit; font-family: 'Cinzel', serif; font-size: .82rem; cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.copier:hover { background: rgb(215 180 99 / 14%); }
.copier.est-copie { background: var(--succes); color: #0a0c11; border-color: var(--succes); }

@media (max-width: 720px) {
  .fiche { grid-template-columns: auto 84px 1fr; }
  .fiche__vignette { width: 84px; }
  .copier { grid-column: 2 / -1; width: 100%; }
}
@media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; } }
</style>

<div class="enveloppe">
  <header class="tete">
    <h1>Atelier d'illustration</h1>
    <p>Les ${entrees.length} illustrations du set, avec pour chacune le nom de fichier attendu, l'illustration
    procédurale actuelle en référence de cadrage, et la requête prête à copier.</p>
  </header>

  <section class="socle">
    <h2>Le bloc de style</h2>
    <p>C'est lui qui fait tenir le set. Il est déjà inclus à la fin de chaque requête ci-dessous — mais si votre
    outil sépare « sujet » et « style », collez-le dans le champ style et ne gardez que la description de la carte.</p>
    <pre>${ech(STYLE_COMMUN)}</pre>
    <button class="copier" data-requete="${ech(STYLE_COMMUN)}">Copier le bloc de style</button>
  </section>

  <section class="mode-emploi">
    <h2>Marche à suivre</h2>
    <ol>
      <li>Copier la requête d'une carte, la coller dans votre outil, générer.</li>
      <li>Télécharger l'image. <strong>Le nom doit commencer par l'identifiant</strong> — <code>syl-yggravent.png</code>,
      <code>syl-yggravent (2).jpg</code> et <code>syl-yggravent-v3.webp</code> conviennent tous.</li>
      <li>Tout déposer dans un même dossier, puis lancer <code>npm run art:importer -- --depuis=/chemin/du/dossier</code>.
      Le recadrage en 512 × 384 et l'encodage WebP sont automatiques.</li>
      <li>Cocher la ligne ici pour suivre l'avancement. La progression est gardée dans ce navigateur.</li>
    </ol>
  </section>

  <div class="barre">
    <div class="jauge">
      <div class="jauge__texte"><span id="fait">0</span> / ${entrees.length} illustrations marquées comme faites</div>
      <div class="jauge__piste"><i id="progression"></i></div>
    </div>
    <div class="filtres" role="group" aria-label="Filtrer par élément">
      <button class="puce" data-filtre="tous" aria-pressed="true">Tous</button>
      ${Object.keys(LABEL_ELEMENT).map((e) => `<button class="puce" data-filtre="${e}" aria-pressed="false">${LABEL_ELEMENT[e]}</button>`).join('')}
      <button class="puce" data-masquer aria-pressed="false">Masquer les faites</button>
    </div>
  </div>

  <main class="liste">
${lignes.join('\n')}
  </main>
</div>

<script>
(function () {
  const CLE = 'invento.atelier.faites';
  let faites = new Set();
  try { faites = new Set(JSON.parse(localStorage.getItem(CLE) || '[]')); } catch (e) { /* stockage indisponible */ }

  let filtre = 'tous';
  let masquer = false;

  const fiches = Array.from(document.querySelectorAll('.fiche'));
  const compteur = document.getElementById('fait');
  const progression = document.getElementById('progression');

  function enregistrer() {
    try { localStorage.setItem(CLE, JSON.stringify([...faites])); } catch (e) { /* sans importance */ }
  }

  function rafraichir() {
    for (const f of fiches) {
      const id = f.dataset.id;
      const estFaite = faites.has(id);
      f.classList.toggle('est-faite', estFaite);
      const coche = f.querySelector('input');
      if (coche) coche.checked = estFaite;
      const visible = (filtre === 'tous' || f.dataset.el === filtre) && !(masquer && estFaite);
      f.hidden = !visible;
    }
    compteur.textContent = String(faites.size);
    progression.style.width = (faites.size / fiches.length * 100).toFixed(1) + '%';
  }

  document.addEventListener('click', async (ev) => {
    const copier = ev.target.closest('.copier');
    if (copier) {
      const texte = copier.dataset.requete || '';
      try {
        await navigator.clipboard.writeText(texte);
      } catch (e) {
        // Certains navigateurs refusent le presse-papiers : on sélectionne le
        // texte dans un champ temporaire pour que la copie reste possible.
        const zone = document.createElement('textarea');
        zone.value = texte;
        document.body.appendChild(zone);
        zone.select();
        try { document.execCommand('copy'); } catch (e2) { /* rien de plus à tenter */ }
        zone.remove();
      }
      const avant = copier.textContent;
      copier.textContent = 'Copié';
      copier.classList.add('est-copie');
      setTimeout(() => { copier.textContent = avant; copier.classList.remove('est-copie'); }, 1400);
      return;
    }

    const puce = ev.target.closest('.puce');
    if (!puce) return;
    if (puce.hasAttribute('data-masquer')) {
      masquer = !masquer;
      puce.setAttribute('aria-pressed', String(masquer));
    } else {
      filtre = puce.dataset.filtre;
      for (const p of document.querySelectorAll('[data-filtre]')) {
        p.setAttribute('aria-pressed', String(p === puce));
      }
    }
    rafraichir();
  });

  document.addEventListener('change', (ev) => {
    const coche = ev.target.closest('[data-fait]');
    if (!coche) return;
    const id = coche.dataset.fait;
    if (coche.checked) faites.add(id); else faites.delete(id);
    enregistrer();
    rafraichir();
  });

  rafraichir();
})();
</script>
`;

  const chemin = join(process.cwd(), 'fiche-illustrations.html');
  await writeFile(chemin, page);
  console.log(`Fiche écrite : fiche-illustrations.html (${entrees.length} entrées, ${(Buffer.byteLength(page) / 1024).toFixed(0)} Ko).`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
