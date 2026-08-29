#!/usr/bin/env node
/**
 * Écrans de démarrage iOS.
 *
 * Sans ces images, iOS affiche une page blanche pendant le lancement d'une
 * application ajoutée à l'écran d'accueil. Chaque appareil réclame une image à
 * ses dimensions exactes, sélectionnée par une requête média — d'où la table
 * ci-dessous et la génération du bloc de balises correspondant.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** [largeur logique, hauteur logique, densité] — portrait uniquement. */
const APPAREILS = [
  [375, 667, 2], // iPhone SE, 8
  [414, 896, 2], // iPhone XR, 11
  [375, 812, 3], // iPhone X, XS, 11 Pro
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [390, 844, 3], // iPhone 12, 13, 14
  [393, 852, 3], // iPhone 14 Pro, 15, 16
  [428, 926, 3], // iPhone 12–14 Pro Max
  [430, 932, 3], // iPhone 15 Pro Max, 16 Plus
  [402, 874, 3], // iPhone 16 Pro
  [440, 956, 3], // iPhone 16 Pro Max
];

const svg = (w, h) => {
  const c = Math.min(w, h);
  const marque = c * 0.34;
  const cx = w / 2;
  const cy = h / 2 - h * 0.04;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="or" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3cf"/><stop offset=".45" stop-color="#d7b463"/><stop offset="1" stop-color="#8a6c28"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#0a0c11"/>
  <path d="M${cx} ${cy - marque} L${cx + marque * 0.72} ${cy - marque * 0.28} L${cx} ${cy + marque} L${cx - marque * 0.72} ${cy - marque * 0.28} Z" fill="url(#or)"/>
  <path d="M${cx} ${cy - marque} L${cx + marque * 0.72} ${cy - marque * 0.28} L${cx - marque * 0.72} ${cy - marque * 0.28} Z" fill="#fff6dd" opacity=".5"/>
  <text x="${cx}" y="${cy + marque * 2.0}" text-anchor="middle"
        font-family="Georgia, serif" font-size="${c * 0.085}" letter-spacing="${c * 0.028}"
        fill="#d7b463">INVENTO</text>
</svg>`;
};

const dossier = join(process.cwd(), 'public', 'demarrage');
await mkdir(dossier, { recursive: true });

const balises = [];
for (const [lw, lh, d] of APPAREILS) {
  const w = lw * d;
  const h = lh * d;
  const nom = `demarrage-${w}x${h}.png`;
  await sharp(Buffer.from(svg(w, h))).png({ compressionLevel: 9 }).toFile(join(dossier, nom));
  balises.push(
    `  <link rel="apple-touch-startup-image" href="demarrage/${nom}"\n` +
    `        media="(device-width: ${lw}px) and (device-height: ${lh}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)">`,
  );
}

await writeFile(join(process.cwd(), 'tools', 'demarrage-balises.html'), balises.join('\n') + '\n');
console.log(`${APPAREILS.length} écrans de démarrage générés dans public/demarrage/.`);
console.log('Balises écrites dans tools/demarrage-balises.html (à coller dans index.html).');
