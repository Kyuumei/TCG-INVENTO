/**
 * INVENTO — Moteur de règles.
 *
 * Toutes les fonctions publiques sont pures : elles clonent l'état reçu, le font
 * évoluer, puis renvoient le nouvel état accompagné de son journal d'événements.
 * L'interface ne modifie jamais un `GameState` directement.
 */
import {
  BEATS,
  WEAK_TO,
  emptyStatus,
  type Ability,
  type CardDef,
  type CardInstance,
  type Condition,
  type Creature,
  type Effect,
  type Element,
  type GameState,
  type Keyword,
  type PlayerState,
  type Selector,
  type TokenSpec,
} from './types';
import { getCard, getTerrain } from '../data/registry';
import { randInt, shuffle } from './rng';

export const LIGNES = 3;
export const PV_DEPART = 20;
export const CRISTAUX_MAX = 8;
export const TAILLE_DECK = 20;
export const MAIN_MAX = 8;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { type: 'mulligan'; rejeter: number[] }
  | { type: 'jouer-creature'; uid: number; ligne: number }
  | { type: 'evoluer'; uid: number; cibleUid: number }
  | { type: 'jouer-sort'; uid: number; cibleUid?: number }
  | { type: 'jouer-relique'; uid: number; cibleUid: number }
  | { type: 'jouer-zone'; uid: number }
  | { type: 'attaquer'; attaquantUid: number; cible: number | 'joueur' }
  | { type: 'pouvoir-terrain'; cibleUid?: number }
  | { type: 'fin-tour' };

// ---------------------------------------------------------------------------
// Utilitaires d'état
// ---------------------------------------------------------------------------

export function clone(state: GameState): GameState {
  return {
    ...state,
    joueurs: [clonePlayer(state.joueurs[0]), clonePlayer(state.joueurs[1])],
    zoneActive: state.zoneActive ? { ...state.zoneActive } : null,
    journal: [],
  };
}

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    main: p.main.map((c) => ({ ...c })),
    deck: p.deck.map((c) => ({ ...c })),
    defausse: p.defausse.map((c) => ({ ...c })),
    lignes: p.lignes.map((c) => (c ? cloneCreature(c) : null)),
  };
}

function cloneCreature(c: Creature): Creature {
  return {
    ...c,
    status: { ...c.status },
    motsClesAccordes: c.motsClesAccordes.slice(),
    reliques: c.reliques.slice(),
    token: c.token ? { ...c.token } : undefined,
  };
}

export function adversaire(j: 0 | 1): 0 | 1 {
  return j === 0 ? 1 : 0;
}

/** Toutes les créatures en jeu, tous camps confondus. */
export function toutesCreatures(state: GameState): Creature[] {
  const out: Creature[] = [];
  for (const p of state.joueurs) for (const c of p.lignes) if (c) out.push(c);
  return out;
}

export function trouverCreature(state: GameState, uid: number): Creature | null {
  for (const p of state.joueurs) for (const c of p.lignes) if (c && c.uid === uid) return c;
  return null;
}

/** Définition d'une créature en jeu, ou `null` s'il s'agit d'un jeton. */
export function defDe(c: Creature): CardDef | null {
  return c.token ? null : getCard(c.defId);
}

export function nomDe(c: Creature): string {
  return c.token ? c.token.nom : (getCard(c.defId)?.nom ?? '???');
}

export function elementDe(c: Creature): Element {
  return c.token ? c.token.element : (getCard(c.defId)?.element ?? 'neutre');
}

/** Mots-clés effectifs : ceux de la carte, des reliques et ceux accordés en jeu. */
export function motsClesDe(c: Creature): Keyword[] {
  const base = c.token ? (c.token.motsCles ?? []) : (getCard(c.defId)?.motsCles ?? []);
  const desReliques: Keyword[] = [];
  for (const rid of c.reliques) {
    const mc = getCard(rid)?.equipement?.motCle;
    if (mc) desReliques.push(mc);
  }
  return [...new Set([...base, ...desReliques, ...c.motsClesAccordes])];
}

export function aMotCle(c: Creature, k: Keyword): boolean {
  return motsClesDe(c).includes(k);
}

export interface Stats {
  atq: number;
  pvMax: number;
  pv: number;
}

/**
 * Statistiques effectives d'une créature : base + reliques + altérations +
 * bonus du terrain personnel de son contrôleur + bonus de la zone partagée.
 */
