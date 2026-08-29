/**
 * La campagne : une succession d'adversaires de difficulté croissante.
 *
 * Chaque palier a son deck, sa personnalité et sa récompense. Le niveau de
 * l'IA monte en même temps que la qualité des decks, si bien que la difficulté
 * progresse sur deux axes plutôt qu'un.
 */
import type { Difficulte } from '../engine/ai';

export interface Adversaire {
  id: string;
  nom: string;
  titre: string;
  deckId: string;
  difficulte: Difficulte;
  recompense: number;
  /** Illustration réutilisée depuis le jeu de cartes. */
  portrait: string;
  replique: string;
}

export const CAMPAGNE: Adversaire[] = [
  {
    id: 'camp-1', nom: 'Wren', titre: 'Apprentie herboriste',
    deckId: 'deck-sylve', difficulte: 'facile', recompense: 60,
    portrait: 'syl-cerf-ecorce',
    replique: "Je débute aussi. On apprend ensemble, d'accord ?",
  },
  {
    id: 'camp-2', nom: 'Torv', titre: 'Souffleur de braises',
    deckId: 'deck-flamme', difficulte: 'facile', recompense: 70,
    portrait: 'fla-molosse',
    replique: "Fais vite. Je n'ai jamais tenu plus de six tours.",
  },
  {
    id: 'camp-3', nom: 'Naele', titre: 'Guetteuse des récifs',
    deckId: 'deck-maree', difficulte: 'normal', recompense: 85,
    portrait: 'mar-loutre',
    replique: "Prends ton temps. Moi, j'en ai.",
  },
  {
    id: 'camp-4', nom: 'Kirr', titre: 'Coureur d\'orages',
    deckId: 'deck-foudre', difficulte: 'normal', recompense: 100,
    portrait: 'fou-voltille',
    replique: "Tu réfléchis encore ? J'ai déjà joué deux fois.",
  },
  {
    id: 'camp-5', nom: 'Dame Orn', titre: 'Gardienne de la Citadelle',
    deckId: 'deck-roc', difficulte: 'normal', recompense: 120,
    portrait: 'roc-gardien-obsidienne',
    replique: "Personne n'est passé. Vous ne ferez pas exception.",
  },
  {
    id: 'camp-6', nom: 'Vesh', titre: 'Percepteur du Sanctuaire',
    deckId: 'deck-ombre', difficulte: 'difficile', recompense: 145,
    portrait: 'omb-faucheur',
    replique: "Tout ce que vous me prendrez, je le reprendrai deux fois.",
  },
  {
    id: 'camp-7', nom: 'Sylvarque', titre: 'Le Ronce-Roi',
    deckId: 'deck-sylve', difficulte: 'difficile', recompense: 170,
    portrait: 'syl-sylvarque',
    replique: "J'ai vu passer mille saisons. Vous, une seule partie.",
  },
  {
    id: 'camp-8', nom: 'Vulcanor', titre: 'La Montagne Éveillée',
    deckId: 'deck-flamme', difficulte: 'difficile', recompense: 200,
    portrait: 'fla-vulcanor',
    replique: "Il ne restera rien. C'est déjà décidé.",
  },
];

export function adversaireSuivant(vaincus: string[]): Adversaire | null {
  return CAMPAGNE.find((a) => !vaincus.includes(a.id)) ?? null;
}

export function estDebloque(a: Adversaire, vaincus: string[]): boolean {
  const i = CAMPAGNE.indexOf(a);
  if (i <= 0) return true;
  return vaincus.includes(CAMPAGNE[i - 1]!.id);
}
