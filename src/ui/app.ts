/**
 * Coque de l'application et navigation.
 *
 * Pas de bibliothèque : un écran est un objet qui sait produire son HTML et
 * s'accrocher au DOM. Une pile conserve l'historique, ce qui donne un bouton
 * retour cohérent sans routeur ni URL — le comportement attendu d'une
 * application installée sur l'écran d'accueil.
 */

export interface Ecran {
  html(): string;
  /** Appelé après insertion dans le DOM : c'est là qu'on pose les écouteurs. */
  monter?(racine: HTMLElement): void;
  /** Appelé avant remplacement : libère minuteurs et écouteurs globaux. */
  demonter?(): void;
}

type Fabrique = () => Ecran;

const pile: Fabrique[] = [];
let courant: Ecran | null = null;
let racine: HTMLElement;

export function demarrer(conteneur: HTMLElement, initial: Fabrique): void {
  racine = conteneur;
  pile.push(initial);
  rendre();
}

function rendre(): void {
  courant?.demonter?.();
  const fabrique = pile[pile.length - 1];
  if (!fabrique) return;
  courant = fabrique();
  racine.innerHTML = courant.html();
  courant.monter?.(racine);
  racine.scrollTop = 0;
}

/** Empile un nouvel écran. */
export function aller(f: Fabrique): void {
  pile.push(f);
  rendre();
}

/** Remplace l'écran courant, sans grossir l'historique. */
export function remplacer(f: Fabrique): void {
  pile[pile.length - 1] = f;
  rendre();
}

/** Revient à l'écran précédent, ou ne fait rien s'il n'y en a pas. */
export function retour(): void {
  if (pile.length <= 1) return;
  pile.pop();
  rendre();
}

/** Vide la pile et repart d'un écran donné (retour à l'accueil). */
export function racineEcran(f: Fabrique): void {
  pile.length = 0;
  pile.push(f);
  rendre();
}

/** Re-rend l'écran courant : utile après une modification du profil. */
export function rafraichir(): void {
  rendre();
}

// ---------------------------------------------------------------------------
// Utilitaires DOM
// ---------------------------------------------------------------------------

/** Délégation d'événement : survit aux re-rendus partiels. */
export function sur<K extends keyof HTMLElementEventMap>(
  conteneur: HTMLElement,
  selecteur: string,
  type: K,
  gestionnaire: (cible: HTMLElement, e: HTMLElementEventMap[K]) => void,
): void {
  conteneur.addEventListener(type, (e) => {
    const cible = (e.target as HTMLElement | null)?.closest(selecteur);
    if (cible instanceof HTMLElement && conteneur.contains(cible)) {
      gestionnaire(cible, e as HTMLElementEventMap[K]);
    }
  });
}

export function q<T extends HTMLElement = HTMLElement>(racineEl: ParentNode, sel: string): T | null {
  return racineEl.querySelector<T>(sel);
}

export function qq<T extends HTMLElement = HTMLElement>(racineEl: ParentNode, sel: string): T[] {
  return Array.from(racineEl.querySelectorAll<T>(sel));
}

/** Barre supérieure standard, avec bouton retour optionnel. */
export function barre(titre: string, options: { retour?: boolean; droite?: string } = {}): string {
  const r = options.retour !== false
    ? `<button class="barre__retour" data-action="retour" aria-label="Retour"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8"/></svg></button>`
    : '';
  return `<header class="barre">${r}<h2>${titre}</h2>${options.droite ?? ''}</header>`;
}

/** Petite vibration de retour tactile, quand l'appareil la propose. */
export function vibrer(ms = 12): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* certains navigateurs refusent hors interaction utilisateur */
    }
  }
}

/** Attente utilisée pour cadencer les animations de l'IA. */
export function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
