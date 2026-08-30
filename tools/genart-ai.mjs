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
 * Vérifie qu'une réponse est bien une image et non une page d'erreur.
 * Les services gratuits répondent volontiers en HTTP 200 avec du HTML quand
 * ils sont saturés : sans ce contrôle, on écrirait une page web en .webp.
 */
async function octetsImage(reponse, nom) {
  const type = reponse.headers.get('content-type') ?? '';
  if (!reponse.ok) throw new Error(`${nom} ${reponse.status} : ${(await reponse.text()).slice(0, 200)}`);
  if (!type.startsWith('image/')) {
    throw new Error(`${nom} n'a pas renvoyé d'image (${type}) : ${(await reponse.text()).slice(0, 200)}`);
  }
  const buf = Buffer.from(await reponse.arrayBuffer());
  if (buf.length < 2048) throw new Error(`${nom} : image tronquée (${buf.length} octets).`);
  return buf;
}

/**
 * Chaque fournisseur reçoit une requête et renvoie les octets d'une image.
 * En ajouter un se résume à écrire une fonction de plus dans cette table.
 */
const FOURNISSEURS = {
  /**
   * Pollinations — gratuit, sans compte ni clé. Une simple requête GET dont la
   * réponse est directement l'image. C'est le chemin le plus court pour
   * illustrer le set sans rien débourser ni configurer, au prix d'une file
   * d'attente partagée : on y va doucement, une image à la fois.
   */
  async pollinations({ prompt, seed, modele }) {
    const p = new URLSearchParams({
      width: '1024',
      height: '768',
      seed: String(seed),
      model: modele ?? 'flux',
      nologo: 'true',
      enhance: 'false',
      referrer: 'invento',
    });
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${p}`;
    return octetsImage(await fetch(url, { headers: { accept: 'image/*' } }), 'Pollinations');
  },

  /**
   * Hugging Face — palier gratuit avec un jeton de compte, également gratuit.
   * Le modèle peut être « froid » : le service répond alors 503 en annonçant un
   * délai de chargement, que les reprises absorbent.
   */
  async huggingface({ prompt, seed, modele }) {
    const jeton = process.env.HF_TOKEN;
    if (!jeton) throw new Error('HF_TOKEN absent. Créez un jeton gratuit sur huggingface.co/settings/tokens.');
    const m = modele ?? 'black-forest-labs/FLUX.1-schnell';
    const r = await fetch(`https://api-inference.huggingface.co/models/${m}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', accept: 'image/*' },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width: 1024, height: 768, seed },
        options: { wait_for_model: true },
      }),
    });
    return octetsImage(r, 'Hugging Face');
  },

  /**
   * Cloudflare Workers AI — palier gratuit quotidien, avec un compte gratuit.
   * La réponse est un JSON contenant l'image encodée en base64.
   */
  async cloudflare({ prompt, seed, modele }) {
    const compte = process.env.CF_ACCOUNT_ID;
    const jeton = process.env.CF_API_TOKEN;
    if (!compte || !jeton) throw new Error('CF_ACCOUNT_ID et CF_API_TOKEN sont requis.');
    const m = modele ?? '@cf/black-forest-labs/flux-1-schnell';
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${compte}/ai/run/${m}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, steps: 4, seed }),
    });
    if (!r.ok) throw new Error(`Cloudflare ${r.status} : ${(await r.text()).slice(0, 200)}`);
    const json = await r.json();
    const b64 = json.result?.image;
    if (!b64) throw new Error(`Cloudflare n'a renvoyé aucune image : ${JSON.stringify(json).slice(0, 200)}`);
    return Buffer.from(b64, 'base64');
  },

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

/**
 * Réglages par défaut par fournisseur. Les services gratuits partagent une
 * file d'attente : y envoyer six requêtes en parallèle ne va pas plus vite, et
 * déclenche des rejets. On y va donc une par une, avec une pause.
 */
const REGLAGES = {
  pollinations: { parallele: 1, pause: 1500, essais: 5 },
  huggingface: { parallele: 1, pause: 1200, essais: 6 },
  cloudflare: { parallele: 2, pause: 400, essais: 4 },
  replicate: { parallele: 2, pause: 0, essais: 4 },
  openai: { parallele: 2, pause: 0, essais: 4 },
  fal: { parallele: 3, pause: 0, essais: 4 },
  local: { parallele: 1, pause: 0, essais: 3 },
};

function lireArgs() {
  const a = process.argv.slice(2);
  const val = (nom, defaut) => {
    const t = a.find((x) => x.startsWith(`--${nom}=`));
    return t ? t.slice(nom.length + 3) : defaut;
  };
  return {
    fournisseur: val('provider', 'pollinations'),
    style: val('style', 'tcg'),
    modele: val('modele', undefined),
    seulement: val('only', undefined),
    element: val('element', undefined),
    limite: Number(val('limit', '0')) || 0,
    parallele: Number(val('parallele', '0')) || 0,
    pause: Number(val('pause', '-1')),
    suffixe: val('suffixe', undefined),
    force: a.includes('--force'),
    dry: a.includes('--dry'),
    boucle: a.includes('--boucle'),
    essais: Number(val('essais', '0')) || 0,
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
      if (i === essais - 1) break; // inutile d'attendre après la dernière
      const attente = Math.min(30000, 2000 * 2 ** i);
      process.stdout.write(`    échec (${e.message.slice(0, 90)}) — nouvelle tentative dans ${attente / 1000} s\n`);
      await new Promise((r) => setTimeout(r, attente));
    }
  }
  throw erreur;
}

