#!/usr/bin/env node
/**
 * Empaquette le jeu en un seul fichier HTML autonome.
 *
 * Les artifacts Claude bloquent le chargement d'images externes : les 158
 * illustrations sont donc converties en URI de données et injectées dans
 * `globalThis.__ART`, que `urlArt()` consulte en priorité. Le résultat est un
 * fichier unique, sans requête réseau autre que la police.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const html = await readFile(join(dist, 'index.html'), 'utf8');

const css = html.match(/href="([^"]*\.css)"/)?.[1]?.replace(/^\.?\//, '');
const js = html.match(/src="([^"]*\.js)"/)?.[1]?.replace(/^\.?\//, '');
if (!css || !js) throw new Error("Impossible de localiser les ressources produites par le build.");

const [feuille, script] = await Promise.all([
  readFile(join(dist, css), 'utf8'),
  readFile(join(dist, js), 'utf8'),
]);

const fichiers = (await readdir(join(dist, 'art'))).filter((f) => f.endsWith('.webp'));
const entrees = [];
let octets = 0;
for (const f of fichiers) {
  const buf = await readFile(join(dist, 'art', f));
  octets += buf.length;
  entrees.push(`${JSON.stringify(f.replace(/\.webp$/, ''))}:"data:image/webp;base64,${buf.toString('base64')}"`);
}

const sortie = `<title>INVENTO</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap">
<style>
html,body{height:100%;margin:0}
${feuille}
</style>
<div id="app"></div>
<script>globalThis.__ART={${entrees.join(',')}};</script>
<script type="module">
${script}
</script>
`;

const chemin = join(process.cwd(), 'invento.html');
await writeFile(chemin, sortie);
const mo = (Buffer.byteLength(sortie) / 1048576).toFixed(2);
console.log(`invento.html écrit — ${mo} Mo (${fichiers.length} illustrations, ${(octets / 1048576).toFixed(2)} Mo d'images).`);
