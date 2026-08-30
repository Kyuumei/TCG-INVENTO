#!/usr/bin/env node
/**
 * Importe des illustrations produites à la main.
 *
 * Le jeu attend `public/art/<identifiant>.webp` en 512 × 384. Ce script prend
 * un dossier de fichiers téléchargés depuis n'importe quel outil — PNG, JPEG,
 * WebP, n'importe quelle taille, n'importe quel format — les recadre, les
 * encode et les range sous le bon nom.
 *
 * L'appariement se fait sur le début du nom de fichier : `syl-yggravent.png`,
 * `syl-yggravent (2).jpg` ou `syl-yggravent-v3.webp` visent tous la même carte.
 * On peut donc télécharger sans renommer, tant que l'identifiant est en tête.
 *
 * Usage :
 *   npm run art:importer -- --depuis=~/Downloads/invento
 *   npm run art:importer -- --depuis=./import --dry
 */
import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { homedir } from 'node:os';
import { chargerDonnees } from './charger-donnees.mjs';

const SORTIE_L = 512;
const SORTIE_H = 384;
const QUALITE = 82;
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

const args = process.argv.slice(2);
const val = (nom, defaut) => {
  const t = args.find((x) => x.startsWith(`--${nom}=`));
  return t ? t.slice(nom.length + 3) : defaut;
};
const dry = args.includes('--dry');
let source = val('depuis', './import');
if (source.startsWith('~')) source = join(homedir(), source.slice(1));

async function principal() {
  const { TOUTES_LES_CARTES, TERRAINS } = await chargerDonnees();
  // Les identifiants les plus longs d'abord : sans cela `syl-champiluce`
  // pourrait être capté par un préfixe plus court.
  const ids = [...TOUTES_LES_CARTES.map((c) => c.id), ...TERRAINS.map((t) => t.id)].sort(
    (a, b) => b.length - a.length,
  );
  const noms = new Map([
    ...TOUTES_LES_CARTES.map((c) => [c.id, c.nom]),
    ...TERRAINS.map((t) => [t.id, t.nom]),
  ]);

  let fichiers;
  try {
    fichiers = await readdir(source);
  } catch {
    console.error(`Dossier introuvable : ${source}`);
    console.error('Indiquez-le avec --depuis=/chemin/vers/le/dossier');
    process.exit(1);
  }

  const candidats = fichiers.filter((f) => EXTENSIONS.has(extname(f).toLowerCase()));
  if (candidats.length === 0) {
    console.log(`Aucune image dans ${source} (formats acceptés : ${[...EXTENSIONS].join(', ')}).`);
    return;
  }

  const destination = join(process.cwd(), 'public', 'art');
  await mkdir(destination, { recursive: true });

  const vus = new Map(); // identifiant -> fichier retenu
  const orphelins = [];

  for (const f of candidats) {
    const base = basename(f, extname(f)).toLowerCase();
    const id = ids.find((x) => base.startsWith(x));
    if (!id) {
      orphelins.push(f);
      continue;
    }
    // À doublon, on garde le fichier au nom le plus long : c'est en général la
    // variante la plus récente (« … (2) », « …-v3 »).
    const precedent = vus.get(id);
    if (!precedent || f.length > precedent.length) vus.set(id, f);
  }

  console.log(`Source      : ${source}`);
  console.log(`Images vues : ${candidats.length}`);
  console.log(`Appariées   : ${vus.size}`);
  if (orphelins.length) {
    console.log(`\nNon appariés (${orphelins.length}) — le nom doit commencer par l'identifiant de la carte :`);
    for (const o of orphelins.slice(0, 12)) console.log(`  · ${o}`);
    if (orphelins.length > 12) console.log(`  … et ${orphelins.length - 12} autres`);
  }
  if (dry) {
    console.log('\nMode --dry : rien n’a été écrit.');
    return;
  }

  console.log('');
  let faits = 0;
  for (const [id, fichier] of vus) {
    try {
      const brut = await readFile(join(source, fichier));
      const webp = await sharp(brut)
        // `attention` recadre sur la zone la plus riche de l'image : sur un
        // format d'entrée carré, c'est ce qui garde la créature dans le cadre.
        .resize(SORTIE_L, SORTIE_H, { fit: 'cover', position: 'attention' })
        .webp({ quality: QUALITE, effort: 5 })
        .toBuffer();
      await writeFile(join(destination, `${id}.webp`), webp);
      faits++;
      console.log(`  ✓ ${id.padEnd(24)} ← ${fichier}   (${noms.get(id) ?? ''})`);
    } catch (e) {
      console.error(`  ✗ ${id} — ${e.message.slice(0, 120)}`);
    }
  }

  const total = ids.length;
  console.log(`\n${faits} illustration(s) importée(s). Le set en compte ${total}.`);
  console.log('Relancez `npm run build`, puis `npm run verifier` pour contrôler le rendu.');
  console.log('Pour annuler : `git checkout -- public/art`.');
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
