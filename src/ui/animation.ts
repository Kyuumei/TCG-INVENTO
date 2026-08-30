/**
 * Couche d'animation.
 *
 * L'interface se redessine d'un bloc à chaque action, ce qui interdit
 * d'animer les éléments eux-mêmes : ils sont détruits puis recréés. On anime
 * donc des *fantômes* — des copies posées dans un calque au-dessus de la page,
 * qui se déplacent pendant que le plateau se met à jour dessous.
 *
 * C'est ce mouvement, plus que le dessin, qui distingue un jeu d'une image :
 * une carte doit être vue quittant la main, une attaque doit avoir un élan, et
 * une créature doit mourir plutôt que disparaître.
 */

let calque: HTMLElement | null = null;

function obtenirCalque(): HTMLElement {
  if (calque && calque.isConnected) return calque;
  calque = document.createElement('div');
  calque.className = 'calque-anim';
  calque.setAttribute('aria-hidden', 'true');
  document.body.appendChild(calque);
  return calque;
}

/** L'utilisateur a demandé moins d'animations : on les rend instantanées. */
export function mouvementReduit(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function attendre(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Crée un fantôme positionné sur un rectangle donné. */
function fantome(html: string, r: DOMRect, classe = ''): HTMLElement {
  const el = document.createElement('div');
  el.className = `fantome ${classe}`;
  el.style.left = `${r.left}px`;
  el.style.top = `${r.top}px`;
  el.style.width = `${r.width}px`;
  el.style.height = `${r.height}px`;
  el.innerHTML = html;
  obtenirCalque().appendChild(el);
  return el;
}

/**
 * Fait voler une copie d'un élément d'un rectangle à un autre, avec une légère
 * courbe : un déplacement rectiligne paraît mécanique.
 */
export async function voler(
  html: string,
  depuis: DOMRect,
  vers: DOMRect,
  options: { duree?: number; echelleFin?: number; rotation?: number; classe?: string } = {},
): Promise<void> {
  if (mouvementReduit()) return;
  const duree = options.duree ?? 300;
  const el = fantome(html, depuis, options.classe);

  const dx = vers.left + vers.width / 2 - (depuis.left + depuis.width / 2);
  const dy = vers.top + vers.height / 2 - (depuis.top + depuis.height / 2);
  const echelle = options.echelleFin ?? vers.width / Math.max(1, depuis.width);
  // Le sommet de l'arc, décalé perpendiculairement à la trajectoire.
  const arc = Math.min(70, Math.abs(dx) * 0.22 + 22);

  const anim = el.animate(
    [
      { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - arc}px) scale(${(1 + echelle) / 2}) rotate(${(options.rotation ?? 0) / 2}deg)`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${echelle}) rotate(${options.rotation ?? 0}deg)`, opacity: 1 },
    ],
    { duration: duree, easing: 'cubic-bezier(.35,.05,.2,1)', fill: 'forwards' },
  );
  await anim.finished.catch(() => undefined);
  el.remove();
}

/**
 * Élan d'attaque : l'attaquant se jette vers sa cible puis revient. On anime
 * l'élément réel, pas un fantôme — il existe encore à ce moment-là.
 */
export async function frapper(attaquant: HTMLElement, cible: DOMRect): Promise<void> {
  if (mouvementReduit()) return;
  const r = attaquant.getBoundingClientRect();
  const dx = cible.left + cible.width / 2 - (r.left + r.width / 2);
  const dy = cible.top + cible.height / 2 - (r.top + r.height / 2);
  const dist = Math.hypot(dx, dy) || 1;
  // On ne parcourt pas toute la distance : le contact suffit à raconter le coup.
  const portee = Math.min(0.42, 62 / dist);

  attaquant.style.zIndex = '20';
  const anim = attaquant.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${-dx * 0.10}px, ${-dy * 0.10}px)`, offset: 0.22 },
      { transform: `translate(${dx * portee}px, ${dy * portee}px)`, offset: 0.52 },
      { transform: 'translate(0,0)' },
    ],
    { duration: 380, easing: 'cubic-bezier(.3,.9,.3,1)' },
  );
  await anim.finished.catch(() => undefined);
  attaquant.style.zIndex = '';
}

/** Disparition d'une créature : la carte se casse et s'efface. */
export async function mourir(html: string, r: DOMRect): Promise<void> {
  if (mouvementReduit()) return;
  const el = fantome(html, r, 'fantome--mort');
  const anim = el.animate(
    [
      { transform: 'scale(1) rotate(0deg)', opacity: 1, filter: 'brightness(1)' },
      { transform: 'scale(1.08) rotate(-2deg)', opacity: 1, filter: 'brightness(2.4)', offset: 0.18 },
      { transform: 'scale(.72) rotate(9deg) translateY(26px)', opacity: 0, filter: 'brightness(.6)' },
    ],
    { duration: 460, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' },
  );
  await anim.finished.catch(() => undefined);
  el.remove();
}

/** Arrivée en jeu : la carte se pose avec un léger rebond. */
export function apparaitre(el: HTMLElement): void {
  if (mouvementReduit()) return;
  el.animate(
    [
      { transform: 'scale(.7) translateY(-14px)', opacity: 0 },
      { transform: 'scale(1.06)', opacity: 1, offset: 0.62 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { duration: 340, easing: 'cubic-bezier(.3,1.4,.5,1)' },
  );
}

/** Onde de choc circulaire, pour les effets de zone. */
export function onde(centre: DOMRect, couleur: string): void {
  if (mouvementReduit()) return;
  const el = document.createElement('div');
  el.className = 'onde';
  el.style.left = `${centre.left + centre.width / 2}px`;
  el.style.top = `${centre.top + centre.height / 2}px`;
  el.style.borderColor = couleur;
  obtenirCalque().appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0)', opacity: .85 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
    ],
    { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)' },
  ).finished.catch(() => undefined).then(() => el.remove());
}

/** Photographie la position de toutes les créatures avant une mutation. */
export function releverPositions(racine: ParentNode): Map<number, { rect: DOMRect; html: string }> {
  const m = new Map<number, { rect: DOMRect; html: string }>();
  for (const el of racine.querySelectorAll<HTMLElement>('[data-creature]')) {
    const uid = Number(el.dataset.creature);
    m.set(uid, { rect: el.getBoundingClientRect(), html: el.outerHTML });
  }
  return m;
}
