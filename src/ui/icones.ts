/**
 * Pictogrammes vectoriels.
 *
 * Des SVG plutôt que des émojis : le rendu des émojis varie d'un appareil à
 * l'autre, ce qui interdit toute cohérence graphique sur une carte imprimée.
 */
import type { Element } from '../engine/types';

const S = (d: string, extra = '') =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${extra}<path d="${d}"/></svg>`;

export const ICONE_ELEMENT: Record<Element, string> = {
  sylve: S('M12 21c0-6 3-10 8-12-1 7-4 10-8 12Zm0 0C12 15 9 11 4 9c1 7 4 10 8 12Zm0 0v-6'),
  flamme: S('M12 2c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 1 0 1-1 1-2 0-3-1-4 0-6Z'),
  maree: S('M12 2c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z'),
  foudre: S('M13 2 4 14h6l-1 8 9-12h-6l1-8Z'),
  roc: S('M2 20 9 6l4 7 2-3 7 10H2Z'),
  ombre: S('M17 3a9 9 0 1 0 4 12 7 7 0 0 1-4-12Z'),
  neutre: S('M12 3 4 12l8 9 8-9-8-9Zm0 4 4.5 5L12 17l-4.5-5L12 7Z'),
};

export const ICONES = {
  cristal: S('M12 2 4 10l8 12 8-12-8-8Zm0 3.6 5 5L12 18.4 7 10.6l5-5Z'),
  attaque: S('M6.5 3 3 6.5 13 16l-2 2 3 3 2-2 1.5 1.5L21 17 6.5 3Zm12 15L17 19.5 15.5 18 17 16.5 18.5 18Z'),
  vie: S('M12 21S3 14.6 3 8.9A5 5 0 0 1 12 6a5 5 0 0 1 9 2.9C21 14.6 12 21 12 21Z'),
  bouclier: S('M12 2 4 5v7c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z'),
  retour: S('M15 4 7 12l8 8'),
  fermer: S('M5 5l14 14M19 5 5 19'),
  boosters: S('M4 4h16l-1.5 4H5.5L4 4Zm1.5 6h13L18 21H6L5.5 10ZM12 4v17'),
  collection: S('M3 5h7v14H3V5Zm11 0h7v14h-7V5Z'),
  deck: S('M4 7h12v13H4V7Zm3-3h12v13'),
  campagne: S('M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.6 3.7L12 11.7 5.4 8 12 4.3Z'),
  duel: S('M4 20 14 10M6 4l14 14M4 4l3 1 1 3M20 20l-3-1-1-3'),
  reglages: S('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4-2 1 1 2-2 2-2-1-1 2h-3l-1-2-2 1-2-2 1-2-2-1V9l2-1-1-2 2-2 2 1 1-2h3l1 2 2-1 2 2-1 2 2 1v2Z'),
  gele: S('M12 2v20M4 7l16 10M20 7 4 17'),
  venin: S('M12 3c3 4 6 6 6 9a6 6 0 0 1-12 0c0-3 3-5 6-9Zm-2 9 4 4m0-4-4 4'),
  vol: S('M2 12c5-5 9-6 12-3 2-4 5-5 8-5-2 2-2 4-3 6-3 6-9 8-17 2Z'),
  garde: S('M12 2 4 5v7c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Zm0 3.2 5 1.9v4.8c0 3.4-2 6-5 7.1-3-1.1-5-3.7-5-7.1V7.1l5-1.9Z'),
};

export const LABEL_ELEMENT: Record<Element, string> = {
  sylve: 'Sylve',
  flamme: 'Flamme',
  maree: 'Marée',
  foudre: 'Foudre',
  roc: 'Roc',
  ombre: 'Ombre',
  neutre: 'Neutre',
};

export const LABEL_RARETE: Record<string, string> = {
  commune: 'Commune',
  'peu-commune': 'Peu commune',
  rare: 'Rare',
  epique: 'Épique',
  legendaire: 'Légendaire',
};
