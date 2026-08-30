/**
 * Écran de bataille.
 *
 * Toute la partie tient sur un écran de téléphone en portrait, jouable au
 * pouce : deux rangées de trois lignes qui se font face, les héros au-dessus et
 * en dessous, la main en éventail en bas.
 *
 * L'interaction se fait en deux touches, jamais en glisser-déposer — le
 * glisser est peu fiable dans Safari mobile et fatigant à répéter :
 *   1. on touche une carte ou une créature : elle se sélectionne et les
 *      destinations légales s'illuminent ;
 *   2. on touche une destination illuminée : l'action est jouée.
 */
import type { Action } from '../../engine/rules';
import {
  LIGNES,
  actionsLegales,
  applyAction,
  ciblesLegales,
  ciblesPourCarte,
  createGame,
  peutAttaquer,
  peutEvoluerSur,
  statsOf,
  trouverCreature,
} from '../../engine/rules';
import type { GameEvent, GameState } from '../../engine/types';
import { getCard, getTerrain } from '../../data/registry';
import { jouerTourIA, type Difficulte } from '../../engine/ai';
import { htmlCarte, htmlCreature, esc } from '../carte';
import { ICONE_ELEMENT, ICONES, LABEL_ELEMENT } from '../icones';
import { consigneSelection, decrireAction } from '../journal';
import { KEYWORD_LABEL } from '../../engine/types';
import { pause, q, racineEcran, retour, sur, vibrer, type Ecran } from '../app';
import { enregistrerResultat } from '../../save/profil';

export interface ConfigBataille {
  nomJoueur: string;
  deckJoueur: string[];
  terrainJoueur: string;
  nomAdversaire: string;
  deckAdversaire: string[];
  terrainAdversaire: string;
  difficulte: Difficulte;
  recompense: number;
  /** Appelé à la fin de la partie, avec le résultat. */
  surFin?: (victoire: boolean) => void;
  /** Écran vers lequel revenir en quittant. */
  retourVers?: () => Ecran;
}

type Selection =
  | { type: 'main'; uid: number }
  | { type: 'creature'; uid: number }
  | { type: 'pouvoir' }
  | null;

const MOI = 0;
const IA = 1;

