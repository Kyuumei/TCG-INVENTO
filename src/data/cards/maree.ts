/**
 * MARÉE — la patience qui use.
 *
 * Identité : contrôle. La Marée gèle, renvoie en main, protège par des
 * boucliers et pioche. Elle ne cherche pas à gagner vite, elle cherche à ce que
 * l'adversaire ne puisse plus jouer. Faible à la Foudre, résiste à l'Ombre.
 */
import type { CardDef } from '../../engine/types';
import { cap, creature, relique, sort, zone } from '../dsl';

export const MAREE: CardDef[] = [
  // --- Lignée abyssale -----------------------------------------------------
  creature({
    id: 'mar-goutterin', nom: 'Goutterin',
    el: 'maree', cout: 1, atq: 1, pv: 3, stade: 1, lignee: 'abyssale', sil: 'amorphe',
    cap: [cap('cri-de-guerre', "Cri de guerre : gagne un Bouclier 2.", [{ kind: 'bouclier', cible: 'soi', valeur: 2 }])],
    art: "une petite créature d'eau vive parfaitement sphérique aux yeux sombres, reflets de lumière dans le liquide",
  }),
  creature({
    id: 'mar-ondulin', nom: 'Ondulin',
    el: 'maree', cout: 3, atq: 3, pv: 5, rar: 'peu-commune', stade: 2, lignee: 'abyssale', de: 'mar-goutterin', sil: 'amorphe',
    cap: [cap('sur-evolution', "Évolution : gèle une créature ennemie pour 1 tour.", [{ kind: 'gel', cible: 'creature-ennemie-la-plus-forte', tours: 1 }])],
    art: "un élémentaire d'eau en forme de vague dressée, écume à la crête, embruns figés en gouttes",
  }),
  creature({
    id: 'mar-abyssalor', nom: 'Abyssalor',
    el: 'maree', cout: 5, atq: 5, pv: 9, rar: 'epique', stade: 3, lignee: 'abyssale', de: 'mar-ondulin', sil: 'amorphe',
    mc: ['garde'],
    cap: [cap('eveil', "Éveil : donne un Bouclier 2 à toutes vos créatures.", [{ kind: 'bouclier', cible: 'creatures-alliees', valeur: 2 }])],
    cit: "À cette profondeur, la lumière renonce.",
    art: "une masse d'eau noire des abysses formant un torse et deux bras immenses, lueurs bioluminescentes en suspension",
  }),

  // --- Lignée du givre -----------------------------------------------------
  creature({
    id: 'mar-givrelet', nom: 'Givrelet',
    el: 'maree', cout: 1, atq: 1, pv: 2, stade: 1, lignee: 'givre', sil: 'humanoide',
    cap: [cap('cri-de-guerre', "Cri de guerre : gèle une créature ennemie pour 1 tour.", [{ kind: 'gel', cible: 'cible', tours: 1 }], { target: 'creature-ennemie' })],
    art: "un lutin de givre bleu pâle aux doigts de glace, haleine visible, sol gelé craquelé",
  }),
  creature({
    id: 'mar-cristalline', nom: 'Cristalline',
    el: 'maree', cout: 3, atq: 2, pv: 6, rar: 'peu-commune', stade: 2, lignee: 'givre', de: 'mar-givrelet', sil: 'humanoide',
    mc: ['garde'],
    art: "une figure féminine entièrement sculptée dans la glace claire, réfractions arc-en-ciel, caverne glaciaire",
  }),
  creature({
    id: 'mar-banquisard', nom: 'Banquisard',
    el: 'maree', cout: 4, atq: 4, pv: 8, rar: 'rare', stade: 3, lignee: 'givre', de: 'mar-cristalline', sil: 'colosse',
    mc: ['garde'],
    cap: [cap('sur-degats', "Après avoir subi des dégâts : gèle son attaquant pour 1 tour.", [{ kind: 'gel', cible: 'ligne-en-face', tours: 1 }])],
    art: "un géant de banquise couvert de plaques de glace bleue et de neige tassée, tempête polaire",
  }),

  // --- Lignée corallienne --------------------------------------------------
  creature({
    id: 'mar-nautilette', nom: 'Nautilette',
    el: 'maree', cout: 2, atq: 1, pv: 4, stade: 1, lignee: 'corail', sil: 'poisson',
    cap: [cap('crepuscule', "Crépuscule : pioche une carte si vous n'avez plus de cartes en main.", [{ kind: 'piocher', valeur: 1 }], { cond: { type: 'main-vide' } })],
    art: "un nautile nacré à la coquille spiralée irisée, tentacules fins, fond marin turquoise",
  }),
  creature({
    id: 'mar-corallien', nom: 'Corallien',
    el: 'maree', cout: 4, atq: 3, pv: 7, rar: 'rare', stade: 2, lignee: 'corail', de: 'mar-nautilette', sil: 'flore',
    mc: ['garde'],
    cap: [cap('crepuscule', "Crépuscule : soigne 2 PV à votre héros.", [{ kind: 'soin', cible: 'joueur-allie', valeur: 2 }])],
    art: "un gardien de corail rose et blanc aux bras branchus, poissons multicolores tournant autour, récif ensoleillé",
  }),

  // --- Créatures autonomes -------------------------------------------------
  creature({
    id: 'mar-meduse-lune', nom: 'Méduse-Lune',
    el: 'maree', cout: 3, atq: 2, pv: 4, rar: 'peu-commune', mc: ['vol'], sil: 'amorphe',
    cap: [cap('cri-de-guerre', "Cri de guerre : donne Venin 1 à une créature ennemie.", [{ kind: 'venin', cible: 'cible', valeur: 1 }], { target: 'creature-ennemie' })],
    art: "une méduse translucide au dôme lumineux flottant dans une eau noire, longs filaments urticants dérivant",
  }),
  creature({
    id: 'mar-loutre', nom: 'Loutre des Récifs',
    el: 'maree', cout: 2, atq: 2, pv: 3, sil: 'quadrupede',
    cap: [cap('cri-de-guerre', "Cri de guerre : pioche une carte.", [{ kind: 'piocher', valeur: 1 }])],
    art: "une loutre de mer sur le dos tenant un galet poli, eau claire et algues, lumière du matin",
  }),
  creature({
    id: 'mar-kraken', nom: 'Kraken Juvénile',
    el: 'maree', cout: 5, atq: 5, pv: 6, rar: 'rare', sil: 'amorphe',
    cap: [cap('sur-attaque', "Après avoir attaqué : renvoie la créature en face dans la main de son propriétaire.", [{ kind: 'renvoyer-en-main', cible: 'ligne-en-face' }])],
    cit: "Juvénile. Retenez bien ce mot.",
    art: "un jeune kraken violet aux tentacules émergeant de l'écume, œil unique immense, navire minuscule au loin",
  }),
  creature({
    id: 'mar-sirene', nom: 'Sirène des Brumes',
    el: 'maree', cout: 4, atq: 3, pv: 5, rar: 'peu-commune', mc: ['voile'], sil: 'humanoide',
    art: "une sirène aux écailles nacrées assise sur un rocher dans un brouillard épais, chevelure d'algues, phare éteint",
  }),
  creature({
    id: 'mar-tortue-siecles', nom: 'Tortue des Siècles',
    el: 'maree', cout: 6, atq: 4, pv: 10, rar: 'rare', mc: ['garde', 'ancrage'], sil: 'quadrupede',
    cap: [cap('eveil', "Éveil : pioche une carte.", [{ kind: 'piocher', valeur: 1 }])],
    art: "une tortue de mer gigantesque à la carapace couverte de coraux et d'épaves, îlot sur son dos",
  }),
  creature({
    id: 'mar-leviathaal', nom: 'Léviathaal',
    el: 'maree', cout: 7, atq: 7, pv: 8, rar: 'legendaire', sil: 'poisson',
    cap: [cap('cri-de-guerre', "Cri de guerre : gèle toutes les créatures ennemies pour 2 tours.", [{ kind: 'gel', cible: 'creatures-ennemies', tours: 2 }])],
    cit: "La mer ne se soulève pas. Elle se retourne.",
    art: "un léviathan colossal dont le dos brise la surface d'un océan déchaîné, écailles bleu nuit, tempête et éclairs",
  }),

  // --- Sorts ---------------------------------------------------------------
  sort({
    id: 'mar-vague', nom: 'Vague Déferlante',
    el: 'maree', cout: 4, rar: 'peu-commune', texte: "Renvoie toutes les créatures ennemies dans la main de leur propriétaire.",
    effets: [{ kind: 'renvoyer-en-main', cible: 'creatures-ennemies' }],
    art: "une vague monumentale s'abattant sur une côte rocheuse, écume explosive, ciel gris",
  }),
  sort({
    id: 'mar-gel-instantane', nom: 'Gel Instantané',
    el: 'maree', cout: 2, texte: "Gèle une créature ennemie 2 tours et lui inflige 2 dégâts.",
    target: 'creature-ennemie',
    effets: [{ kind: 'gel', cible: 'cible', tours: 2 }, { kind: 'degats', cible: 'cible', valeur: 2 }],
    art: "une créature saisie par le gel en pleine course, cristaux de glace se propageant sur sa peau",
  }),
  sort({
    id: 'mar-courant', nom: 'Courant Purificateur',
    el: 'maree', cout: 3, texte: "Pioche deux cartes.",
    effets: [{ kind: 'piocher', valeur: 2 }],
    art: "un courant d'eau claire traversant une eau trouble, poissons argentés remontant le flux",
  }),
  sort({
    id: 'mar-brume', nom: 'Brume Épaisse',
    el: 'maree', cout: 2, texte: "Donne un Bouclier 3 à toutes vos créatures.",
    effets: [{ kind: 'bouclier', cible: 'creatures-alliees', valeur: 3 }],
    art: "un banc de brume dense engloutissant une flotte de barques, formes à peine devinées",
  }),
  sort({
    id: 'mar-maelstrom', nom: 'Maelström',
    el: 'maree', cout: 5, rar: 'epique', texte: "Inflige 4 dégâts à toutes les créatures ennemies et les gèle 1 tour.",
    effets: [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 4 }, { kind: 'gel', cible: 'creatures-ennemies', tours: 1 }],
    art: "un tourbillon océanique béant aspirant des navires, spirale d'eau noire vue du ciel",
  }),

  // --- Reliques ------------------------------------------------------------
  relique({
    id: 'mar-perle', nom: 'Perle des Profondeurs',
    el: 'maree', cout: 2, atq: 0, pv: 4,
    texte: "La créature équipée gagne un Bouclier 2.",
    effets: [{ kind: 'bouclier', cible: 'cible', valeur: 2 }],
    art: "une perle noire irisée posée dans une huître ouverte au fond de l'océan, halo bleuté",
  }),
  relique({
    id: 'mar-trident', nom: "Trident d'Écume",
    el: 'maree', cout: 3, atq: 2, pv: 2, motCle: 'insaisissable', rar: 'rare',
    art: "un trident d'argent aux pointes d'écume figée, algues enroulées sur la hampe, fond d'eau profonde",
  }),

  // --- Zone ----------------------------------------------------------------
  zone({
    id: 'mar-ocean', nom: 'Océan Sans Fond',
    el: 'maree', cout: 4, atq: 0, pv: 3,
    cit: "Il n'y a pas de fond. Il n'y a que de la patience.",
    art: "une étendue d'océan sombre à perte de vue sous un ciel de plomb, houle lente et menaçante",
  }),
];
