#!/usr/bin/env node
/**
 * Finalisation du build.
 *
 * Injecte dans le service worker la liste exacte des fichiers du socle et une
 * empreinte de version. Sans cette étape, les ressources produites par Vite
 * portent des noms hachés inconnus du service worker, et la première visite
 * hors ligne échouerait.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');

const assets = (await readdir(join(dist, 'assets'))).map((f) => `./assets/${f}`);
const socle = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-180.png',
  './icone-192.png',
  './icone-512.png',
  ...assets,
];

// L'empreinte porte sur le contenu réel du socle : deux builds identiques
// produisent la même version, et le service worker n'est pas réinstallé pour rien.
const empreinte = createHash('sha256');
for (const f of socle) {
  if (f === './') continue;
  empreinte.update(await readFile(join(dist, f.slice(2))));
}
const version = empreinte.digest('hex').slice(0, 12);

const chemin = join(dist, 'sw.js');
const sw = (await readFile(chemin, 'utf8'))
  .replace("'__VERSION__'", JSON.stringify(version))
  .replace("'__SOCLE__'", JSON.stringify(socle));
await writeFile(chemin, sw);

console.log(`Service worker finalisé — version ${version}, ${socle.length} fichiers dans le socle.`);
