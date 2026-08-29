#!/usr/bin/env node
/**
 * Génère l'illustration de chaque carte et de chaque terrain.
 *
 * Le rendu est entièrement déterministe : la graine vient de l'identifiant de
 * la carte, donc relancer la commande reproduit exactement les mêmes fichiers.
 * Les images déjà présentes sont conservées, ce qui permet de remplacer une
 * illustration par une version générée par IA (voir `npm run art:ai`) sans que
 * cette commande ne l'écrase.
 *
 * Usage :
 *   npm run art              # ne génère que ce qui manque
 *   npm run art -- --force   # régénère tout
 *   npm run art -- --only=syl-yggravent
 */
import sharp from 'sharp';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { rendreIllustration } from './painter.mjs';
import { PALETTES } from './palette.mjs';
import { chargerDonnees } from './charger-donnees.mjs';

const RENDU_L = 768;
const RENDU_H = 576;
const SORTIE_L = 512;
const SORTIE_H = 384;
const QUALITE = 80;

const args = process.argv.slice(2);
const force = args.includes('--force');
const seulement = args.find((a) => a.startsWith('--only='))?.slice(7);

const dossier = join(process.cwd(), 'public', 'art');

async function existe(chemin) {
  try {
    await access(chemin);
    return true;
  } catch {
    return false;
  }
}

async function principal() {
  await mkdir(dossier, { recursive: true });
  const { TOUTES_LES_CARTES, TERRAINS } = await chargerDonnees();

  const travaux = [
    ...TOUTES_LES_CARTES.map((c) => ({
      id: c.id,
      seed: c.artSeed,
      element: c.element,
      silhouette: c.silhouette ?? 'paysage',
    })),
    ...TERRAINS.map((t) => ({ id: t.id, seed: t.artSeed, element: t.element, silhouette: 'paysage' })),
  ].filter((t) => !seulement || t.id === seulement);

  let faits = 0;
  let ignores = 0;
  const t0 = Date.now();

  for (const t of travaux) {
    const chemin = join(dossier, `${t.id}.webp`);
    if (!force && (await existe(chemin))) {
      ignores++;
      continue;
    }
    const brut = rendreIllustration({
      seed: t.seed,
      palette: PALETTES[t.element] ?? PALETTES.neutre,
      silhouette: t.silhouette,
      w: RENDU_L,
      h: RENDU_H,
    });
    // Le redimensionnement Lanczos depuis une résolution supérieure fait office
    // de sur-échantillonnage : les contours sont nets sans coût de rendu.
    const webp = await sharp(brut, { raw: { width: RENDU_L, height: RENDU_H, channels: 3 } })
      .resize(SORTIE_L, SORTIE_H, { kernel: 'lanczos3' })
      .webp({ quality: QUALITE, effort: 5 })
      .toBuffer();
    await writeFile(chemin, webp);
    faits++;
    if (faits % 20 === 0) {
      process.stdout.write(`  ${faits}/${travaux.length - ignores} illustrations…\n`);
    }
  }

  const s = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Terminé : ${faits} illustration(s) générée(s), ${ignores} conservée(s), en ${s} s.`);
  console.log(`Dossier : public/art/`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
