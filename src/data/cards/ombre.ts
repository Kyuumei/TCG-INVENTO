/**
 * OMBRE — ce qui prend sans demander.
 *
 * Identité : attrition. L'Ombre draine les points de vie, empoisonne, sacrifie
 * ses propres créatures pour un gain immédiat et détruit ce qu'elle ne peut pas
 * vaincre au combat. Faible à la Marée, résiste à la Flamme.
 */
import type { CardDef } from '../../engine/types';
import { cap, creature, jeton, relique, sort, zone } from '../dsl';

export const OMBRE: CardDef[] = [
  // --- Lignée du Nécrarque ------------------------------------------------
  creature({
    id: 'omb-ombrelin', nom: 'Ombrelin',
    el: 'ombre', cout: 1, atq: 2, pv: 2, stade: 1, lignee: 'necrarque', sil: 'amorphe',
    mc: ['lien-vital'],
    art: "une petite silhouette d'ombre pure aux deux yeux blancs, contours flous et fumeux, coin de mur nocturne",
  }),
  creature({
    id: 'omb-spectrelle', nom: 'Spectrelle',
    el: 'ombre', cout: 3, atq: 3, pv: 4, rar: 'peu-commune', stade: 2, lignee: 'necrarque', de: 'omb-ombrelin', sil: 'humanoide',
    mc: ['lien-vital', 'voile'],
    art: "un spectre féminin en linceul déchiré flottant à un mètre du sol, visage à demi effacé, chandelles éteintes",
  }),
  creature({
    id: 'omb-necrarque', nom: 'Nécrarque',
    el: 'ombre', cout: 5, atq: 6, pv: 6, rar: 'epique', stade: 3, lignee: 'necrarque', de: 'omb-spectrelle', sil: 'humanoide',
    mc: ['lien-vital'],
    cap: [cap('sur-attaque', "Après avoir attaqué : inflige 1 dégât au joueur adverse et vous soigne de 1 PV.", [
      { kind: 'degats', cible: 'joueur-ennemi', valeur: 1 },
      { kind: 'soin', cible: 'joueur-allie', valeur: 1 },
    ])],
    cit: "Il ne tue pas. Il redistribue.",
    art: "un archiliche couronné en robe noire brodée d'or terni, main tendue drainant une lumière vitale, crypte immense",
  }),

  // --- Lignée vampirique ---------------------------------------------------
  creature({
    id: 'omb-chauvenuit', nom: 'Chauvenuit',
    el: 'ombre', cout: 2, atq: 2, pv: 2, stade: 1, lignee: 'vampire', sil: 'oiseau',
    mc: ['vol'],
    art: "une chauve-souris noire aux ailes membraneuses tendues devant une pleine lune, silhouette en contre-jour",
  }),
  creature({
    id: 'omb-vampyrelle', nom: 'Vampyrelle',
    el: 'ombre', cout: 3, atq: 3, pv: 3, rar: 'peu-commune', stade: 2, lignee: 'vampire', de: 'omb-chauvenuit', sil: 'humanoide',
    mc: ['vol', 'lien-vital'],
    art: "une vampire ailée en robe pourpre planant au-dessus de toits d'ardoise, brume et lune froide",
  }),
  creature({
    id: 'omb-nosferane', nom: 'Nosferane',
    el: 'ombre', cout: 5, atq: 5, pv: 6, rar: 'rare', stade: 3, lignee: 'vampire', de: 'omb-vampyrelle', sil: 'humanoide',
    mc: ['vol', 'lien-vital'],
    cap: [cap('sur-evolution', "Évolution : gagne +1/+1 pour chaque créature ennemie en jeu.", [{ kind: 'buff', cible: 'soi', atq: 1, pv: 1 }])],
    art: "un seigneur vampire aux ailes de cuir immenses perché sur une gargouille, cape déployée, ville endormie",
  }),

  // --- Lignée des murmures -------------------------------------------------
  creature({
    id: 'omb-murmurien', nom: 'Murmurien',
    el: 'ombre', cout: 2, atq: 1, pv: 3, stade: 1, lignee: 'murmure', sil: 'amorphe',
    cap: [cap('cri-de-guerre', "Cri de guerre : donne Venin 1 à une créature ennemie.", [{ kind: 'venin', cible: 'cible', valeur: 1 }], { target: 'creature-ennemie' })],
    art: "une nuée de fumée noire d'où émergent des bouches entrouvertes, murmures visibles en volutes",
  }),
  creature({
    id: 'omb-cauchemarin', nom: 'Cauchemarin',
    el: 'ombre', cout: 4, atq: 4, pv: 5, rar: 'rare', stade: 2, lignee: 'murmure', de: 'omb-murmurien', sil: 'quadrupede',
    cap: [cap('crepuscule', "Crépuscule : donne Venin 1 à toutes les créatures ennemies.", [{ kind: 'venin', cible: 'creatures-ennemies', valeur: 1 }])],
    art: "un cheval noir aux yeux vides et à la crinière de fumée, sabots laissant des empreintes d'ombre, lande nocturne",
  }),

  // --- Créatures autonomes -------------------------------------------------
  creature({
    id: 'omb-corbeau', nom: 'Corbeau Funèbre',
    el: 'ombre', cout: 2, atq: 2, pv: 2, mc: ['vol'], sil: 'oiseau',
    cap: [cap('dernier-souffle', "Dernier souffle : inflige 2 dégâts à une créature ennemie au hasard.", [{ kind: 'degats', cible: 'creature-ennemie-aleatoire', valeur: 2 }])],
    art: "un corbeau noir luisant posé sur un crâne, œil rouge, brouillard de cimetière",
  }),
  creature({
    id: 'omb-faucheur', nom: 'Faucheur Voilé',
    el: 'ombre', cout: 6, atq: 5, pv: 6, rar: 'rare', mc: ['voile'], sil: 'humanoide',
    cap: [cap('cri-de-guerre', "Cri de guerre : détruit la créature ennemie la plus faible.", [{ kind: 'detruire', cible: 'creature-ennemie-la-plus-faible' }])],
    art: "une faucheuse encapuchonnée dont le visage reste vide, faux d'obsidienne, brume rampante au sol",
  }),
  creature({
    id: 'omb-chat-suie', nom: 'Chat de Suie',
    el: 'ombre', cout: 1, atq: 1, pv: 2, mc: ['voile'], sil: 'quadrupede',
    art: "un chat entièrement noir aux yeux d'ambre assis sur un rebord de fenêtre, nuit pluvieuse derrière la vitre",
  }),
  creature({
    id: 'omb-poupee', nom: 'Poupée Maudite',
    el: 'ombre', cout: 3, atq: 3, pv: 3, rar: 'peu-commune', sil: 'humanoide',
    cap: [cap('dernier-souffle', "Dernier souffle : inflige 3 dégâts au joueur adverse.", [{ kind: 'degats', cible: 'joueur-ennemi', valeur: 3 }])],
    art: "une poupée de porcelaine fissurée aux yeux noirs assise dans un grenier poussiéreux, fil rouge autour du cou",
  }),
  creature({
    id: 'omb-goule', nom: 'Goule des Charniers',
    el: 'ombre', cout: 4, atq: 5, pv: 3, rar: 'peu-commune', sil: 'humanoide',
    cap: [cap('cri-de-guerre', "Cri de guerre : gagne +2/+2 si vous contrôlez une autre créature.", [
      { kind: 'buff', cible: 'soi', atq: 2, pv: 2 },
    ], { cond: { type: 'creatures-alliees', min: 2 } })],
    art: "une goule décharnée aux longs bras accroupie sur un tas d'ossements, peau grise tendue, torches lointaines",
  }),
  creature({
    id: 'omb-nyxaroth', nom: 'Nyxaroth',
    el: 'ombre', cout: 7, atq: 7, pv: 8, rar: 'legendaire', mc: ['vol', 'lien-vital', 'voile'], sil: 'colosse',
    cap: [cap('cri-de-guerre', "Cri de guerre : inflige 3 dégâts à toutes les créatures ennemies et vous soigne d'autant.", [
      { kind: 'degats', cible: 'creatures-ennemies', valeur: 3 },
      { kind: 'soin', cible: 'joueur-allie', valeur: 3 },
    ])],
    cit: "La nuit n'est pas l'absence du jour. C'est son propriétaire.",
    art: "un dragon d'ombre pure aux ailes constellées d'étoiles mortes, corps absorbant la lumière, éclipse totale derrière lui",
  }),

  // --- Sorts ---------------------------------------------------------------
  sort({
    id: 'omb-drain', nom: 'Drain de Vie',
    el: 'ombre', cout: 2, texte: "Inflige 3 dégâts à une créature ennemie et vous soigne de 3 PV.",
    target: 'creature-ennemie',
    effets: [{ kind: 'degats', cible: 'cible', valeur: 3 }, { kind: 'soin', cible: 'joueur-allie', valeur: 3 }],
    art: "un filament de lumière rouge quittant un corps pour rejoindre une main gantée, obscurité totale",
  }),
  sort({
    id: 'omb-malediction', nom: 'Malédiction',
    el: 'ombre', cout: 3, rar: 'peu-commune', texte: "Détruit une créature ennemie dont l'attaque est la plus faible.",
    effets: [{ kind: 'detruire', cible: 'creature-ennemie-la-plus-faible' }],
    art: "un sceau runique noir s'allumant sous les pieds d'une silhouette, fissures de lumière violette",
  }),
  sort({
    id: 'omb-voile-nocturne', nom: 'Voile Nocturne',
    el: 'ombre', cout: 2, texte: "Donne Voile et +1/+1 à toutes vos créatures.",
    effets: [
      { kind: 'accorder-mot-cle', cible: 'creatures-alliees', motCle: 'voile' },
      { kind: 'buff', cible: 'creatures-alliees', atq: 1, pv: 1 },
    ],
    art: "un voile de nuit tombant sur une armée en marche, silhouettes effacées une à une",
  }),
  sort({
    id: 'omb-peste', nom: 'Peste Rampante',
    el: 'ombre', cout: 3, texte: "Donne Venin 2 à toutes les créatures ennemies.",
    effets: [{ kind: 'venin', cible: 'creatures-ennemies', valeur: 2 }],
    art: "une brume verdâtre rampant au ras du sol entre des colonnes, rats fuyant devant elle",
  }),
  sort({
    id: 'omb-sacrifice', nom: 'Sacrifice Impie',
    el: 'ombre', cout: 4, rar: 'epique', texte: "Invoque deux Âmes 3/2 avec Lien vital et pioche une carte.",
    effets: [
      { kind: 'invoquer', jeton: jeton('Âme', 'ombre', 3, 2, ['lien-vital']), nombre: 2 },
      { kind: 'piocher', valeur: 1 },
    ],
    art: "un cercle rituel de bougies noires d'où s'élèvent deux silhouettes lumineuses pâles",
  }),

  // --- Reliques ------------------------------------------------------------
  relique({
    id: 'omb-dague', nom: 'Dague Empoisonnée',
    el: 'ombre', cout: 2, atq: 2, pv: 0,
    texte: "La créature équipée gagne Lien vital.",
    effets: [{ kind: 'accorder-mot-cle', cible: 'cible', motCle: 'lien-vital' }],
    art: "une dague fine à la lame verdâtre suintante, poignée d'os noir, fiole brisée à côté",
  }),
  relique({
    id: 'omb-masque', nom: 'Masque des Murmures',
    el: 'ombre', cout: 3, atq: 2, pv: 2, motCle: 'voile', rar: 'rare',
    art: "un masque de céramique blanche sans bouche posé sur un tissu noir, fissure fine sur la joue",
  }),

  // --- Zone ----------------------------------------------------------------
  zone({
    id: 'omb-crepuscule', nom: 'Crépuscule Perpétuel',
    el: 'ombre', cout: 4, atq: 2, pv: 1,
    cit: "Le soleil s'est couché il y a onze ans.",
    art: "une plaine sous un ciel de crépuscule permanent, soleil noir bas sur l'horizon, longues ombres",
  }),
];
