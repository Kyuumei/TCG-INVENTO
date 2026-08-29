/**
 * NEUTRE — le liant.
 *
 * Ces cartes n'appartiennent à aucun élément : elles ne profitent ni des
 * terrains ni des zones, mais elles ne subissent jamais de faiblesse
 * élémentaire. Elles servent à combler une courbe et à stabiliser un deck.
 */
import type { CardDef } from '../../engine/types';
import { cap, creature, jeton, relique, sort, zone } from '../dsl';

export const NEUTRE: CardDef[] = [
  creature({
    id: 'neu-eclaireur', nom: 'Éclaireur Agile',
    el: 'neutre', cout: 1, atq: 2, pv: 1, mc: ['elan'], sil: 'humanoide',
    art: "un éclaireur encapuchonné accroupi sur une branche, arc court en main, forêt au crépuscule",
  }),
  creature({
    id: 'neu-marchand', nom: 'Marchand Ambulant',
    el: 'neutre', cout: 2, atq: 1, pv: 3, sil: 'humanoide',
    cap: [cap('cri-de-guerre', "Cri de guerre : pioche une carte.", [{ kind: 'piocher', valeur: 1 }])],
    art: "un colporteur voûté sous un énorme sac d'objets hétéroclites, route de campagne poussiéreuse",
  }),
  creature({
    id: 'neu-mercenaire', nom: 'Mercenaire Balafré',
    el: 'neutre', cout: 3, atq: 4, pv: 3, sil: 'humanoide',
    art: "un mercenaire au visage balafré en armure de cuir dépareillée, épée bâtarde sur l'épaule, camp de guerre",
  }),
  creature({
    id: 'neu-golem-argile', nom: "Golem d'Argile",
    el: 'neutre', cout: 4, atq: 3, pv: 6, mc: ['garde'], sil: 'humanoide',
    art: "un golem d'argile crue aux doigts épais, fissures sèches sur le torse, atelier d'alchimiste",
  }),
  creature({
    id: 'neu-chevalier-errant', nom: 'Chevalier Errant',
    el: 'neutre', cout: 5, atq: 5, pv: 5, rar: 'peu-commune', mc: ['garde'], sil: 'humanoide',
    cap: [cap('cri-de-guerre', "Cri de guerre : soigne 3 PV à votre héros.", [{ kind: 'soin', cible: 'joueur-allie', valeur: 3 }])],
    art: "un chevalier en armure ternie appuyé sur son épée devant un pont de pierre, cape rapiécée, pluie fine",
  }),
  creature({
    id: 'neu-alchimiste', nom: 'Apprenti Alchimiste',
    el: 'neutre', cout: 2, atq: 1, pv: 4, sil: 'humanoide',
    cap: [cap('crepuscule', "Crépuscule : soigne 1 PV à votre héros.", [{ kind: 'soin', cible: 'joueur-allie', valeur: 1 }])],
    art: "un jeune apprenti aux lunettes de protection tenant une fiole bouillonnante, étagères d'ingrédients",
  }),
  creature({
    id: 'neu-chien-garde', nom: 'Vieux Chien de Garde',
    el: 'neutre', cout: 2, atq: 2, pv: 3, mc: ['garde'], sil: 'quadrupede',
    art: "un vieux mâtin gris couché en travers d'un seuil, œil ouvert, museau grisonnant",
  }),
  creature({
    id: 'neu-statue', nom: 'Statue Vigilante',
    el: 'neutre', cout: 3, atq: 0, pv: 8, mc: ['garde', 'ancrage'], sil: 'humanoide',
    cit: "Elle a vu trois sièges. Elle n'a jamais bougé.",
    art: "une statue de pierre en armure tenant un bouclier, lichen sur les épaules, cour de château déserte",
  }),
  creature({
    id: 'neu-faucon', nom: 'Faucon Messager',
    el: 'neutre', cout: 2, atq: 2, pv: 2, mc: ['vol'], sil: 'oiseau',
    cap: [cap('dernier-souffle', "Dernier souffle : pioche une carte.", [{ kind: 'piocher', valeur: 1 }])],
    art: "un faucon pèlerin en vol tenant un rouleau scellé à la patte, ciel dégagé au-dessus des collines",
  }),
  creature({
    id: 'neu-colosse-anonyme', nom: 'Colosse Anonyme',
    el: 'neutre', cout: 6, atq: 6, pv: 7, rar: 'peu-commune', sil: 'colosse',
    art: "un géant de pierre sans visage debout dans la brume, proportions écrasantes, silhouette contre le ciel blanc",
  }),
  creature({
    id: 'neu-capitaine', nom: 'Capitaine de Compagnie',
    el: 'neutre', cout: 4, atq: 3, pv: 4, rar: 'rare', sil: 'humanoide',
    cap: [cap('cri-de-guerre', "Cri de guerre : donne +1/+1 à vos autres créatures.", [{ kind: 'buff', cible: 'autres-creatures-alliees', atq: 1, pv: 1 }])],
    art: "une capitaine en cuirasse gravée levant son épée, bannière déchirée derrière elle, troupe en formation",
  }),
  creature({
    id: 'neu-arbitre', nom: "Arbitre des Éléments",
    el: 'neutre', cout: 6, atq: 5, pv: 8, rar: 'legendaire', mc: ['voile', 'garde'], sil: 'humanoide',
    cap: [cap('eveil', "Éveil : pioche une carte et soigne 1 PV à toutes vos créatures.", [
      { kind: 'piocher', valeur: 1 },
      { kind: 'soin', cible: 'creatures-alliees', valeur: 1 },
    ])],
    cit: "Six éléments se disputaient le monde. Quelqu'un devait tenir le registre.",
    art: "une figure encapuchonnée aux yeux blancs entourée de six sphères élémentaires en orbite lente, salle circulaire de pierre claire",
  }),

  // --- Sorts ---------------------------------------------------------------
  sort({
    id: 'neu-second-souffle', nom: 'Deuxième Souffle',
    el: 'neutre', cout: 2, texte: "Soigne 5 PV à votre héros et pioche une carte.",
    effets: [{ kind: 'soin', cible: 'joueur-allie', valeur: 5 }, { kind: 'piocher', valeur: 1 }],
    art: "une main tendue relevant un guerrier à genoux sur un champ de bataille au lever du jour",
  }),
  sort({
    id: 'neu-coup-bas', nom: 'Coup Bas',
    el: 'neutre', cout: 1, texte: "Inflige 2 dégâts à une créature.",
    target: 'creature', effets: [{ kind: 'degats', cible: 'cible', valeur: 2 }],
    art: "une dague surgissant d'un angle mort dans une ruelle sombre, éclat de lame",
  }),
  sort({
    id: 'neu-ralliement', nom: 'Cri de Ralliement',
    el: 'neutre', cout: 3, rar: 'peu-commune', texte: "Donne +2/+1 à toutes vos créatures.",
    effets: [{ kind: 'buff', cible: 'creatures-alliees', atq: 2, pv: 1 }],
    art: "un cor de guerre levé au sommet d'une colline, bannières se redressant dans la brume",
  }),
  sort({
    id: 'neu-conscription', nom: 'Conscription',
    el: 'neutre', cout: 3, texte: "Invoque trois Recrues 2/2.",
    effets: [{ kind: 'invoquer', jeton: jeton('Recrue', 'neutre', 2, 2), nombre: 3 }],
    art: "une file de paysans recevant des piques dans une cour boueuse, sergent criant des ordres",
  }),

  // --- Reliques ------------------------------------------------------------
  relique({
    id: 'neu-banniere', nom: 'Bannière de Guerre',
    el: 'neutre', cout: 3, atq: 1, pv: 1, rar: 'peu-commune',
    texte: "À l'équipement : vos autres créatures gagnent +1/+0.",
    effets: [{ kind: 'buff', cible: 'autres-creatures-alliees', atq: 1, pv: 0 }],
    art: "une bannière rouge et or plantée dans un sol détrempé, hampe fendue, tissu claquant au vent",
  }),
  relique({
    id: 'neu-bottes', nom: 'Bottes du Vagabond',
    el: 'neutre', cout: 1, atq: 1, pv: 1, motCle: 'elan',
    art: "une paire de bottes de cuir usées jusqu'à la corde posées près d'un feu de camp, route derrière",
  }),

  // --- Zone ----------------------------------------------------------------
  zone({
    id: 'neu-arene', nom: 'Arène Ancestrale',
    el: 'neutre', cout: 3, atq: 1, pv: 1,
    cit: "Le sable ne prend parti pour personne.",
    art: "une arène de pierre circulaire écrasée de soleil, gradins vides et rongés par le temps, sable clair",
  }),
];