export function statsOf(state: GameState, c: Creature): Stats {
  const def = defDe(c);
  let atq = c.token ? c.token.atq : (def?.atq ?? 0);
  let pvMax = c.token ? c.token.pv : (def?.pv ?? 1);

  for (const rid of c.reliques) {
    const eq = getCard(rid)?.equipement;
    if (eq) {
      atq += eq.atq;
      pvMax += eq.pv;
    }
  }

  atq += c.status.bonusAtq;
  pvMax += c.status.bonusPv;

  const el = elementDe(c);
  const terrain = getTerrain(state.joueurs[c.proprietaire].terrainId);
  if (terrain && terrain.passif.element === el) {
    atq += terrain.passif.atq;
    pvMax += terrain.passif.pv;
  }

  if (state.zoneActive) {
    const z = getCard(state.zoneActive.defId)?.zone;
    if (z && z.element === el) {
      atq += z.atq;
      pvMax += z.pv;
    }
  }

  atq = Math.max(0, atq);
  pvMax = Math.max(1, pvMax);
  return { atq, pvMax, pv: Math.max(0, pvMax - c.degats) };
}

// ---------------------------------------------------------------------------
// Interactions élémentaires
// ---------------------------------------------------------------------------

export interface DamageMod {
  valeur: number;
  faiblesse: boolean;
  resistance: boolean;
}

/**
 * Applique le cycle élémentaire : faiblesse = +50 % (arrondi supérieur),
 * résistance = −1 dégât (jamais en dessous de 1).
 */
export function modulerDegats(base: number, attaquant: Element | null, defenseur: Element): DamageMod {
  if (base <= 0 || attaquant === null || attaquant === 'neutre') {
    return { valeur: Math.max(0, base), faiblesse: false, resistance: false };
  }
  if (WEAK_TO[defenseur] === attaquant) {
    return { valeur: Math.ceil(base * 1.5), faiblesse: true, resistance: false };
  }
  if (BEATS[defenseur] === attaquant) {
    return { valeur: Math.max(1, base - 1), faiblesse: false, resistance: true };
  }
  return { valeur: base, faiblesse: false, resistance: false };
}

// ---------------------------------------------------------------------------
// Création de partie
// ---------------------------------------------------------------------------

export interface SetupJoueur {
  nom: string;
  deck: string[];
  terrainId: string;
}

export function createGame(a: SetupJoueur, b: SetupJoueur, seed: number): GameState {
  let uid = 1;
  const build = (s: SetupJoueur, sd: number): [PlayerState, number] => {
    const cartes: CardInstance[] = s.deck.map((defId) => ({ uid: uid++, defId }));
    const [melange, ns] = shuffle(cartes, sd);
    return [
      {
        nom: s.nom,
        pv: PV_DEPART,
        pvMax: PV_DEPART,
        cristaux: 0,
        cristauxMax: 0,
        main: [],
        deck: melange,
        defausse: [],
        lignes: new Array(LIGNES).fill(null),
        terrainId: s.terrainId,
        pouvoirUtilise: false,
        fatigue: 0,
      },
      ns,
    ];
  };

  let s = seed >>> 0;
  const [p0, s1] = build(a, s);
  s = s1;
  const [p1, s2] = build(b, s);
  s = s2;

  const state: GameState = {
    joueurs: [p0, p1],
    actif: 0,
    tour: 0,
    phase: 'mulligan',
    vainqueur: null,
    zoneActive: null,
    prochainUid: uid,
    seed: s,
    journal: [],
  };

  // Main de départ : le second joueur reçoit une carte de plus en compensation.
  for (let i = 0; i < 4; i++) piocher(state, 0);
  for (let i = 0; i < 5; i++) piocher(state, 1);
  state.journal = [];
  return state;
}

/** Remplace les cartes choisies puis lance le premier tour. */
export function appliquerMulligan(state: GameState, rejeter: number[]): GameState {
  const s = clone(state);
  if (s.phase !== 'mulligan') return s;
  const p = s.joueurs[0];
  const indices = [...new Set(rejeter)].filter((i) => i >= 0 && i < p.main.length).sort((x, y) => y - x);
  const rendues: CardInstance[] = [];
  for (const i of indices) rendues.push(...p.main.splice(i, 1));
  for (let i = 0; i < rendues.length; i++) piocher(s, 0);
  p.deck.push(...rendues);
  const [melange, ns] = shuffle(p.deck, s.seed);
  p.deck = melange;
  s.seed = ns;
  s.phase = 'jeu';
  s.actif = 1; // `debutTour` bascule vers le joueur 0.
  debutTour(s);
  return s;
}

// ---------------------------------------------------------------------------
// Pioche et fatigue
// ---------------------------------------------------------------------------

function piocher(state: GameState, j: 0 | 1): void {
  const p = state.joueurs[j];
  const carte = p.deck.shift();
  if (!carte) {
    p.fatigue += 1;
    state.journal.push({ t: 'fatigue', joueur: j, degats: p.fatigue });
    degatsJoueur(state, j, p.fatigue, null);
    return;
  }
  if (p.main.length >= MAIN_MAX) {
    p.defausse.push(carte);
    return;
  }
  p.main.push(carte);
  state.journal.push({ t: 'pioche', joueur: j, uid: carte.uid, defId: carte.defId });
}

// ---------------------------------------------------------------------------
// Dégâts et soins
// ---------------------------------------------------------------------------

