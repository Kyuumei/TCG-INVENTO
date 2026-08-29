/**
 * Charge les définitions de cartes TypeScript depuis un script Node.
 *
 * On passe par esbuild plutôt que par une compilation `tsc` séparée : les
 * outils lisent ainsi exactement les mêmes sources que l'application.
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function chargerDonnees() {
  const dir = await mkdtemp(join(tmpdir(), 'invento-data-'));
  const entree = join(dir, 'entree.ts');
  await writeFile(
    entree,
    `export { TOUTES_LES_CARTES, TERRAINS } from ${JSON.stringify(join(process.cwd(), 'src/data/registry.ts'))};\n`,
  );
  const sortie = join(dir, 'donnees.mjs');
  await build({ entryPoints: [entree], bundle: true, format: 'esm', platform: 'neutral', outfile: sortie, logLevel: 'error' });
  const mod = await import(pathToFileURL(sortie).href);
  await rm(dir, { recursive: true, force: true });
  return mod;
}
