/**
 * Service worker.
 *
 * Deux caches aux durées de vie distinctes :
 *   - le *socle* (HTML, CSS, JS, icônes) est versionné et remplacé à chaque
 *     déploiement ; sa liste est injectée au build par `tools/postbuild.mjs` ;
 *   - le *média* (les 158 illustrations, les polices) est stable et conservé
 *     d'une version à l'autre — le contenu d'une illustration ne change jamais,
 *     seul son nom changerait.
 *
 * Les ressources du socle portent une empreinte dans leur nom : les servir
 * depuis le cache est donc sûr. Les navigations passent d'abord par le réseau,
 * pour qu'un nouveau déploiement soit vu dès qu'une connexion existe.
 */
const VERSION = '__VERSION__';
const SOCLE = '__SOCLE__';
const CACHE_SOCLE = `invento-socle-${VERSION}`;
const CACHE_MEDIA = 'invento-media-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_SOCLE)
      .then((c) => c.addAll(SOCLE))
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) =>
        Promise.all(
          noms
            .filter((n) => n.startsWith('invento-socle-') && n !== CACHE_SOCLE)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Le client demande l'activation immédiate de la version en attente. */
self.addEventListener('message', (e) => {
  if (e.data === 'activer-maintenant') self.skipWaiting();
});

function estMedia(url) {
  return (
    url.pathname.includes('/art/') ||
    url.pathname.includes('/demarrage/') ||
    url.hostname.endsWith('googleapis.com') ||
    url.hostname.endsWith('gstatic.com')
  );
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const memeOrigine = url.origin === self.location.origin;
  const media = estMedia(url);
  if (!memeOrigine && !media) return;

  // Navigation : réseau d'abord, cache en secours. C'est ce qui permet de
  // récupérer une nouvelle version sans vider le cache à la main.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(CACHE_SOCLE).then((c) => c.put(req, copie)).catch(() => undefined);
          return rep;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html'))),
    );
    return;
  }

  const nomCache = media ? CACHE_MEDIA : CACHE_SOCLE;
  e.respondWith(
    caches.match(req).then((cachee) => {
      if (cachee) return cachee;
      return fetch(req).then((rep) => {
        if (rep.ok || rep.type === 'opaque') {
          const copie = rep.clone();
          caches.open(nomCache).then((c) => c.put(req, copie)).catch(() => undefined);
        }
        return rep;
      });
    }),
  );
});
