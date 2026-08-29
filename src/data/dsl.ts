/**
 * Petit langage de définition de cartes.
 *
 * L'objectif est qu'une carte tienne en quelques lignes lisibles : le DSL
 * calcule la graine d'illustration à partir de l'identifiant (rendu procédural
 * reproductible) et impose les valeurs par défaut cohérentes avec le type.
 */
import type {
  Ability,
  CardDef,
  Effect,
  Element,
  Keyword,
  Rarity,
  Silhouette,
  TargetSpec,
  TerrainDef,
  TokenSpec,
  TriggerKind,
  ZoneEffect,
  Condition,
} from '../engine/types';

/** Hachage FNV-1a : même identifiant, même illustration, à jamais. */
export function hashSeed(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

interface CreatureOpts {
  id: string;
  nom: string;
  el: Element;
  cout: number;
  atq: number;
  pv: number;
  rar?: Rarity;
  mc?: Keyword[];
  stade?: 1 | 2 | 3;
  lignee?: string;
  de?: string;
  cap?: Ability[];
  cit?: string;
  art: string;
  sil?: Silhouette;
}

export function creature(o: CreatureOpts): CardDef {
  return {
    id: o.id,
    nom: o.nom,
    kind: 'creature',
    element: o.el,
    cout: o.cout,
    atq: o.atq,
    pv: o.pv,
    rarete: o.rar ?? 'commune',
    motsCles: o.mc,
    stade: o.stade,
    lignee: o.lignee,
    evolueDe: o.de,
    capacites: o.cap,
    citation: o.cit,
    artPrompt: o.art,
    artSeed: hashSeed(o.id),
    silhouette: o.sil ?? 'quadrupede',
  };
}

interface SortOpts {
  id: string;
  nom: string;
  el: Element;
  cout: number;
  rar?: Rarity;
  texte: string;
  target?: TargetSpec;
  effets: Effect[];
  cond?: Condition;
  cit?: string;
  art: string;
}

export function sort(o: SortOpts): CardDef {
  return {
    id: o.id,
    nom: o.nom,
    kind: 'sort',
    element: o.el,
    cout: o.cout,
    rarete: o.rar ?? 'commune',
    capacites: [
      {
        trigger: 'immediat',
        target: o.target ?? 'aucune',
        texte: o.texte,
        effets: o.effets,
        ...(o.cond ? { condition: o.cond } : {}),
      },
    ],
    citation: o.cit,
    artPrompt: o.art,
    artSeed: hashSeed(o.id),
    silhouette: 'paysage',
  };
}

interface ReliqueOpts {
  id: string;
  nom: string;
  el: Element;
  cout: number;
  atq: number;
  pv: number;
  motCle?: Keyword;
  rar?: Rarity;
  texte?: string;
  effets?: Effect[];
  cit?: string;
  art: string;
}

export function relique(o: ReliqueOpts): CardDef {
  return {
    id: o.id,
    nom: o.nom,
    kind: 'relique',
    element: o.el,
    cout: o.cout,
    rarete: o.rar ?? 'peu-commune',
    equipement: { atq: o.atq, pv: o.pv, ...(o.motCle ? { motCle: o.motCle } : {}) },
    capacites: o.effets
      ? [{ trigger: 'immediat', target: 'creature-alliee', texte: o.texte ?? '', effets: o.effets }]
      : undefined,
    citation: o.cit,
    artPrompt: o.art,
    artSeed: hashSeed(o.id),
    silhouette: 'objet',
  };
}

interface ZoneOpts {
  id: string;
  nom: string;
  el: Element;
  cout: number;
  atq: number;
  pv: number;
  rar?: Rarity;
  cit?: string;
  art: string;
}

export function zone(o: ZoneOpts): CardDef {
  const z: ZoneEffect = {
    element: o.el,
    atq: o.atq,
    pv: o.pv,
    texte: `Les créatures ${LABEL_ELEMENT[o.el]} des deux camps gagnent ${fmt(o.atq)}/${fmt(o.pv)}.`,
  };
  return {
    id: o.id,
    nom: o.nom,
    kind: 'zone',
    element: o.el,
    cout: o.cout,
    rarete: o.rar ?? 'rare',
    zone: z,
    citation: o.cit,
    artPrompt: o.art,
    artSeed: hashSeed(o.id),
    silhouette: 'paysage',
  };
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Raccourci de construction d'une capacité. */
export function cap(
  trigger: TriggerKind,
  texte: string,
  effets: Effect[],
  opts: { target?: TargetSpec; cond?: Condition } = {},
): Ability {
  return {
    trigger,
    target: opts.target ?? 'aucune',
    texte,
    effets,
    ...(opts.cond ? { condition: opts.cond } : {}),
  };
}

export function jeton(nom: string, element: Element, atq: number, pv: number, motsCles?: Keyword[]): TokenSpec {
  return { nom, element, atq, pv, ...(motsCles ? { motsCles } : {}) };
}

interface TerrainOpts {
  id: string;
  nom: string;
  el: Element;
  passifTexte: string;
  passif: { atq: number; pv: number };
  pouvoirNom: string;
  pouvoirTexte: string;
  cout: number;
  target?: TargetSpec;
  effets: Effect[];
  art: string;
}

export function terrain(o: TerrainOpts): TerrainDef {
  return {
    id: o.id,
    nom: o.nom,
    element: o.el,
    passifTexte: o.passifTexte,
    passif: { element: o.el, atq: o.passif.atq, pv: o.passif.pv },
    pouvoirNom: o.pouvoirNom,
    pouvoirTexte: o.pouvoirTexte,
    pouvoirCout: o.cout,
    pouvoirTarget: o.target ?? 'aucune',
    pouvoirEffets: o.effets,
    artSeed: hashSeed(o.id),
    artPrompt: o.art,
  };
}

export const LABEL_ELEMENT: Record<Element, string> = {
  sylve: 'Sylve',
  flamme: 'Flamme',
  maree: 'Marée',
  foudre: 'Foudre',
  roc: 'Roc',
  ombre: 'Ombre',
  neutre: 'Neutre',
};
