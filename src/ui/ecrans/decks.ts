/**
 * Mes decks : choix du deck actif, et accès au constructeur.
 *
 * Les six decks préconstruits restent toujours jouables, même sans posséder
 * les cartes : ils servent de repère et évitent de bloquer un débutant devant
 * une collection incomplète. La collection ne contraint que les decks
 * personnalisés.
 */
import { aller, barre, rafraichir, retour, sur, type Ecran } from '../app';
import { DECKS } from '../../data/decks';
import { charger, resoudreDeck, sauver, supprimerDeck } from '../../save/profil';
import { getTerrain } from '../../data/registry';
import { esc, urlArt } from '../carte';
import { ecranConstructeur } from './constructeur';

export function ecranDecks(): Ecran {
  function corps(): string {
    const p = charger();

    const preconstruits = DECKS.map((d) => {
      const t = getTerrain(d.terrainId);
      return `<button class="fiche ${p.deckActif === d.id ? 'est-active' : ''}" data-choisir="${d.id}">
        <span class="fiche__vignette"><img src="${urlArt(d.terrainId)}" alt="" loading="lazy"></span>
        <span class="fiche__corps">
          <span class="fiche__titre">${esc(d.nom)}</span>
          <span class="fiche__detail">${esc(d.description)}<br><em>${esc(t?.nom ?? '')} — 20 cartes</em></span>
        </span>
        <span class="fiche__etat">${p.deckActif === d.id ? 'Actif' : ''}</span>
      </button>`;
    }).join('');

    const persos = p.decks.length
      ? p.decks.map((d) => {
          const t = getTerrain(d.terrainId);
          return `<div class="fiche ${p.deckActif === d.id ? 'est-active' : ''}">
            <span class="fiche__corps" data-choisir="${d.id}" role="button" tabindex="0">
              <span class="fiche__titre">${esc(d.nom)}</span>
              <span class="fiche__detail">${d.cartes.length} cartes — ${esc(t?.nom ?? '')}</span>
            </span>
            <button class="bouton bouton--fantome" data-editer="${d.id}" style="min-height:34px;padding:0 12px">Modifier</button>
            <button class="bouton bouton--danger" data-supprimer="${d.id}" style="min-height:34px;padding:0 12px">✕</button>
          </div>`;
        }).join('')
      : `<p class="vide">Aucun deck personnalisé. Créez-en un à partir de votre collection.</p>`;

    return `<div class="ecran__corps">
      <h3 style="margin-top:16px">Decks préconstruits</h3>
      <p class="fiche__detail">Toujours jouables, quelle que soit votre collection.</p>
      <div class="liste">${preconstruits}</div>

      <h3 style="margin-top:22px">Mes constructions</h3>
      <div class="liste">${persos}</div>

      <div style="padding:18px 0 8px">
        <button class="bouton bouton--primaire bouton--bloc" data-nouveau>Construire un deck</button>
      </div>
    </div>`;
  }

  return {
    html: () => `<div class="ecran">${barre('Mes decks')}${corps()}</div>`,

    monter(r) {
      sur(r, '[data-action="retour"]', 'click', () => retour());
      sur(r, '[data-choisir]', 'click', (el) => {
        const id = el.dataset.choisir!;
        if (!resoudreDeck(id)) return;
        const p = charger();
        p.deckActif = id;
        sauver(p);
        rafraichir();
      });
      sur(r, '[data-editer]', 'click', (el) => {
        const id = el.dataset.editer!;
        aller(() => ecranConstructeur(id));
      });
      sur(r, '[data-supprimer]', 'click', (el) => {
        const id = el.dataset.supprimer!;
        const d = charger().decks.find((x) => x.id === id);
        if (d && confirm(`Supprimer définitivement « ${d.nom} » ?`)) {
          supprimerDeck(id);
          rafraichir();
        }
      });
      sur(r, '[data-nouveau]', 'click', () => aller(() => ecranConstructeur(null)));
    },
  };
}
