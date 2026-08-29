/**
 * FLAMME — la faim qui court.
 *
 * Identité : agressive et pressée. Beaucoup d'attaque, peu de points de vie,
 * de l'Élan, et des dégâts directs au visage adverse. Elle gagne vite ou pas du
 * tout. Faible à l'Ombre, résiste à la Sylve.
 */
import type { CardDef } from '../../engine/types';
import { cap, creature, jeton, relique, sort, zone } from '../dsl';

export const FLAMME: CardDef[] = [
  // --- Lignée de l'Ignivore ------------------------------------------------
  creature({
    id: 'fla-braisillon', nom: 'Braisillon',
    el: 'flamme', cout: 1, atq: 2, pv: 2, stade: 1, lignee: 'ignivore', sil: 'quadrupede',
    mc: ['elan'],
    cit: "Il ne sait pas s'arrêter. Il ne l'a jamais appris.",
    art: "un renardeau de braise incandescente aux pattes fumantes bondissant sur un sol de cendre, étincelles orange",
  }),
  creature({
    id: 'fla-flambard', nom: 'Flambard',
    el: 'flamme', cout: 3, atq: 4, pv: 3, rar: 'peu-commune', stade: 2, lignee: 'ignivore', de: 'fla-braisillon', sil: 'quadrupede',
    mc: ['elan'],
    cap: [cap('sur-attaque', "Après avoir attaqué : inflige 1 dégât au joueur adverse.", [{ kind: 'degats', cible: 'joueur-ennemi', valeur: 1 }])],
    art: "un grand félin dont la crinière est un brasier vif, crocs de charbon rougeoyant, plaine calcinée au crépuscule",
  }),
  creature({
    id: 'fla-ignivore', nom: 'Ignivore',
    el: 'flamme', cout: 5, atq: 7, pv: 5, rar: 'epique', stade: 3, lignee: 'ignivore', de: 'fla-flambard', sil: 'quadrupede',
    mc: ['elan', 'percee'],
    art: "une bête de feu blanc à quatre pattes, corps de magma fissuré, traînée d'incendie derrière elle, ciel de fumée noire",
  }),

  // --- Lignée du Pyrogarde -------------------------------------------------
  creature({
    id: 'fla-cendrelet', nom: 'Cendrelet',
    el: 'flamme', cout: 1, atq: 1, pv: 3, stade: 1, lignee: 'pyrogarde', sil: 'humanoide',
    art: "un petit golem de cendre grise aux yeux orange, silhouette voûtée, sol de suie fumante",
  }),
  creature({
    id: 'fla-charbrule', nom: 'Charbrûle',
    el: 'flamme', cout: 3, atq: 3, pv: 4, rar: 'peu-commune', stade: 2, lignee: 'pyrogarde', de: 'fla-cendrelet', sil: 'humanoide',
    cap: [cap('sur-degats', "Après avoir subi des dégâts : inflige 1 dégât à la créature en face.", [{ kind: 'degats', cible: 'ligne-en-face', valeur: 1 }])],
    art: "un guerrier de charbon ardent aux fissures incandescentes, armure craquelée par la chaleur, forge en arrière-plan",
  }),
  creature({
    id: 'fla-pyrogarde', nom: 'Pyrogarde',
    el: 'flamme', cout: 5, atq: 5, pv: 7, rar: 'rare', stade: 3, lignee: 'pyrogarde', de: 'fla-charbrule', sil: 'colosse',
    mc: ['garde'],
    cap: [cap('sur-degats', "Après avoir subi des dégâts : inflige 2 dégâts à toutes les créatures ennemies.", [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 2 }])],
    cit: "Frappez-le. Il n'attend que ça.",
    art: "un colosse en armure de fonte rougie tenant un pavois de métal en fusion, coulées de lave à ses pieds",
  }),

  // --- Lignée de la Salamandre ---------------------------------------------
  creature({
    id: 'fla-etincelin', nom: 'Étincelin',
    el: 'flamme', cout: 2, atq: 3, pv: 1, stade: 1, lignee: 'salamandre', sil: 'serpent',
    mc: ['elan'],
    art: "un lézard minuscule fait d'étincelles vives filant sur une roche noire, traînée lumineuse",
  }),
  creature({
    id: 'fla-salamandre', nom: 'Salamandre Ardente',
    el: 'flamme', cout: 4, atq: 5, pv: 4, rar: 'rare', stade: 2, lignee: 'salamandre', de: 'fla-etincelin', sil: 'serpent',
    mc: ['elan'],
    cap: [cap('cri-de-guerre', "Cri de guerre : inflige 2 dégâts à une créature ennemie.", [{ kind: 'degats', cible: 'cible', valeur: 2 }], { target: 'creature-ennemie' })],
    art: "une salamandre écarlate longue de trois mètres, peau vernissée de flammes, gueule ouverte crachant un jet de feu",
  }),

  // --- Créatures autonomes -------------------------------------------------
  creature({
    id: 'fla-phenixel', nom: 'Phénixel',
    el: 'flamme', cout: 4, atq: 4, pv: 3, rar: 'rare', mc: ['vol'], sil: 'oiseau',
    cap: [cap('dernier-souffle', "Dernier souffle : invoque une Cendre 2/2 avec Élan.", [{ kind: 'invoquer', jeton: jeton('Cendre', 'flamme', 2, 2, ['elan']), nombre: 1 }])],
    cit: "Tuez-le. Il reviendra plus petit, mais plus pressé.",
    art: "un oiseau de flamme dorée aux ailes déployées émergeant d'une gerbe d'étincelles, plumes de feu se détachant",
  }),
  creature({
    id: 'fla-forgeron', nom: 'Forgeron des Laves',
    el: 'flamme', cout: 3, atq: 2, pv: 4, rar: 'peu-commune', sil: 'humanoide',
    cap: [cap('eveil', "Éveil : donne +1/+0 à une autre créature alliée au hasard.", [{ kind: 'buff', cible: 'autres-creatures-alliees', atq: 1, pv: 0 }])],
    art: "un forgeron nain à la barbe de braise martelant une lame incandescente sur une enclume de basalte, gerbe d'étincelles",
  }),
  creature({
    id: 'fla-molosse', nom: 'Molosse de Cendre',
    el: 'flamme', cout: 2, atq: 3, pv: 2, mc: ['elan'], sil: 'quadrupede',
    art: "un chien de guerre au pelage de cendre et aux yeux de charbon ardent, gueule fumante, ruines brûlées",
  }),
  creature({
    id: 'fla-papillon', nom: 'Papillon de Braise',
    el: 'flamme', cout: 2, atq: 2, pv: 1, mc: ['vol'], sil: 'insecte',
    cap: [cap('dernier-souffle', "Dernier souffle : inflige 2 dégâts au joueur adverse.", [{ kind: 'degats', cible: 'joueur-ennemi', valeur: 2 }])],
    art: "un papillon aux ailes de braise translucide voletant au-dessus d'un feu de camp, motifs incandescents sur les ailes",
  }),
  creature({
    id: 'fla-fauve-obsidienne', nom: "Fauve d'Obsidienne",
    el: 'flamme', cout: 6, atq: 7, pv: 6, rar: 'rare', mc: ['double-frappe'], sil: 'quadrupede',
    art: "une panthère de verre volcanique noir aux veines de lave, posture de chasse, coulée basaltique fumante",
  }),
  creature({
    id: 'fla-vulcanor', nom: 'Vulcanor',
    el: 'flamme', cout: 7, atq: 8, pv: 7, rar: 'legendaire', mc: ['elan', 'percee'], sil: 'colosse',
    cap: [cap('cri-de-guerre', "Cri de guerre : inflige 3 dégâts réparties — 3 à la créature ennemie la plus forte.", [{ kind: 'degats', cible: 'creature-ennemie-la-plus-forte', valeur: 3 }])],
    cit: "La montagne s'est levée. Elle avait des choses à dire.",
    art: "un titan de magma émergeant d'un cratère en éruption, épaules de roche fissurée, ciel rouge et pluie de cendres",
  }),

  // --- Sorts ---------------------------------------------------------------
  sort({
    id: 'fla-trait-feu', nom: 'Trait de Feu',
    el: 'flamme', cout: 1, texte: "Inflige 3 dégâts à une créature ennemie.",
    target: 'creature-ennemie', effets: [{ kind: 'degats', cible: 'cible', valeur: 3 }],
    art: "une flèche de feu compacte fendant l'air en laissant une traînée de fumée noire",
  }),
  sort({
    id: 'fla-deflagration', nom: 'Déflagration',
    el: 'flamme', cout: 4, rar: 'peu-commune', texte: "Inflige 3 dégâts à toutes les créatures ennemies.",
    effets: [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 3 }],
    art: "une onde de choc de feu balayant un champ de bataille, silhouettes projetées, souffle orange aveuglant",
  }),
  sort({
    id: 'fla-immolation', nom: 'Immolation',
    el: 'flamme', cout: 2, texte: "Inflige 4 dégâts au joueur adverse.",
    effets: [{ kind: 'degats', cible: 'joueur-ennemi', valeur: 4 }],
    art: "une comète enflammée s'abattant sur une citadelle lointaine, ciel embrasé",
  }),
  sort({
    id: 'fla-fureur', nom: 'Fureur Incandescente',
    el: 'flamme', cout: 2, texte: "Donne +3/+0 et Élan à une créature alliée.",
    target: 'creature-alliee',
    effets: [{ kind: 'buff', cible: 'cible', atq: 3, pv: 0 }, { kind: 'accorder-mot-cle', cible: 'cible', motCle: 'elan' }],
    art: "un guerrier hurlant dont les veines s'illuminent de lave, aura de chaleur déformant l'air",
  }),
  sort({
    id: 'fla-mur-flammes', nom: 'Mur de Flammes',
    el: 'flamme', cout: 3, rar: 'peu-commune', texte: "Vos créatures gagnent Riposte 2 jusqu'à la fin de la partie.",
    effets: [{ kind: 'riposte', cible: 'creatures-alliees', valeur: 2 }],
    art: "un rideau de flammes verticales séparant deux armées, chaleur ondoyante, silhouettes derrière le brasier",
  }),

  // --- Reliques ------------------------------------------------------------
  relique({
    id: 'fla-lame-blanche', nom: 'Lame Chauffée à Blanc',
    el: 'flamme', cout: 2, atq: 3, pv: 0,
    art: "une épée longue portée au blanc dans la forge, métal translucide de chaleur, obscurité autour",
  }),
  relique({
    id: 'fla-braise-eternelle', nom: 'Braise Éternelle',
    el: 'flamme', cout: 3, atq: 2, pv: 1, motCle: 'elan', rar: 'rare',
    art: "un charbon unique flottant dans une cage de fer ouvragé, lueur pulsante, atelier sombre",
  }),

  // --- Zone ----------------------------------------------------------------
  zone({
    id: 'fla-caldeira', nom: 'Caldeira Rugissante',
    el: 'flamme', cout: 4, atq: 2, pv: 0,
    cit: "Ici, tout ce qui hésite finit en cendre.",
    art: "un cratère volcanique immense empli de lave en mouvement, arches de roche noire, geysers de feu",
  }),
];