function degatsJoueur(state: GameState, j: 0 | 1, valeur: number, _src: Creature | null): void {
  if (valeur <= 0) return;
  const p = state.joueurs[j];
  p.pv = Math.max(0, p.pv - valeur);
  state.journal.push({ t: 'degats', cibleUid: null, joueur: j, valeur, faiblesse: false, resistance: false });
  verifierFin(state);
}

function soinJoueur(state: GameState, j: 0 | 1, valeur: number): void {
  if (valeur <= 0) return;
  const p = state.joueurs[j];
  const avant = p.pv;
  p.pv = Math.min(p.pvMax, p.pv + valeur);
  if (p.pv > avant) {
    state.journal.push({ t: 'soin', cibleUid: null, joueur: j, valeur: p.pv - avant });
  }
}

/**
 * Inflige des dégâts à une créature. `elementSource` active le cycle élémentaire ;
 * `null` correspond à des dégâts bruts (fatigue, venin, effets neutres).
 */
function degatsCreature(
  state: GameState,
  c: Creature,
  valeur: number,
  elementSource: Element | null,
  source: Creature | null,
): number {
  if (valeur <= 0) return 0;
  const mod = modulerDegats(valeur, elementSource, elementDe(c));
  let restant = mod.valeur;

  if (c.status.bouclier > 0) {
    const absorbe = Math.min(c.status.bouclier, restant);
    c.status.bouclier -= absorbe;
    restant -= absorbe;
    state.journal.push({ t: 'statut', cibleUid: c.uid, texte: `Bouclier −${absorbe}` });
  }
  if (restant <= 0) return 0;

  const st = statsOf(state, c);
  const inflige = Math.min(restant, st.pv);
  c.degats += restant;
  state.journal.push({
    t: 'degats',
    cibleUid: c.uid,
    joueur: null,
    valeur: restant,
    faiblesse: mod.faiblesse,
    resistance: mod.resistance,
  });

  if (source && aMotCle(source, 'lien-vital')) {
    soinJoueur(state, source.proprietaire, restant);
  }

  // Excédent : la percée le reporte sur le joueur adverse.
  const excedent = restant - inflige;
  if (excedent > 0 && source && aMotCle(source, 'percee')) {
    degatsJoueur(state, c.proprietaire, excedent, source);
  }

  if (statsOf(state, c).pv <= 0) {
    tuer(state, c);
  } else {
    declencher(state, c, 'sur-degats', null);
  }
  return restant;
}

function soinCreature(state: GameState, c: Creature, valeur: number): void {
  if (valeur <= 0 || c.degats === 0) return;
  const rendu = Math.min(valeur, c.degats);
  c.degats -= rendu;
  state.journal.push({ t: 'soin', cibleUid: c.uid, joueur: null, valeur: rendu });
}

function tuer(state: GameState, c: Creature): void {
  const p = state.joueurs[c.proprietaire];
  if (p.lignes[c.ligne]?.uid !== c.uid) return; // Déjà retirée.
  state.journal.push({ t: 'mort', uid: c.uid, defId: c.defId, joueur: c.proprietaire, ligne: c.ligne });
  p.lignes[c.ligne] = null;
  if (!c.token) p.defausse.push({ uid: c.uid, defId: c.defId });
  for (const rid of c.reliques) p.defausse.push({ uid: state.prochainUid++, defId: rid });
  declencher(state, c, 'dernier-souffle', null);
  verifierFin(state);
}

/** Lecture opaque de la phase : empêche TypeScript de sur-restreindre le type. */
function estTermine(state: GameState): boolean {
  return state.phase === 'termine';
}

function verifierFin(state: GameState): void {
  if (state.phase === 'termine') return;
  const mort0 = state.joueurs[0].pv <= 0;
  const mort1 = state.joueurs[1].pv <= 0;
  if (!mort0 && !mort1) return;
  // Double KO : le joueur actif perd (il a provoqué la situation).
  const vainqueur: 0 | 1 = mort0 && mort1 ? adversaire(state.actif) : mort0 ? 1 : 0;
  state.phase = 'termine';
  state.vainqueur = vainqueur;
  state.journal.push({ t: 'fin-partie', vainqueur });
}

// ---------------------------------------------------------------------------
// Résolution des capacités
// ---------------------------------------------------------------------------

/** Contexte de résolution : qui déclenche, et sur quoi. */
interface Ctx {
  source: Creature | null;
  lanceur: 0 | 1;
  element: Element | null;
  cible: Creature | null;
}

function evaluerCondition(state: GameState, cond: Condition, ctx: Ctx): boolean {
  const p = state.joueurs[ctx.lanceur];
  switch (cond.type) {
    case 'allie-du-meme-element': {
      if (!ctx.source) return false;
      const el = elementDe(ctx.source);
      const n = p.lignes.filter((c) => c && c.uid !== ctx.source!.uid && elementDe(c) === el).length;
      return n >= cond.min;
    }
    case 'main-vide':
      return p.main.length === 0;
    case 'pv-inferieurs':
      return p.pv < cond.seuil;
    case 'creatures-alliees':
      return p.lignes.filter(Boolean).length >= cond.min;
    case 'zone-active': {
      if (!state.zoneActive) return false;
      return getCard(state.zoneActive.defId)?.zone?.element === cond.element;
    }
  }
}

