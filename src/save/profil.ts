/**
 * Profil du joueur, conservé dans le stockage local du navigateur.
 *
 * Tout tient dans une seule clé JSON : collection, decks personnalisés,
 * progression de campagne et monnaie. La migration est gérée par un numéro de
 * version, pour qu'une mise à jour du jeu ne fasse jamais perdre sa collection.
 */
import { DECKS } from '../data/decks';
import { TOUTES_LES_CARTES, exemplairesMax, getCard } from '../data/registry';
import type { Rarity } from '../engine/types';
import { Rng } from '../engine/rng';

const CLE = 'invento.profil.v1';
const VERSION = 1;

export interface DeckSauvegarde {
  id: string;
  nom: string;
  terrainId: string;
  cartes: string[];
}

export interface Profil {
  version: number;
  /** Nombre d'exemplaires possédés, par identifiant de carte. */
  collection: Record<string, number>;
  decks: DeckSauvegarde[];
  /** Deck sélectionné : identifiant préconstruit ou identifiant personnalisé. */
  deckActif: string;
  pieces: number;
  boosters: number;
  campagne: { vaincus: string[] };
  stats: { parties: number; victoires: number };
  reglages: { animations: boolean; conseils: boolean };
}

function profilNeuf(): Profil {
  const collection: Record<string, number> = {};
  // Les deux decks de départ sont offerts en intégralité : on peut construire
  // dès la première minute sans avoir ouvert un seul booster.
  for (const d of DECKS.filter((x) => x.id === 'deck-sylve' || x.id === 'deck-flamme')) {
    for (const [id, n] of d.liste) {
      collection[id] = Math.max(collection[id] ?? 0, n);
    }
  }
  return {
    version: VERSION,
    collection,
    decks: [],
    deckActif: 'deck-sylve',
    pieces: 150,
    boosters: 3,
    campagne: { vaincus: [] },
    stats: { parties: 0, victoires: 0 },
    reglages: { animations: true, conseils: true },
  };
}

let cache: Profil | null = null;

export function charger(): Profil {
  if (cache) return cache;
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) {
      const p = JSON.parse(brut) as Profil;
      if (p && p.version === VERSION && p.collection) {
        // On purge les identifiants disparus entre deux versions du jeu.
        for (const id of Object.keys(p.collection)) if (!getCard(id)) delete p.collection[id];
        cache = { ...profilNeuf(), ...p };
        return cache;
      }
    }
  } catch {
    // Stockage indisponible (navigation privée, quota) : on joue sans sauvegarde.
  }
  cache = profilNeuf();
  return cache;
}

export function sauver(p: Profil = charger()): void {
  cache = p;
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    // Sans stockage, la partie en cours reste jouable ; seule la progression
    // ne survivra pas au rechargement.
  }
}

export function reinitialiser(): void {
  cache = profilNeuf();
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien à faire */
  }
}

export function possede(id: string): number {
  return charger().collection[id] ?? 0;
}

/** Nombre de cartes distinctes possédées, et total du set. */
export function avancementCollection(): { obtenues: number; total: number } {
  const p = charger();
  const obtenues = TOUTES_LES_CARTES.filter((c) => (p.collection[c.id] ?? 0) > 0).length;
  return { obtenues, total: TOUTES_LES_CARTES.length };
}

// ---------------------------------------------------------------------------
// Boosters
// ---------------------------------------------------------------------------

export const PRIX_BOOSTER = 120;
export const REMBOURSEMENT_DOUBLON = 25;

/** Tirage pondéré d'une rareté pour un emplacement de booster. */
function tirerRarete(rng: Rng, emplacement: 'commune' | 'garantie' | 'brillante'): Rarity {
  const t = rng.next();
  if (emplacement === 'commune') return t < 0.82 ? 'commune' : 'peu-commune';
  if (emplacement === 'garantie') return t < 0.78 ? 'peu-commune' : 'rare';
  if (t < 0.66) return 'rare';
  if (t < 0.93) return 'epique';
  return 'legendaire';
}

export interface CarteTiree {
  id: string;
  doublon: boolean;
  rarete: Rarity;
}

