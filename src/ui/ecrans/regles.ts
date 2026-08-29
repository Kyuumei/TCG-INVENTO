/**
 * Règles du jeu : la référence complète, consultable en cours de partie.
 */
import { barre, retour, sur, type Ecran } from '../app';
import { BEATS, KEYWORD_LABEL, KEYWORD_RULE, ELEMENTS, type Keyword } from '../../engine/types';
import { ICONE_ELEMENT, LABEL_ELEMENT } from '../icones';

const MOTS: Keyword[] = [
  'elan', 'garde', 'vol', 'percee', 'voile', 'double-frappe', 'lien-vital', 'insaisissable', 'ancrage',
];

export function ecranRegles(): Ecran {
  const cycle = ELEMENTS.map((e) => {
    const bat = BEATS[e];
    return `<li><b>${ICONE_ELEMENT[e]} ${LABEL_ELEMENT[e]}</b> l'emporte sur ${LABEL_ELEMENT[bat!]}.</li>`;
  }).join('');

  const motsCles = MOTS.map(
    (m) => `<li><b>${KEYWORD_LABEL[m]}</b> — ${KEYWORD_RULE[m]}</li>`,
  ).join('');

  return {
    html: () => `<div class="ecran">
      ${barre('Règles du jeu')}
      <div class="ecran__corps" style="line-height:1.6">

        <h3 style="margin-top:18px">But de la partie</h3>
        <p>Chaque joueur commence à 20 points de vie. Le premier à réduire son adversaire à zéro gagne.
        Une partie dure environ six à huit minutes.</p>

        <h3 style="margin-top:18px">Le tour</h3>
        <p>Au début de votre tour, votre réserve de cristaux augmente de 1 (maximum 8) et se recharge
        entièrement, puis vous piochez une carte. Vous pouvez ensuite, dans l'ordre que vous voulez :
        jouer des cartes, activer le pouvoir de votre terrain une fois, et attaquer avec vos créatures.</p>

        <h3 style="margin-top:18px">Les lignes</h3>
        <p>Le plateau compte trois lignes par camp, qui se font face. Une créature attaque celle qui lui
        fait face sur sa ligne ; si la ligne d'en face est vide, elle frappe directement le joueur adverse.
        Les deux créatures se blessent simultanément : bien choisir sa ligne est l'essentiel du jeu.</p>

        <h3 style="margin-top:18px">Le cycle élémentaire</h3>
        <p>Frapper un élément que l'on domine inflige <b>50 % de dégâts en plus</b> (arrondi au supérieur).
        Être frappé par un élément que l'on domine retire <b>1 dégât</b>.</p>
        <ul>${cycle}</ul>

        <h3 style="margin-top:18px">Terrains et zones</h3>
        <p>Votre terrain est choisi avec votre deck et reste actif toute la partie : il renforce les créatures
        de son élément et donne un pouvoir activable une fois par tour. Les cartes <b>Zone</b>, elles, sont
        posées sur le champ de bataille partagé et profitent aux deux camps — jouer une zone au mauvais
        moment renforce l'adversaire.</p>

        <h3 style="margin-top:18px">Évolutions</h3>
        <p>Une créature de stade 2 ou 3 se joue directement sur sa forme précédente, à condition que
        celle-ci soit en jeu depuis au moins un tour. L'évolution conserve les blessures déjà subies,
        en referme 2, et peut attaquer immédiatement.</p>

        <h3 style="margin-top:18px">Construire un deck</h3>
        <p>Exactement 20 cartes, deux exemplaires maximum par carte, un seul pour les légendaires.</p>

        <h3 style="margin-top:18px">Mots-clés</h3>
        <ul>${motsCles}</ul>

        <h3 style="margin-top:18px">Altérations</h3>
        <ul>
          <li><b>Venin X</b> — la créature subit X dégâts à la fin de chaque tour.</li>
          <li><b>Régénération X</b> — elle récupère X points de vie à la fin de chaque tour.</li>
          <li><b>Riposte X</b> — elle inflige X dégâts à qui l'attaque.</li>
          <li><b>Bouclier X</b> — les X prochains dégâts sont absorbés.</li>
          <li><b>Gel</b> — la créature ne peut pas attaquer pendant le nombre de tours indiqué.</li>
        </ul>

        <p style="height:24px"></p>
      </div>
    </div>`,

    monter(r) {
      sur(r, '[data-action="retour"]', 'click', () => retour());
    },
  };
}
