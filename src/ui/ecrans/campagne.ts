/**
 * Campagne : la suite d'adversaires, débloqués un par un.
 */
import { aller, barre, retour, sur, type Ecran } from '../app';
import { CAMPAGNE, estDebloque } from '../../data/campagne';
import { charger, resoudreDeck, sauver } from '../../save/profil';
import { deplier, getDeck } from '../../data/decks';
import { urlArt, esc } from '../carte';
import { ecranBataille } from './bataille';
import { ecranAccueil } from './accueil';

export function ecranCampagne(): Ecran {
  const profil = charger();
  const vaincus = profil.campagne.vaincus;

  const fiches = CAMPAGNE.map((a, i) => {
    const debloque = estDebloque(a, vaincus);
    const vaincu = vaincus.includes(a.id);
    const deck = getDeck(a.deckId);
    return `<button class="fiche ${debloque ? '' : 'est-verrouillee'} ${vaincu ? 'est-active' : ''}"
        data-adversaire="${a.id}" ${debloque ? '' : 'disabled'}>
      <span class="fiche__vignette"><img src="${urlArt(a.portrait)}" alt="" loading="lazy"></span>
      <span class="fiche__corps">
        <span class="fiche__titre">${i + 1}. ${esc(a.nom)}</span>
        <span class="fiche__detail">${esc(a.titre)} — ${esc(deck?.nom ?? '')}<br>
          <em>${debloque ? esc(a.replique) : 'Battez l’adversaire précédent pour le débloquer.'}</em></span>
      </span>
      <span class="fiche__etat">${vaincu ? '✔' : debloque ? `+${a.recompense}` : '🔒'}</span>
    </button>`;
  }).join('');

  return {
    html: () => `<div class="ecran">
      ${barre('Campagne', { droite: `<span class="monnaie">${profil.pieces}</span>` })}
      <div class="ecran__corps"><div class="liste">${fiches}</div></div>
    </div>`,

    monter(r) {
      sur(r, '[data-action="retour"]', 'click', () => retour());
      sur(r, '[data-adversaire]', 'click', (el) => {
        const a = CAMPAGNE.find((x) => x.id === el.dataset.adversaire);
        if (!a) return;
        const mien = resoudreDeck(profil.deckActif) ?? resoudreDeck('deck-sylve')!;
        const sien = getDeck(a.deckId)!;
        aller(() =>
          ecranBataille({
            nomJoueur: 'Vous',
            deckJoueur: mien.cartes,
            terrainJoueur: mien.terrainId,
            nomAdversaire: a.nom,
            deckAdversaire: deplier(sien.liste),
            terrainAdversaire: sien.terrainId,
            difficulte: a.difficulte,
            recompense: a.recompense,
            retourVers: ecranAccueil,
            surFin: (victoire) => {
              if (!victoire) return;
              const p = charger();
              if (!p.campagne.vaincus.includes(a.id)) {
                p.campagne.vaincus.push(a.id);
                // Chaque adversaire vaincu offre aussi un booster.
                p.boosters += 1;
                sauver(p);
              }
            },
          }),
        );
      });
    },
  };
}
