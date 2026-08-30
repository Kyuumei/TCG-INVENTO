/**
 * Mise en mots des actions.
 *
 * Sans cela, le tour de l'adversaire se résume à un plateau qui change tout
 * seul : on voit le résultat, jamais le geste. Chaque action est donc traduite
 * en une phrase courte, affichée au moment où elle est jouée.
 *
 * La description est faite à partir de l'état *avant* l'action : c'est le seul
 * moment où l'on connaît encore le nom de la carte quittant la main et celui de
 * la créature sur le point de mourir.
 */
import type { Action } from '../engine/rules';
import { adversaire, nomDe, trouverCreature } from '../engine/rules';
import type { GameState } from '../engine/types';
import { getCard, getTerrain } from '../data/registry';

function nomCarteEnMain(etat: GameState, j: 0 | 1, uid: number): string {
  const inst = etat.joueurs[j].main.find((c) => c.uid === uid);
  return (inst && getCard(inst.defId)?.nom) ?? 'une carte';
}

function nomCreature(etat: GameState, uid: number): string {
  const c = trouverCreature(etat, uid);
  return c ? nomDe(c) : 'une créature';
}

/**
 * Renvoie la phrase décrivant une action, ou `null` pour les actions muettes
 * (la fin de tour a son propre bandeau).
 */
export function decrireAction(etat: GameState, action: Action): string | null {
  const j = etat.actif;
  const acteur = etat.joueurs[j].nom;
  const cible = etat.joueurs[adversaire(j)].nom;

  switch (action.type) {
    case 'jouer-creature':
      return `${acteur} invoque ${nomCarteEnMain(etat, j, action.uid)} en ligne ${action.ligne + 1}.`;

    case 'evoluer':
      return `${nomCreature(etat, action.cibleUid)} évolue en ${nomCarteEnMain(etat, j, action.uid)}.`;

    case 'jouer-sort': {
      const nom = nomCarteEnMain(etat, j, action.uid);
      return action.cibleUid !== undefined
        ? `${acteur} lance ${nom} sur ${nomCreature(etat, action.cibleUid)}.`
        : `${acteur} lance ${nom}.`;
    }

    case 'jouer-relique':
      return `${nomCreature(etat, action.cibleUid)} s'équipe de ${nomCarteEnMain(etat, j, action.uid)}.`;

    case 'jouer-zone':
      return `${acteur} déploie ${nomCarteEnMain(etat, j, action.uid)}.`;

    case 'pouvoir-terrain': {
      const t = getTerrain(etat.joueurs[j].terrainId);
      const nom = t?.pouvoirNom ?? 'son terrain';
      return action.cibleUid !== undefined
        ? `${acteur} active ${nom} sur ${nomCreature(etat, action.cibleUid)}.`
        : `${acteur} active ${nom}.`;
    }

    case 'attaquer': {
      const att = nomCreature(etat, action.attaquantUid);
      return action.cible === 'joueur'
        ? `${att} frappe ${cible} directement.`
        : `${att} attaque ${nomCreature(etat, action.cible)}.`;
    }

    default:
      return null;
  }
}

/** Consigne affichée quand une carte ou une créature est sélectionnée. */
export function consigneSelection(quoi: 'ligne' | 'evolution' | 'cible-alliee' | 'cible-ennemie' | 'cible-libre' | 'jouer' | 'attaque'): string {
  switch (quoi) {
    case 'ligne': return 'Touchez une ligne libre pour l’invoquer.';
    case 'evolution': return 'Touchez la créature à faire évoluer.';
    case 'cible-alliee': return 'Touchez une de vos créatures.';
    case 'cible-ennemie': return 'Touchez une créature adverse.';
    case 'cible-libre': return 'Touchez la créature à cibler.';
    case 'jouer': return 'Touchez la carte à nouveau pour la jouer.';
    case 'attaque': return 'Touchez la cible à attaquer.';
  }
}
