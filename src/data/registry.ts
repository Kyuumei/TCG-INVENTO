/**
 * Registre central : indexe toutes les cartes et tous les terrains du jeu.
 *
 * Le moteur ne connaît que cet accès par identifiant ; ajouter une extension se
 * résume à concaténer un tableau de plus ci-dessous.
 */
import type { CardDef, Element, Rarity, TerrainDef } from '../engine/types';
import { SYLVE } from './cards/sylve';
import { FLAMME } from './cards/flamme';
import { MAREE } from './cards/maree';
import { FOUDRE } from './cards/foudre';
import { ROC } from './cards/roc';
import { OMBRE } from './cards/ombre';
import { NEUTRE } from './cards/neutre';
import { TERRAINS } from './terrains';

export const TOUTES_LES_CARTES: CardDef[] = [
  ...SYLVE,
  ...FLAMME,
  ...MAREE,
  ...FOUDRE,
  ...ROC,
  ...OMBRE,
  ...NEUTRE,
];

const INDEX = new Map<string, CardDef>();
for (const c of TOUTES_LES_CARTES) {
  if (INDEX.has(c.id)) throw new Error(`Identifiant de carte en double : ${c.id}`);
  INDEX.set(c.id, c);
}

const INDEX_TERRAIN = new Map<string, TerrainDef>();
for (const t of TERRAINS) INDEX_TERRAIN.set(t.id, t);

export function getCard(id: string): CardDef | null {
  return INDEX.get(id) ?? null;
}

export function getCardOrThrow(id: string): CardDef {
  const c = INDEX.get(id);
  if (!c) throw new Error(`Carte inconnue : ${id}`);
  return c;
}

export function getTerrain(id: string): TerrainDef | null {
  return INDEX_TERRAIN.get(id) ?? null;
}

export { TERRAINS };

/** Nombre maximal d'exemplaires autorisés dans un deck, selon la rareté. */
export function exemplairesMax(rarete: Rarity): number {
  return rarete === 'legendaire' ? 1 : 2;
}

export function cartesParElement(el: Element): CardDef[] {
  return TOUTES_LES_CARTES.filter((c) => c.element === el);
}

/** Toute la chaîne d'évolution d'une carte, du stade 1 au stade final. */
export function ligneeDe(lignee: string): CardDef[] {
  return TOUTES_LES_CARTES.filter((c) => c.lignee === lignee).sort((a, b) => (a.stade ?? 0) - (b.stade ?? 0));
}

/** Carte dont `id` est l'évolution directe, s'il y en a une. */
export function evolutionDe(id: string): CardDef | null {
  return TOUTES_LES_CARTES.find((c) => c.evolueDe === id) ?? null;
}

export const NB_CARTES = TOUTES_LES_CARTES.length;
