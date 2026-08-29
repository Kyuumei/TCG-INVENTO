/**
 * Service worker.
 *
 * Stratégie « cache d'abord » : une fois la première visite effectuée, le jeu
 * démarre et se joue intégralement hors ligne — c'est tout l'intérêt d'une
 * application ajoutée à l'écran d'accueil. Les réponses réseau réussies sont
 * mises en cache au fil de l'eau, ce qui couvre aussi les 158 illustrations
 * sans avoir à les lister ici.
 */
const CACHE = 'invento-v1';
const SOCLE = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SOCLE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Les polices Google sont mises en cache comme le reste ; tout le reste des
  // origines tierces est laissé au navigateur.
  const memeOrigine = url.origin === self.location.origin;
  const police = url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com');
  if (!memeOrigine && !police) return;

  e.respondWith(
    caches.match(req).then((cachee) => {
      if (cachee) return cachee;
      return fetch(req)
        .then((reponse) => {
          if (reponse.ok || reponse.type === 'opaque') {
            const copie = reponse.clone();
            caches.open(CACHE).then((c) => c.put(req, copie)).catch(() => undefined);
          }
          return reponse;
        })
        .catch(() =>
          // Hors ligne et non mise en cache : on renvoie la coque pour les
          // navigations, sinon on laisse l'erreur remonter.
          req.mode === 'navigate' ? caches.match('./index.html') : Promise.reject(new Error('hors ligne')),
        );
    }),
  );
});
