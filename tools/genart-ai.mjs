#!/usr/bin/env node
/**
 * Génération des illustrations par IA.
 *
 * Chaque carte porte déjà, dans `src/data/cards/`, un champ `artPrompt` qui
 * décrit sa scène. Ce script en fait une requête complète — description de la
 * carte plus directive de style commune — l'envoie au fournisseur choisi, puis
 * recadre et encode le résultat au même format que le rendu procédural.
 *
 * La cohérence d'un set de 158 illustrations ne vient pas du modèle mais de la
 * directive de style partagée et de la graine déterministe : c'est ce qui évite
 * que la carte 3 et la carte 140 semblent venir de deux jeux différents.
 *
 * Rien n'est écrasé sans `--force`, et les illustrations étant versionnées dans
 * Git, `git checkout -- public/art` ramène toujours l'état précédent.
 *
 * Exemples :
 *   npm run art:ai -- --dry --limit=3              # affiche les requêtes, sans appel
 *   npm run art:ai -- --provider=replicate --limit=6
 *   npm run art:ai -- --provider=openai --only=syl-yggravent --force
 *   npm run art:ai -- --provider=replicate --element=flamme --force
 */
import sharp from 'sharp';
import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chargerDonnees } from './charger-donnees.mjs';

const SORTIE_L = 512;
const SORTIE_H = 384;
const QUALITE = 82;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/**
 * Directives de style, en anglais : c'est la langue sur laquelle les modèles
 * d'image sont le mieux entraînés, et c'est la partie de la requête qui pilote
 * réellement le rendu. La description de la carte, elle, reste en français.
 */
const STYLES = {
  /** Le registre du jeu : illustration de carte à collectionner. */
  tcg:
    'trading card game illustration, painted digital artwork, clean confident ink outlines, ' +
    'bold saturated colours, soft key light from the upper left, coloured shadows never grey, ' +
    'single clear subject centred in frame, simple atmospheric background with depth, ' +
    'no text, no logos, no card frame, no borders, no watermark, landscape composition',
  /** Plus proche de l'aquarelle, à la manière des cartes Pokémon anciennes. */
  aquarelle:
    'watercolour and gouache creature illustration, visible brush texture, soft washes, ' +
    'gentle gradients, warm natural light, delicate ink linework, single subject centred, ' +
    'simple background, no text, no borders, no watermark, landscape composition',
  /** Peinture plus dense et dramatique, registre Magic. */
  huile:
    'oil painting fantasy illustration, dramatic chiaroscuro lighting, rich impasto texture, ' +
    'deep saturated palette, single imposing subject, atmospheric depth, painterly brushwork, ' +
    'no text, no borders, no watermark, landscape composition',
  /** Rendu 3D stylisé, propre et lumineux. */
  rendu:
    'stylised 3D rendered creature, soft global illumination, subsurface scattering, ' +
    'clean shapes, vibrant colours, shallow depth of field background, ' +
    'no text, no borders, no watermark, landscape composition',
};

const NEGATIF =
  'text, letters, watermark, signature, logo, card frame, border, ui, collage, multiple panels, ' +
  'blurry, lowres, deformed anatomy, extra limbs, photo, photorealistic';

/** Note d'ambiance ajoutée selon l'élément, pour ancrer la palette. */
const AMBIANCE = {
  sylve: 'lush verdant palette, dappled forest light',
  flamme: 'ember and molten palette, glowing heat haze',
  maree: 'deep blue and teal palette, wet reflective surfaces',
  foudre: 'violet and electric blue palette, crackling arcs',
  roc: 'ochre and stone palette, dusty sunlit air',
  ombre: 'deep violet and near-black palette, cold rim light',
  neutre: 'muted earthy palette, overcast daylight',
};

// ---------------------------------------------------------------------------
// Fournisseurs
// ---------------------------------------------------------------------------

/**
 * Chaque fournisseur reçoit une requête et renvoie les octets d'une image.
 * En ajouter un se résume à écrire une fonction de plus dans cette table.
 */
