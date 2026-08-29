/**
 * Constructeur de deck.
 *
 * L'écran est découpé en deux : la liste du deck en cours en haut, la
 * collection filtrable en bas. Une touche ajoute une carte, une touche sur la
 * liste la retire — pas de glisser-déposer, qui serait pénible au pouce.
 */
import { barre, rafraichir, retour, sur, vibrer, type Ecran } from '../app';
import { TERRAINS, TOUTES_LES_CARTES, exemplairesMax, getCard, getTerrain } from '../../data/registry';
import { ELEMENTS, type CardKind, type Element } from '../../engine/types';
import { charger, enregistrerDeck, sauver, validerDeck, type DeckSauvegarde } from '../../save/profil';
import { esc, htmlCarte } from '../carte';
import { ICONE_ELEMENT, LABEL_ELEMENT } from '../icones';

const TAILLE = 20;

const LABEL_KIND: Record<CardKind, string> = {
  creature: 'Créatures',
  sort: 'Sorts',
  relique: 'Reliques',
  zone: 'Zones',
};

export function ecranConstructeur(deckId: string | null): Ecran {
  const profil = charger();
  const existant = deckId ? profil.decks.find((d) => d.id === deckId) : null;

  let nom = existant?.nom ?? 'Nouveau deck';
  let terrainId = existant?.terrainId ?? 'ter-carrefour';
  let cartes: string[] = existant ? existant.cartes.slice() : [];

  let filtreEl: Element | 'tous' = 'tous';
  let filtreKind: CardKind | 'tous' = 'tous';

  /** Cartes possédées, dédupliquées et triées par coût. */
  function collectionDisponible() {
    return TOUTES_LES_CARTES.filter((c) => {
      if ((profil.collection[c.id] ?? 0) === 0) return false;
      if (filtreEl !== 'tous' && c.element !== filtreEl) return false;
      if (filtreKind !== 'tous' && c.kind !== filtreKind) return false;
      return true;
    }).sort((a, b) => a.cout - b.cout || a.nom.localeCompare(b.nom, 'fr'));
  }

  function compte(): Map<string, number> {
    const m = new Map<string, number>();
    for (const id of cartes) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }

  function ajouter(id: string): void {
    const def = getCard(id);
    if (!def) return;
    if (cartes.length >= TAILLE) return;
    const actuel = cartes.filter((c) => c === id).length;
    if (actuel >= Math.min(exemplairesMax(def.rarete), profil.collection[id] ?? 0)) return;
    cartes.push(id);
    vibrer(8);
    redessiner();
  }

  function retirer(id: string): void {
    const i = cartes.lastIndexOf(id);
    if (i >= 0) {
      cartes.splice(i, 1);
      vibrer(8);
      redessiner();
    }
  }

  /** Histogramme des coûts : la lecture la plus utile pour équilibrer un deck. */
  function htmlCourbe(): string {
    const seaux = new Array(8).fill(0) as number[];
    for (const id of cartes) {
      const c = getCard(id);
      if (c) seaux[Math.min(7, c.cout)] = (seaux[Math.min(7, c.cout)] ?? 0) + 1;
    }
    const max = Math.max(1, ...seaux);
    const barres = seaux
      .map((n, i) => `<div class="courbe__barre" style="height:${(n / max) * 100}%" title="${n} carte(s) à ${i}">
        <span>${i === 7 ? '7+' : i}</span></div>`)
      .join('');
    return `<div class="courbe">${barres}</div><div style="height:16px"></div>`;
  }

  function htmlListeDeck(): string {
    const m = compte();
    if (m.size === 0) return `<p class="vide">Deck vide. Ajoutez des cartes depuis votre collection.</p>`;
    const lignes = [...m.entries()]
      .map(([id, n]) => ({ def: getCard(id)!, n }))
      .filter((x) => x.def)
      .sort((a, b) => a.def.cout - b.def.cout || a.def.nom.localeCompare(b.def.nom, 'fr'))
      .map(
        ({ def, n }) => `<button class="fiche" data-retirer="${def.id}" style="padding:8px 10px">
          <span class="carte__cout" style="font-size:14px">${def.cout}</span>
          <span class="fiche__corps">
            <span class="fiche__titre" style="font-size:.86rem">${esc(def.nom)}</span>
            <span class="fiche__detail" style="font-size:.72rem">${LABEL_ELEMENT[def.element]} · ${LABEL_KIND[def.kind].slice(0, -1)}</span>
          </span>
          <span class="fiche__etat">×${n}</span>
        </button>`,
      )
      .join('');
    return `<div class="liste">${lignes}</div>`;
  }

  function corps(): string {
    const validation = validerDeck(cartes);
    const t = getTerrain(terrainId);

    const puceEl = [
      `<button class="puce ${filtreEl === 'tous' ? 'est-active' : ''}" data-fel="tous">Tous</button>`,
      ...[...ELEMENTS, 'neutre' as Element].map(
        (e) => `<button class="puce ${filtreEl === e ? 'est-active' : ''}" data-fel="${e}">${ICONE_ELEMENT[e]}${LABEL_ELEMENT[e]}</button>`,
      ),
    ].join('');
    const puceKind = [
      `<button class="puce ${filtreKind === 'tous' ? 'est-active' : ''}" data-fkind="tous">Tout type</button>`,
      ...(Object.keys(LABEL_KIND) as CardKind[]).map(
        (k) => `<button class="puce ${filtreKind === k ? 'est-active' : ''}" data-fkind="${k}">${LABEL_KIND[k]}</button>`,
      ),
    ].join('');

    const m = compte();
    const dispo = collectionDisponible()
      .map((c) => {
        const enDeck = m.get(c.id) ?? 0;
        const possede = profil.collection[c.id] ?? 0;
        const plein = enDeck >= Math.min(exemplairesMax(c.rarete), possede) || cartes.length >= TAILLE;
        return htmlCarte(c, {
          compte: possede - enDeck,
          inactive: plein,
          interactive: true,
          data: { ajouter: c.id },
        });
      })
      .join('');

    const terrains = TERRAINS.map(
      (x) => `<button class="puce ${x.id === terrainId ? 'est-active' : ''}" data-terrain="${x.id}">${ICONE_ELEMENT[x.element]}${esc(x.nom)}</button>`,
    ).join('');

    return `<div class="ecran__corps">
      <label style="display:block;padding-top:14px">
        <span class="fiche__detail">Nom du deck</span>
        <input id="nom-deck" value="${esc(nom)}" maxlength="40"
          style="width:100%;margin-top:4px;padding:10px;border-radius:10px;border:1px solid var(--bord);background:var(--panneau);color:var(--texte);font:inherit">
      </label>

      <h3 style="margin-top:18px">Terrain</h3>
      <div class="filtres">${terrains}</div>
      <p class="fiche__detail">${esc(t?.passifTexte ?? '')} <br><b>${esc(t?.pouvoirNom ?? '')}</b> (${t?.pouvoirCout ?? 0} cristaux) — ${esc(t?.pouvoirTexte ?? '')}</p>

      <h3 style="margin-top:18px">Deck — ${cartes.length} / ${TAILLE}</h3>
      ${htmlCourbe()}
      ${htmlListeDeck()}
      ${validation.erreurs.length
        ? `<ul class="fiche__detail" style="color:#e79b98;padding-left:18px">${validation.erreurs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`
        : `<p class="fiche__detail" style="color:var(--succes)">Deck valide, prêt à jouer.</p>`}

      <h3 style="margin-top:22px">Votre collection</h3>
      <div class="filtres">${puceEl}</div>
      <div class="filtres">${puceKind}</div>
      ${dispo ? `<div class="grille">${dispo}</div>` : `<p class="vide">Aucune carte possédée ne correspond à ces filtres. Ouvrez des boosters !</p>`}

      <div style="padding:20px 0 8px">
        <button class="bouton bouton--primaire bouton--bloc" data-enregistrer ${validation.ok ? '' : 'disabled'}>
          Enregistrer${validation.ok ? '' : ` (${TAILLE - cartes.length} carte(s) manquante(s))`}
        </button>
      </div>
    </div>`;
  }

  let racineEl: HTMLElement;
  function redessiner(): void {
    const champ = racineEl.querySelector<HTMLInputElement>('#nom-deck');
    if (champ) nom = champ.value;
    const c = racineEl.querySelector('.ecran__corps');
    if (c) c.outerHTML = corps();
  }

  return {
    html: () => `<div class="ecran">${barre(existant ? 'Modifier le deck' : 'Nouveau deck')}${corps()}</div>`,

    monter(r) {
      racineEl = r;
      sur(r, '[data-action="retour"]', 'click', () => retour());
      sur(r, '[data-ajouter]', 'click', (el) => ajouter(el.dataset.ajouter!));
      sur(r, '[data-retirer]', 'click', (el) => retirer(el.dataset.retirer!));
      sur(r, '[data-fel]', 'click', (el) => {
        filtreEl = el.dataset.fel as Element | 'tous';
        redessiner();
      });
      sur(r, '[data-fkind]', 'click', (el) => {
        filtreKind = el.dataset.fkind as CardKind | 'tous';
        redessiner();
      });
      sur(r, '[data-terrain]', 'click', (el) => {
        terrainId = el.dataset.terrain!;
        redessiner();
      });
      sur(r, '[data-enregistrer]', 'click', () => {
        const champ = r.querySelector<HTMLInputElement>('#nom-deck');
        if (champ) nom = champ.value.trim() || 'Deck sans nom';
        const deck: DeckSauvegarde = {
          id: existant?.id ?? `perso-${Date.now().toString(36)}`,
          nom,
          terrainId,
          cartes: cartes.slice(),
        };
        enregistrerDeck(deck);
        const p = charger();
        p.deckActif = deck.id;
        sauver(p);
        vibrer(20);
        retour();
        rafraichir();
      });
    },
  };
}