/**
 * Une passe de génération. Renvoie le nombre d'illustrations écrites, ce qui
 * permet à la boucle de savoir si elle progresse encore.
 */
async function passe(opt, generer, reglage, parallele, pause, dossier, entrees) {
  let travaux = entrees.slice();
  if (opt.seulement) travaux = travaux.filter((t) => t.id === opt.seulement);
  if (opt.element) travaux = travaux.filter((t) => t.element === opt.element);
  if (!opt.force && !opt.dry) {
    const restant = [];
    for (const t of travaux) if (!(await existe(join(dossier, `${t.id}.webp`)))) restant.push(t);
    travaux = restant;
  }
  if (opt.limite) travaux = travaux.slice(0, opt.limite);

  if (travaux.length === 0) return { faits: 0, echecs: 0, restants: 0 };

  if (opt.dry) {
    for (const t of travaux) {
      console.log(`── ${t.id} — ${t.nom}`);
      console.log(`   ${construireRequete(t, opt.style, opt.suffixe)}\n`);
    }
    console.log('Mode --dry : aucune requête envoyée, aucun fichier écrit.');
    return { faits: 0, echecs: 0, restants: 0 };
  }

  let faits = 0;
  let echecs = 0;

  for (let i = 0; i < travaux.length; i += parallele) {
    const lot = travaux.slice(i, i + parallele);
    await Promise.all(
      lot.map(async (t) => {
        const prompt = construireRequete(t, opt.style, opt.suffixe);
        try {
          const brut = await avecReprises(
            () => generer({ prompt, seed: t.artSeed % 2147483647, modele: opt.modele }),
            reglage.essais,
          );
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
    // Les paliers gratuits n'aiment pas les rafales : on respire entre les lots.
    if (pause > 0 && i + parallele < travaux.length) {
      await new Promise((r) => setTimeout(r, pause));
    }
  }

  return { faits, echecs, restants: travaux.length - faits };
}

async function principal() {
  const opt = lireArgs();
  const generer = FOURNISSEURS[opt.fournisseur];
  if (!generer) {
    console.error(`Fournisseur inconnu : ${opt.fournisseur}. Disponibles : ${Object.keys(FOURNISSEURS).join(', ')}.`);
    process.exit(1);
  }
  const reglage = REGLAGES[opt.fournisseur] ?? { parallele: 2, pause: 0, essais: 4 };
  const parallele = opt.parallele || reglage.parallele;
  const pause = opt.pause >= 0 ? opt.pause : reglage.pause;
  if (opt.essais) reglage.essais = opt.essais;

  const dossier = join(process.cwd(), 'public', 'art');
  await mkdir(dossier, { recursive: true });

  const { TOUTES_LES_CARTES, TERRAINS } = await chargerDonnees();
  const entrees = [
    ...TOUTES_LES_CARTES.map((c) => ({ id: c.id, nom: c.nom, element: c.element, artPrompt: c.artPrompt, artSeed: c.artSeed })),
    ...TERRAINS.map((t) => ({ id: t.id, nom: t.nom, element: t.element, artPrompt: t.artPrompt, artSeed: t.artSeed })),
  ];

  console.log(`Fournisseur : ${opt.fournisseur}${opt.modele ? ` (${opt.modele})` : ''}`);
  console.log(`Style       : ${opt.suffixe ? 'personnalisé' : opt.style}`);
  console.log(`Cadence     : ${parallele} en parallèle, ${pause} ms de pause`);
  console.log(`Mode        : ${opt.boucle ? 'boucle jusqu’à complétion' : 'une passe'}\n`);

  const t0 = Date.now();
  let totalFaits = 0;
  let tour = 0;

  // Un service gratuit échoue régulièrement sans que ce soit grave : on
  // repasse sur ce qui manque tant que l'on progresse. C'est ce qui rend la
  // voie gratuite utilisable sans surveiller le terminal.
  for (;;) {
    tour++;
    if (opt.boucle) console.log(`── passe ${tour}`);
    const { faits, echecs, restants } = await passe(opt, generer, reglage, parallele, pause, dossier, entrees);
    totalFaits += faits;

    if (!opt.boucle || opt.dry) break;
    if (restants === 0) {
      console.log('\nToutes les illustrations demandées existent.');
      break;
    }
    if (faits === 0) {
      console.log(`\nAucune progression sur cette passe (${echecs} échec(s)). On s’arrête là.`);
      console.log('Vérifiez la clé, le quota, ou relancez plus tard.');
      break;
    }
    console.log(`   ${restants} restante(s), nouvelle passe…\n`);
    await new Promise((r) => setTimeout(r, 3000));
  }

  const s = ((Date.now() - t0) / 1000).toFixed(0);
  if (!opt.dry) {
    console.log(`\nTerminé : ${totalFaits} illustration(s) générée(s) en ${s} s.`);
    if (totalFaits > 0) {
      console.log('Relancez `npm run build`, puis `npm run verifier` pour contrôler le rendu.');
      console.log('Pour revenir en arrière : `git checkout -- public/art`.');
    }
  }
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
