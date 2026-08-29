/**
 * INVENTO — Types fondamentaux du moteur de jeu.
 *
 * Le moteur est volontairement pur : aucune dépendance au DOM. Il transforme un
 * `GameState` immuable en un nouvel état via des actions, en émettant un journal
 * d'événements que l'interface rejoue sous forme d'animations.
 */

/** Les six types élémentaires, plus le neutre. */
export type Element = 'sylve' | 'flamme' | 'maree' | 'foudre' | 'roc' | 'ombre' | 'neutre';

export const ELEMENTS: Element[] = ['sylve', 'flamme', 'maree', 'foudre', 'roc', 'ombre'];

/**
 * Cycle de faiblesses : chaque type est vaincu par le précédent.
 * Flamme > Sylve > Roc > Foudre > Marée > Ombre > Flamme
 */
export const BEATS: Record<Element, Element | null> = {
  flamme: 'sylve',
  sylve: 'roc',
  roc: 'foudre',
  foudre: 'maree',
  maree: 'ombre',
  ombre: 'flamme',
  neutre: null,
};

/** Type dont `el` subit la faiblesse (dégâts majorés). */
export const WEAK_TO: Record<Element, Element | null> = {
  sylve: 'flamme',
  roc: 'sylve',
  foudre: 'roc',
  maree: 'foudre',
  ombre: 'maree',
  flamme: 'ombre',
  neutre: null,
};

/** Familles de formes reconnues par le peintre procédural. */
export type Silhouette =
  | 'quadrupede'
  | 'oiseau'
  | 'serpent'
  | 'humanoide'
  | 'insecte'
  | 'amorphe'
  | 'colosse'
  | 'poisson'
  | 'flore'
  | 'objet'
  | 'paysage';

export type Rarity = 'commune' | 'peu-commune' | 'rare' | 'epique' | 'legendaire';

export type CardKind = 'creature' | 'sort' | 'relique' | 'zone';

/** Mots-clés statiques portés par une créature. */
export type Keyword =
  | 'elan'          // Peut attaquer le tour où elle entre en jeu.
  | 'garde'         // Les créatures adverses adjacentes doivent l'attaquer.
  | 'voile'         // Ne peut être ciblée par les sorts et capacités adverses.
  | 'vol'           // Ignore la créature en face et frappe le joueur.
  | 'percee'        // Les dégâts excédentaires sont infligés au joueur adverse.
  | 'double-frappe' // Attaque deux fois par tour.
  | 'lien-vital'    // Soigne son invocateur des dégâts infligés.
  | 'insaisissable' // Ne subit pas les dégâts de riposte.
  | 'ancrage';      // Ne peut pas être déplacée ni renvoyée en main.

export const KEYWORD_LABEL: Record<Keyword, string> = {
  elan: 'Élan',
  garde: 'Garde',
  voile: 'Voile',
  vol: 'Vol',
  percee: 'Percée',
  'double-frappe': 'Double frappe',
  'lien-vital': 'Lien vital',
  insaisissable: 'Insaisissable',
  ancrage: 'Ancrage',
};

export const KEYWORD_RULE: Record<Keyword, string> = {
  elan: "Peut attaquer dès le tour où elle entre en jeu.",
  garde: "Les créatures adverses des lignes adjacentes doivent l'attaquer en priorité.",
  voile: "Ne peut pas être ciblée par les sorts et capacités de l'adversaire.",
  vol: "Frappe directement le joueur adverse en ignorant la créature d'en face.",
  percee: "Les dégâts qui dépassent les PV de la cible sont infligés au joueur adverse.",
  'double-frappe': "Peut attaquer deux fois par tour.",
  'lien-vital': "Soigne son invocateur d'un montant égal aux dégâts qu'elle inflige.",
  insaisissable: "Ne subit jamais les dégâts de riposte.",
  ancrage: "Ne peut être ni déplacée, ni renvoyée dans la main.",
};

/** Altérations temporaires appliquées à une créature en jeu. */
export interface StatusEffects {
  /** Dégâts infligés en fin de tour à son contrôleur. */
  venin: number;
  /** Soins reçus en fin de tour. */
  regeneration: number;
  /** Dégâts renvoyés à l'attaquant. */
  riposte: number;
  /** Nombre de tours pendant lesquels la créature ne peut pas attaquer. */
  gel: number;
  /** Modificateur d'attaque permanent (buffs de sorts et reliques). */
  bonusAtq: number;
  /** Modificateur de PV maximum permanent. */
  bonusPv: number;
  /** Bouclier absorbant les prochains dégâts. */
  bouclier: number;
}