/** Résout un sélecteur en une liste de créatures. */
function resoudreCreatures(state: GameState, sel: Selector, ctx: Ctx): Creature[] {
  const moi = state.joueurs[ctx.lanceur];
  const eux = state.joueurs[adversaire(ctx.lanceur)];
  const alliees = moi.lignes.filter((c): c is Creature => c !== null);
  const ennemies = eux.lignes.filter((c): c is Creature => c !== null);

  switch (sel) {
    case 'cible':
      return ctx.cible ? [ctx.cible] : [];
    case 'soi':
      return ctx.source ? [ctx.source] : [];
    case 'toutes-creatures':
      return [...alliees, ...ennemies];
    case 'creatures-alliees':
      return alliees;
    case 'autres-creatures-alliees':
      return alliees.filter((c) => c.uid !== ctx.source?.uid);
    case 'creatures-ennemies':
      return ennemies;
    case 'creature-ennemie-aleatoire': {
      if (ennemies.length === 0) return [];
      const [i, ns] = randInt(state.seed, ennemies.length);
      state.seed = ns;
      return [ennemies[i]!];
    }
    case 'creature-ennemie-la-plus-faible': {
      if (ennemies.length === 0) return [];
      return [ennemies.reduce((a, b) => (statsOf(state, a).pv <= statsOf(state, b).pv ? a : b))];
    }
    case 'creature-ennemie-la-plus-forte': {
      if (ennemies.length === 0) return [];
      return [ennemies.reduce((a, b) => (statsOf(state, a).atq >= statsOf(state, b).atq ? a : b))];
    }
    case 'ligne-en-face': {
      if (!ctx.source) return [];
      const face = eux.lignes[ctx.source.ligne];
      return face ? [face] : [];
    }
    default:
      return [];
  }
}

function appliquerEffet(state: GameState, eff: Effect, ctx: Ctx): void {
  const cibleJoueur = (sel: Selector): 0 | 1 | null =>
    sel === 'joueur-allie' ? ctx.lanceur : sel === 'joueur-ennemi' ? adversaire(ctx.lanceur) : null;

  switch (eff.kind) {
    case 'degats': {
      const j = cibleJoueur(eff.cible);
      if (j !== null) {
        degatsJoueur(state, j, eff.valeur, ctx.source);
        return;
      }
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        degatsCreature(state, c, eff.valeur, ctx.element, ctx.source);
      }
      return;
    }
    case 'soin': {
      const j = cibleJoueur(eff.cible);
      if (j !== null) {
        soinJoueur(state, j, eff.valeur);
        return;
      }
      for (const c of resoudreCreatures(state, eff.cible, ctx)) soinCreature(state, c, eff.valeur);
      return;
    }
    case 'buff': {
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        c.status.bonusAtq += eff.atq;
        c.status.bonusPv += eff.pv;
        state.journal.push({ t: 'buff', cibleUid: c.uid, atq: eff.atq, pv: eff.pv });
      }
      return;
    }
    case 'bouclier':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        c.status.bouclier += eff.valeur;
        state.journal.push({ t: 'statut', cibleUid: c.uid, texte: `Bouclier +${eff.valeur}` });
      }
      return;
    case 'venin':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        c.status.venin += eff.valeur;
        state.journal.push({ t: 'statut', cibleUid: c.uid, texte: `Venin ${c.status.venin}` });
      }
      return;
    case 'regeneration':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        c.status.regeneration += eff.valeur;
        state.journal.push({ t: 'statut', cibleUid: c.uid, texte: `Régénération ${c.status.regeneration}` });
      }
      return;
    case 'riposte':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        c.status.riposte += eff.valeur;
        state.journal.push({ t: 'statut', cibleUid: c.uid, texte: `Riposte ${c.status.riposte}` });
      }
      return;
    case 'gel':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        c.status.gel = Math.max(c.status.gel, eff.tours);
        state.journal.push({ t: 'statut', cibleUid: c.uid, texte: 'Gelée' });
      }
      return;
    case 'reveiller':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        c.fraichementJouee = false;
        c.attaquesFaites = 0;
        c.status.gel = 0;
        state.journal.push({ t: 'statut', cibleUid: c.uid, texte: 'Prête' });
      }
      return;
    case 'accorder-mot-cle':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        if (!c.motsClesAccordes.includes(eff.motCle)) c.motsClesAccordes.push(eff.motCle);
        state.journal.push({ t: 'statut', cibleUid: c.uid, texte: eff.motCle });
      }
      return;
    case 'detruire':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) tuer(state, c);
      return;
    case 'renvoyer-en-main':
      for (const c of resoudreCreatures(state, eff.cible, ctx)) {
        if (aMotCle(c, 'ancrage') || c.token) continue;
        const p = state.joueurs[c.proprietaire];
        p.lignes[c.ligne] = null;
        if (p.main.length < MAIN_MAX) p.main.push({ uid: c.uid, defId: c.defId });
        else p.defausse.push({ uid: c.uid, defId: c.defId });
        state.journal.push({ t: 'mort', uid: c.uid, defId: c.defId, joueur: c.proprietaire, ligne: c.ligne });
      }
      return;
    case 'piocher':
      for (let i = 0; i < eff.valeur; i++) piocher(state, ctx.lanceur);
      return;
    case 'cristaux': {
      const p = state.joueurs[ctx.lanceur];
      p.cristaux = Math.min(CRISTAUX_MAX, p.cristaux + eff.valeur);
      return;
    }
    case 'invoquer': {
      for (let i = 0; i < eff.nombre; i++) {
        const ligne = premiereLigneLibre(state, ctx.lanceur);
        if (ligne === -1) return;
        poserJeton(state, ctx.lanceur, ligne, eff.jeton);
      }
      return;
    }
  }
}

