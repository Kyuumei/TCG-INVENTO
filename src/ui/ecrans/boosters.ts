/**
 * Ouverture de boosters.
 *
 * Cinq cartes révélées une à une : c'est le moment le plus tactile du jeu, il
 * mérite son animation. Les doublons sont convertis en pièces.
 */
import { barre, rafraichir, retour, sur, vibrer, type Ecran } from '../app';
import { getCard } from '../../data/registry';
import { htmlCarte, htmlDos } from '../carte';
import { ICONES } from '../icones';
import { PRIX_BOOSTER, acheterBooster, charger, ouvrirBooster, sauver, type CarteTiree } from '../../save/profil';

export function ecranBoosters(): Ecran {
  let tirage: CarteTiree[] | null = null;

  function corps(): string {
    const p = charger();
    if (tirage) {
      const gagnees = tirage.filter((t) => !t.doublon).length;
      const cartes = tirage
        .map((t) => {
          const def = getCard(t.id);
          if (!def) return '';
          // Chaque carte se retourne pour se révéler : c'est le geste que le
          // joueur vient chercher en ouvrant un booster.
          return `<div class="retournable" style="position:relative">
            <div class="retournable__plan">
              <div class="retournable__face">${htmlCarte(def)}</div>
              <div class="retournable__face retournable__face--dos">${htmlDos()}</div>
            </div>
            ${t.doublon ? '<span class="tirage__doublon">doublon · +25</span>' : ''}
          </div>`;
        })
        .join('');
      return `<div class="ecran__corps">
        <div class="tirage">${cartes}</div>
        <p class="fiche__detail" style="text-align:center">
          ${gagnees} nouvelle${gagnees > 1 ? 's' : ''} carte${gagnees > 1 ? 's' : ''} sur 5.
        </p>
        <div class="modale__actions" style="padding:14px 0">
          <button class="bouton bouton--primaire" data-encore ${p.boosters > 0 ? '' : 'disabled'}>
            Ouvrir un autre (${p.boosters})
          </button>
          <button class="bouton bouton--fantome" data-terminer>Terminer</button>
        </div>
      </div>`;
    }

    return `<div class="ecran__corps boosters">
      <div class="paquet ${p.boosters > 0 ? '' : 'est-vide'}" data-ouvrir>INVENTO</div>
      <p class="fiche__detail" style="text-align:center">
        ${p.boosters > 0
          ? `Vous avez <b>${p.boosters}</b> booster${p.boosters > 1 ? 's' : ''}. Touchez le paquet pour l'ouvrir.`
          : `Aucun booster en réserve. Achetez-en un pour ${PRIX_BOOSTER} pièces, ou gagnez-en un à chaque adversaire vaincu en campagne.`}
      </p>
      <button class="bouton ${p.pieces >= PRIX_BOOSTER ? 'bouton--primaire' : ''}" data-acheter ${p.pieces >= PRIX_BOOSTER ? '' : 'disabled'}>
        ${ICONES.cristal} Acheter un booster — ${PRIX_BOOSTER}
      </button>
    </div>`;
  }

  return {
    html: () => {
      const p = charger();
      return `<div class="ecran">${barre('Boosters', { droite: `<span class="monnaie">${ICONES.cristal}${p.pieces}</span>` })}${corps()}</div>`;
    },

    monter(r) {
      const redessiner = () => rafraichir();
      sur(r, '[data-action="retour"]', 'click', () => retour());
      sur(r, '[data-ouvrir]', 'click', () => {
        const p = charger();
        if (p.boosters <= 0) return;
        p.boosters -= 1;
        sauver(p);
        tirage = ouvrirBooster();
        vibrer(24);
        const c = r.querySelector('.ecran__corps');
        if (c) c.outerHTML = corps();
      });
      sur(r, '[data-encore]', 'click', () => {
        const p = charger();
        if (p.boosters <= 0) return;
        p.boosters -= 1;
        sauver(p);
        tirage = ouvrirBooster();
        vibrer(24);
        const c = r.querySelector('.ecran__corps');
        if (c) c.outerHTML = corps();
      });
      sur(r, '[data-terminer]', 'click', () => {
        tirage = null;
        redessiner();
      });
      sur(r, '[data-acheter]', 'click', () => {
        if (acheterBooster()) {
          vibrer(16);
          redessiner();
        }
      });
    },
  };
}