export function emptyStatus(): StatusEffects {
  return { venin: 0, regeneration: 0, riposte: 0, gel: 0, bonusAtq: 0, bonusPv: 0, bouclier: 0 };
}

/** Moment auquel une capacité déclenchée se produit. */
export type TriggerKind =
  | 'cri-de-guerre'   // À l'entrée en jeu.
  | 'dernier-souffle' // À la mort.
  | 'eveil'           // Au début du tour de son contrôleur.
  | 'crepuscule'      // À la fin du tour de son contrôleur.
  | 'sur-attaque'     // Juste après avoir attaqué.
  | 'sur-degats'      // Après avoir subi des dégâts et survécu.
  | 'sur-evolution'   // Lorsqu'elle évolue.
  | 'immediat';       // Sorts : à la résolution.

/** Cible que le joueur doit désigner avant la résolution. */
export type TargetSpec =
  | 'aucune'
  | 'creature-alliee'
  | 'creature-ennemie'
  | 'creature'
  | 'ligne-alliee-vide'
  | 'joueur-ennemi';

/**
 * Une capacité est décrite par des données, jamais par du code arbitraire :
 * cela rend les cartes sérialisables, testables et lisibles par l'IA.
 */
export interface Ability {
  trigger: TriggerKind;
  target: TargetSpec;
  /** Texte de règles affiché sur la carte. */
  texte: string;
  effets: Effect[];
  /** Condition optionnelle évaluée avant l'application des effets. */
  condition?: Condition;
}

export type Condition =
  | { type: 'allie-du-meme-element'; min: number }
  | { type: 'main-vide' }
  | { type: 'pv-inferieurs'; seuil: number }
  | { type: 'creatures-alliees'; min: number }
  | { type: 'zone-active'; element: Element };

/** Sélecteur déclaratif désignant les entités affectées par un effet. */
export type Selector =
  | 'cible'
  | 'soi'
  | 'toutes-creatures'
  | 'creatures-alliees'
  | 'creatures-ennemies'
  | 'autres-creatures-alliees'
  | 'joueur-allie'
  | 'joueur-ennemi'
  | 'creature-ennemie-aleatoire'
  | 'creature-ennemie-la-plus-faible'
  | 'creature-ennemie-la-plus-forte'
  | 'ligne-en-face';

/** Effet élémentaire appliqué par une capacité. */
export type Effect =
  | { kind: 'degats'; cible: Selector; valeur: number }
  | { kind: 'soin'; cible: Selector; valeur: number }
  | { kind: 'buff'; cible: Selector; atq: number; pv: number }
  | { kind: 'bouclier'; cible: Selector; valeur: number }
  | { kind: 'venin'; cible: Selector; valeur: number }
  | { kind: 'regeneration'; cible: Selector; valeur: number }
  | { kind: 'riposte'; cible: Selector; valeur: number }
  | { kind: 'gel'; cible: Selector; tours: number }
  | { kind: 'piocher'; valeur: number }
  | { kind: 'cristaux'; valeur: number }
  | { kind: 'invoquer'; jeton: TokenSpec; nombre: number }
  | { kind: 'detruire'; cible: Selector }
  | { kind: 'renvoyer-en-main'; cible: Selector }
  | { kind: 'accorder-mot-cle'; cible: Selector; motCle: Keyword }
  | { kind: 'reveiller'; cible: Selector };

/** Créature générée sans exister dans la collection (jetons). */
export interface TokenSpec {
  nom: string;
  element: Element;
  atq: number;
  pv: number;
  motsCles?: Keyword[];
  art?: string;
}

/** Définition immuable d'une carte de la collection. */
export interface CardDef {
  id: string;
  nom: string;
  kind: CardKind;
  element: Element;
  cout: number;
  rarete: Rarity;
  /** Texte d'ambiance affiché en bas de la carte. */
  citation?: string;
  /** Description de l'illustration, utilisée par le générateur d'art. */
  artPrompt: string;
  /** Archétype de silhouette guidant le rendu procédural. */
  silhouette?: Silhouette;
  /** Graine déterministe du rendu procédural. */
  artSeed: number;

  // --- Créatures ---
  atq?: number;
  pv?: number;
  motsCles?: Keyword[];
  /** Stade d'évolution : 1, 2 ou 3. */
  stade?: 1 | 2 | 3;
  /** Identifiant de la lignée évolutive partagée. */
  lignee?: string;
  /** Identifiant de la carte dont celle-ci est l'évolution directe. */
  evolueDe?: string;

  capacites?: Ability[];

