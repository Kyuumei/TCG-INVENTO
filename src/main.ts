/**
 * Point d'entrée de l'application.
 */
import './ui/styles.css';
import { demarrer } from './ui/app';
import { ecranAccueil } from './ui/ecrans/accueil';

const racine = document.getElementById('app');
if (racine) {
  demarrer(racine, ecranAccueil);
}

// Enregistrement du service worker : c'est lui qui rend le jeu jouable hors
// ligne une fois ajouté à l'écran d'accueil.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => {
      // Sans service worker, le jeu fonctionne, mais seulement en ligne.
    });
  });
}

// Empêche le zoom par double-tape, qui gêne les touches rapides sur le plateau.
let dernierTap = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const maintenant = Date.now();
    if (maintenant - dernierTap < 300) e.preventDefault();
    dernierTap = maintenant;
  },
  { passive: false },
);
