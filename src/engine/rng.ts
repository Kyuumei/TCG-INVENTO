/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 *
 * Le moteur ne fait jamais appel à `Math.random` : toute la part de hasard passe
 * par la graine stockée dans le `GameState`, ce qui rend les parties
 * reproductibles et l'IA testable.
 */
export function nextSeed(seed: number): number {
  return (seed + 0x6d2b79f5) >>> 0;
}

/** Renvoie un flottant dans [0, 1) et la graine suivante. */
export function rand(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) >>> 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return [value, t];
}

/** Entier dans [0, max). */
export function randInt(seed: number, max: number): [number, number] {
  const [v, s] = rand(seed);
  return [Math.floor(v * max), s];
}

/** Mélange de Fisher-Yates déterministe ; renvoie une nouvelle liste. */
export function shuffle<T>(items: readonly T[], seed: number): [T[], number] {
  const out = items.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const [j, ns] = randInt(s, i + 1);
    s = ns;
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return [out, s];
}

/** Choisit un élément au hasard, ou `undefined` si la liste est vide. */
export function pick<T>(items: readonly T[], seed: number): [T | undefined, number] {
  if (items.length === 0) return [undefined, seed];
  const [i, s] = randInt(seed, items.length);
  return [items[i], s];
}

/** Générateur autonome pour les usages hors moteur (boosters, art, IA). */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    const [v, s] = rand(this.s);
    this.s = s;
    return v;
  }
  int(max: number): number {
    return Math.floor(this.next() * max);
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)]!;
  }
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = out[i]!;
      out[i] = out[j]!;
      out[j] = tmp;
    }
    return out;
  }
  /** Bruit gaussien approché (somme de trois tirages uniformes). */
  gauss(): number {
    return (this.next() + this.next() + this.next() - 1.5) * 1.1547;
  }
}
