/**
 * Écran d'accueil : le point d'entrée du jeu.
 */
import { aller, sur, type Ecran } from '../app';
import { ICONES } from '../icones';
import { avancementCollection, charger } from '../../save/profil';
import { ecranCampagne } from './campagne';
import { ecranDuel } from './duel';
import { ecranBoosters } from './boosters';
import { ecranCollection } from './collection';
import { ecranDecks } from './decks';
import { ecranRegles } from './regles';

export function ecranAccueil(): Ecran {
  const p = charger();
  const av = avancementCollection();

  return {
    html: () => `<div class="ecran accueil">
      <div>
        <h1 class="accueil__logo">INVENTO</h1>
        <p class="accueil__accroche">Six éléments, cent cinquante et une cartes,<br>et un tour pour tout renverser.</p>
      </div>

      <nav class="accueil__menu">
        <button class="bouton bouton--primaire bouton--bloc" data-va="campagne">${ICONES.campagne} Campagne</button>
        <button class="bouton bouton--bloc" data-va="duel">${ICONES.duel} Duel libre</button>
        <button class="bouton bouton--bloc" data-va="boosters">${ICONES.boosters} Boosters ${p.boosters > 0 ? `<b style="color:var(--or)">(${p.boosters})</b>` : ''}</button>
        <button class="bouton bouton--bloc" data-va="decks">${ICONES.deck} Mes decks</button>
        <button class="bouton bouton--bloc" data-va="collection">${ICONES.collection} Collection</button>
        <button class="bouton bouton--fantome bouton--bloc" data-va="regles">Règles du jeu</button>
      </nav>

      <div class="accueil__pied">
        <span class="monnaie">${ICONES.cristal} ${p.pieces} pièces</span>
        <span>${av.obtenues} / ${av.total} cartes</span>
        <span>${p.stats.victoires} victoire${p.stats.victoires > 1 ? 's' : ''} sur ${p.stats.parties}</span>
      </div>
    </div>`,

    monter(r) {
      sur(r, '[data-va]', 'click', (el) => {
        switch (el.dataset.va) {
          case 'campagne': return aller(ecranCampagne);
          case 'duel': return aller(ecranDuel);
          case 'boosters': return aller(ecranBoosters);
          case 'decks': return aller(ecranDecks);
          case 'collection': return aller(ecranCollection);
          case 'regles': return aller(ecranRegles);
        }
      });
    },
  };
}
