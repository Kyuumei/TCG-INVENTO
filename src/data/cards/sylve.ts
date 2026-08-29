/**
 * SYLVE — la forêt patiente.
 *
 * Identité : fragiles isolées, ingérables en groupe. La Sylve régénère, gagne
 * des bonus par symbiose et sature le plateau de jetons. Faible à la Flamme,
 * résiste au Roc.
 */
import type { CardDef } from '../../engine/types';
import { cap, creature, jeton, relique, sort, zone } from '../dsl';

export const SYLVE: CardDef[] = [
  // --- Lignée du Ronce-Roi -------------------------------------------------
  creature({
    id: 'syl-poussevrille', nom: 'Poussevrille',
    el: 'sylve', cout: 1, atq: 1, pv: 3, stade: 1, lignee: 'ronce-roi', sil: 'insecte',
    cap: [cap('crepuscule', "Crépuscule : soigne 1 PV à cette créature.", [{ kind: 'soin', cible: 'soi', valeur: 1 }])],
    cit: "Elle ne grandit pas. Elle s'installe.",
    art: "une minuscule chenille de mousse vert tendre lovée sur une fougère humide, gouttes de rosée, lumière matinale filtrée",
  }),
  creature({
    id: 'syl-roncefeuille', nom: 'Roncefeuille',
    el: 'sylve', cout: 3, atq: 3, pv: 5, rar: 'peu-commune', stade: 2, lignee: 'ronce-roi', de: 'syl-poussevrille', sil: 'quadrupede',
    mc: ['garde'],
    cap: [cap('sur-evolution', "Évolution : gagne Régénération 1.", [{ kind: 'regeneration', cible: 'soi', valeur: 1 }])],
    art: "une bête à quatre pattes tressée de ronces épaisses et de feuilles sombres, épines luisantes, sous-bois brumeux",
  }),
  creature({
    id: 'syl-sylvarque', nom: 'Sylvarque',
    el: 'sylve', cout: 5, atq: 6, pv: 8, rar: 'epique', stade: 3, lignee: 'ronce-roi', de: 'syl-roncefeuille', sil: 'colosse',
    mc: ['garde'],
    cap: [cap('sur-evolution', "Évolution : les autres créatures alliées gagnent +1/+1.", [{ kind: 'buff', cible: 'autres-creatures-alliees', atq: 1, pv: 1 }])],
    cit: "Les rois passent. La forêt reste.",
    art: "un colosse d'écorce ancienne et de racines nouées, mousse et champignons sur ses épaules, canopée cathédrale derrière lui",
  }),

  // --- Lignée fongique -----------------------------------------------------
  creature({
    id: 'syl-champiluce', nom: 'Champiluce',
    el: 'sylve', cout: 1, atq: 1, pv: 2, stade: 1, lignee: 'fongique', sil: 'flore',
    cap: [cap('dernier-souffle', "Dernier souffle : pioche une carte.", [{ kind: 'piocher', valeur: 1 }])],
    art: "un petit champignon bioluminescent cyan sur pattes fines, spores flottantes, grotte forestière obscure",
  }),
  creature({
    id: 'syl-sporeveille', nom: 'Sporeveille',
    el: 'sylve', cout: 2, atq: 2, pv: 4, rar: 'peu-commune', stade: 2, lignee: 'fongique', de: 'syl-champiluce', sil: 'flore',
    cap: [cap('cri-de-guerre', "Cri de guerre : inflige 1 dégât à toutes les créatures ennemies.", [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 1 }])],
    art: "une créature-champignon à chapeau large libérant un nuage de spores dorées, forêt humide, rais de lumière",
  }),
  creature({
    id: 'syl-myceleste', nom: 'Mycéleste',
    el: 'sylve', cout: 4, atq: 4, pv: 7, rar: 'rare', stade: 3, lignee: 'fongique', de: 'syl-sporeveille', sil: 'flore',
    cap: [cap('crepuscule', "Crépuscule : 1 dégât aux créatures ennemies, 1 PV soigné aux alliées.", [
      { kind: 'degats', cible: 'creatures-ennemies', valeur: 1 },
      { kind: 'soin', cible: 'creatures-alliees', valeur: 1 },
    ])],
    cit: "Le réseau sait avant vous ce que vous allez faire.",
    art: "un immense champignon céleste aux lamelles violettes et or, filaments lumineux courant sur le sol, nuit étoilée",
  }),

  // --- Lignée des lianes ---------------------------------------------------
  creature({
    id: 'syl-lianeau', nom: 'Lianeau',
    el: 'sylve', cout: 2, atq: 2, pv: 3, stade: 1, lignee: 'liane', sil: 'serpent',
    cap: [cap('cri-de-guerre', "Cri de guerre : gèle une créature ennemie pour 1 tour.", [{ kind: 'gel', cible: 'cible', tours: 1 }], { target: 'creature-ennemie' })],
    art: "un serpent végétal fait de lianes tressées et de vrilles vertes, yeux de sève ambrée, jungle dense",
  }),
  creature({
    id: 'syl-etreignelle', nom: 'Étreignelle',
    el: 'sylve', cout: 4, atq: 4, pv: 6, rar: 'rare', stade: 2, lignee: 'liane', de: 'syl-lianeau', sil: 'serpent',
    cap: [cap('sur-attaque', "Après avoir attaqué : gèle la créature en face pour 1 tour.", [{ kind: 'gel', cible: 'ligne-en-face', tours: 1 }])],
    art: "un python de lianes massives enserrant une colonne de pierre moussue, fleurs carnivores écloses le long du corps",
  }),

  // --- Créatures autonomes -------------------------------------------------
  creature({
    id: 'syl-cerf-ecorce', nom: "Cerf d'Écorce",
    el: 'sylve', cout: 3, atq: 3, pv: 4, rar: 'peu-commune', sil: 'quadrupede',
    cap: [cap('eveil', "Éveil : soigne 1 PV à toutes vos créatures.", [{ kind: 'soin', cible: 'creatures-alliees', valeur: 1 }])],
    art: "un grand cerf dont les bois sont des branches en fleurs, pelage d'écorce claire, clairière au petit matin",
  }),
  creature({
    id: 'syl-colibruine', nom: 'Colibruine',
    el: 'sylve', cout: 2, atq: 2, pv: 2, mc: ['vol'], sil: 'oiseau',
    art: "un colibri émeraude scintillant figé en vol devant une fleur géante, ailes floutées par la vitesse, bruine irisée",
  }),
  creature({
    id: 'syl-mantivigne', nom: 'Mantivigne',
    el: 'sylve', cout: 4, atq: 5, pv: 3, rar: 'peu-commune', sil: 'insecte',
    cap: [cap('cri-de-guerre', "Cri de guerre : +2/+0 si vous contrôlez une autre créature Sylve.", [{ kind: 'buff', cible: 'soi', atq: 2, pv: 0 }], { cond: { type: 'allie-du-meme-element', min: 1 } })],
    art: "une mante religieuse de la taille d'un homme, corps de vigne et de feuilles, pattes ravisseuses en épines, vignoble sauvage",
  }),
  creature({
    id: 'syl-oursequoia', nom: 'Ourséquoia',
    el: 'sylve', cout: 6, atq: 6, pv: 9, rar: 'rare', mc: ['garde'], sil: 'colosse',
    cap: [cap('sur-degats', "Après avoir subi des dégâts : soigne 2 PV.", [{ kind: 'soin', cible: 'soi', valeur: 2 }])],
    art: "un ours titanesque au dos couvert de séquoias vivants, brume de montagne, échelle vertigineuse",
  }),
  creature({
    id: 'syl-gardien-souches', nom: 'Gardien des Souches',
    el: 'sylve', cout: 3, atq: 2, pv: 5, sil: 'humanoide',
    cap: [cap('dernier-souffle', "Dernier souffle : invoque deux Pousses 1/1.", [{ kind: 'invoquer', jeton: jeton('Pousse', 'sylve', 1, 1), nombre: 2 }])],
    art: "un gardien trapu taillé dans une souche creuse, yeux de lucioles, entouré de jeunes pousses",
  }),
  creature({
    id: 'syl-yggravent', nom: 'Yggravent',
    el: 'sylve', cout: 7, atq: 6, pv: 10, rar: 'legendaire', mc: ['garde', 'ancrage'], sil: 'colosse',
    cap: [
      cap('cri-de-guerre', "Cri de guerre : donne Régénération 2 à toutes vos créatures.", [{ kind: 'regeneration', cible: 'creatures-alliees', valeur: 2 }]),
      cap('eveil', "Éveil : invoque une Pousse 1/1.", [{ kind: 'invoquer', jeton: jeton('Pousse', 'sylve', 1, 1), nombre: 1 }]),
    ],
    cit: "Il était là avant le premier nom. Il entendra le dernier.",
    art: "un arbre-monde colossal aux racines suspendues dans le vide, feuillage doré traversé de vent, nuages sous ses branches",
  }),

  // --- Sorts ---------------------------------------------------------------
  sort({
    id: 'syl-croissance', nom: 'Croissance Sauvage',
    el: 'sylve', cout: 2, texte: "Donne +2/+3 à une créature alliée.",
    target: 'creature-alliee', effets: [{ kind: 'buff', cible: 'cible', atq: 2, pv: 3 }],
    art: "un jet de lianes et de fleurs jaillissant du sol en spirale lumineuse, énergie verte",
  }),
  sort({
    id: 'syl-spores', nom: 'Pluie de Spores',
    el: 'sylve', cout: 3, rar: 'peu-commune', texte: "Inflige 2 dégâts à toutes les créatures ennemies.",
    effets: [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 2 }],
    art: "un nuage dense de spores dorées balayant un champ de bataille forestier, silhouettes voilées",
  }),
  sort({
    id: 'syl-racines', nom: 'Racines Étrangleuses',
    el: 'sylve', cout: 3, texte: "Gèle une créature ennemie 2 tours et lui inflige Venin 1.",
    target: 'creature-ennemie',
    effets: [{ kind: 'gel', cible: 'cible', tours: 2 }, { kind: 'venin', cible: 'cible', valeur: 1 }],
    art: "des racines noueuses surgissant de la terre pour enserrer une armure, mousse et terre projetée",
  }),
  sort({
    id: 'syl-photosynthese', nom: 'Photosynthèse',
    el: 'sylve', cout: 2, texte: "Pioche une carte et gagne 1 cristal ce tour-ci.",
    effets: [{ kind: 'piocher', valeur: 1 }, { kind: 'cristaux', valeur: 1 }],
    art: "un rayon de soleil perçant la canopée et frappant une feuille translucide, nervures incandescentes",
  }),
  sort({
    id: 'syl-eveil-foret', nom: 'Éveil de la Forêt',
    el: 'sylve', cout: 5, rar: 'epique', texte: "Invoque trois Pousses 1/1, puis donne +1/+1 à vos créatures.",
    effets: [
      { kind: 'invoquer', jeton: jeton('Pousse', 'sylve', 1, 1), nombre: 3 },
      { kind: 'buff', cible: 'creatures-alliees', atq: 1, pv: 1 },
    ],
    cit: "Ils croyaient marcher sur un sol. C'était un dos.",
    art: "une forêt entière se dressant sur ses racines dans la brume, dizaines de silhouettes d'arbres en marche",
  }),

  // --- Reliques ------------------------------------------------------------
  relique({
    id: 'syl-amulette-seve', nom: 'Amulette de Sève',
    el: 'sylve', cout: 2, atq: 1, pv: 3,
    texte: "La créature équipée gagne Régénération 1.",
    effets: [{ kind: 'regeneration', cible: 'cible', valeur: 1 }],
    art: "une amulette d'ambre doré contenant une goutte de sève vivante, cordon de liane tressée, fond sombre",
  }),
  relique({
    id: 'syl-couronne-gui', nom: 'Couronne de Gui',
    el: 'sylve', cout: 3, atq: 2, pv: 2, motCle: 'garde', rar: 'rare',
    art: "une couronne tressée de gui et de baies blanches posée sur une pierre druidique, lumière rasante",
  }),

  // --- Zone ----------------------------------------------------------------
  zone({
    id: 'syl-canopee', nom: 'Canopée Éternelle',
    el: 'sylve', cout: 4, atq: 1, pv: 2,
    cit: "Sous ces branches, le temps oublie de passer.",
    art: "une voûte de canopée infinie vue d'en dessous, colonnes de lumière verte, sol tapissé de fougères",
  }),
];