function premiereLigneLibre(state: GameState, j: 0 | 1): number {
  // On remplit du centre vers l'extérieur : la ligne centrale est la plus disputée.
  for (const l of [1, 0, 2]) if (!state.joueurs[j].lignes[l]) return l;
  return -1;
}

function poserJeton(state: GameState, j: 0 | 1, ligne: number, spec: TokenSpec): Creature {
  const c: Creature = {
    uid: state.prochainUid++,
    defId: `jeton:${spec.nom}`,
    proprietaire: j,
    ligne,
    degats: 0,
    status: emptyStatus(),
    attaquesFaites: 0,
    fraichementJouee: !(spec.motsCles ?? []).includes('elan'),
    motsClesAccordes: [],
    reliques: [],
    token: { ...spec },
    tourArrivee: state.tour,
  };
  state.joueurs[j].lignes[ligne] = c;
  state.journal.push({ t: 'invocation', uid: c.uid, defId: c.defId, joueur: j, ligne });
  return c;
}

/** Applique une capacité complète (condition puis effets). */
function resoudreCapacite(state: GameState, cap: Ability, ctx: Ctx): void {
  if (cap.condition && !evaluerCondition(state, cap.condition, ctx)) return;
  for (const eff of cap.effets) appliquerEffet(state, eff, ctx);
}