/**
 * Ouvre un booster de cinq cartes : trois communes, une peu commune garantie et
 * une carte brillante. Les exemplaires au-delà de la limite autorisée sont
 * convertis en pièces.
 */
export function ouvrirBooster(graine: number = Date.now()): CarteTiree[] {
  const p = charger();
  const rng = new Rng(graine >>> 0);
  const emplacements: ('commune' | 'garantie' | 'brillante')[] = [
    'commune', 'commune', 'commune', 'garantie', 'brillante',
  ];
  const tirees: CarteTiree[] = [];

  for (const e of emplacements) {
    const rarete = tirerRarete(rng, e);
    const bassin = TOUTES_LES_CARTES.filter((c) => c.rarete === rarete);
    const carte = bassin.length > 0 ? rng.pick(bassin) : rng.pick(TOUTES_LES_CARTES);
    const deja = p.collection[carte.id] ?? 0;
    const max = exemplairesMax(carte.rarete);
    const doublon = deja >= max;
    if (doublon) p.pieces += REMBOURSEMENT_DOUBLON;
    else p.collection[carte.id] = deja + 1;
    tirees.push({ id: carte.id, doublon, rarete: carte.rarete });
  }

  sauver(p);
  return tirees;
}

export function acheterBooster(): boolean {
  const p = charger();
  if (p.pieces < PRIX_BOOSTER) return false;
  p.pieces -= PRIX_BOOSTER;
  p.boosters += 1;
  sauver(p);
  return true;
}

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------

/**
 * Vérifie qu'un deck est légal : exactement 20 cartes, la limite d'exemplaires
 * respectée, et toutes les cartes effectivement possédées.
 */
export function validerDeck(cartes: string[]): { ok: boolean; erreurs: string[] } {
  const p = charger();
  const erreurs: string[] = [];
  if (cartes.length !== 20) erreurs.push(`Le deck doit contenir 20 cartes (actuellement ${cartes.length}).`);
  const compte = new Map<string, number>();
  for (const id of cartes) compte.set(id, (compte.get(id) ?? 0) + 1);
  for (const [id, n] of compte) {
    const def = getCard(id);
    if (!def) {
      erreurs.push(`Carte inconnue : ${id}.`);
      continue;
    }
    const max = exemplairesMax(def.rarete);
    if (n > max) erreurs.push(`${def.nom} : ${n} exemplaires pour un maximum de ${max}.`);
    const owned = p.collection[id] ?? 0;
    if (n > owned) erreurs.push(`${def.nom} : vous n'en possédez que ${owned}.`);
  }
  return { ok: erreurs.length === 0, erreurs };
}

export function enregistrerDeck(deck: DeckSauvegarde): void {
  const p = charger();
  const i = p.decks.findIndex((d) => d.id === deck.id);
  if (i >= 0) p.decks[i] = deck;
  else p.decks.push(deck);
  sauver(p);
}

export function supprimerDeck(id: string): void {
  const p = charger();
  p.decks = p.decks.filter((d) => d.id !== id);
  if (p.deckActif === id) p.deckActif = 'deck-sylve';
  sauver(p);
}

/** Résout un identifiant de deck (préconstruit ou personnalisé) en cartes. */
export function resoudreDeck(id: string): { nom: string; cartes: string[]; terrainId: string } | null {
  const pre = DECKS.find((d) => d.id === id);
  if (pre) {
    const cartes: string[] = [];
    for (const [cid, n] of pre.liste) for (let i = 0; i < n; i++) cartes.push(cid);
    return { nom: pre.nom, cartes, terrainId: pre.terrainId };
  }
  const perso = charger().decks.find((d) => d.id === id);
  if (perso) return { nom: perso.nom, cartes: perso.cartes.slice(), terrainId: perso.terrainId };
  return null;
}

export function enregistrerResultat(victoire: boolean, recompense: number): void {
  const p = charger();
  p.stats.parties += 1;
  if (victoire) {
    p.stats.victoires += 1;
    p.pieces += recompense;
  }
  sauver(p);
}
