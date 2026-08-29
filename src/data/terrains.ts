/**
 * Les Terrains.
 *
 * Chaque joueur en choisit un avec son deck. Il reste actif toute la partie :
 * il confère un bonus passif permanent aux créatures de son élément et donne
 * accès à un pouvoir activable une fois par tour contre des cristaux.
 *
 * C'est l'héritage assumé des terrains de Magic, débarrassé de la pioche : on
 * garde l'identité de couleur et la ressource activable, sans le risque de ne
 * jamais tirer ses terres.
 */
import type { TerrainDef } from '../engine/types';
import { terrain } from './dsl';

export const TERRAINS: TerrainDef[] = [
  terrain({
    id: 'ter-bosquet',
    nom: 'Bosquet des Origines',
    el: 'sylve',
    passifTexte: 'Vos créatures Sylve gagnent +0/+1.',
    passif: { atq: 0, pv: 1 },
    pouvoirNom: 'Sève Nourricière',
    pouvoirTexte: 'Soigne 2 PV à une créature alliée.',
    cout: 1, target: 'creature-alliee',
    effets: [{ kind: 'soin', cible: 'cible', valeur: 2 }],
    art: "une clairière circulaire baignée d'une lumière verte, arbre central noueux, sol tapissé de mousse",
  }),
  terrain({
    id: 'ter-forge',
    nom: 'Forge du Cratère',
    el: 'flamme',
    passifTexte: 'Vos créatures Flamme gagnent +1/+0.',
    passif: { atq: 1, pv: 0 },
    pouvoirNom: 'Étincelle',
    pouvoirTexte: 'Inflige 1 dégât à une créature ennemie.',
    cout: 1, target: 'creature-ennemie',
    effets: [{ kind: 'degats', cible: 'cible', valeur: 1 }],
    art: "une forge creusée dans la paroi d'un cratère volcanique, coulées de lave canalisées, enclumes noires",
  }),
  terrain({
    id: 'ter-abysse',
    nom: 'Abysse Silencieux',
    el: 'maree',
    passifTexte: 'Vos créatures Marée gagnent +0/+1.',
    passif: { atq: 0, pv: 1 },
    pouvoirNom: 'Courant Froid',
    pouvoirTexte: 'Gèle une créature ennemie pour 1 tour.',
    cout: 2, target: 'creature-ennemie',
    effets: [{ kind: 'gel', cible: 'cible', tours: 1 }],
    art: "une fosse océanique obscure éclairée par des lueurs bioluminescentes, colonnes d'eau plus sombre",
  }),
  terrain({
    id: 'ter-pics',
    nom: 'Pics Hurlants',
    el: 'foudre',
    passifTexte: 'Vos créatures Foudre gagnent +1/+0.',
    passif: { atq: 1, pv: 0 },
    pouvoirNom: 'Décharge',
    pouvoirTexte: 'Inflige 1 dégât au joueur adverse.',
    cout: 1,
    effets: [{ kind: 'degats', cible: 'joueur-ennemi', valeur: 1 }],
    art: "des pics rocheux acérés perçant une couche de nuages orageux, éclairs entre les sommets",
  }),
  terrain({
    id: 'ter-citadelle',
    nom: 'Citadelle de Fer',
    el: 'roc',
    passifTexte: 'Vos créatures Roc gagnent +0/+2.',
    passif: { atq: 0, pv: 2 },
    pouvoirNom: 'Herse',
    pouvoirTexte: 'Donne un Bouclier 2 à une créature alliée.',
    cout: 2, target: 'creature-alliee',
    effets: [{ kind: 'bouclier', cible: 'cible', valeur: 2 }],
    art: "une forteresse de basalte et de fer accrochée à une falaise, remparts massifs, ciel gris de plomb",
  }),
  terrain({
    id: 'ter-sanctuaire',
    nom: 'Sanctuaire Éteint',
    el: 'ombre',
    passifTexte: 'Vos créatures Ombre gagnent +1/+0.',
    passif: { atq: 1, pv: 0 },
    pouvoirNom: 'Dîme',
    pouvoirTexte: 'Inflige 1 dégât à une créature ennemie et vous soigne de 1 PV.',
    cout: 2, target: 'creature-ennemie',
    effets: [
      { kind: 'degats', cible: 'cible', valeur: 1 },
      { kind: 'soin', cible: 'joueur-allie', valeur: 1 },
    ],
    art: "un temple abandonné aux vitraux brisés envahi par l'obscurité, autel fendu, cierges éteints",
  }),
  terrain({
    id: 'ter-carrefour',
    nom: 'Carrefour des Routes',
    el: 'neutre',
    passifTexte: "Aucun bonus élémentaire : ce terrain n'appartient à personne.",
    passif: { atq: 0, pv: 0 },
    pouvoirNom: 'Halte',
    pouvoirTexte: 'Soigne 2 PV à votre héros.',
    cout: 1,
    effets: [{ kind: 'soin', cible: 'joueur-allie', valeur: 2 }],
    art: "un carrefour de routes de terre avec une pierre gravée et un vieux poteau indicateur, plaine ouverte au couchant",
  }),
];
