/**
 * Rendu d'une carte.
 *
 * Le gabarit reprend celui d'une carte à collectionner imprimée : bandeau de
 * titre portant les points de vie et le symbole d'élément, bandeau d'évolution
 * avec la vignette de la forme précédente, illustration à cartouche, bloc de
 * talents, ligne d'attaque, et pied Faiblesse / Résistance.
 *
 * Cette dernière barre n'est pas décorative : le cycle élémentaire décide de la
 * moitié des combats, et il fallait jusqu'ici l'avoir appris par cœur.
 *
 * L'illustration est un vrai fichier WebP chargé depuis `public/art/`.
 */
import type { CardDef, Creature, GameState, Keyword } from '../engine/types';
import { BEATS, KEYWORD_LABEL, KEYWORD_RULE, WEAK_TO } from '../engine/types';
import { getCard } from '../data/registry';
import { aMotCle, elementDe, motsClesDe, nomDe, statsOf } from '../engine/rules';
import { ICONE_ELEMENT, ICONES, LABEL_ELEMENT, LABEL_RARETE } from './icones';

/** Échappement systématique : les textes de carte contiennent des apostrophes. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/**
 * Chemin de l'illustration d'une carte.
 *
 * Lorsque le jeu est empaqueté en fichier unique (voir `npm run bundle`), les
 * images sont injectées en URI de données dans `globalThis.__ART` : la même
 * fonction sert alors les deux modes de distribution.
 */
export function urlArt(id: string): string {
  const embarquees = (globalThis as { __ART?: Record<string, string> }).__ART;
  return embarquees?.[id] ?? `art/${id}.webp`;
}

const LABEL_STADE: Record<number, string> = { 1: 'BASE', 2: 'NIVEAU 1', 3: 'NIVEAU 2' };

const LABEL_KIND_COURT: Record<CardDef['kind'], string> = {
  creature: 'Créature',
  sort: 'Sort',
  relique: 'Relique',
  zone: 'Zone',
};

