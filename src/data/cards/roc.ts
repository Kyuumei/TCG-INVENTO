/**
 * ROC — ce qui ne bouge pas.
 *
 * Identité : défense et inévitabilité. Beaucoup de points de vie, de la Garde,
 * de l'Ancrage, des boucliers, et des menaces lentes mais impossibles à retirer
 * du plateau. Faible à la Sylve, résiste à la Foudre.
 */
import type { CardDef } from '../../engine/types';
import { cap, creature, jeton, relique, sort, zone } from '../dsl';

export const ROC: CardDef[] = [
  // --- Lignée du Monolithe -------------------------------------------------
  creature({
    id: 'roc-caillouti', nom: 'Caillouti',
    el: 'roc', cout: 1, atq: 1, pv: 4, stade: 1, lignee: 'monolithe', sil: 'amorphe',
    mc: ['garde'],
    art: "un petit galet vivant aux yeux ronds et à la bouche fendue, mousse sur le dessus, éboulis de montagne",
  }),
  creature({
    id: 'roc-rocaillon', nom: 'Rocaillon',
    el: 'roc', cout: 3, atq: 3, pv: 6, rar: 'peu-commune', stade: 2, lignee: 'monolithe', de: 'roc-caillouti', sil: 'humanoide',
    mc: ['garde'],
    art: "un golem de pierre trapu aux poings démesurés, veines de quartz dans le granit, carrière abandonnée",
  }),
  creature({
    id: 'roc-colossite', nom: 'Colossite',
    el: 'roc', cout: 5, atq: 5, pv: 10, rar: 'epique', stade: 3, lignee: 'monolithe', de: 'roc-rocaillon', sil: 'colosse',
    mc: ['garde', 'ancrage'],
    cit: "On ne le contourne pas. On négocie.",
    art: "un monolithe vivant de dix mètres, blocs de granit assemblés par une lumière dorée, vallée en contrebas",
  }),

  // --- Lignée du fer -------------------------------------------------------
  creature({
    id: 'roc-ferrail', nom: 'Ferrail',
    el: 'roc', cout: 2, atq: 2, pv: 4, stade: 1, lignee: 'fer', sil: 'humanoide',
    cap: [cap('cri-de-guerre', "Cri de guerre : gagne un Bouclier 2.", [{ kind: 'bouclier', cible: 'soi', valeur: 2 }])],
    art: "un automate rudimentaire de fer rouillé aux rivets apparents, vapeur s'échappant des jointures",
  }),
  creature({
    id: 'roc-acierin', nom: 'Aciérin',
    el: 'roc', cout: 4, atq: 4, pv: 6, rar: 'peu-commune', stade: 2, lignee: 'fer', de: 'roc-ferrail', sil: 'humanoide',
    mc: ['garde'],
    cap: [cap('sur-evolution', "Évolution : gagne un Bouclier 3.", [{ kind: 'bouclier', cible: 'soi', valeur: 3 }])],
    art: "un chevalier d'acier poli sans visage, plaques articulées, halo froid de forge",
  }),
  creature({
    id: 'roc-titanferre', nom: 'Titanferré',
    el: 'roc', cout: 6, atq: 7, pv: 9, rar: 'rare', stade: 3, lignee: 'fer', de: 'roc-acierin', sil: 'colosse',
    mc: ['garde', 'percee'],
    art: "un titan d'acier noir et de laiton haut comme une tour, poing serré, forteresse en ruine derrière lui",
  }),

  // --- Lignée de l'éboulis -------------------------------------------------
  creature({
    id: 'roc-gravillon', nom: 'Gravillon',
    el: 'roc', cout: 2, atq: 3, pv: 2, stade: 1, lignee: 'eboulis', sil: 'amorphe',
    cap: [cap('dernier-souffle', "Dernier souffle : inflige 2 dégâts à la créature en face.", [{ kind: 'degats', cible: 'ligne-en-face', valeur: 2 }])],
    art: "un amas de gravier en mouvement formant une silhouette instable, cailloux tombant en continu",
  }),
  creature({
    id: 'roc-eboulith', nom: 'Éboulith',
    el: 'roc', cout: 4, atq: 5, pv: 5, rar: 'rare', stade: 2, lignee: 'eboulis', de: 'roc-gravillon', sil: 'colosse',
    cap: [cap('dernier-souffle', "Dernier souffle : inflige 3 dégâts à toutes les créatures ennemies.", [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 3 }])],
    art: "une avalanche de rochers ayant pris forme humanoïde, poussière et fracas, versant de montagne",
  }),

  // --- Créatures autonomes -------------------------------------------------
  creature({
    id: 'roc-tatou-basalte', nom: 'Tatou de Basalte',
    el: 'roc', cout: 3, atq: 2, pv: 6, mc: ['garde'], sil: 'quadrupede',
    art: "un tatou géant à la carapace de basalte hexagonal, enroulé en boule défensive, désert de lave refroidie",
  }),
  creature({
    id: 'roc-gardien-obsidienne', nom: "Gardien d'Obsidienne",
    el: 'roc', cout: 5, atq: 4, pv: 8, rar: 'peu-commune', mc: ['garde'], sil: 'humanoide',
    cap: [cap('eveil', "Éveil : donne +0/+1 à toutes vos créatures.", [{ kind: 'buff', cible: 'creatures-alliees', atq: 0, pv: 1 }])],
    art: "une statue-gardienne de verre volcanique noir aux arêtes tranchantes, reflets rouges, temple souterrain",
  }),
  creature({
    id: 'roc-scarabee-fer', nom: 'Scarabée de Fer',
    el: 'roc', cout: 2, atq: 1, pv: 5, sil: 'insecte',
    cap: [cap('crepuscule', "Crépuscule : soigne 1 PV à toutes vos créatures.", [{ kind: 'soin', cible: 'creatures-alliees', valeur: 1 }])],
    art: "un scarabée à carapace de fer bruni aux reflets bleus, pattes crochues sur une paroi de mine",
  }),
  creature({
    id: 'roc-taupe', nom: 'Taupe des Mines',
    el: 'roc', cout: 3, atq: 4, pv: 3, sil: 'quadrupede',
    cap: [cap('cri-de-guerre', "Cri de guerre : pioche une carte.", [{ kind: 'piocher', valeur: 1 }])],
    art: "une taupe massive aux griffes de diamant émergeant de la roche, galerie éclairée à la lampe",
  }),
  creature({
    id: 'roc-colosse-oublie', nom: 'Colosse Oublié',
    el: 'roc', cout: 7, atq: 6, pv: 12, rar: 'rare', mc: ['garde', 'ancrage'], sil: 'colosse',
    art: "une statue colossale à demi ensevelie s'éveillant dans le désert, sable coulant de ses épaules",
  }),
  creature({
    id: 'roc-terramont', nom: 'Terramont',
    el: 'roc', cout: 7, atq: 7, pv: 11, rar: 'legendaire', mc: ['garde', 'ancrage', 'percee'], sil: 'colosse',
    cap: [cap('cri-de-guerre', "Cri de guerre : donne un Bouclier 3 à toutes vos créatures.", [{ kind: 'bouclier', cible: 'creatures-alliees', valeur: 3 }])],
    cit: "Les cartes le dessinent comme une montagne. Les cartes ont tort.",
    art: "une montagne entière dressée sur deux jambes de roche, cascades tombant de ses flancs, nuages à mi-hauteur",
  }),

  // --- Sorts ---------------------------------------------------------------
  sort({
    id: 'roc-mur-pierre', nom: 'Mur de Pierre',
    el: 'roc', cout: 2, texte: "Invoque deux Menhirs 0/4 avec Garde.",
    effets: [{ kind: 'invoquer', jeton: jeton('Menhir', 'roc', 0, 4, ['garde', 'ancrage']), nombre: 2 }],
    art: "deux menhirs se dressant du sol dans un fracas de terre, alignement mégalithique dans la brume",
  }),
  sort({
    id: 'roc-seisme', nom: 'Séisme',
    el: 'roc', cout: 5, rar: 'peu-commune', texte: "Inflige 5 dégâts à toutes les créatures ennemies.",
    effets: [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 5 }],
    art: "une faille béante déchirant le sol d'une cité, bâtiments basculant, poussière et gravats",
  }),
  sort({
    id: 'roc-peau-granit', nom: 'Peau de Granit',
    el: 'roc', cout: 2, texte: "Donne +0/+4 et Garde à une créature alliée.",
    target: 'creature-alliee',
    effets: [{ kind: 'buff', cible: 'cible', atq: 0, pv: 4 }, { kind: 'accorder-mot-cle', cible: 'cible', motCle: 'garde' }],
    art: "une peau humaine se couvrant de plaques de granit gris, mains levées en protection",
  }),
  sort({
    id: 'roc-avalanche', nom: 'Avalanche',
    el: 'roc', cout: 4, texte: "Inflige 6 dégâts à une créature ennemie et gèle les autres 1 tour.",
    target: 'creature-ennemie',
    effets: [{ kind: 'degats', cible: 'cible', valeur: 6 }, { kind: 'gel', cible: 'creatures-ennemies', tours: 1 }],
    art: "un pan entier de montagne dévalant une pente enneigée, nuage de poudreuse",
  }),
  sort({
    id: 'roc-veine-mere', nom: 'Veine-Mère',
    el: 'roc', cout: 3, rar: 'epique', texte: "Donne +1/+3 à vos créatures et un Bouclier 2.",
    effets: [{ kind: 'buff', cible: 'creatures-alliees', atq: 1, pv: 3 }, { kind: 'bouclier', cible: 'creatures-alliees', valeur: 2 }],
    art: "une veine de minerai doré courant dans une paroi de roche noire, lumière chaude émanant de la pierre",
  }),

  // --- Reliques ------------------------------------------------------------
  relique({
    id: 'roc-bouclier-tectite', nom: 'Bouclier de Tectite',
    el: 'roc', cout: 2, atq: 0, pv: 4, motCle: 'garde',
    art: "un large bouclier rond taillé dans une pierre de météorite verte, bosselures et éclats",
  }),
  relique({
    id: 'roc-gantelets', nom: "Gantelets d'Airain",
    el: 'roc', cout: 3, atq: 3, pv: 2, motCle: 'percee', rar: 'rare',
    art: "une paire de gantelets massifs en airain gravé posés sur une enclume, patine sombre",
  }),

  // --- Zone ----------------------------------------------------------------
  zone({
    id: 'roc-faille', nom: 'Faille Titanesque',
    el: 'roc', cout: 4, atq: 0, pv: 3,
    cit: "La terre a une mémoire, et elle est rancunière.",
    art: "un canyon vertigineux fendu par une faille récente, strates de roche colorées, brume au fond",
  }),
];