  // --- Reliques ---
  /** Bonus permanents conférés à la créature équipée. */
  equipement?: { atq: number; pv: number; motCle?: Keyword };

  // --- Zones ---
  zone?: ZoneEffect;
}

/** Effet passif d'une carte Zone posée sur le champ de bataille partagé. */
export interface ZoneEffect {
  /** Les créatures de cet élément reçoivent le bonus. */
  element: Element;
  atq: number;
  pv: number;
  texte: string;
}

/** Terrain personnel choisi avec le deck, actif toute la partie. */
export interface TerrainDef {
  id: string;
  nom: string;
  element: Element;
  /** Description du bonus passif permanent. */
  passifTexte: string;
  passif: { element: Element; atq: number; pv: number };
  /** Pouvoir activable, une fois par tour, contre des cristaux. */
  pouvoirNom: string;
  pouvoirTexte: string;
  pouvoirCout: number;
  pouvoirTarget: TargetSpec;
  pouvoirEffets: Effect[];
  artSeed: number;
  artPrompt: string;
  silhouette?: Silhouette;
}

/** Instance d'une carte dans une partie (main, deck, défausse). */
export interface CardInstance {
  /** Identifiant unique dans la partie. */
  uid: number;
  defId: string;
}

/** Créature effectivement en jeu, sur une ligne. */
export interface Creature {
  uid: number;
  defId: string;
  proprietaire: 0 | 1;
  ligne: number;
  degats: number;
  status: StatusEffects;
  /** Attaques déjà effectuées durant le tour courant. */
  attaquesFaites: number;
  /** Vrai tant que la créature n'a pas passé un tour complet en jeu. */
  fraichementJouee: boolean;
  /** Mots-clés accordés en cours de partie, en plus de ceux de la définition. */
  motsClesAccordes: Keyword[];
  /** Reliques équipées (ids de définition). */
  reliques: string[];
  /** Jeton sans définition dans la collection. */
  token?: TokenSpec;
  /** Numéro de tour où elle est entrée en jeu, pour l'évolution. */
  tourArrivee: number;
}

export interface PlayerState {
  nom: string;
  pv: number;
  pvMax: number;
  cristaux: number;
  cristauxMax: number;
  main: CardInstance[];
  deck: CardInstance[];
  defausse: CardInstance[];
  /** Trois lignes ; `null` = ligne vide. */
  lignes: (Creature | null)[];
  terrainId: string;
  pouvoirUtilise: boolean;
  /** Cartes brûlées par un deck vide (dégâts de fatigue croissants). */
  fatigue: number;
}

export type Phase = 'mulligan' | 'jeu' | 'termine';

export interface GameState {
  joueurs: [PlayerState, PlayerState];
  actif: 0 | 1;
  tour: number;
  phase: Phase;
  vainqueur: 0 | 1 | null;
  /** Zone partagée active, posée par une carte Zone. */
  zoneActive: { defId: string; pose: 0 | 1 } | null;
  /** Compteur servant à attribuer les `uid`. */
  prochainUid: number;
  /** Graine du générateur pseudo-aléatoire (reproductibilité et rejouabilité). */
  seed: number;
  journal: GameEvent[];
}

/** Événement émis par le moteur ; l'interface les rejoue en animations. */
export type GameEvent =
  | { t: 'debut-tour'; joueur: 0 | 1; tour: number }
  | { t: 'pioche'; joueur: 0 | 1; uid: number; defId: string }
  | { t: 'fatigue'; joueur: 0 | 1; degats: number }
  | { t: 'carte-jouee'; joueur: 0 | 1; defId: string; ligne?: number }
  | { t: 'invocation'; uid: number; defId: string; joueur: 0 | 1; ligne: number }
  | { t: 'evolution'; uid: number; de: string; vers: string; ligne: number; joueur: 0 | 1 }
  | { t: 'attaque'; attaquant: number; ligne: number; cible: number | 'joueur' }
  | { t: 'degats'; cibleUid: number | null; joueur: 0 | 1 | null; valeur: number; faiblesse: boolean; resistance: boolean }
  | { t: 'soin'; cibleUid: number | null; joueur: 0 | 1 | null; valeur: number }
  | { t: 'mort'; uid: number; defId: string; joueur: 0 | 1; ligne: number }
  | { t: 'buff'; cibleUid: number; atq: number; pv: number }
  | { t: 'statut'; cibleUid: number; texte: string }
  | { t: 'zone-posee'; defId: string; joueur: 0 | 1 }
  | { t: 'pouvoir-terrain'; joueur: 0 | 1; terrainId: string }
  | { t: 'fin-partie'; vainqueur: 0 | 1 };