/** Déclenche toutes les capacités d'une créature correspondant au moment donné. */
function declencher(state: GameState, c: Creature, trigger: Ability['trigger'], cible: Creature | null): void {
  const def = defDe(c);
  if (!def?.capacites) return;
  for (const cap of def.capacites) {
    if (cap.trigger !== trigger) continue;
    resoudreCapacite(state, cap, {
      source: c,
      lanceur: c.proprietaire,
      element: def.element,
      cible,
    });
  }
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

/**
 * Cibles légales d'un attaquant.
 *
 * En temps normal une créature affronte celle qui lui fait face sur sa ligne, et
 * frappe le joueur si la ligne est vide. Le mot-clé Vol court-circuite tout,
 * tandis que Garde force l'attaquant à s'occuper d'abord des défenseurs des
 * lignes adjacentes.
 */
export function ciblesLegales(state: GameState, attaquant: Creature): (number | 'joueur')[] {
  const adv = adversaire(attaquant.proprietaire);
  const lignesAdv = state.joueurs[adv].lignes;

  if (aMotCle(attaquant, 'vol')) return ['joueur'];

  const gardes: number[] = [];
  for (const l of [attaquant.ligne - 1, attaquant.ligne, attaquant.ligne + 1]) {
    if (l < 0 || l >= LIGNES) continue;
    const c = lignesAdv[l];
    if (c && aMotCle(c, 'garde')) gardes.push(c.uid);
  }
  if (gardes.length > 0) return gardes;

  const face = lignesAdv[attaquant.ligne];
  return face ? [face.uid] : ['joueur'];
}

export function peutAttaquer(state: GameState, c: Creature): boolean {
  if (state.phase !== 'jeu' || c.proprietaire !== state.actif) return false;
  if (c.fraichementJouee && !aMotCle(c, 'elan')) return false;
  if (c.status.gel > 0) return false;
  if (statsOf(state, c).atq <= 0) return false;
  const max = aMotCle(c, 'double-frappe') ? 2 : 1;
  return c.attaquesFaites < max;
}

function executerAttaque(state: GameState, attaquant: Creature, cible: number | 'joueur'): void {
  const st = statsOf(state, attaquant);
  const elAtt = elementDe(attaquant);
  attaquant.attaquesFaites += 1;

  state.journal.push({ t: 'attaque', attaquant: attaquant.uid, ligne: attaquant.ligne, cible });

  if (cible === 'joueur') {
    const adv = adversaire(attaquant.proprietaire);
    degatsJoueur(state, adv, st.atq, attaquant);
    if (aMotCle(attaquant, 'lien-vital')) soinJoueur(state, attaquant.proprietaire, st.atq);
  } else {
    const def = trouverCreature(state, cible);
    if (!def) return;
    const stDef = statsOf(state, def);
    const elDef = elementDe(def);

    // Les deux créatures se frappent simultanément : on fige les valeurs d'abord.
    degatsCreature(state, def, st.atq, elAtt, attaquant);

    if (!aMotCle(attaquant, 'insaisissable')) {
      const riposte = stDef.atq + def.status.riposte;
      if (riposte > 0) degatsCreature(state, attaquant, riposte, elDef, def);
    } else if (def.status.riposte > 0) {
      // Insaisissable esquive la contre-attaque mais pas les épines.
      degatsCreature(state, attaquant, def.status.riposte, null, def);
    }
  }

  if (state.joueurs[attaquant.proprietaire].lignes[attaquant.ligne]?.uid === attaquant.uid) {
    declencher(state, attaquant, 'sur-attaque', cible === 'joueur' ? null : trouverCreature(state, cible));
  }
}

// ---------------------------------------------------------------------------
// Déroulement du tour
// ---------------------------------------------------------------------------

function debutTour(state: GameState): void {
  state.actif = adversaire(state.actif);
  state.tour += 1;
  const p = state.joueurs[state.actif];

  p.cristauxMax = Math.min(CRISTAUX_MAX, p.cristauxMax + 1);
  p.cristaux = p.cristauxMax;
  p.pouvoirUtilise = false;

  for (const c of p.lignes) {
    if (!c) continue;
    c.fraichementJouee = false;
    c.attaquesFaites = 0;
    if (c.status.gel > 0) c.status.gel -= 1;
  }

  state.journal.push({ t: 'debut-tour', joueur: state.actif, tour: state.tour });

  for (const c of p.lignes.slice()) {
    if (c && p.lignes[c.ligne]?.uid === c.uid) declencher(state, c, 'eveil', null);
  }
  if (estTermine(state)) return;

  piocher(state, state.actif);
}

function finTour(state: GameState): void {
  const p = state.joueurs[state.actif];

  for (const c of p.lignes.slice()) {
    if (c && p.lignes[c.ligne]?.uid === c.uid) declencher(state, c, 'crepuscule', null);
  }
  if (estTermine(state)) return;

  // Venin puis régénération, sur les créatures des deux camps.
  for (const joueur of state.joueurs) {
    for (const c of joueur.lignes.slice()) {
      if (!c || joueur.lignes[c.ligne]?.uid !== c.uid) continue;
      if (c.status.venin > 0) degatsCreature(state, c, c.status.venin, null, null);
    }
  }
  if (estTermine(state)) return;
  for (const joueur of state.joueurs) {
    for (const c of joueur.lignes) {
      if (c && c.status.regeneration > 0) soinCreature(state, c, c.status.regeneration);
    }
  }
  if (estTermine(state)) return;

  debutTour(state);
}

// ---------------------------------------------------------------------------
// Jouer une carte
// ---------------------------------------------------------------------------

function retirerDeLaMain(p: PlayerState, uid: number): CardInstance | null {
  const i = p.main.findIndex((c) => c.uid === uid);
  if (i === -1) return null;
  return p.main.splice(i, 1)[0]!;
}

function poserCreature(state: GameState, j: 0 | 1, ligne: number, inst: CardInstance, def: CardDef): Creature {
  const c: Creature = {
    uid: inst.uid,
    defId: inst.defId,
    proprietaire: j,
    ligne,
    degats: 0,
    status: emptyStatus(),
    attaquesFaites: 0,
    fraichementJouee: !(def.motsCles ?? []).includes('elan'),
    motsClesAccordes: [],
    reliques: [],
    tourArrivee: state.tour,
  };
  state.joueurs[j].lignes[ligne] = c;
  state.journal.push({ t: 'invocation', uid: c.uid, defId: c.defId, joueur: j, ligne });
  return c;
}

/** Une évolution peut-elle être posée sur cette créature ? */
export function peutEvoluerSur(state: GameState, evolution: CardDef, c: Creature): boolean {
  if (!evolution.evolueDe || c.token) return false;
  if (c.defId !== evolution.evolueDe) return false;
  if (c.proprietaire !== state.actif) return false;
  // La créature doit avoir passé un tour complet en jeu.
  return c.tourArrivee < state.tour;
}

// ---------------------------------------------------------------------------
// Actions légales
// ---------------------------------------------------------------------------

/** Cibles valides pour une carte à cibler ; `null` si la carte n'en demande pas. */
export function ciblesPourCarte(state: GameState, def: CardDef, j: 0 | 1): number[] | null {
  const spec =
    def.kind === 'relique'
      ? 'creature-alliee'
      : def.kind === 'sort'
        ? (def.capacites?.[0]?.target ?? 'aucune')
        : 'aucune';
  if (spec === 'aucune') return null;

  const moi = state.joueurs[j].lignes.filter((c): c is Creature => c !== null);
  const eux = state.joueurs[adversaire(j)].lignes.filter((c): c is Creature => c !== null);
  const ciblables = (list: Creature[], adverse: boolean) =>
    list.filter((c) => !(adverse && aMotCle(c, 'voile'))).map((c) => c.uid);

  switch (spec) {
    case 'creature-alliee':
      return ciblables(moi, false);
    case 'creature-ennemie':
      return ciblables(eux, true);
    case 'creature':
      return [...ciblables(moi, false), ...ciblables(eux, true)];
    default:
      return null;
  }
}

export function actionsLegales(state: GameState): Action[] {
  if (state.phase !== 'jeu') return [];
  const j = state.actif;
  const p = state.joueurs[j];
  const out: Action[] = [{ type: 'fin-tour' }];

  for (const inst of p.main) {
    const def = getCard(inst.defId);
    if (!def || def.cout > p.cristaux) continue;

    if (def.kind === 'creature') {
      if (def.evolueDe) {
        for (const c of p.lignes) {
          if (c && peutEvoluerSur(state, def, c)) out.push({ type: 'evoluer', uid: inst.uid, cibleUid: c.uid });
        }
      } else {
        for (let l = 0; l < LIGNES; l++) {
          if (!p.lignes[l]) out.push({ type: 'jouer-creature', uid: inst.uid, ligne: l });
        }
      }
    } else if (def.kind === 'sort') {
      const cibles = ciblesPourCarte(state, def, j);
      if (cibles === null) out.push({ type: 'jouer-sort', uid: inst.uid });
      else for (const cu of cibles) out.push({ type: 'jouer-sort', uid: inst.uid, cibleUid: cu });
    } else if (def.kind === 'relique') {
      for (const cu of ciblesPourCarte(state, def, j) ?? []) {
        out.push({ type: 'jouer-relique', uid: inst.uid, cibleUid: cu });
      }
    } else if (def.kind === 'zone') {
      out.push({ type: 'jouer-zone', uid: inst.uid });
    }
  }

  const terrain = getTerrain(p.terrainId);
  if (terrain && !p.pouvoirUtilise && terrain.pouvoirCout <= p.cristaux) {
    if (terrain.pouvoirTarget === 'aucune') {
      out.push({ type: 'pouvoir-terrain' });
    } else {
      const fausseDef: CardDef = {
        id: terrain.id,
        nom: terrain.nom,
        kind: 'sort',
        element: terrain.element,
        cout: terrain.pouvoirCout,
        rarete: 'commune',
        artPrompt: '',
        artSeed: 0,
        capacites: [{ trigger: 'immediat', target: terrain.pouvoirTarget, texte: '', effets: terrain.pouvoirEffets }],
      };
      for (const cu of ciblesPourCarte(state, fausseDef, j) ?? []) {
        out.push({ type: 'pouvoir-terrain', cibleUid: cu });
      }
    }
  }

  for (const c of p.lignes) {
    if (!c || !peutAttaquer(state, c)) continue;
    for (const cible of ciblesLegales(state, c)) out.push({ type: 'attaquer', attaquantUid: c.uid, cible });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Application d'une action
// ---------------------------------------------------------------------------

/**
 * Applique une action et renvoie le nouvel état. Toute action illégale est
 * ignorée : l'état renvoyé est alors identique (journal vide).
 */
export function applyAction(state: GameState, action: Action): GameState {
  if (action.type === 'mulligan') return appliquerMulligan(state, action.rejeter);
  if (state.phase !== 'jeu') return clone(state);

  const s = clone(state);
  const j = s.actif;
  const p = s.joueurs[j];

  switch (action.type) {
    case 'fin-tour': {
      finTour(s);
      return s;
    }

    case 'jouer-creature': {
      const inst = p.main.find((c) => c.uid === action.uid);
      const def = inst && getCard(inst.defId);
      if (!inst || !def || def.kind !== 'creature' || def.evolueDe) return s;
      if (def.cout > p.cristaux) return s;
      if (action.ligne < 0 || action.ligne >= LIGNES || p.lignes[action.ligne]) return s;

      retirerDeLaMain(p, action.uid);
      p.cristaux -= def.cout;
      s.journal.push({ t: 'carte-jouee', joueur: j, defId: def.id, ligne: action.ligne });
      const c = poserCreature(s, j, action.ligne, inst, def);
      declencher(s, c, 'cri-de-guerre', null);
      return s;
    }

    case 'evoluer': {
      const inst = p.main.find((c) => c.uid === action.uid);
      const def = inst && getCard(inst.defId);
      const base = trouverCreature(s, action.cibleUid);
      if (!inst || !def || !base || def.kind !== 'creature') return s;
      if (def.cout > p.cristaux || !peutEvoluerSur(s, def, base)) return s;

      retirerDeLaMain(p, action.uid);
      p.cristaux -= def.cout;
      p.defausse.push({ uid: base.uid, defId: base.defId });

      const ancien = base.defId;
      base.defId = def.id;
      base.degats = Math.max(0, base.degats - 2); // L'évolution referme les blessures légères.
      base.fraichementJouee = false;
      base.attaquesFaites = 0;
      base.tourArrivee = s.tour;

      s.journal.push({ t: 'carte-jouee', joueur: j, defId: def.id });
      s.journal.push({ t: 'evolution', uid: base.uid, de: ancien, vers: def.id, ligne: base.ligne, joueur: j });
      declencher(s, base, 'sur-evolution', null);
      declencher(s, base, 'cri-de-guerre', null);
      return s;
    }

    case 'jouer-sort': {
      const inst = p.main.find((c) => c.uid === action.uid);
      const def = inst && getCard(inst.defId);
      if (!inst || !def || def.kind !== 'sort' || def.cout > p.cristaux) return s;

      const cibles = ciblesPourCarte(s, def, j);
      if (cibles !== null) {
        if (action.cibleUid === undefined || !cibles.includes(action.cibleUid)) return s;
      }
      const cible = action.cibleUid !== undefined ? trouverCreature(s, action.cibleUid) : null;

      retirerDeLaMain(p, action.uid);
      p.cristaux -= def.cout;
      p.defausse.push(inst);
      s.journal.push({ t: 'carte-jouee', joueur: j, defId: def.id });

      for (const cap of def.capacites ?? []) {
        resoudreCapacite(s, cap, { source: null, lanceur: j, element: def.element, cible });
      }
      return s;
    }

    case 'jouer-relique': {
      const inst = p.main.find((c) => c.uid === action.uid);
      const def = inst && getCard(inst.defId);
      const cible = trouverCreature(s, action.cibleUid);
      if (!inst || !def || !cible || def.kind !== 'relique' || def.cout > p.cristaux) return s;
      if (cible.proprietaire !== j) return s;

      retirerDeLaMain(p, action.uid);
      p.cristaux -= def.cout;
      cible.reliques.push(def.id);
      s.journal.push({ t: 'carte-jouee', joueur: j, defId: def.id });
      s.journal.push({
        t: 'buff',
        cibleUid: cible.uid,
        atq: def.equipement?.atq ?? 0,
        pv: def.equipement?.pv ?? 0,
      });
      for (const cap of def.capacites ?? []) {
        resoudreCapacite(s, cap, { source: cible, lanceur: j, element: def.element, cible });
      }
      return s;
    }

    case 'jouer-zone': {
      const inst = p.main.find((c) => c.uid === action.uid);
      const def = inst && getCard(inst.defId);
      if (!inst || !def || def.kind !== 'zone' || def.cout > p.cristaux) return s;

      retirerDeLaMain(p, action.uid);
      p.cristaux -= def.cout;
      if (s.zoneActive) s.joueurs[s.zoneActive.pose].defausse.push({ uid: s.prochainUid++, defId: s.zoneActive.defId });
      s.zoneActive = { defId: def.id, pose: j };
      s.journal.push({ t: 'carte-jouee', joueur: j, defId: def.id });
      s.journal.push({ t: 'zone-posee', defId: def.id, joueur: j });

      // La zone peut faire mourir une créature dont les PV max chutent.
      for (const joueur of s.joueurs) {
        for (const c of joueur.lignes.slice()) {
          if (c && statsOf(s, c).pv <= 0) tuer(s, c);
        }
      }
      return s;
    }

    case 'pouvoir-terrain': {
      const terrain = getTerrain(p.terrainId);
      if (!terrain || p.pouvoirUtilise || terrain.pouvoirCout > p.cristaux) return s;
      const cible = action.cibleUid !== undefined ? trouverCreature(s, action.cibleUid) : null;
      if (terrain.pouvoirTarget !== 'aucune' && !cible) return s;
      if (cible && aMotCle(cible, 'voile') && cible.proprietaire !== j) return s;

      p.cristaux -= terrain.pouvoirCout;
      p.pouvoirUtilise = true;
      s.journal.push({ t: 'pouvoir-terrain', joueur: j, terrainId: terrain.id });
      for (const eff of terrain.pouvoirEffets) {
        appliquerEffet(s, eff, { source: null, lanceur: j, element: terrain.element, cible });
      }
      return s;
    }

    case 'attaquer': {
      const att = trouverCreature(s, action.attaquantUid);
      if (!att || att.proprietaire !== j || !peutAttaquer(s, att)) return s;
      const legales = ciblesLegales(s, att);
      if (!legales.some((c) => c === action.cible)) return s;
      executerAttaque(s, att, action.cible);
      return s;
    }
  }
}

/** Rejoue une suite d'actions ; utile pour les tests et la reprise de partie. */
export function rejouer(initial: GameState, actions: Action[]): GameState {
  return actions.reduce((s, a) => applyAction(s, a), initial);
}
