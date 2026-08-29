/**
 * Point d'entrée de l'application.
 */
import './ui/styles.css';
import { demarrer } from './ui/app';
import { ecranAccueil } from './ui/ecrans/accueil';
import { enregistrerServiceWorker, prechargerIllustrations, proposerInstallation } from './save/horsligne';

const racine = document.getElementById('app');
if (racine) demarrer(racine, ecranAccueil);

enregistrerServiceWorker();
proposerInstallation();
window.addEventListener('load', () => prechargerIllustrations());

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
