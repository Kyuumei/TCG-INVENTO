/**
 * Duel libre : on choisit son deck, celui de l'adversaire et la difficulté.
 */
import { aller, barre, retour, sur, type Ecran } from '../app';
import { DECKS, deplier, getDeck } from '../../data/decks';
import { charger, resoudreDeck } from '../../save/profil';
import { esc, urlArt } from '../carte';
import { getTerrain } from '../../data/registry';
import type { Difficulte } from '../../engine/ai';
import { ecranBataille } from './bataille';
import { ecranAccueil } from './accueil';

const NIVEAUX: { id: Difficulte; nom: string; detail: string }[] = [
  { id: 'facile', nom: 'Apprenti', detail: "L'adversaire joue correctement, mais sans anticiper." },
  { id: 'normal', nom: 'Duelliste', detail: 'Il enchaîne ses cartes et cherche les bons échanges.' },
  { id: 'difficile', nom: 'Archonte', detail: 'Il planifie son tour entier et ne rate presque rien.' },
];

export function ecranDuel(): Ecran {
  const profil = charger();
  let adversaire = DECKS.find((d) => d.id !== profil.deckActif)?.id ?? DECKS[0]!.id;
  let niveau: Difficulte = 'normal';

  function corps(): string {
    const mien = resoudreDeck(profil.deckActif);
    const terrain = getTerrain(mien?.terrainId ?? '');
    const advDecks = DECKS.map((d) => {
      const t = getTerrain(d.terrainId);
      return `<button class="fiche ${d.id === adversaire ? 'est-active' : ''}" data-adv="${d.id}">
        <span class="fiche__vignette"><img src="${urlArt(d.terrainId)}" alt="" loading="lazy"></span>
        <span class="fiche__corps">
          <span class="fiche__titre">${esc(d.nom)}</span>
          <span class="fiche__detail">${esc(d.description)}<br><em>${esc(t?.nom ?? '')}</em></span>
        </span>
      </button>`;
    }).join('');

    const niveaux = NIVEAUX.map(
      (n) => `<button class="fiche ${n.id === niveau ? 'est-active' : ''}" data-niveau="${n.id}">
        <span class="fiche__corps"><span class="fiche__titre">${n.nom}</span>
        <span class="fiche__detail">${n.detail}</span></span></button>`,
    ).join('');

    return `<div class="ecran__corps">
      <h3 style="margin-top:16px">Votre deck</h3>
      <p class="fiche__detail">${esc(mien?.nom ?? 'Aucun')} — ${esc(terrain?.nom ?? '')}<br>
        <em>Changez-le depuis « Mes decks ».</em></p>

      <h3 style="margin-top:20px">Adversaire</h3>
      <div class="liste">${advDecks}</div>

      <h3 style="margin-top:20px">Difficulté</h3>
      <div class="liste">${niveaux}</div>

      <div style="padding:20px 0 8px"><button class="bouton bouton--primaire bouton--bloc" data-lancer>Lancer le duel</button></div>
    </div>`;
  }

  return {
    html: () => `<div class="ecran">${barre('Duel libre')}${corps()}</div>`,

    monter(r) {
      const redessiner = () => {
        const c = r.querySelector('.ecran__corps');
        if (c) c.outerHTML = corps();
      };
      sur(r, '[data-action="retour"]', 'click', () => retour());
      sur(r, '[data-adv]', 'click', (el) => {
        adversaire = el.dataset.adv!;
        redessiner();
      });
      sur(r, '[data-niveau]', 'click', (el) => {
        niveau = el.dataset.niveau as Difficulte;
        redessiner();
      });
      sur(r, '[data-lancer]', 'click', () => {
        const mien = resoudreDeck(charger().deckActif) ?? resoudreDeck('deck-sylve')!;
        const sien = getDeck(adversaire)!;
        aller(() =>
          ecranBataille({
            nomJoueur: 'Vous',
            deckJoueur: mien.cartes,
            terrainJoueur: mien.terrainId,
            nomAdversaire: sien.nom,
            deckAdversaire: deplier(sien.liste),
            terrainAdversaire: sien.terrainId,
            difficulte: niveau,
            recompense: niveau === 'difficile' ? 70 : niveau === 'normal' ? 45 : 25,
            retourVers: ecranAccueil,
          }),
        );
      });
    },
  };
}
