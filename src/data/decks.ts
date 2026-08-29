/**
 * Decks préconstruits.
 *
 * Chacun tient en 20 cartes, avec deux exemplaires maximum par carte (un seul
 * pour les légendaires). Ils servent à la fois de decks de départ pour le
 * joueur et de decks pour les adversaires de la campagne.
 */
import type { Element } from '../engine/types';
import { getCardOrThrow } from './registry';

export interface DeckPreconstruit {
  id: string;
  nom: string;
  element: Element;
  terrainId: string;
  description: string;
  /** Paires [identifiant de carte, nombre d'exemplaires]. */
  liste: [string, number][];
}

/** Déplie une liste compacte en un tableau de 20 identifiants. */
export function deplier(liste: [string, number][]): string[] {
  const out: string[] = [];
  for (const [id, n] of liste) {
    getCardOrThrow(id); // Lève si l'identifiant est erroné.
    for (let i = 0; i < n; i++) out.push(id);
  }
  return out;
}

export const DECKS: DeckPreconstruit[] = [
  {
    id: 'deck-sylve',
    nom: 'Ronces et Patience',
    element: 'sylve',
    terrainId: 'ter-bosquet',
    description: "Occupe le plateau, régénère, et laisse l'adversaire s'épuiser sur des créatures qui repoussent.",
    liste: [
      ['syl-poussevrille', 2], ['syl-roncefeuille', 2], ['syl-sylvarque', 1],
      ['syl-champiluce', 2], ['syl-sporeveille', 2], ['syl-myceleste', 1],
      ['syl-colibruine', 2], ['syl-cerf-ecorce', 2], ['syl-gardien-souches', 1],
      ['syl-oursequoia', 1], ['syl-yggravent', 1],
      ['syl-croissance', 2], ['syl-spores', 1],
    ],
  },
  {
    id: 'deck-flamme',
    nom: 'Course à la Cendre',
    element: 'flamme',
    terrainId: 'ter-forge',
    description: "Frappe dès le premier tour et ne s'arrête pas. Si la partie dure, elle est perdue.",
    liste: [
      ['fla-braisillon', 2], ['fla-flambard', 2], ['fla-ignivore', 1],
      ['fla-etincelin', 2], ['fla-salamandre', 2],
      ['fla-molosse', 2], ['fla-papillon', 2], ['fla-phenixel', 1],
      ['fla-vulcanor', 1],
      ['fla-trait-feu', 2], ['fla-immolation', 2], ['fla-fureur', 1],
    ],
  },
  {
    id: 'deck-maree',
    nom: 'Le Fond Monte',
    element: 'maree',
    terrainId: 'ter-abysse',
    description: "Gèle, renvoie, pioche. Une partie contre ce deck se joue toujours un tour trop tard.",
    liste: [
      ['mar-goutterin', 2], ['mar-ondulin', 2], ['mar-abyssalor', 1],
      ['mar-givrelet', 2], ['mar-cristalline', 2],
      ['mar-loutre', 2], ['mar-meduse-lune', 2], ['mar-sirene', 1],
      ['mar-leviathaal', 1],
      ['mar-gel-instantane', 2], ['mar-courant', 2], ['mar-vague', 1],
    ],
  },
  {
    id: 'deck-foudre',
    nom: 'Avant le Tonnerre',
    element: 'foudre',
    terrainId: 'ter-pics',
    description: "Des créatures fragiles mais immédiates, et des tours qui se rejouent deux fois.",
    liste: [
      ['fou-etincelou', 2], ['fou-voltille', 2], ['fou-fulguror', 1],
      ['fou-nimbule', 2], ['fou-orageon', 2],
      ['fou-guepe', 2], ['fou-lynx', 2], ['fou-colibri-plasma', 2],
      ['fou-zephyrion', 1],
      ['fou-impulsion', 2], ['fou-surcharge', 1], ['fou-eclair-fourchu', 1],
    ],
  },
  {
    id: 'deck-roc',
    nom: 'Rien ne Passe',
    element: 'roc',
    terrainId: 'ter-citadelle',
    description: "Un mur, puis un mur derrière le mur. La victoire arrive quand l'adversaire n'a plus de cartes.",
    liste: [
      ['roc-caillouti', 2], ['roc-rocaillon', 2], ['roc-colossite', 1],
      ['roc-ferrail', 2], ['roc-acierin', 2],
      ['roc-tatou-basalte', 2], ['roc-scarabee-fer', 2], ['roc-gardien-obsidienne', 1],
      ['roc-terramont', 1],
      ['roc-mur-pierre', 2], ['roc-peau-granit', 2], ['roc-seisme', 1],
    ],
  },
  {
    id: 'deck-ombre',
    nom: 'La Dîme',
    element: 'ombre',
    terrainId: 'ter-sanctuaire',
    description: "Chaque point de vie retiré à l'adversaire vous revient. Lentement, puis d'un coup.",
    liste: [
      ['omb-ombrelin', 2], ['omb-spectrelle', 2], ['omb-necrarque', 1],
      ['omb-chauvenuit', 2], ['omb-vampyrelle', 2],
      ['omb-chat-suie', 2], ['omb-corbeau', 2], ['omb-poupee', 2],
      ['omb-nyxaroth', 1],
      ['omb-drain', 2], ['omb-malediction', 1], ['omb-peste', 1],
    ],
  },
];

export function getDeck(id: string): DeckPreconstruit | null {
  return DECKS.find((d) => d.id === id) ?? null;
}