const FOURNISSEURS = {
  /**
   * Replicate — le meilleur rapport qualité/prix pour un set entier.
   * Modèle par défaut : Flux Schnell, très bon marché ; `--modele` permet de
   * passer à `black-forest-labs/flux-1.1-pro` pour les cartes légendaires.
   */
  async replicate({ prompt, seed, modele }) {
    const jeton = process.env.REPLICATE_API_TOKEN;
    if (!jeton) throw new Error('REPLICATE_API_TOKEN absent de l’environnement.');
    const m = modele ?? 'black-forest-labs/flux-schnell';
    const r = await fetch(`https://api.replicate.com/v1/models/${m}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
        // `wait` évite d'avoir à interroger la prédiction en boucle.
        Prefer: 'wait=60',
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '4:3',
          output_format: 'png',
          num_outputs: 1,
          seed,
        },
      }),
    });
    if (!r.ok) throw new Error(`Replicate ${r.status} : ${(await r.text()).slice(0, 300)}`);
    const json = await r.json();
    if (json.status === 'failed') throw new Error(`Replicate : ${json.error}`);
    const url = Array.isArray(json.output) ? json.output[0] : json.output;
    if (!url) throw new Error('Replicate n’a renvoyé aucune image (prédiction encore en cours ?).');
    const img = await fetch(url);
    return Buffer.from(await img.arrayBuffer());
  },

  /** OpenAI — la meilleure obéissance à une description détaillée. */
  async openai({ prompt, modele }) {
    const cle = process.env.OPENAI_API_KEY;
    if (!cle) throw new Error('OPENAI_API_KEY absent de l’environnement.');
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modele ?? 'gpt-image-1',
        prompt,
        size: '1536x1024', // le format paysage le plus proche du 4:3
        quality: 'medium',
        n: 1,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status} : ${(await r.text()).slice(0, 300)}`);
    const json = await r.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI n’a renvoyé aucune image.');
    return Buffer.from(b64, 'base64');
  },

  /** Fal — rapide, tarifs proches de Replicate. */
  async fal({ prompt, seed, modele }) {
    const cle = process.env.FAL_KEY;
    if (!cle) throw new Error('FAL_KEY absent de l’environnement.');
    const m = modele ?? 'fal-ai/flux/schnell';
    const r = await fetch(`https://fal.run/${m}`, {
      method: 'POST',
      headers: { Authorization: `Key ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image_size: { width: 1024, height: 768 },
        num_images: 1,
        seed,
      }),
    });
    if (!r.ok) throw new Error(`Fal ${r.status} : ${(await r.text()).slice(0, 300)}`);
    const json = await r.json();
    const url = json.images?.[0]?.url;
    if (!url) throw new Error('Fal n’a renvoyé aucune image.');
    const img = await fetch(url);
    return Buffer.from(await img.arrayBuffer());
  },

  /**
   * Installation locale (Automatic1111 ou Forge, API activée avec `--api`).
   * Gratuit et illimité une fois la machine équipée, et le seul moyen d'imposer
   * un style par LoRA — la voie royale pour une vraie cohérence de set.
   */
  async local({ prompt, seed, modele }) {
    const base = process.env.SD_URL ?? 'http://127.0.0.1:7860';
    const r = await fetch(`${base}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negative_prompt: NEGATIF,
        width: 1024,
        height: 768,
        steps: 28,
        cfg_scale: 5.5,
        sampler_name: 'DPM++ 2M',
        seed,
        override_settings: modele ? { sd_model_checkpoint: modele } : undefined,
      }),
    });
    if (!r.ok) throw new Error(`Local ${r.status} : ${(await r.text()).slice(0, 300)}`);
    const json = await r.json();
    const b64 = json.images?.[0];
    if (!b64) throw new Error('L’installation locale n’a renvoyé aucune image.');
    return Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  },
};

// ---------------------------------------------------------------------------
// Programme
// ---------------------------------------------------------------------------

function lireArgs() {
  const a = process.argv.slice(2);
  const val = (nom, defaut) => {
    const t = a.find((x) => x.startsWith(`--${nom}=`));
    return t ? t.slice(nom.length + 3) : defaut;
  };
  return {
    fournisseur: val('provider', 'replicate'),
    style: val('style', 'tcg'),
    modele: val('modele', undefined),
    seulement: val('only', undefined),
    element: val('element', undefined),
    limite: Number(val('limit', '0')) || 0,
    parallele: Math.max(1, Number(val('parallele', '2')) || 2),
    suffixe: val('suffixe', undefined),
    force: a.includes('--force'),
    dry: a.includes('--dry'),
  };
}

async function existe(chemin) {
  try {
    await access(chemin);
    return true;
  } catch {
    return false;
  }
}

