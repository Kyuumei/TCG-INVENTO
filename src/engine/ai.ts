/**
 * Intelligence artificielle adverse.
 *
 * L'IA joue son tour comme une suite de décisions gloutonnes évaluées par
 * simulation : pour chaque action légale, elle applique l'action sur une copie
 * de l'état et note le résultat. Le niveau « difficile » ajoute une recherche
 * en faisceau qui anticipe les enchaînements (jouer un buff *puis* attaquer).
 *
 * L'IA n'inspecte jamais le contenu de la main adverse : l'évaluation ne
 * regarde que le nombre de cartes. Elle ne simule jamais au-delà de sa propre
 * fin de tour, pour ne pas « voir » la carte que l'adversaire va piocher.
 */
import { actionsLegales, adversaire, applyAction, aMotCle, statsOf, type Action } from './rules';
import type { Creature, GameState } from './types';
import { Rng } from './rng';
import { getCard } from '../data/registry';

export type Difficulte = 'facile' | 'normal' | 'difficile';

/** Poids d'un mot-clé dans l'estimation de la valeur d'une créature. */
function bonusMotsCles(c: Creature): number {
  let b = 0;
  if (aMotCle(c, 'garde')) b += 1.2;
  if (aMotCle(c, 'vol')) b += 1.4;
  if (aMotCle(c, 'elan')) b += 0.6;
  if (aMotCle(c, 'double-frappe')) b += 1.6;
  if (aMotCle(c, 'lien-vital')) b += 1.0;
  if (aMotCle(c, 'percee')) b += 0.8;
  if (aMotCle(c, 'voile')) b += 0.8;
  if (aMotCle(c, 'insaisissable')) b += 0.7;
  return b;
}

function valeurCreature(state: GameState, c: Creature): number {
  const st = statsOf(state, c);
  // Une créature vaut à peu près son attaque plus ses PV restants ; les PV
  // pèsent un peu moins car ils ne menacent rien par eux-mêmes.
  let v = st.atq * 1.15 + st.pv * 0.85 + bonusMotsCles(c);
  v += c.status.bouclier * 0.7;
  v += c.status.regeneration * 0.8;
  v -= c.status.venin * 0.9;
  if (c.status.gel > 0) v -= st.atq * 0.5 * c.status.gel;
  return v;
}

/**
 * Note un état du point de vue du joueur `pov`. Les valeurs sont exprimées en
 * « points de vie équivalents » pour rester comparables entre elles.
 */
export function evaluer(state: GameState, pov: 0 | 1): number {
  if (state.phase === 'termine') {
    return state.vainqueur === pov ? 10_000 : -10_000;
  }
  const adv = adversaire(pov);
  const moi = state.joueurs[pov];
  const eux = state.joueurs[adv];

  // Les points de vie comptent double en dessous de 8 : la mort est absorbante.
  const pvScore = (p: number) => p + Math.max(0, 8 - p) * 1.5;
  let s = (pvScore(moi.pv) - pvScore(eux.pv)) * 2.2;

  for (const c of moi.lignes) if (c) s += valeurCreature(state, c);
  for (const c of eux.lignes) if (c) s -= valeurCreature(state, c);

  s += moi.main.length * 1.1 - eux.main.length * 1.1;
  s += (moi.deck.length > 0 ? 0 : -6) + (eux.deck.length > 0 ? 0 : 6);

  return s;
}

/** Léger malus pour les cristaux laissés inutilisés en fin de tour. */
function malusCristaux(state: GameState, pov: 0 | 1): number {
  return state.joueurs[pov].cristaux * 0.35;
}

interface Noeud {
  state: GameState;
  actions: Action[];
  score: number;
}

/**
 * Recherche en faisceau : on développe les meilleures suites d'actions du tour
 * courant, sans jamais franchir la fin de tour.
 */