export function ecranBataille(config: ConfigBataille): Ecran {
  let etat: GameState = createGame(
    { nom: config.nomJoueur, deck: config.deckJoueur, terrainId: config.terrainJoueur },
    { nom: config.nomAdversaire, deck: config.deckAdversaire, terrainId: config.terrainAdversaire },
    (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0,
  );
  let selection: Selection = null;
  let rejets = new Set<number>();
  let occupe = false; // vrai pendant le tour de l'IA et ses animations
  let racineEl: HTMLElement;
  let annule = false;
  /** Dernière action mise en mots, affichée au centre du champ de bataille. */
  let derniereAction: string | null = null;

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------

  /**
   * Cristaux en pastilles plutôt qu'en fraction : on lit d'un coup d'œil ce
   * qu'il reste à dépenser, sans avoir à faire la soustraction.
   */
  function htmlCristaux(dispo: number, max: number): string {
    let pastilles = '';
    for (let i = 0; i < max; i++) {
      pastilles += `<i class="${i < dispo ? 'est-pleine' : ''}"></i>`;
    }
    return `<span class="cristaux" title="${dispo} cristaux disponibles sur ${max}">${pastilles}</span>`;
  }

  function htmlHeros(j: 0 | 1, ciblable: boolean): string {
    const p = etat.joueurs[j];
    const terrain = getTerrain(p.terrainId);
    const actif = etat.actif === j && etat.phase === 'jeu';
    const partPv = Math.max(0, Math.min(1, p.pv / p.pvMax));
    return `<div class="heros ${actif ? 'est-actif' : ''} ${ciblable ? 'est-ciblable' : ''}" data-heros="${j}">
      <span class="heros__nom">${esc(p.nom)}</span>
      ${terrain ? `<span class="heros__terrain" title="${esc(terrain.nom)} — ${esc(terrain.passifTexte)}">${ICONE_ELEMENT[terrain.element]}</span>` : ''}
      <span class="heros__pioche" title="${p.main.length} carte(s) en main, ${p.deck.length} dans le deck">
        ${p.main.length}<i></i>${p.deck.length}
      </span>
      ${htmlCristaux(p.cristaux, Math.max(1, p.cristauxMax))}
      <span class="heros__pv" title="Points de vie">
        <span class="heros__jauge"><i style="width:${partPv * 100}%"></i></span>
        ${ICONES.vie}${p.pv}
      </span>
    </div>`;
  }

  function htmlLignes(j: 0 | 1, posables: number[], ciblables: Set<number>, attaquables: Set<number>): string {
    const p = etat.joueurs[j];
    const cases: string[] = [];
    for (let l = 0; l < LIGNES; l++) {
      const c = p.lignes[l];
      const posable = posables.includes(l);
      if (!c) {
        cases.push(`<div class="ligne est-libre ${posable ? 'est-posable' : ''}" data-ligne="${l}" data-cote="${j}"></div>`);
      } else {
        const prete = j === MOI && etat.actif === MOI && peutAttaquer(etat, c) && !selection;
        cases.push(
          `<div class="ligne" data-ligne="${l}" data-cote="${j}">${htmlCreature(etat, c, {
            mien: j === MOI,
            prete,
            attaquable: attaquables.has(c.uid),
            ciblable: ciblables.has(c.uid),
          })}</div>`,
        );
      }
    }
    return `<div class="lignes lignes--${j === MOI ? 'mienne' : 'adverse'}">${cases.join('')}</div>`;
  }

  /**
   * Bande centrale : elle sépare les deux camps et porte les trois informations
   * qu'on cherche en permanence — à qui est le tour, quelle zone est active, et
   * ce qui vient de se passer.
   */
  function htmlBande(): string {
    const z = etat.zoneActive ? getCard(etat.zoneActive.defId) : null;
    const zone = z
      ? `<span class="bande__zone" title="${esc(z.zone?.texte ?? '')}">${ICONE_ELEMENT[z.element]}${esc(z.nom)}</span>`
      : '';
    const monTour = etat.actif === MOI && etat.phase === 'jeu';
    const tour = `<span class="bande__tour ${monTour ? 'est-mien' : ''}">${monTour ? 'Votre tour' : `Tour de ${esc(etat.joueurs[IA].nom)}`}</span>`;
    const action = derniereAction ? `<span class="bande__action">${esc(derniereAction)}</span>` : '';
    return `<div class="bande">${tour}${zone}${action}</div>`;
  }

  function htmlMain(): string {
    const p = etat.joueurs[MOI];
    const monTour = etat.actif === MOI && etat.phase === 'jeu';
    const jouables = new Set<number>();
    if (monTour) {
      for (const a of actionsLegales(etat)) {
        if ('uid' in a) jouables.add(a.uid);
      }
    }

    const cartes = p.main
      .map((inst) => {
        const def = getCard(inst.defId);
        if (!def) return '';
        const injouable = monTour && !jouables.has(inst.uid);
        const choisie = selection?.type === 'main' && selection.uid === inst.uid;
        const troppCher = def.cout > p.cristaux;
        return htmlCarte(def, {
          data: { 'main-uid': String(inst.uid) },
          interactive: true,
          compacte: true,
          selectionnee: choisie,
        }).replace(
          'class="carte ',
          `class="carte ${injouable ? 'est-injouable ' : ''}${troppCher ? 'est-trop-chere ' : ''}`,
        );
      })
      .join('');
    return `<div class="main"><div class="main__piste">${cartes}</div></div>`;
  }

  function htmlPouvoir(): string {
    const p = etat.joueurs[MOI];
    const t = getTerrain(p.terrainId);
    if (!t) return '';
    const dispo = etat.actif === MOI && etat.phase === 'jeu' && !p.pouvoirUtilise && p.cristaux >= t.pouvoirCout && !occupe;
    const choisi = selection?.type === 'pouvoir';
    return `<button class="pouvoir ${dispo ? 'est-dispo' : ''} ${choisi ? 'est-selectionnee' : ''}" data-pouvoir ${dispo ? '' : 'disabled'}>
      <span class="pouvoir__corps">
        <span class="pouvoir__nom">${esc(t.pouvoirNom)}</span>
        <span class="pouvoir__texte">${esc(t.pouvoirTexte)}</span>
      </span>
      <span class="pouvoir__cout">${ICONES.cristal}${t.pouvoirCout}</span>
    </button>`;
  }

  /** Texte de règles complet d'une carte, pour le bandeau de sélection. */
  function reglesDe(def: import('../../engine/types').CardDef): string {
    const bouts: string[] = [];
    if (def.motsCles?.length) bouts.push(def.motsCles.map((m) => KEYWORD_LABEL[m]).join(' · '));
    if (def.equipement) {
      const { atq, pv, motCle } = def.equipement;
      bouts.push(`Équipée : ${atq >= 0 ? '+' : ''}${atq}/${pv >= 0 ? '+' : ''}${pv}${motCle ? ` et ${KEYWORD_LABEL[motCle]}` : ''}.`);
    }
    if (def.zone) bouts.push(def.zone.texte);
    for (const c of def.capacites ?? []) if (c.texte) bouts.push(c.texte);
    return bouts.join(' ');
  }

  /**
   * Bandeau de sélection : il remplace le pouvoir de terrain dès qu'une carte
   * ou une créature est choisie. C'est lui qui rend le jeu lisible — la carte
   * en main est trop petite pour porter son texte, et rien n'indiquait
   * jusqu'ici quel geste on attendait du joueur.
   */
  function htmlApercu(): string {
    if (!selection) return '';

    if (selection.type === 'pouvoir') {
      const t = getTerrain(etat.joueurs[MOI].terrainId);
      if (!t) return '';
      return bandeauApercu(
        t.pouvoirNom,
        `Terrain — ${LABEL_ELEMENT[t.element]}`,
        t.pouvoirTexte,
        consigneSelection(t.pouvoirTarget === 'creature-alliee' ? 'cible-alliee' : t.pouvoirTarget === 'creature-ennemie' ? 'cible-ennemie' : 'cible-libre'),
        null,
      );
    }

    if (selection.type === 'creature') {
      const c = trouverCreature(etat, selection.uid);
      if (!c) return '';
      const def = c.token ? null : getCard(c.defId);
      const st = statsOf(etat, c);
      return bandeauApercu(
        def?.nom ?? c.token?.nom ?? '',
        `${st.atq} attaque · ${st.pv} points de vie`,
        def ? reglesDe(def) : '',
        consigneSelection('attaque'),
        def?.id ?? null,
      );
    }

    const uidChoisi = selection.uid;
    const inst = etat.joueurs[MOI].main.find((x) => x.uid === uidChoisi);
    const def = inst && getCard(inst.defId);
    if (!def) return '';

    let consigne: string;
    if (def.kind === 'creature' && !def.evolueDe) consigne = consigneSelection('ligne');
    else if (def.kind === 'creature') consigne = consigneSelection('evolution');
    else if (def.kind === 'relique') consigne = consigneSelection('cible-alliee');
    else if (def.kind === 'zone') consigne = consigneSelection('jouer');
    else {
      const spec = def.capacites?.[0]?.target ?? 'aucune';
      consigne =
        spec === 'aucune' ? consigneSelection('jouer')
        : spec === 'creature-alliee' ? consigneSelection('cible-alliee')
        : spec === 'creature-ennemie' ? consigneSelection('cible-ennemie')
        : consigneSelection('cible-libre');
    }

    const stats = def.kind === 'creature' ? `${def.atq}/${def.pv} · ` : '';
    return bandeauApercu(
      `${def.nom}`,
      `${stats}${def.cout} cristaux`,
      reglesDe(def),
      consigne,
      def.id,
    );
  }

  function bandeauApercu(nom: string, sous: string, regles: string, consigne: string, artId: string | null): string {
    const vignette = artId
      ? `<span class="apercu__vignette"><img src="art/${artId}.webp" alt="" loading="lazy"></span>`
      : '';
    return `<div class="apercu">
      ${vignette}
      <span class="apercu__corps">
        <span class="apercu__nom">${esc(nom)}</span>
        <span class="apercu__sous">${esc(sous)}</span>
        ${regles ? `<span class="apercu__regles">${esc(regles)}</span>` : ''}
        <span class="apercu__consigne">${esc(consigne)}</span>
      </span>
      <button class="apercu__annuler" data-annuler aria-label="Annuler la sélection">✕</button>
    </div>`;
  }

  function htmlMulligan(): string {
    const p = etat.joueurs[MOI];
    const cartes = p.main
      .map((inst, i) => {
        const def = getCard(inst.defId);
        if (!def) return '';
        return htmlCarte(def, {
          data: { 'mulligan-index': String(i) },
          interactive: true,
          selectionnee: rejets.has(i),
          inactive: rejets.has(i),
        });
      })
      .join('');
    return `<div class="ecran">
      <header class="barre"><h2>Main de départ</h2></header>
      <div class="ecran__corps">
        <p class="vide" style="padding:12px 0">Touchez les cartes à remettre dans le deck. Vous en piocherez autant.</p>
        <div class="grille">${cartes}</div>
      </div>
      <div class="actions" style="padding:12px 16px calc(12px + var(--sr-bas))">
        <button class="bouton bouton--primaire bouton--bloc" data-mulligan-valider>
          ${rejets.size === 0 ? 'Garder cette main' : `Remplacer ${rejets.size} carte${rejets.size > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>`;
  }

  /** Destinations légales à mettre en évidence selon la sélection courante. */
  function surbrillance(): { posables: number[]; ciblesMoi: Set<number>; ciblesEux: Set<number>; herosCiblable: boolean } {
    const posables: number[] = [];
    const ciblesMoi = new Set<number>();
    const ciblesEux = new Set<number>();
    let herosCiblable = false;

    if (!selection || etat.actif !== MOI || etat.phase !== 'jeu') {
      return { posables, ciblesMoi, ciblesEux, herosCiblable };
    }

    if (selection.type === 'creature') {
      const c = trouverCreature(etat, selection.uid);
      if (c) {
        for (const cible of ciblesLegales(etat, c)) {
          if (cible === 'joueur') herosCiblable = true;
          else ciblesEux.add(cible);
        }
      }
      return { posables, ciblesMoi, ciblesEux, herosCiblable };
    }

    if (selection.type === 'pouvoir') {
      for (const a of actionsLegales(etat)) {
        if (a.type !== 'pouvoir-terrain' || a.cibleUid === undefined) continue;
        const c = trouverCreature(etat, a.cibleUid);
        if (!c) continue;
        (c.proprietaire === MOI ? ciblesMoi : ciblesEux).add(c.uid);
      }
      return { posables, ciblesMoi, ciblesEux, herosCiblable };
    }

    // On fige l'identifiant : la fermeture ci-dessous perdrait le rétrécissement
    // de type appliqué à `selection`.
    const uidChoisi = selection.uid;
    const inst = etat.joueurs[MOI].main.find((x) => x.uid === uidChoisi);
    const def = inst && getCard(inst.defId);
    if (!def) return { posables, ciblesMoi, ciblesEux, herosCiblable };

    if (def.kind === 'creature' && !def.evolueDe) {
      for (let l = 0; l < LIGNES; l++) if (!etat.joueurs[MOI].lignes[l]) posables.push(l);
    } else if (def.kind === 'creature' && def.evolueDe) {
      for (const c of etat.joueurs[MOI].lignes) {
        if (c && peutEvoluerSur(etat, def, c)) ciblesMoi.add(c.uid);
      }
    } else {
      for (const uid of ciblesPourCarte(etat, def, MOI) ?? []) {
        const c = trouverCreature(etat, uid);
        if (c) (c.proprietaire === MOI ? ciblesMoi : ciblesEux).add(uid);
      }
    }
    return { posables, ciblesMoi, ciblesEux, herosCiblable };
  }

  function html(): string {
    if (etat.phase === 'mulligan') return htmlMulligan();

    const { posables, ciblesMoi, ciblesEux, herosCiblable } = surbrillance();
    const attaquablesEux = selection?.type === 'creature' ? new Set(ciblesEux) : new Set<number>();
    const monTour = etat.actif === MOI && etat.phase === 'jeu';

    // Le champ regroupe les deux rangées et la bande centrale, pour que les
    // trois lignes se lisent comme trois couloirs qui se font face.
    return `<div class="ecran">
      <div class="plateau ${occupe ? 'est-occupe' : ''}">
        ${htmlHeros(IA, herosCiblable)}
        <div class="champ">
          ${htmlLignes(IA, [], ciblesEux, attaquablesEux)}
          ${htmlBande()}
          ${htmlLignes(MOI, posables, ciblesMoi, new Set())}
        </div>
        ${htmlHeros(MOI, false)}
        <div class="tiroir">${selection ? htmlApercu() : htmlPouvoir()}</div>
        ${htmlMain()}
        <div class="actions">
          <button class="bouton bouton--fantome" data-quitter aria-label="Quitter la partie">Quitter</button>
          <button class="bouton bouton--primaire" data-fin-tour ${monTour && !occupe ? '' : 'disabled'}>
            ${occupe ? 'Tour adverse…' : monTour ? 'Fin du tour' : 'En attente'}
          </button>
        </div>
      </div>
    </div>`;
  }

  // -------------------------------------------------------------------------
  // Animations
  // -------------------------------------------------------------------------

  function nombreVolant(selecteur: string, texte: string, variante: string): void {
    const cible = q(racineEl, selecteur);
    if (!cible) return;
    const r = cible.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `nombre-volant nombre-volant--${variante}`;
    el.textContent = texte;
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top + r.height / 2}px`;
    document.body.appendChild(el);
    cible.classList.add('anime-degat');
    setTimeout(() => cible.classList.remove('anime-degat'), 340);
    setTimeout(() => el.remove(), 950);
  }

  function animerJournal(journal: GameEvent[]): void {
    for (const e of journal) {
      if (e.t === 'degats') {
        const sel = e.cibleUid !== null ? `[data-creature="${e.cibleUid}"]` : `[data-heros="${e.joueur}"]`;
        const suffixe = e.faiblesse ? ' ⚡' : e.resistance ? ' ⛨' : '';
        nombreVolant(sel, `−${e.valeur}${suffixe}`, e.faiblesse ? 'faiblesse' : 'degat');
      } else if (e.t === 'soin') {
        const sel = e.cibleUid !== null ? `[data-creature="${e.cibleUid}"]` : `[data-heros="${e.joueur}"]`;
        nombreVolant(sel, `+${e.valeur}`, 'soin');
      }
    }
  }

  function banniere(texte: string): void {
    const el = document.createElement('div');
    el.className = 'consigne';
    el.textContent = texte;
    q(racineEl, '.plateau')?.appendChild(el);
    setTimeout(() => el.remove(), 1250);
  }

  // -------------------------------------------------------------------------
  // Déroulement
  // -------------------------------------------------------------------------

  function redessiner(): void {
    racineEl.innerHTML = html();
  }

  function jouer(action: Action): void {
    const phrase = decrireAction(etat, action);
    const apres = applyAction(etat, action);
    if (apres.journal.length === 0) {
      selection = null;
      redessiner();
      return;
    }
    etat = apres;
    selection = null;
    if (phrase) derniereAction = phrase;
    redessiner();
    animerJournal(apres.journal);
    vibrer(10);
    if (etat.phase === 'termine') terminer();
  }

  async function finirTour(): Promise<void> {
    if (occupe || etat.actif !== MOI || etat.phase !== 'jeu') return;
    occupe = true;
    selection = null;
    derniereAction = null;
    etat = applyAction(etat, { type: 'fin-tour' });
    redessiner();
    if (etat.phase === 'termine') {
      occupe = false;
      terminer();
      return;
    }

    banniere(`Tour de ${etat.joueurs[IA].nom}`);
    await pause(700);
    if (annule) return;

    // L'IA calcule tout son tour, puis on rejoue ses actions une par une pour
    // que le joueur puisse suivre ce qui se passe.
    const suite = jouerTourIA(etat, config.difficulte, ((Date.now() & 0xffff) ^ (etat.tour * 7919)) >>> 0);
    for (const action of suite) {
      if (annule) return;
      if (etat.phase !== 'jeu') break;
      // La phrase se construit sur l'état d'avant : c'est le dernier moment où
      // le nom de la carte jouée et celui de la cible sont encore connus.
      const phrase = decrireAction(etat, action);
      etat = applyAction(etat, action);
      if (phrase) derniereAction = phrase;
      redessiner();
      animerJournal(etat.journal);
      await pause(action.type === 'fin-tour' ? 180 : phrase ? 900 : 500);
      if (etat.phase === 'termine') break;
    }

    occupe = false;
    if (etat.phase === 'termine') {
      terminer();
      return;
    }
    derniereAction = null;
    redessiner();
    banniere('À vous de jouer');
  }

  function terminer(): void {
    const victoire = etat.vainqueur === MOI;
    const gain = victoire ? config.recompense : 0;
    enregistrerResultat(victoire, gain);
    config.surFin?.(victoire);

    const overlay = document.createElement('div');
    overlay.className = 'fin';
    overlay.innerHTML = `
      <h2 class="fin__titre ${victoire ? 'est-victoire' : 'est-defaite'}">${victoire ? 'Victoire' : 'Défaite'}</h2>
      <p>${victoire
        ? `Vous avez vaincu ${esc(etat.joueurs[IA].nom)} en ${etat.tour} tours.`
        : `${esc(etat.joueurs[IA].nom)} l'emporte. La prochaine sera la bonne.`}</p>
      ${gain > 0 ? `<p class="fin__gain">+${gain} pièces</p>` : ''}
      <div class="modale__actions"><button class="bouton bouton--primaire" data-fin-retour>Continuer</button></div>`;
    racineEl.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-fin-retour]')) {
        annule = true;
        if (config.retourVers) racineEcran(config.retourVers);
        else retour();
      }
    });
  }

  // -------------------------------------------------------------------------
  // Interactions
  // -------------------------------------------------------------------------

  function toucherCarteMain(uid: number): void {
    if (occupe || etat.actif !== MOI || etat.phase !== 'jeu') return;
    const inst = etat.joueurs[MOI].main.find((c) => c.uid === uid);
    const def = inst && getCard(inst.defId);
    if (!def) return;

    // Deuxième touche sur la même carte : on joue, si aucune cible n'est requise.
    if (selection?.type === 'main' && selection.uid === uid) {
      if (def.kind === 'zone') return jouer({ type: 'jouer-zone', uid });
      if (def.kind === 'sort' && ciblesPourCarte(etat, def, MOI) === null) {
        return jouer({ type: 'jouer-sort', uid });
      }
      selection = null;
      redessiner();
      return;
    }

    const jouable = actionsLegales(etat).some((a) => 'uid' in a && a.uid === uid);
    if (!jouable) {
      selection = null;
      redessiner();
      return;
    }
    selection = { type: 'main', uid };
    vibrer(8);
    redessiner();
  }

  function toucherLigne(cote: number, ligne: number): void {
    if (occupe || etat.actif !== MOI) return;
    if (selection?.type !== 'main' || cote !== MOI) return;
    jouer({ type: 'jouer-creature', uid: selection.uid, ligne });
  }

  function toucherCreature(uid: number): void {
    if (occupe || etat.actif !== MOI || etat.phase !== 'jeu') return;
    const c = trouverCreature(etat, uid);
    if (!c) return;

    if (selection?.type === 'main') {
      const uidChoisi = selection.uid;
      const inst = etat.joueurs[MOI].main.find((x) => x.uid === uidChoisi);
      const def = inst && getCard(inst.defId);
      if (!def) return;
      if (def.kind === 'creature' && def.evolueDe) return jouer({ type: 'evoluer', uid: uidChoisi, cibleUid: uid });
      if (def.kind === 'relique') return jouer({ type: 'jouer-relique', uid: uidChoisi, cibleUid: uid });
      if (def.kind === 'sort') return jouer({ type: 'jouer-sort', uid: uidChoisi, cibleUid: uid });
      return;
    }
    if (selection?.type === 'pouvoir') return jouer({ type: 'pouvoir-terrain', cibleUid: uid });
    if (selection?.type === 'creature') {
      const att = trouverCreature(etat, selection.uid);
      if (att && ciblesLegales(etat, att).includes(uid)) {
        return jouer({ type: 'attaquer', attaquantUid: selection.uid, cible: uid });
      }
    }

    if (c.proprietaire === MOI && peutAttaquer(etat, c)) {
      selection = { type: 'creature', uid };
      vibrer(8);
      redessiner();
    } else if (!c.token) {
      ouvrirDetail(c.defId);
    }
  }

  function toucherHeros(j: number): void {
    if (occupe || etat.actif !== MOI) return;
    if (selection?.type === 'creature' && j === IA) {
      const att = trouverCreature(etat, selection.uid);
      if (att && ciblesLegales(etat, att).includes('joueur')) {
        return jouer({ type: 'attaquer', attaquantUid: selection.uid, cible: 'joueur' });
      }
    }
  }

  function ouvrirDetail(defId: string): void {
    const def = getCard(defId);
    if (!def) return;
    const modale = document.createElement('div');
    modale.className = 'modale';
    modale.innerHTML = `<div class="modale__contenu">${htmlCarte(def)}
      <button class="bouton bouton--fantome">Fermer</button></div>`;
    modale.addEventListener('click', () => modale.remove());
    document.body.appendChild(modale);
  }

  return {
    html,
    monter(r: HTMLElement) {
      racineEl = r;
      annule = false;

      sur(r, '[data-mulligan-index]', 'click', (el) => {
        const i = Number(el.dataset.mulliganIndex);
        if (rejets.has(i)) rejets.delete(i);
        else rejets.add(i);
        redessiner();
      });
      sur(r, '[data-mulligan-valider]', 'click', () => {
        etat = applyAction(etat, { type: 'mulligan', rejeter: [...rejets] });
        rejets = new Set();
        redessiner();
        banniere('À vous de jouer');
      });

      sur(r, '[data-main-uid]', 'click', (el) => toucherCarteMain(Number(el.dataset.mainUid)));
      sur(r, '[data-creature]', 'click', (el) => toucherCreature(Number(el.dataset.creature)));
      sur(r, '.ligne', 'click', (el) => {
        if (el.querySelector('[data-creature]')) return; // la créature gère elle-même
        toucherLigne(Number(el.dataset.cote), Number(el.dataset.ligne));
      });
      sur(r, '[data-heros]', 'click', (el) => toucherHeros(Number(el.dataset.heros)));
      sur(r, '[data-pouvoir]', 'click', () => {
        if (occupe || etat.actif !== MOI) return;
        const t = getTerrain(etat.joueurs[MOI].terrainId);
        if (!t) return;
        if (t.pouvoirTarget === 'aucune') return jouer({ type: 'pouvoir-terrain' });
        selection = selection?.type === 'pouvoir' ? null : { type: 'pouvoir' };
        redessiner();
      });
      sur(r, '[data-annuler]', 'click', () => {
        selection = null;
        redessiner();
      });
      sur(r, '[data-fin-tour]', 'click', () => void finirTour());
      sur(r, '[data-quitter]', 'click', () => {
        annule = true;
        if (config.retourVers) racineEcran(config.retourVers);
        else retour();
      });

      // Appui long sur une carte de la main : ouvre sa fiche détaillée.
      let minuteur: number | undefined;
      const annulerAppui = () => {
        if (minuteur) window.clearTimeout(minuteur);
        minuteur = undefined;
      };
      r.addEventListener('pointerdown', (e) => {
        const cible = (e.target as HTMLElement).closest<HTMLElement>('[data-main-uid]');
        if (!cible) return;
        minuteur = window.setTimeout(() => {
          const inst = etat.joueurs[MOI].main.find((c) => c.uid === Number(cible.dataset.mainUid));
          if (inst) ouvrirDetail(inst.defId);
        }, 480);
      });
      r.addEventListener('pointerup', annulerAppui);
      r.addEventListener('pointercancel', annulerAppui);
      r.addEventListener('pointermove', annulerAppui);
    },
    demonter() {
      annule = true;
    },
  };
}
