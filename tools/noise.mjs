/**
 * Bruit procédural : la base de tout le rendu.
 *
 * Tout est déterministe à partir d'une graine entière — deux exécutions du
 * générateur produisent des images strictement identiques, ce qui permet de
 * versionner les illustrations sans surprise.
 */

/** Hachage entier rapide, bien décorrélé sur les bits de poids fort. */
function hash2(x, y, seed) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1274126177;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Bruit de valeur bilinéaire lissé, dans [0, 1]. */
export function valueNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const top = a + (b - a) * xf;
  const bot = c + (d - c) * xf;
  return top + (bot - top) * yf;
}

/** Bruit fractal : somme d'octaves d'amplitude décroissante. */
export function fbm(x, y, seed, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 7919);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/**
 * Bruit « crêtes » : produit des arêtes nettes, idéal pour les montagnes, les
 * nervures de roche et les nuages d'orage.
 */
export function ridged(x, y, seed, octaves = 5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise(x * freq, y * freq, seed + i * 6151) * 2 - 1);
    sum += amp * n * n;
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;
  }
  return sum / norm;
}

/**
 * Bruit tourbillonnant : on déforme les coordonnées par un premier bruit avant
 * d'en échantillonner un second. C'est ce qui donne aux nuages, à la fumée et
 * aux coulées de lave leur aspect non répétitif.
 */
export function warped(x, y, seed, force = 2.2) {
  const qx = fbm(x, y, seed + 11, 4);
  const qy = fbm(x + 5.2, y + 1.3, seed + 23, 4);
  return fbm(x + force * qx, y + force * qy, seed + 37, 5);
}

/** Bruit cellulaire (Worley) : écailles, pavage de roche, bulles. */
export function worley(x, y, seed, jitter = 0.85) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let best = 8;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const px = cx + hash2(cx, cy, seed) * jitter;
      const py = cy + hash2(cx, cy, seed + 4111) * jitter;
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) best = d;
    }
  }
  return Math.min(1, Math.sqrt(best));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Générateur pseudo-aléatoire déterministe, identique à celui du moteur. */
export class Rng {
  constructor(seed) {
    this.s = seed >>> 0;
  }
  next() {
    let t = (this.s + 0x6d2b79f5) >>> 0;
    this.s = t;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) {
    return a + this.next() * (b - a);
  }
  int(n) {
    return Math.floor(this.next() * n);
  }
  pick(list) {
    return list[this.int(list.length)];
  }
  /** Approximation gaussienne centrée réduite. */
  gauss() {
    return (this.next() + this.next() + this.next() - 1.5) * 1.1547;
  }
}
