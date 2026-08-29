/**
 * FOUDRE — la décision plus rapide que la pensée.
 *
 * Identité : tempo. Créatures peu chères, Élan, Vol, Double frappe, et surtout
 * la capacité de réveiller ses propres créatures pour rejouer un tour dans le
 * tour. Faible au Roc, résiste à la Marée.
 */
import type { CardDef } from '../../engine/types';
import { cap, creature, jeton, relique, sort, zone } from '../dsl';

export const FOUDRE: CardDef[] = [
  // --- Lignée du Fulguror --------------------------------------------------
  creature({
    id: 'fou-etincelou', nom: 'Étincelou',
    el: 'foudre', cout: 1, atq: 2, pv: 1, stade: 1, lignee: 'fulguror', sil: 'quadrupede',
    mc: ['elan'],
    art: "un louveteau électrique bleu vif au pelage hérissé d'arcs électriques, course sur une lande d'orage",
  }),
  creature({
    id: 'fou-voltille', nom: 'Voltille',
    el: 'foudre', cout: 2, atq: 3, pv: 3, rar: 'peu-commune', stade: 2, lignee: 'fulguror', de: 'fou-etincelou', sil: 'quadrupede',
    mc: ['elan'],
    art: "un loup adulte parcouru d'éclairs bleus, poils dressés par la charge, nuages bas et sol crépitant",
  }),
  creature({
    id: 'fou-fulguror', nom: 'Fulguror',
    el: 'foudre', cout: 4, atq: 5, pv: 4, rar: 'epique', stade: 3, lignee: 'fulguror', de: 'fou-voltille', sil: 'quadrupede',
    mc: ['elan', 'double-frappe'],
    cit: "Il est déjà passé. Vous entendrez le tonnerre plus tard.",
    art: "un immense loup de foudre blanche en pleine détente, corps à demi dématérialisé en arcs électriques, ciel noir zébré",
  }),

  // --- Lignée orageuse -----------------------------------------------------
  creature({
    id: 'fou-nimbule', nom: 'Nimbule',
    el: 'foudre', cout: 1, atq: 1, pv: 2, stade: 1, lignee: 'orage', sil: 'amorphe',
    mc: ['vol'],
    art: "un petit nuage rond et sombre flottant, minuscules éclairs sous sa base, ciel dégagé autour",
  }),
  creature({
    id: 'fou-orageon', nom: 'Orageon',
    el: 'foudre', cout: 3, atq: 3, pv: 3, rar: 'peu-commune', stade: 2, lignee: 'orage', de: 'fou-nimbule', sil: 'amorphe',
    mc: ['vol'],
    cap: [cap('sur-attaque', "Après avoir attaqué : inflige 1 dégât à toutes les créatures ennemies.", [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 1 }])],
    art: "un nuage d'orage compact en forme de tête grondante, pluie et éclairs tombant de sa masse",
  }),
  creature({
    id: 'fou-tonnerrax', nom: 'Tonnerrax',
    el: 'foudre', cout: 5, atq: 5, pv: 5, rar: 'rare', stade: 3, lignee: 'orage', de: 'fou-orageon', sil: 'amorphe',
    mc: ['vol'],
    cap: [cap('sur-attaque', "Après avoir attaqué : inflige 2 dégâts à toutes les créatures ennemies.", [{ kind: 'degats', cible: 'creatures-ennemies', valeur: 2 }])],
    art: "un front orageux titanesque à visage humanoïde, bras de nuages et de foudre, plaine écrasée sous l'ombre",
  }),

  // --- Lignée statique -----------------------------------------------------
  creature({
    id: 'fou-statiquin', nom: 'Statiquin',
    el: 'foudre', cout: 2, atq: 2, pv: 2, stade: 1, lignee: 'statique', sil: 'insecte',
    cap: [cap('cri-de-guerre', "Cri de guerre : gagne 1 cristal ce tour-ci.", [{ kind: 'cristaux', valeur: 1 }])],
    art: "une créature-boule couverte de piquants métalliques crépitants, arcs sautant entre les pointes",
  }),
  creature({
    id: 'fou-arcflux', nom: 'Arcflux',
    el: 'foudre', cout: 4, atq: 4, pv: 4, rar: 'rare', stade: 2, lignee: 'statique', de: 'fou-statiquin', sil: 'insecte',
    cap: [cap('sur-evolution', "Évolution : réveille toutes vos créatures.", [{ kind: 'reveiller', cible: 'creatures-alliees' }])],
    art: "un arachnide de métal et de plasma aux pattes effilées, arc électrique permanent entre ses membres, laboratoire ruiné",
  }),

  // --- Créatures autonomes -------------------------------------------------
  creature({
    id: 'fou-guepe', nom: 'Guêpe Voltaïque',
    el: 'foudre', cout: 2, atq: 3, pv: 1, mc: ['vol', 'elan'], sil: 'insecte',
    art: "une guêpe géante aux ailes crépitant d'électricité, dard incandescent, fond de ciel orageux",
  }),
  creature({
    id: 'fou-lynx', nom: 'Lynx Cinétique',
    el: 'foudre', cout: 3, atq: 4, pv: 2, rar: 'peu-commune', mc: ['elan', 'insaisissable'], sil: 'quadrupede',
    art: "un lynx au pelage argenté parcouru de filaments électriques, bondissant, traînée de lumière derrière lui",
  }),
  creature({
    id: 'fou-sentinelle-cuivre', nom: 'Sentinelle de Cuivre',
    el: 'foudre', cout: 4, atq: 3, pv: 6, rar: 'peu-commune', mc: ['garde'], sil: 'humanoide',
    cap: [cap('sur-degats', "Après avoir subi des dégâts : inflige 2 dégâts à une créature ennemie au hasard.", [{ kind: 'degats', cible: 'creature-ennemie-aleatoire', valeur: 2 }])],
    art: "un automate de cuivre patiné hérissé de bobines et de paratonnerres, décharges entre ses plaques",
  }),
  creature({
    id: 'fou-colibri-plasma', nom: 'Colibri Plasma',
    el: 'foudre', cout: 1, atq: 1, pv: 1, mc: ['vol', 'elan'], sil: 'oiseau',
    cap: [cap('dernier-souffle', "Dernier souffle : pioche une carte.", [{ kind: 'piocher', valeur: 1 }])],
    art: "un colibri fait de plasma violet pur, corps translucide et lumineux, obscurité totale autour",
  }),
  creature({
    id: 'fou-chevaucheur', nom: "Chevaucheur d'Éclairs",
    el: 'foudre', cout: 5, atq: 6, pv: 4, rar: 'rare', mc: ['elan'], sil: 'humanoide',
    cap: [cap('cri-de-guerre', "Cri de guerre : réveille une autre créature alliée.", [{ kind: 'reveiller', cible: 'autres-creatures-alliees' }])],
    art: "un cavalier debout sur un éclair descendant du ciel, lance levée, cape claquant dans la tempête",
  }),
  creature({
    id: 'fou-zephyrion', nom: 'Zéphyrion',
    el: 'foudre', cout: 6, atq: 6, pv: 6, rar: 'legendaire', mc: ['vol', 'double-frappe'], sil: 'oiseau',
    cap: [cap('eveil', "Éveil : inflige 2 dégâts au joueur adverse.", [{ kind: 'degats', cible: 'joueur-ennemi', valeur: 2 }])],
    cit: "Il n'y a pas de vent là-haut. Il n'y a que lui.",
    art: "un rapace immense aux plumes de foudre bleue et blanche, ailes déployées entre deux fronts d'orage, éclairs en arc",
  }),

  // --- Sorts ---------------------------------------------------------------
  sort({
    id: 'fou-eclair-fourchu', nom: 'Éclair Fourchu',
    el: 'foudre', cout: 3, rar: 'peu-commune', texte: "Inflige 4 dégâts à la créature ennemie la plus forte et 2 à une autre au hasard.",
    effets: [
      { kind: 'degats', cible: 'creature-ennemie-la-plus-forte', valeur: 4 },
      { kind: 'degats', cible: 'creature-ennemie-aleatoire', valeur: 2 },
    ],
    art: "un éclair se divisant en deux branches au-dessus d'une plaine, embrasement du ciel",
  }),
  sort({
    id: 'fou-surcharge', nom: 'Surcharge',
    el: 'foudre', cout: 1, texte: "Gagne 2 cristaux ce tour-ci.",
    effets: [{ kind: 'cristaux', valeur: 2 }],
    art: "un cristal bleu fissuré libérant un flot d'énergie électrique, éclats en suspension",
  }),
  sort({
    id: 'fou-impulsion', nom: 'Impulsion',
    el: 'foudre', cout: 2, texte: "Réveille toutes vos créatures : elles peuvent attaquer de nouveau.",
    effets: [{ kind: 'reveiller', cible: 'creatures-alliees' }],
    art: "une onde de choc électrique circulaire partant du sol, poussière soulevée en anneau",
  }),
  sort({
    id: 'fou-champ-magnetique', nom: 'Champ Magnétique',
    el: 'foudre', cout: 3, texte: "Donne +2/+0 et Vol à une créature alliée.",
    target: 'creature-alliee',
    effets: [{ kind: 'buff', cible: 'cible', atq: 2, pv: 0 }, { kind: 'accorder-mot-cle', cible: 'cible', motCle: 'vol' }],
    art: "des lignes de champ magnétique bleutées enveloppant une silhouette en lévitation, limaille en suspension",
  }),
  sort({
    id: 'fou-orage-parfait', nom: 'Orage Parfait',
    el: 'foudre', cout: 5, rar: 'epique', texte: "Invoque deux Éclairs 3/1 avec Élan et Vol.",
    effets: [{ kind: 'invoquer', jeton: jeton('Éclair', 'foudre', 3, 1, ['elan', 'vol']), nombre: 2 }],
    art: "une supercellule orageuse tournante vue depuis la plaine, plusieurs éclairs simultanés touchant le sol",
  }),

  // --- Reliques ------------------------------------------------------------
  relique({
    id: 'fou-bobine', nom: 'Bobine Runique',
    el: 'foudre', cout: 2, atq: 2, pv: 1, motCle: 'elan',
    art: "une bobine de cuivre gravée de runes, arc électrique permanent entre ses bornes, atelier sombre",
  }),
  relique({
    id: 'fou-serres', nom: 'Serres Conductrices',
    el: 'foudre', cout: 3, atq: 2, pv: 2, motCle: 'double-frappe', rar: 'rare',
    art: "une paire de griffes de métal poli reliées par des câbles crépitants, posées sur du velours noir",
  }),

  // --- Zone ----------------------------------------------------------------
  zone({
    id: 'fou-ciel-dechaine', nom: 'Ciel Déchaîné',
    el: 'foudre', cout: 3, atq: 2, pv: 0,
    cit: "Levez la tête. C'est la dernière chose que vous ferez lentement.",
    art: "un ciel entièrement zébré d'éclairs simultanés au-dessus d'une plaine rase, lumière stroboscopique",
  }),
];