/** Le coût, rendu en pastilles d'énergie plutôt qu'en chiffre isolé. */
function pastillesCout(def: CardDef): string {
  const n = Math.min(def.cout, 8);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<i class="energie energie--${def.element}">${ICONE_ELEMENT[def.element]}</i>`;
  }
  return out || '<i class="energie energie--libre"></i>';
}

/**
 * Barre Faiblesse / Résistance.
 *
 * Le cycle élémentaire décide de la moitié des combats, et jusqu'ici il fallait
 * l'avoir mémorisé. L'inscrire sur la carte, comme le fait le jeu Pokémon,
 * transforme une règle abstraite en information consultable en jeu.
 */
function barreCycle(def: CardDef): string {
  const faible = WEAK_TO[def.element];
  const resiste = BEATS[def.element];
  const cell = (titre: string, el: typeof faible, valeur: string, variante: string) =>
    el
      ? `<span class="carte__cycle carte__cycle--${variante}" title="${titre} : ${LABEL_ELEMENT[el]}">
           <em>${titre}</em>${ICONE_ELEMENT[el]}<b>${valeur}</b>
         </span>`
      : `<span class="carte__cycle carte__cycle--vide"><em>${titre}</em><b>—</b></span>`;
  return `<div class="carte__pied">
    ${cell('Faiblesse', faible, '+50%', 'faiblesse')}
    ${cell('Résistance', resiste, '−1', 'resistance')}
  </div>`;
}

/** Bandeau d'évolution, avec la vignette de la forme précédente. */
function bandeauEvolution(def: CardDef): string {
  if (!def.evolueDe) return '';
  const base = getCard(def.evolueDe);
  if (!base) return '';
  return `<div class="carte__evolue">
    <span class="carte__evolue-vignette"><img src="${urlArt(base.id)}" alt="" loading="lazy" decoding="async"></span>
    <span class="carte__evolue-texte">Évolution de : ${esc(base.nom)}</span>
  </div>`;
}

/** Bloc « Talent » : mots-clés et capacités déclenchées. */
function blocTalent(def: CardDef): string {
  const lignes: string[] = [];

  if (def.motsCles?.length) {
    lignes.push(`<div class="carte__talent">
      <span class="carte__talent-badge">Talent</span>
      <span class="carte__talent-nom">${def.motsCles.map((m) => esc(KEYWORD_LABEL[m])).join(' · ')}</span>
      <p class="carte__talent-texte">${def.motsCles.map((m) => esc(KEYWORD_RULE[m])).join(' ')}</p>
    </div>`);
  }

  for (const c of def.capacites ?? []) {
    if (!c.texte) continue;
    // « Cri de guerre : inflige 3 dégâts. » se scinde en titre et corps ; le
    // corps reprend alors une majuscule, puisqu'il devient une phrase.
    const [tete, ...reste] = c.texte.split(/ : (.+)/);
    const brut = reste.join('') || tete || '';
    const corps = brut.charAt(0).toUpperCase() + brut.slice(1);
    const titre = reste.length ? tete : 'Capacité';
    lignes.push(`<div class="carte__talent">
      <span class="carte__talent-badge">Talent</span>
      <span class="carte__talent-nom">${esc(titre ?? 'Capacité')}</span>
      <p class="carte__talent-texte">${esc(corps ?? '')}</p>
    </div>`);
  }

  if (def.equipement) {
    const { atq, pv, motCle } = def.equipement;
    const bonus = `${atq >= 0 ? '+' : ''}${atq}/${pv >= 0 ? '+' : ''}${pv}`;
    lignes.push(`<div class="carte__talent">
      <span class="carte__talent-badge">Équipement</span>
      <span class="carte__talent-nom">${bonus}${motCle ? ` · ${esc(KEYWORD_LABEL[motCle])}` : ''}</span>
      <p class="carte__talent-texte">La créature équipée gagne ${bonus}${motCle ? ` et ${esc(KEYWORD_LABEL[motCle])}` : ''}.</p>
    </div>`);
  }

  if (def.zone) {
    lignes.push(`<div class="carte__talent">
      <span class="carte__talent-badge">Zone</span>
      <span class="carte__talent-nom">Champ de bataille</span>
      <p class="carte__talent-texte">${esc(def.zone.texte)}</p>
    </div>`);
  }

  return lignes.join('');
}

/** Ligne d'attaque : coût en énergies, nom, dégâts. */
function ligneAttaque(def: CardDef): string {
  if (def.kind !== 'creature') return '';
  return `<div class="carte__attaque">
    <span class="carte__attaque-cout">${pastillesCout(def)}</span>
    <span class="carte__attaque-nom">Assaut</span>
    <span class="carte__attaque-degats">${def.atq ?? 0}</span>
  </div>`;
}

export interface OptionsCarte {
  /**
   * Version compacte, pour la main et les grilles : l'illustration et les
   * chiffres seulement. À moins de cent vingt pixels de large, le texte de
   * règles fait moins de sept pixels — le montrer ne sert qu'à encombrer. Il
   * est repris en entier dans le bandeau de sélection et la fiche détaillée.
   */
  compacte?: boolean;
  /** Ajoute une pastille de comptage (collection, constructeur). */
  compte?: number;
  /** Grise la carte (non possédée, injouable). */
  inactive?: boolean;
  /** Marque la carte comme sélectionnée. */
  selectionnee?: boolean;
  /** Attributs de données ajoutés à la racine, pour la délégation d'événements. */
  data?: Record<string, string>;
  /** Rend la carte focusable et cliquable au clavier. */
  interactive?: boolean;
}

/**
 * Carte complète.
 *
 * Le gabarit suit celui d'une carte à collectionner imprimée : bandeau de titre
 * avec les points de vie et le symbole d'élément, bandeau d'évolution,
 * illustration à cartouche, bloc de talents, ligne d'attaque, puis le pied
 * Faiblesse / Résistance et le crédit d'illustration.
 *
 * Les cartes épiques et légendaires passent en illustration pleine page, avec
 * le texte posé par-dessus — l'équivalent des cartes « full art ».
 */
export function htmlCarte(def: CardDef, o: OptionsCarte = {}): string {
  const data = Object.entries(o.data ?? {})
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('');
  const pleine = def.rarete === 'epique' || def.rarete === 'legendaire';
  const classes = [
    'carte',
    `carte--${def.element}`,
    `carte--${def.rarete}`,
    `carte--${def.kind}`,
    pleine ? 'carte--pleine' : '',
    o.compacte ? 'carte--compacte' : '',
    o.inactive ? 'est-inactive' : '',
    o.selectionnee ? 'est-selectionnee' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const stade = def.kind === 'creature' ? (LABEL_STADE[def.stade ?? 1] ?? 'BASE') : LABEL_KIND_COURT[def.kind].toUpperCase();

  const pv =
    def.kind === 'creature'
      ? `<span class="carte__pv"><em>PV</em><b>${def.pv ?? 0}</b></span>`
      : '';

  const cartouche =
    def.kind === 'creature'
      ? `${LABEL_ELEMENT[def.element]} · Stade ${def.stade ?? 1}`
      : `${LABEL_KIND_COURT[def.kind]} — ${LABEL_ELEMENT[def.element]}`;

  const corps = o.compacte
    ? ''
    : `<div class="carte__corps">
        ${blocTalent(def)}
        ${ligneAttaque(def)}
      </div>
      ${def.kind === 'creature' ? barreCycle(def) : ''}
      <div class="carte__credits">
        <span class="carte__rarete" title="${LABEL_RARETE[def.rarete]}"></span>
        ${def.citation ? `<span class="carte__citation">${esc(def.citation)}</span>` : '<span></span>'}
      </div>`;

  const statsCompactes =
    o.compacte && def.kind === 'creature'
      ? `<div class="carte__mini-stats">
           <span class="carte__mini-atq">${ICONES.attaque}${def.atq ?? 0}</span>
           <span class="carte__mini-pv">${ICONES.vie}${def.pv ?? 0}</span>
         </div>`
      : '';

  const compte = o.compte !== undefined ? `<span class="carte__compte">×${o.compte}</span>` : '';
  const roleAttrs = o.interactive ? ' role="button" tabindex="0"' : '';

  return `<article class="${classes}"${data}${roleAttrs} aria-label="${esc(def.nom)}, coût ${def.cout}${def.kind === 'creature' ? `, ${def.atq} attaque, ${def.pv} points de vie` : ''}">
    <div class="carte__cadre">
      <div class="carte__interieur">
        <header class="carte__entete">
          <span class="carte__stade">${esc(stade)}</span>
          <h3 class="carte__nom">${esc(def.nom)}</h3>
          ${pv}
          <span class="carte__element" title="${LABEL_ELEMENT[def.element]}">${ICONE_ELEMENT[def.element]}</span>
        </header>
        ${o.compacte ? '' : bandeauEvolution(def)}
        <figure class="carte__art">
          <img src="${urlArt(def.id)}" alt="" loading="lazy" decoding="async" width="512" height="384">
          ${o.compacte ? '' : `<figcaption>${esc(cartouche)}</figcaption>`}
        </figure>
        ${corps}
        ${statsCompactes}
      </div>
    </div>
    <span class="carte__cout" title="Coût : ${def.cout} cristaux">${def.cout}</span>
    <div class="carte__foil" aria-hidden="true"></div>
    ${compte}
  </article>`;
}

// ---------------------------------------------------------------------------
// Créature en jeu
// ---------------------------------------------------------------------------

const ICONE_MOT_CLE: Partial<Record<Keyword, string>> = {
  garde: ICONES.garde,
  vol: ICONES.vol,
  elan: ICONES.duel,
  'lien-vital': ICONES.vie,
  voile: ICONES.bouclier,
};

/**
 * Créature en jeu.
 *
 * Sur le plateau, une créature est une carte miniature et non un jeton
 * abstrait : c'est ce qui fait lire la partie comme un jeu de cartes plutôt que
 * comme une grille. Les points de vie s'affichent en gros au-dessus, doublés
 * d'une jauge — la valeur exacte compte, mais l'état général se lit sans lire.
 */
export function htmlCreature(
  state: GameState,
  c: Creature,
  o: { attaquable?: boolean; prete?: boolean; ciblable?: boolean; mien?: boolean } = {},
): string {
  const def = c.token ? null : getCard(c.defId);
  const st = statsOf(state, c);
  const el = elementDe(c);
  const nom = nomDe(c);
  const base = def?.atq ?? c.token?.atq ?? 0;
  const part = st.pvMax > 0 ? Math.max(0, Math.min(1, st.pv / st.pvMax)) : 0;

  const mc = motsClesDe(c)
    .map((m) => (ICONE_MOT_CLE[m] ? `<span class="jeton__mc" title="${KEYWORD_LABEL[m]}">${ICONE_MOT_CLE[m]}</span>` : ''))
    .join('');

  const etats: string[] = [];
  if (c.status.gel > 0) etats.push(`<span class="jeton__etat jeton__etat--gel" title="Gelée ${c.status.gel} tour(s)">${ICONES.gele}</span>`);
  if (c.status.venin > 0) etats.push(`<span class="jeton__etat jeton__etat--venin" title="Venin ${c.status.venin}">${ICONES.venin}<b>${c.status.venin}</b></span>`);
  if (c.status.bouclier > 0) etats.push(`<span class="jeton__etat jeton__etat--bouclier" title="Bouclier ${c.status.bouclier}">${ICONES.bouclier}<b>${c.status.bouclier}</b></span>`);
  if (c.reliques.length > 0) etats.push(`<span class="jeton__etat jeton__etat--relique" title="${c.reliques.map((r) => getCard(r)?.nom ?? '').join(', ')}">${ICONES.deck}</span>`);

  const classes = [
    'jeton',
    `jeton--${el}`,
    // Les deux camps peuvent jouer le même élément : sans marque d'appartenance,
    // un miroir Sylve contre Sylve devient illisible.
    o.mien ? 'est-mienne' : 'est-adverse',
    o.prete ? 'est-prete' : '',
    o.attaquable ? 'est-attaquable' : '',
    o.ciblable ? 'est-ciblable' : '',
    c.status.gel > 0 ? 'est-gelee' : '',
    part <= 0.34 ? 'est-affaiblie' : '',
    aMotCle(c, 'garde') ? 'a-garde' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const art = c.token ? '' : `<img src="${urlArt(c.defId)}" alt="" loading="lazy" decoding="async">`;

  return `<div class="${classes}" data-creature="${c.uid}" aria-label="${esc(nom)}, ${st.atq} attaque, ${st.pv} points de vie sur ${st.pvMax}">
    <div class="jeton__carte">
      <div class="jeton__art">${art}</div>
      <div class="jeton__voile"></div>
      <div class="jeton__vie">
        <span class="jeton__pv-nombre">${st.pv}</span>
        <span class="jeton__barre"><i style="width:${part * 100}%"></i></span>
      </div>
      <div class="jeton__mcs">${mc}</div>
      <div class="jeton__etats">${etats.join('')}</div>
      <div class="jeton__nom">${esc(nom)}</div>
      <span class="jeton__atq ${st.atq > base ? 'est-boostee' : ''}">${ICONES.attaque}${st.atq}</span>
    </div>
  </div>`;
}