/** Assemble la requête finale : scène, ambiance élémentaire, style. */
function construireRequete(carte, style, suffixe) {
  const directive = suffixe ?? STYLES[style] ?? STYLES.tcg;
  const ambiance = AMBIANCE[carte.element] ?? '';
  return [carte.artPrompt, ambiance, directive].filter(Boolean).join(', ');
}

/** Réessaie avec un délai croissant : ces API rendent régulièrement des 429. */
async function avecReprises(fn, essais = 4) {
  let erreur;
  for (let i = 0; i < essais; i++) {
    try {
      return await fn();
    } catch (e) {
      erreur = e;
      const attente = 2000 * 2 ** i;
      process.stdout.write(`    échec (${e.message.slice(0, 90)}) — nouvelle tentative dans ${attente / 1000} s\n`);
      await new Promise((r) => setTimeout(r, attente));
    }
  }
  throw erreur;
}

async function principal() {
  const opt = lireArgs();
  const generer = FOURNISSEURS[opt.fournisseur];
  if (!generer) {
    console.error(`Fournisseur inconnu : ${opt.fournisseur}. Disponibles : ${Object.keys(FOURNISSEURS).join(', ')}.`);
    process.exit(1);
  }

  const dossier = join(process.cwd(), 'public', 'art');
  await mkdir(dossier, { recursive: true });

  const { TOUTES_LES_CARTES, TERRAINS } = await chargerDonnees();
  let travaux = [
    ...TOUTES_LES_CARTES.map((c) => ({ id: c.id, nom: c.nom, element: c.element, artPrompt: c.artPrompt, artSeed: c.artSeed })),
    ...TERRAINS.map((t) => ({ id: t.id, nom: t.nom, element: t.element, artPrompt: t.artPrompt, artSeed: t.artSeed })),
  ];

  if (opt.seulement) travaux = travaux.filter((t) => t.id === opt.seulement);
  if (opt.element) travaux = travaux.filter((t) => t.element === opt.element);
  // En mode --dry on veut pouvoir relire n'importe quelle requête, y compris
  // celles des cartes déjà illustrées.
  if (!opt.force && !opt.dry) {
    const restant = [];
    for (const t of travaux) if (!(await existe(join(dossier, `${t.id}.webp`)))) restant.push(t);
    travaux = restant;
  }
  if (opt.limite) travaux = travaux.slice(0, opt.limite);

  if (travaux.length === 0) {
    console.log('Rien à générer. Utilisez --force pour régénérer des illustrations existantes.');
    return;
  }

  console.log(`Fournisseur : ${opt.fournisseur}${opt.modele ? ` (${opt.modele})` : ''}`);
  console.log(`Style       : ${opt.suffixe ? 'personnalisé' : opt.style}`);
  console.log(`À générer   : ${travaux.length} illustration(s)\n`);

  if (opt.dry) {
    for (const t of travaux) {
      console.log(`── ${t.id} — ${t.nom}`);
      console.log(`   ${construireRequete(t, opt.style, opt.suffixe)}\n`);
    }
    console.log('Mode --dry : aucune requête envoyée, aucun fichier écrit.');
    return;
  }

  let faits = 0;
  let echecs = 0;
  const t0 = Date.now();

  // On avance par petits lots : ces API limitent le débit, et un lot restreint
  // rend l'interruption sans dégât.
  for (let i = 0; i < travaux.length; i += opt.parallele) {
    const lot = travaux.slice(i, i + opt.parallele);
    await Promise.all(
      lot.map(async (t) => {
        const prompt = construireRequete(t, opt.style, opt.suffixe);
        try {
          const brut = await avecReprises(() => generer({ prompt, seed: t.artSeed % 2147483647, modele: opt.modele }));
          const webp = await sharp(brut)
            .resize(SORTIE_L, SORTIE_H, { fit: 'cover', position: 'attention' })
            .webp({ quality: QUALITE, effort: 5 })
            .toBuffer();
          await writeFile(join(dossier, `${t.id}.webp`), webp);
          faits++;
          console.log(`  ✓ ${t.id} — ${t.nom}`);
        } catch (e) {
          echecs++;
          console.error(`  ✗ ${t.id} — ${e.message.slice(0, 160)}`);
        }
      }),
    );
  }

  const s = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nTerminé : ${faits} générée(s), ${echecs} en échec, en ${s} s.`);
  if (faits > 0) {
    console.log('Relancez `npm run build` puis vérifiez le rendu avec `npm run verifier`.');
    console.log('Pour revenir en arrière : `git checkout -- public/art`.');
  }
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
