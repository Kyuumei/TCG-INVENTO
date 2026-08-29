/**
 * Transpile les sources TypeScript du moteur avec esbuild puis les charge en
 * mémoire, afin que les tests s'exécutent sur le code réel sans étape de build.
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function chargerMoteur() {
  const entree = `
    export * from '../src/engine/rules';
    export * from '../src/engine/types';
    export * from '../src/engine/ai';
    export * from '../src/engine/rng';
    export * from '../src/data/registry';
    export * from '../src/data/decks';
  `;
  const dir = await mkdtemp(join(tmpdir(), 'invento-'));
  const src = join(process.cwd(), 'tests', '__entree.ts');
  await writeFile(src, entree);
  const sortie = join(dir, 'moteur.mjs');
  await build({
    entryPoints: [src],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile: sortie,
    logLevel: 'error',
  });
  return import(pathToFileURL(sortie).href);
}
