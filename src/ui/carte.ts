/**
 * Rendu d'une carte.
 *
 * La carte est composée comme un objet imprimé : bord noir, cadre coloré par
 * l'élément, fenêtre d'illustration, bandeau de type, encart de règles sur
 * fond clair, et médaillons de statistiques. L'illustration est un fichier
 * WebP réel chargé depuis `public/art/`.
 */
import type { CardDef, Creature, GameState, Keyword } from '../engine/types';
import { KEYWORD_LABEL } from '../engine/types';
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

/** Ligne de type affichée sous l'illustration. */
function ligneType(def: CardDef): string {
  const el = LABEL_ELEMENT[def.element];
  switch (def.kind) {
    case 'creature': {
      const stade = def.stade ? ` · Stade ${def.stade}` : '';
      return `Créature — ${el}${stade}`;
    }
    case 'sort':
      return `Sort — ${el}`;
    case 'relique':
      return `Relique — ${el}`;
    case 'zone':
      return `Zone — ${el}`;
  }
}

/** Corps de texte : mots-clés, capacités, effets d'équipement ou de zone. */
function corpsTexte(def: CardDef): string {
  const morceaux: string[] = [];

  if (def.motsCles?.length) {
    morceaux.push(
      `<p class="carte__motscles">${def.motsCles.map((m) => esc(KEYWORD_LABEL[m])).join(' · ')}</p>`,
    );
  }
  if (def.evolueDe) {
    const base = getCard(def.evolueDe);
    if (base) morceaux.push(`<p class="carte__evolution">Évolue de ${esc(base.nom)}</p>`);
  }
  if (def.equipement) {
    const { atq, pv, motCle } = def.equipement;
    const bonus = `${atq >= 0 ? '+' : ''}${atq}/${pv >= 0 ? '+' : ''}${pv}`;
    const mc = motCle ? ` et gagne ${esc(KEYWORD_LABEL[motCle])}` : '';
    morceaux.push(`<p class="carte__regle">La créature équipée gagne ${bonus}${mc}.</p>`);
  }
  if (def.zone) {
    morceaux.push(`<p class="carte__regle">${esc(def.zone.texte)}</p>`);
  }
  for (const c of def.capacites ?? []) {
    if (!c.texte) continue;
    morceaux.push(`<p class="carte__regle">${esc(c.texte)}</p>`);
  }
  if (def.citation) {
    morceaux.push(`<p class="carte__citation">${esc(def.citation)}</p>`);
  }
  return morceaux.join('');
}

export interface OptionsCarte {
  /** Ajoute une pastille de comptage (collection, deckbuilder). */
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

/** Carte complète, telle qu'on la voit en main, en collection ou en détail. */
export function htmlCarte(def: CardDef, o: OptionsCarte = {}): string {
  const data = Object.entries(o.data ?? {})
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('');
  const classes = [
    'carte',
    `carte--${def.element}`,
    `carte--${def.rarete}`,
    `carte--${def.kind}`,
    o.inactive ? 'est-inactive' : '',
    o.selectionnee ? 'est-selectionnee' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const stats =
    def.kind === 'creature'
      ? `<div class="carte__stats">
           <span class="carte__atq" title="Attaque">${ICONES.attaque}<b>${def.atq ?? 0}</b></span>
           <span class="carte__pv" title="Points de vie">${ICONES.vie}<b>${def.pv ?? 0}</b></span>
         </div>`
      : '';

  const compte =
    o.compte !== undefined ? `<span class="carte__compte">×${o.compte}</span>` : '';

  const roleAttrs = o.interactive ? ' role="button" tabindex="0"' : '';

  return `<article class="${classes}"${data}${roleAttrs} aria-label="${esc(def.nom)}, coût ${def.cout}">
    <div class="carte__bord">
      <div class="carte__cadre">
        <header class="carte__entete">
          <span class="carte__cout">${def.cout}</span>
          <h3 class="carte__nom">${esc(def.nom)}</h3>
          <span class="carte__element" title="${LABEL_ELEMENT[def.element]}">${ICONE_ELEMENT[def.element]}</span>
        </header>
        <div class="carte__art">
          <img src="${urlArt(def.id)}" alt="" loading="lazy" decoding="async" width="512" height="384">
        </div>
        <div class="carte__type">
          <span>${esc(ligneType(def))}</span>
          <span class="carte__rarete" title="${LABEL_RARETE[def.rarete]}"></span>
        </div>
        <div class="carte__texte">${corpsTexte(def)}</div>
        ${stats}
      </div>
    </div>
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
 * Vue compacte d'une créature posée sur une ligne : illustration, nom, mots-clés
 * essentiels et statistiques courantes (bonus de terrain et de zone inclus).
 */
export function htmlCreature(state: GameState, c: Creature, o: { attaquable?: boolean; prete?: boolean; ciblable?: boolean } = {}): string {
  const def = c.token ? null : getCard(c.defId);
  const st = statsOf(state, c);
  const el = elementDe(c);
  const nom = nomDe(c);
  const base = def?.atq ?? c.token?.atq ?? 0;
  const basePv = def?.pv ?? c.token?.pv ?? 1;

  const mc = motsClesDe(c)
    .map((m) => (ICONE_MOT_CLE[m] ? `<span class="jeton__mc" title="${KEYWORD_LABEL[m]}">${ICONE_MOT_CLE[m]}</span>` : ''))
    .join('');

  const etats: string[] = [];
  if (c.status.gel > 0) etats.push(`<span class="jeton__etat jeton__etat--gel" title="Gelée ${c.status.gel} tour(s)">${ICONES.gele}</span>`);
  if (c.status.venin > 0) etats.push(`<span class="jeton__etat jeton__etat--venin" title="Venin ${c.status.venin}">${ICONES.venin}</span>`);
  if (c.status.bouclier > 0) etats.push(`<span class="jeton__etat jeton__etat--bouclier" title="Bouclier ${c.status.bouclier}">${ICONES.bouclier}<b>${c.status.bouclier}</b></span>`);

  const classes = [
    'jeton',
    `jeton--${el}`,
    o.prete ? 'est-prete' : '',
    o.attaquable ? 'est-attaquable' : '',
    o.ciblable ? 'est-ciblable' : '',
    c.status.gel > 0 ? 'est-gelee' : '',
    aMotCle(c, 'garde') ? 'a-garde' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const art = c.token ? '' : `<img src="${urlArt(c.defId)}" alt="" loading="lazy" decoding="async">`;

  return `<div class="${classes}" data-creature="${c.uid}" aria-label="${esc(nom)}, ${st.atq} attaque, ${st.pv} points de vie">
    <div class="jeton__art">${art}<div class="jeton__voile"></div></div>
    <div class="jeton__nom">${esc(nom)}</div>
    <div class="jeton__mcs">${mc}</div>
    <div class="jeton__etats">${etats.join('')}</div>
    <span class="jeton__atq ${st.atq > base ? 'est-boostee' : ''}">${st.atq}</span>
    <span class="jeton__pv ${st.pv < st.pvMax ? 'est-blessee' : st.pvMax > basePv ? 'est-boostee' : ''}">${st.pv}</span>
  </div>`;
}
