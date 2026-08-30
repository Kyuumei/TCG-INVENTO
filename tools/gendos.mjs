#!/usr/bin/env node
/**
 * Dos de carte.
 *
 * Reprend le motif dessiné dans Claude Design : fond violet très sombre, double
 * filet doré, et une rosace de pétales en deux couches décalées d'un demi-pas,
 * dont le recouvrement crée les nuances. Le tout en vectoriel, donc net à toute
 * taille et modifiable en une variable.
 *
 * Un fichier `public/cadres/dos.png` déposé à la main prend de toute façon le
 * dessus : ce script sert de point de départ, pas de contrainte.
 */
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const L = 630;
const H = 880;

const PETALES = 13;
const OR = '#b09a5c';
const OR_CLAIR = '#d8c584';

/** Un pétale en amande, pointe vers le haut, dessiné depuis le centre. */
function petale(cx, cy, longueur, largeur) {
  const y0 = cy - longueur;
  return `M ${cx} ${y0}
          C ${cx + largeur} ${cy - longueur * 0.42}, ${cx + largeur} ${cy - longueur * 0.1}, ${cx} ${cy}
          C ${cx - largeur} ${cy - longueur * 0.1}, ${cx - largeur} ${cy - longueur * 0.42}, ${cx} ${y0} Z`;
}

function couronne(cx, cy, longueur, largeur, couleur, opacite, decalage) {
  let out = '';
  for (let i = 0; i < PETALES; i++) {
    const angle = (360 / PETALES) * i + decalage;
    out += `<path d="${petale(cx, cy, longueur, largeur)}" fill="${couleur}" fill-opacity="${opacite}"
              transform="rotate(${angle} ${cx} ${cy})"/>`;
  }
  return out;
}

const cx = L / 2;
const cy = H / 2;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">
  <defs>
    <radialGradient id="fond" cx="50%" cy="46%" r="72%">
      <stop offset="0%" stop-color="#282040"/>
      <stop offset="58%" stop-color="#181330"/>
      <stop offset="100%" stop-color="#0c0918"/>
    </radialGradient>
    <linearGradient id="filet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${OR_CLAIR}"/>
      <stop offset="45%" stop-color="${OR}"/>
      <stop offset="100%" stop-color="#7a683a"/>
    </linearGradient>
    <radialGradient id="coeur" cx="38%" cy="34%" r="70%">
      <stop offset="0%" stop-color="#f0e2ac"/>
      <stop offset="55%" stop-color="${OR}"/>
      <stop offset="100%" stop-color="#6d5c30"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="46%" r="46%">
      <stop offset="0%" stop-color="#b9a9ff" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="#b9a9ff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${L}" height="${H}" fill="url(#fond)"/>
  <rect width="${L}" height="${H}" fill="url(#halo)"/>

  <!-- Rayures obliques très discrètes : elles évitent l'aplat parfait. -->
  <g stroke="#ffffff" stroke-opacity="0.022" stroke-width="1">
    ${Array.from({ length: 26 }, (_, i) => {
      const x = -H + i * 62;
      return `<line x1="${x}" y1="${H}" x2="${x + H}" y2="0"/>`;
    }).join('')}
  </g>

  <!-- Double filet doré. -->
  <rect x="26" y="26" width="${L - 52}" height="${H - 52}" rx="10"
        fill="none" stroke="url(#filet)" stroke-width="5"/>
  <rect x="44" y="44" width="${L - 88}" height="${H - 88}" rx="6"
        fill="none" stroke="url(#filet)" stroke-width="1.6" stroke-opacity="0.8"/>

  <!-- Rosace : deux couronnes décalées d'un demi-pas, leur recouvrement fait
       les nuances sans qu'aucune couleur ne soit peinte deux fois. -->
  ${couronne(cx, cy, 236, 66, '#6d5568', 0.62, 0)}
  ${couronne(cx, cy, 210, 58, '#a9a0cc', 0.42, 360 / PETALES / 2)}

  <circle cx="${cx}" cy="${cy}" r="42" fill="url(#coeur)"/>
  <circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="#5c4c26" stroke-width="1.5" stroke-opacity="0.7"/>
</svg>`;

await mkdir(join(process.cwd(), 'public', 'cadres'), { recursive: true });
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
await writeFile(join(process.cwd(), 'public', 'cadres', 'dos.png'), png);
console.log(`Dos de carte écrit : public/cadres/dos.png (${L} × ${H}, ${(png.length / 1024).toFixed(0)} Ko)`);
