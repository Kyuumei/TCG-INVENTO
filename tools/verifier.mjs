#!/usr/bin/env node
/**
 * Vérification de bout en bout dans un vrai navigateur.
 *
 * Le jeu est servi statiquement, puis piloté comme le ferait un joueur :
 * on démarre une partie, on joue quelques tours et on capture des écrans.
 * Toute erreur de console fait échouer la vérification — c'est le filet qui
 * attrape les fautes que le typage ne voit pas.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const RACINE = join(process.cwd(), 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
  '.json': 'application/json', '.svg': 'image/svg+xml',
};

const serveur = createServer(async (req, res) => {
  try {
    let chemin = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (chemin.endsWith('/')) chemin += 'index.html';
    const fichier = join(RACINE, normalize(chemin).replace(/^(\.\.[/\\])+/, ''));
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
    res.end(contenu);
  } catch {
    res.writeHead(404).end('introuvable');
  }
});

await new Promise((r) => serveur.listen(4188, r));
const base = 'http://127.0.0.1:4188/';
await mkdir('captures', { recursive: true });

const navigateur = await chromium.launch({ executablePath: process.env.CHEMIN_CHROMIUM || undefined });
const contexte = await navigateur.newContext({
  viewport: { width: 390, height: 844 },   // iPhone 14/15
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-FR',
});
const page = await contexte.newPage();

const erreurs = [];
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => erreurs.push(`page: ${e.message}`));
page.on('requestfailed', (r) => {
  const u = r.url();
  if (u.startsWith(base)) erreurs.push(`requête échouée: ${u} — ${r.failure()?.errorText}`);
});

async function capture(nom) {
  await page.screenshot({ path: `captures/${nom}.png` });
  console.log(`  capture: captures/${nom}.png`);
}

console.log('→ Accueil');
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForSelector('.accueil__logo');
await capture('01-accueil');

console.log('→ Règles');
await page.click('[data-va="regles"]');
await page.waitForSelector('.ecran__corps h3');
await capture('02-regles');
await page.click('[data-action="retour"]');

console.log('→ Collection');
await page.click('[data-va="collection"]');
await page.waitForSelector('.grille .carte');
await page.waitForTimeout(700);
await capture('03-collection');
const nbCartes = await page.locator('.grille .carte').count();
console.log(`  ${nbCartes} cartes affichées`);
await page.click('.grille .carte');
await page.waitForSelector('.modale .carte');
await page.waitForTimeout(400);
await capture('04-carte-detail');
await page.click('.modale');
await page.click('[data-action="retour"]');

console.log('→ Boosters');
await page.click('[data-va="boosters"]');
await page.waitForSelector('.paquet');
await capture('05-booster-ferme');
await page.click('.paquet');
await page.waitForSelector('.tirage .carte');
await page.waitForTimeout(900);
await capture('06-booster-ouvert');
await page.click('[data-terminer]');
await page.click('[data-action="retour"]');

console.log('→ Decks');
await page.click('[data-va="decks"]');
await page.waitForSelector('[data-choisir]');
await capture('07-decks');
await page.click('[data-nouveau]');
await page.waitForSelector('#nom-deck');
await page.waitForTimeout(500);
await capture('08-constructeur');
await page.click('[data-action="retour"]');
await page.click('[data-action="retour"]');

console.log('→ Campagne puis bataille');
await page.click('[data-va="campagne"]');
await page.waitForSelector('[data-adversaire]');
await capture('09-campagne');
await page.click('[data-adversaire="camp-1"]');
await page.waitForSelector('[data-mulligan-valider]');
await page.waitForTimeout(500);
await capture('10-mulligan');
await page.click('[data-mulligan-valider]');
await page.waitForSelector('.plateau');
await page.waitForTimeout(900);
await capture('11-plateau');

// On joue quelques tours : poser une créature si possible, puis passer.
for (let tour = 0; tour < 6; tour++) {
  const cartes = page.locator('.main .carte:not(.est-injouable)');
  if (await cartes.count()) {
    await cartes.first().click();
    await page.waitForTimeout(250);
    const ligne = page.locator('.ligne.est-posable');
    if (await ligne.count()) {
      await ligne.first().click();
      await page.waitForTimeout(350);
    } else {
      const cible = page.locator('.jeton.est-ciblable');
      if (await cible.count()) await cible.first().click();
      else await cartes.first().click();
      await page.waitForTimeout(300);
    }
  }
  // Attaquer avec toutes les créatures prêtes.
  for (let i = 0; i < 3; i++) {
    const prete = page.locator('.jeton.est-prete');
    if (!(await prete.count())) break;
    await prete.first().click();
    await page.waitForTimeout(200);
    const ennemi = page.locator('.jeton.est-attaquable');
    if (await ennemi.count()) await ennemi.first().click();
    else if (await page.locator('.heros.est-ciblable').count()) await page.locator('.heros.est-ciblable').click();
    else if (await page.locator('[data-annuler]').count()) await page.click('[data-annuler]');
    await page.waitForTimeout(320);
  }
  if (tour === 2) await capture('12-plateau-en-cours');
  if (await page.locator('.fin').count()) break;
  const finTour = page.locator('[data-fin-tour]:not([disabled])');
  if (!(await finTour.count())) break;
  await finTour.click();
  await page.waitForTimeout(2600);
  if (await page.locator('.fin').count()) break;
}
await capture('13-partie-avancee');
if (await page.locator('.fin').count()) await capture('14-fin-partie');

await navigateur.close();
serveur.close();

if (erreurs.length) {
  console.error('\nERREURS DÉTECTÉES :');
  for (const e of [...new Set(erreurs)]) console.error('  - ' + e);
  process.exit(1);
}
console.log('\nAucune erreur. Vérification réussie.');