function faisceau(depart: GameState, pov: 0 | 1, largeur: number, profondeur: number, rng: Rng): Action[] {
  let front: Noeud[] = [{ state: depart, actions: [], score: evaluer(depart, pov) }];
  let meilleur: Noeud = front[0]!;

  for (let d = 0; d < profondeur; d++) {
    const candidats: Noeud[] = [];

    for (const noeud of front) {
      if (noeud.state.phase !== 'jeu' || noeud.state.actif !== pov) continue;
      const actions = actionsLegales(noeud.state).filter((a) => a.type !== 'fin-tour');
      if (actions.length === 0) continue;

      for (const a of actions) {
        const suivant = applyAction(noeud.state, a);
        // Une action illégale ou sans effet ne fait pas avancer la recherche.
        if (suivant.journal.length === 0) continue;
        const score = evaluer(suivant, pov) + rng.next() * 0.05; // Départage sans biais.
        candidats.push({ state: suivant, actions: [...noeud.actions, a], score });
      }
    }

    if (candidats.length === 0) break;
    candidats.sort((x, y) => y.score - x.score);

    for (const c of candidats) {
      const ajuste = c.score - malusCristaux(c.state, pov);
      const refAjuste = meilleur.score - malusCristaux(meilleur.state, pov);
      if (ajuste > refAjuste) meilleur = c;
    }
    front = candidats.slice(0, largeur);
  }

  return meilleur.actions;
}

/** Paramètres de recherche par niveau de difficulté. */
const REGLAGES: Record<Difficulte, { largeur: number; profondeur: number; bruit: number }> = {
  facile: { largeur: 1, profondeur: 1, bruit: 3.5 },
  normal: { largeur: 3, profondeur: 3, bruit: 0.8 },
  difficile: { largeur: 6, profondeur: 6, bruit: 0 },
};

/**
 * Joue le tour complet de l'IA et renvoie la suite d'actions retenue, fin de
 * tour incluse. L'appelant les applique une par une pour animer le résultat.
 */
export function jouerTourIA(state: GameState, difficulte: Difficulte, seed: number): Action[] {
  const pov = state.actif;
  const reglage = REGLAGES[difficulte];
  const rng = new Rng(seed);
  const suite: Action[] = [];
  let courant = state;

  // Filet de sécurité : une IA ne joue jamais plus de 40 actions dans un tour.
  for (let garde = 0; garde < 40; garde++) {
    if (courant.phase !== 'jeu' || courant.actif !== pov) break;

    let choisies: Action[];
    if (reglage.bruit > 0) {
      // Niveau facile : on prend une bonne action, pas la meilleure.
      const actions = actionsLegales(courant).filter((a) => a.type !== 'fin-tour');
      if (actions.length === 0) break;
      const notes = actions.map((a) => {
        const s = applyAction(courant, a);
        return { a, score: evaluer(s, pov) + rng.gauss() * reglage.bruit };
      });
      notes.sort((x, y) => y.score - x.score);
      const base = evaluer(courant, pov);
      if (notes[0]!.score <= base - 1.5) break; // Rien d'utile à faire.
      choisies = [notes[0]!.a];
    } else {
      choisies = faisceau(courant, pov, reglage.largeur, reglage.profondeur, rng);
      if (choisies.length === 0) break;
      choisies = [choisies[0]!]; // On rejoue la recherche après chaque action.
    }

    const suivant = applyAction(courant, choisies[0]!);
    if (suivant.journal.length === 0) break; // Action sans effet : on s'arrête.
    suite.push(choisies[0]!);
    courant = suivant;
  }

  suite.push({ type: 'fin-tour' });
  return suite;
}

/**
 * Choix de mulligan de l'IA : elle rejette les cartes trop chères pour être
 * jouées dans les premiers tours.
 */
export function mulliganIA(state: GameState, j: 0 | 1): number[] {
  const main = state.joueurs[j].main;
  const rejeter: number[] = [];
  let chers = 0;
  for (let i = 0; i < main.length; i++) {
    const def = state.joueurs[j].main[i];
    if (!def) continue;
    const cout = coutDe(def.defId);
    if (cout >= 5 && chers < 2) {
      rejeter.push(i);
      chers++;
    }
  }
  return rejeter;
}

function coutDe(defId: string): number {
  return getCard(defId)?.cout ?? 0;
}
