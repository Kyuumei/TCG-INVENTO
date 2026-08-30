#!/usr/bin/env node
/**
 * Gabarit de cadre.
 *
 * Produit une image de référence aux dimensions exactes de la carte, avec les
 * zones réservées au texte et à l'illustration. Un cadre dessiné par-dessus ce
 * gabarit s'intègre sans retouche : il suffit de laisser la fenêtre
 * d'illustration transparente et de ne rien peindre dans les zones de texte.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Géométrie de référence, en pixels sur une carte de 630 × 880. */
export const GEOMETRIE = {
  largeur: 630,
  hauteur: 880,
  rayon: 32,
  gemmeCout: { cx: 74, cy: 72, r: 42 },
  titre: { x: 118, y: 38, w: 468, h: 66 },
  evolution: { x: 44, y: 112, w: 542, h: 46 },
  art: { x: 52, y: 170, w: 526, h: 394 },
  texte: { x: 44, y: 576, w: 542, h: 118 },
  attaque: { x: 44, y: 706, w: 542, h: 66 },
  pied: { x: 44, y: 784, w: 542, h: 52 },
};

const G = GEOMETRIE;

const zone = (r, couleur, etiquette, sousTitre = '') => `
  <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="8"
        fill="${couleur}" fill-opacity="0.14" stroke="${couleur}" stroke-width="2" stroke-dasharray="8 6"/>
  <text x="${r.x + 10}" y="${r.y + 24}" font-family="monospace" font-size="17" fill="${couleur}">${etiquette}</text>
  <text x="${r.x + 10}" y="${r.y + 44}" font-family="monospace" font-size="13" fill="${couleur}" fill-opacity="0.75">
    ${r.x} , ${r.y} — ${r.w} × ${r.h}${sousTitre ? '  ·  ' + sousTitre : ''}
  </text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.largeur}" height="${G.hauteur}">
  <rect width="${G.largeur}" height="${G.hauteur}" fill="#0e1219"/>
  <rect x="1" y="1" width="${G.largeur - 2}" height="${G.hauteur - 2}" rx="${G.rayon}"
        fill="none" stroke="#d7b463" stroke-width="2"/>
  <text x="${G.largeur / 2}" y="${G.hauteur - 16}" text-anchor="middle"
        font-family="monospace" font-size="15" fill="#98a0af">
    INVENTO — gabarit de cadre ${G.largeur} × ${G.hauteur} (rapport 63:88)
  </text>

  ${zone(G.art, '#3fa5c8', 'ILLUSTRATION', 'à laisser transparente')}
  ${zone(G.titre, '#d7b463', 'TITRE + PV')}
  ${zone(G.evolution, '#9c9689', 'ÉVOLUTION', 'facultatif')}
  ${zone(G.texte, '#6fae4e', 'TEXTE DE RÈGLES')}
  ${zone(G.attaque, '#e2622a', 'LIGNE D’ATTAQUE')}
  ${zone(G.pied, '#9364c8', 'FAIBLESSE / RÉSISTANCE')}

  <circle cx="${G.gemmeCout.cx}" cy="${G.gemmeCout.cy}" r="${G.gemmeCout.r}"
          fill="#d7b463" fill-opacity="0.18" stroke="#d7b463" stroke-width="2" stroke-dasharray="6 5"/>
  <text x="${G.gemmeCout.cx}" y="${G.gemmeCout.cy + 5}" text-anchor="middle"
        font-family="monospace" font-size="13" fill="#d7b463">COÛT</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
await writeFile(join(process.cwd(), 'public', 'cadres', 'gabarit-cadre.png'), png);

await writeFile(
  join(process.cwd(), 'public', 'cadres', 'geometrie.json'),
  JSON.stringify(GEOMETRIE, null, 2) + '\n',
);

console.log('Gabarit écrit : public/cadres/gabarit-cadre.png');
console.log('Géométrie     : public/cadres/geometrie.json');
console.log('');
console.log('Un cadre déposé sous public/cadres/cadre-<element>.png doit :');
console.log('  · mesurer 630 × 880 pixels ;');
console.log('  · laisser la zone ILLUSTRATION entièrement transparente ;');
console.log('  · ne rien peindre d’essentiel dans les autres zones, occupées par le texte.');
