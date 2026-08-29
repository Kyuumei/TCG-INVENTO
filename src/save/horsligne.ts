/**
 * Installation, mise à jour et disponibilité hors ligne.
 *
 * Trois responsabilités :
 *   1. enregistrer le service worker et surveiller les nouvelles versions ;
 *   2. précharger les 158 illustrations pour que le jeu soit réellement
 *      jouable sans connexion — elles sont chargées paresseusement par les
 *      cartes, donc une illustration jamais affichée ne serait jamais en cache ;
 *   3. proposer l'installation sur l'écran d'accueil là où le navigateur
 *      l'expose (Android, Chrome de bureau ; iOS passe par le menu Partager).
 */
import { TOUTES_LES_CARTES, TERRAINS } from '../data/registry';
import { urlArt } from '../ui/carte';

const CLE_PRECHARGE = 'invento.precharge.v1';

/**
 * Vrai lorsque le jeu tourne depuis le fichier unique produit par
 * `npm run bundle` : il embarque déjà tout, mais n'a ni service worker ni
 * manifeste — proposer une installation y serait trompeur.
 */
function estAutonome(): boolean {
  return (globalThis as { __AUTONOME?: boolean }).__AUTONOME === true;
}

/** Bandeau discret en bas d'écran, réutilisé pour les mises à jour et les avis. */
function bandeau(texte: string, action?: { libelle: string; faire: () => void }): void {
  document.querySelector('.bandeau')?.remove();
  const el = document.createElement('div');
  el.className = 'bandeau';
  el.innerHTML = `<span>${texte}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.className = 'bouton bouton--primaire';
    b.textContent = action.libelle;
    b.addEventListener('click', () => {
      action.faire();
      el.remove();
    });
    el.appendChild(b);
  }
  const fermer = document.createElement('button');
  fermer.className = 'bandeau__fermer';
  fermer.setAttribute('aria-label', 'Fermer');
  fermer.textContent = '✕';
  fermer.addEventListener('click', () => el.remove());
  el.appendChild(fermer);
  document.body.appendChild(el);
  if (!action) setTimeout(() => el.remove(), 4200);
}

/**
 * Enregistre le service worker et signale les nouvelles versions.
 *
 * Une version en attente n'est jamais activée dans le dos du joueur : elle le
 * serait au beau milieu d'une partie. On propose, il décide.
 */
export function enregistrerServiceWorker(): void {
  if (estAutonome() || !('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;

  navigator.serviceWorker
    .register(new URL('sw.js', document.baseURI).href)
    .then((reg) => {
      // Une version est déjà prête et attend son tour.
      if (reg.waiting && navigator.serviceWorker.controller) proposerMaj(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const neuf = reg.installing;
        if (!neuf) return;
        neuf.addEventListener('statechange', () => {
          // `controller` non nul signifie qu'une version tournait déjà : c'est
          // une mise à jour, pas la première installation.
          if (neuf.state === 'installed' && navigator.serviceWorker.controller) proposerMaj(neuf);
        });
      });
    })
    .catch(() => {
      // Sans service worker, le jeu fonctionne, mais seulement en ligne.
    });

  let rechargement = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (rechargement) return;
    rechargement = true;
    location.reload();
  });
}

function proposerMaj(worker: ServiceWorker): void {
  bandeau('Une nouvelle version du jeu est disponible.', {
    libelle: 'Mettre à jour',
    faire: () => worker.postMessage('activer-maintenant'),
  });
}

/**
 * Met les illustrations en cache en tâche de fond, par petits lots, pour ne
 * pas concurrencer le chargement de l'écran affiché.
 */
export function prechargerIllustrations(): void {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  try {
    if (localStorage.getItem(CLE_PRECHARGE)) return;
  } catch {
    return; // stockage indisponible : on ne préchargera pas en boucle
  }

  const urls = [
    ...TOUTES_LES_CARTES.map((c) => urlArt(c.id)),
    ...TERRAINS.map((t) => urlArt(t.id)),
  ];

  const lancer = async () => {
    const LOT = 8;
    for (let i = 0; i < urls.length; i += LOT) {
      await Promise.all(
        urls.slice(i, i + LOT).map((u) =>
          fetch(u, { cache: 'force-cache' }).catch(() => undefined),
        ),
      );
    }
    try {
      localStorage.setItem(CLE_PRECHARGE, '1');
    } catch {
      /* sans importance */
    }
    bandeau('Jeu disponible hors ligne : toutes les illustrations sont en cache.');
  };

  const differer = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (differer) differer(() => void lancer());
  else setTimeout(() => void lancer(), 2500);
}

/**
 * Invite à l'installation. Chrome et Edge fournissent l'événement ;
 * iOS ne l'expose pas, on y explique donc le geste manuellement.
 */
export function proposerInstallation(): void {
  if (estAutonome()) return;
  let invite: (Event & { prompt(): Promise<void> }) | null = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invite = e as Event & { prompt(): Promise<void> };
    bandeau('Installez INVENTO pour y jouer hors ligne.', {
      libelle: 'Installer',
      faire: () => void invite?.prompt(),
    });
  });

  // iOS : pas d'événement d'installation, et le jeu n'est pas déjà lancé
  // depuis l'écran d'accueil. On décrit alors le geste, une seule fois.
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const autonome =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (iOS && !autonome) {
    try {
      if (!localStorage.getItem('invento.invite-ios')) {
        localStorage.setItem('invento.invite-ios', '1');
        setTimeout(
          () => bandeau('Ajoutez INVENTO à votre écran d’accueil : bouton Partager, puis « Sur l’écran d’accueil ».'),
          2000,
        );
      }
    } catch {
      /* stockage indisponible : on n'insiste pas */
    }
  }
}
