#!/usr/bin/env node
/**
 * Génère les icônes de l'application.
 *
 * Une icône d'écran d'accueil iOS n'a que quelques dizaines de pixels utiles :
 * on dessine donc une marque simple et très contrastée — un cristal doré sur un
 * fond profond — plutôt qu'une illustration réduite qui deviendrait illisible.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const svg = (taille) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="fond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d2534"/>
      <stop offset="1" stop-color="#0a0c11"/>
    </linearGradient>
    <linearGradient id="or" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3cf"/>
      <stop offset=".45" stop-color="#d7b463"/>
      <stop offset="1" stop-color="#8a6c28"/>
    </linearGradient>
    <radialGradient id="lueur" cx=".5" cy=".38" r=".55">
      <stop offset="0" stop-color="#ffe9b0" stop-opacity=".55"/>
      <stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#fond)"/>
  <rect width="512" height="512" fill="url(#lueur)"/>
  <rect x="26" y="26" width="460" height="460" rx="96" fill="none" stroke="#8a6c28" stroke-width="8"/>
  <path d="M256 96 372 212 256 416 140 212 256 96Z" fill="url(#or)"/>
  <path d="M256 96 372 212H140L256 96Z" fill="#fff6dd" opacity=".55"/>
  <path d="M256 96 256 416" stroke="#7a5c1e" stroke-width="6" opacity=".45"/>
  <path d="M140 212h232" stroke="#7a5c1e" stroke-width="6" opacity=".45"/>
</svg>`;

const dossier = join(process.cwd(), 'public');
await mkdir(dossier, { recursive: true });

for (const taille of [180, 192, 512]) {
  await sharp(Buffer.from(svg(taille)))
    .resize(taille, taille)
    .png()
    .toFile(join(dossier, `icone-${taille}.png`));
}
console.log('Icônes générées : icone-180.png, icone-192.png, icone-512.png');
