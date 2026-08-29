/**
 * Collection : toutes les cartes du jeu, celles que l'on possède en couleur,
 * les autres en silhouette. Filtres par élément, rareté et possession.
 */
import { barre, retour, sur, type Ecran } from '../app';
import { TOUTES_LES_CARTES } from '../../data/registry';
import { ELEMENTS, type Element, type Rarity } from '../../engine/types';
import { avancementCollection, charger } from '../../save/profil';
import { htmlCarte } from '../carte';
import { ICONE_ELEMENT, LABEL_ELEMENT, LABEL_RARETE } from '../icones';

const RARETES: Rarity[] = ['commune', 'peu-commune', 'rare', 'epique', 'legendaire'];

export function ecranCollection(): Ecran {
  const profil = charger();
  let element: Element | 'tous' = 'tous';
  let rarete: Rarity | 'toutes' = 'toutes';
  let seulementPossedees = false;

  function cartesFiltrees() {
    return TOUTES_LES_CARTES.filter((c) => {
      if (element !== 'tous' && c.element !== element) return false;
      if (rarete !== 'toutes' && c.rarete !== rarete) return false;
      if (seulementPossedees && (profil.collection[c.id] ?? 0) === 0) return false;
      return true;
    }).sort((a, b) => a.cout - b.cout || a.nom.localeCompare(b.nom, 'fr'));
  }

  function corps(): string {
    const av = avancementCollection();
    const puceEl = [
      `<button class="puce ${element === 'tous' ? 'est-active' : ''}" data-el="tous">Tous</button>`,
      ...ELEMENTS.map(
        (e) => `<button class="puce ${element === e ? 'est-active' : ''}" data-el="${e}">${ICONE_ELEMENT[e]}${LABEL_ELEMENT[e]}</button>`,
      ),
      `<button class="puce ${element === 'neutre' ? 'est-active' : ''}" data-el="neutre">${ICONE_ELEMENT.neutre}Neutre</button>`,
    ].join('');

    const puceRar = [
      `<button class="puce ${rarete === 'toutes' ? 'est-active' : ''}" data-rar="toutes">Toutes raretés</button>`,
      ...RARETES.map(
        (r) => `<button class="puce ${rarete === r ? 'est-active' : ''}" data-rar="${r}">${LABEL_RARETE[r]}</button>`,
      ),
      `<button class="puce ${seulementPossedees ? 'est-active' : ''}" data-possedees>Possédées</button>`,
    ].join('');

    const liste = cartesFiltrees();
    const grille = liste
      .map((c) => {
        const n = profil.collection[c.id] ?? 0;
        return htmlCarte(c, {
          compte: n,
          inactive: n === 0,
          interactive: true,
          data: { carte: c.id },
        });
      })
      .join('');

    return `<div class="ecran__corps">
      <div class="filtres">${puceEl}</div>
      <div class="filtres">${puceRar}</div>
      <p class="fiche__detail">${liste.length} carte${liste.length > 1 ? 's' : ''} affichée${liste.length > 1 ? 's' : ''} — collection complétée à ${Math.round((av.obtenues / av.total) * 100)} %.</p>
      ${liste.length ? `<div class="grille">${grille}</div>` : `<p class="vide">Aucune carte ne correspond à ces filtres.</p>`}
    </div>`;
  }

  return {
    html: () => `<div class="ecran">${barre('Collection')}${corps()}</div>`,

    monter(r) {
      const redessiner = () => {
        const c = r.querySelector('.ecran__corps');
        if (c) c.outerHTML = corps();
      };
      sur(r, '[data-action="retour"]', 'click', () => retour());
      sur(r, '[data-el]', 'click', (el) => {
        element = el.dataset.el as Element | 'tous';
        redessiner();
      });
      sur(r, '[data-rar]', 'click', (el) => {
        rarete = el.dataset.rar as Rarity | 'toutes';
        redessiner();
      });
      sur(r, '[data-possedees]', 'click', () => {
        seulementPossedees = !seulementPossedees;
        redessiner();
      });
      sur(r, '[data-carte]', 'click', (el) => {
        const def = TOUTES_LES_CARTES.find((c) => c.id === el.dataset.carte);
        if (!def) return;
        const modale = document.createElement('div');
        modale.className = 'modale';
        modale.innerHTML = `<div class="modale__contenu">${htmlCarte(def)}
          <p class="fiche__detail">Possédées : ${profil.collection[def.id] ?? 0}</p>
          <button class="bouton bouton--fantome">Fermer</button></div>`;
        modale.addEventListener('click', () => modale.remove());
        document.body.appendChild(modale);
      });
    },
  };
}
