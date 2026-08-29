/**
 * Le peintre — registre « illustration de carte à collectionner ».
 *
 * L'objectif n'est pas le photoréalisme mais le dessin : aplats de couleur
 * franche, ombres en deux ou trois valeurs seulement, contour encré, fond en
 * lavis avec un halo derrière le sujet. C'est la grammaire visuelle d'une
 * illustration de Pokémon ou de Magic, appliquée par du code.
 *
 * Pipeline, dans l'ordre :
 *   1. fond : dégradé, lavis, éclat en étoile, halo derrière le sujet
 *   2. décor : deux masses plates encrées, puis le sol
 *   3. sujet : champ de distance -> volume -> ombrage en aplats -> encrage
 *   4. yeux, éclats et poussière lumineuse
 *   5. étalonnage doux : saturation, rehaut, grain de papier
 *
 * Le rendu est un vrai fichier matriciel (WebP) : rien n'est dessiné à
 * l'exécution dans le navigateur.
 */
import { fbm, ridged, warped, worley, lerp, clamp, smoothstep, Rng } from './noise.mjs';
import { construireSujet, evalSDF } from './anatomie.mjs';

export class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Float32Array(w * h * 3);
  }
  set(x, y, r, g, b) {
    const i = (y * this.w + x) * 3;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
  }
  /** Mélange la couleur donnée par-dessus le pixel, avec l'opacité `a`. */
  blend(x, y, col, a) {
    if (a <= 0) return;
    if (a > 1) a = 1;
    const i = (y * this.w + x) * 3;
    const d = this.data;
    d[i] += (col[0] - d[i]) * a;
    d[i + 1] += (col[1] - d[i + 1]) * a;
    d[i + 2] += (col[2] - d[i + 2]) * a;
  }
  add(x, y, col, a) {
    const i = (y * this.w + x) * 3;
    this.data[i] += col[0] * a;
    this.data[i + 1] += col[1] * a;
    this.data[i + 2] += col[2] * a;
  }
}

const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// ---------------------------------------------------------------------------
// 1-2. Le fond et le décor
// ---------------------------------------------------------------------------

/**
 * Ligne de crête d'une masse de décor, en coordonnées normalisées.
 * `u` est l'abscisse dans [0,1], le retour l'ordonnée du sommet dans [0,1].
 * Les profils restent volontairement simples : ce sont des silhouettes
 * dessinées, pas des reliefs simulés.
 */
function profil(decor, u, couche, seed) {
  const f = 1.3 + couche * 1.6;
  const s = seed + couche * 977;
  switch (decor) {
    case 'montagne': {
      const r = ridged(u * f, couche * 3.1, s, 3);
      return 0.66 - r * (0.26 - couche * 0.05);
    }
    case 'volcan': {
      const cone = Math.max(0, 1 - Math.abs(u - 0.5 - couche * 0.1) * (3.0 + couche));
      return 0.70 - Math.pow(cone, 1.5) * 0.32 - fbm(u * f, couche, s, 2) * 0.08;
    }
    case 'foret': {
      // Une frise de cimes arrondies, régulières mais désaccordées par du bruit.
      const j = fbm(u * 9, couche * 4, s + 401, 2);
      const bosses = Math.pow(Math.abs(Math.sin(u * (13 + couche * 9) + j * 7)), 0.7);
      return 0.70 - bosses * (0.10 + j * 0.09) - fbm(u * f, couche, s, 2) * 0.09;
    }
    case 'ocean': {
      return 0.76 - couche * 0.07 + Math.sin(u * (5 + couche * 4) + s * 0.01) * 0.020;
    }
    case 'orage': {
      const b = warped(u * f * 0.8, 0.4 + couche * 0.7, s, 1.5);
      return 0.52 - b * 0.22 + couche * 0.12;
    }
    case 'ruines': {
      const brut = fbm(u * f * 0.8, couche * 1.7, s, 2);
      const paliers = Math.round(brut * 5) / 5;
      const fleche = Math.pow(Math.abs(Math.sin(u * (6 + couche * 4) + brut * 4)), 26) * 0.15;
      return 0.72 - paliers * 0.22 - fleche - couche * 0.02;
    }
    default:
      return 0.74 - fbm(u * f, couche * 2, s, 3) * (0.12 - couche * 0.02);
  }
}

export function peindreFond(cv, pal, rng, seed) {
  const { w, h } = cv;

  // Centre d'intérêt : c'est là que se placera le sujet, et donc le halo.
  const sx = w * rng.range(0.42, 0.58);
  const sy = h * rng.range(0.38, 0.50);

  // Éclat en étoile : le nombre de branches et la phase varient par carte.
  const branches = 10 + rng.int(12) * 2;
  const phase = rng.range(0, 6.28);
  const forceEclat = rng.range(0.06, 0.15);
  const diag = Math.hypot(w, h);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      // Dégradé de base, courbé pour garder du contraste en haut.
      let col = mix(pal.fondHaut, pal.fondBas, Math.pow(v, 1.25));

      // Lavis : de larges taches douces d'une teinte voisine, comme une
      // aquarelle posée avant le dessin.
      const u = x / w;
      const tache = fbm(u * 1.9, v * 1.9, seed + 61, 3);
      col = mix(col, pal.lavis, smoothstep(0.42, 0.80, tache) * 0.52);
      const tache2 = fbm(u * 3.4 + 4, v * 3.4, seed + 83, 3);
      col = mix(col, pal.halo, smoothstep(0.60, 0.92, tache2) * 0.14);

      // Éclat en étoile centré sur le sujet.
      const dx = x - sx;
      const dy = y - sy;
      const dist = Math.hypot(dx, dy) / diag;
      const ang = Math.atan2(dy, dx);
      const rayon = 0.5 + 0.5 * Math.sin(ang * branches + phase);
      const eclat = smoothstep(0.45, 1.0, rayon) * smoothstep(0.62, 0.06, dist);
      col = mix(col, pal.halo, eclat * forceEclat);

      // Halo circulaire : détache le sujet du fond, comme un fond de studio.
      const halo = smoothstep(0.52, 0.0, dist);
      col = mix(col, pal.halo, halo * 0.16);

      cv.set(x, y, col[0], col[1], col[2]);
    }
  }

  // Deux masses de décor, aplaties et encrées.
  for (let couche = 0; couche < 2; couche++) {
    const loin = couche === 0;
    const teinte = loin
      ? mix(pal.massifLoin, pal.fondBas, 0.34)
      : mix(pal.massifPres, pal.massifLoin, 0.18);
    const encre = mix(pal.ligne, teinte, loin ? 0.62 : 0.34);
    const rehaut = mix(teinte, pal.halo, loin ? 0.30 : 0.42);
    const epaisseur = loin ? h * 0.004 : h * 0.007;

    for (let x = 0; x < w; x++) {
      const yTop = profil(pal.decor, x / w, couche, seed) * h;
      for (let y = Math.max(0, Math.floor(yTop - epaisseur * 3)); y < h; y++) {
        const a = smoothstep(yTop - 1.0, yTop + 1.0, y);
        if (a <= 0) continue;
        // Aplat, éclairci juste sous la crête (le « rebord » du dessin).
        const sousCrete = smoothstep(yTop + h * 0.045, yTop, y);
        let col = mix(teinte, rehaut, sousCrete * 0.55);
        // Trait d'encre sur la crête elle-même.
        const trait = smoothstep(yTop + epaisseur, yTop, y) * smoothstep(yTop - epaisseur * 1.6, yTop - epaisseur * 0.2, y);
        col = mix(col, encre, trait * 0.9);
        cv.blend(x, y, col, a);
      }
    }
  }

  // Sol au premier plan : un aplat clair, séparé par un trait.
  const solY = Math.floor(h * 0.845);
  const encreSol = mix(pal.ligne, pal.sol, 0.42);
  for (let y = Math.max(0, solY - 4); y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = smoothstep(solY - 1, solY + 1, y);
      if (a <= 0) continue;
      const p = (y - solY) / Math.max(1, h - solY);
      let col = mix(pal.sol, mix(pal.sol, pal.ligne, 0.35), Math.pow(p, 0.8) * 0.55);
      const trait = smoothstep(solY + h * 0.008, solY, y) * smoothstep(solY - h * 0.012, solY - h * 0.002, y);
      col = mix(col, encreSol, trait * 0.75);
      cv.blend(x, y, col, a);
    }
  }

  return { sx, sy };
}

// ---------------------------------------------------------------------------
// 3. Le sujet, en aplats
// ---------------------------------------------------------------------------

/**
 * Motif de matière. En dessin, il ne sert pas à simuler une réflectance mais à
 * décider où poser une seconde valeur d'ombre et où tirer un trait.
 */
function matiere(kind, x, y, seed) {
  switch (kind) {
    case 'ecaille': {
      const cell = worley(x * 22, y * 22, seed + 5);
      return { v: cell, trait: smoothstep(0.14, 0.03, cell), lueur: 0 };
    }
    case 'ecorce': {
      const r = ridged(x * 6, y * 28, seed + 9, 3);
      return { v: r, trait: smoothstep(0.80, 0.96, r), lueur: 0 };
    }
    case 'roche': {
      const cell = worley(x * 9, y * 9, seed + 17);
      return { v: cell, trait: smoothstep(0.11, 0.02, cell), lueur: 0 };
    }
    case 'braise': {
      const cell = worley(x * 10, y * 10, seed + 21);
      const f = fbm(x * 14, y * 14, seed + 33, 3);
      return { v: f, trait: smoothstep(0.13, 0.03, cell) * 0.5, lueur: smoothstep(0.30, 0.05, cell) * smoothstep(0.40, 0.72, f) };
    }
    case 'plasma': {
      const wp = warped(x * 7, y * 7, seed + 41, 2.0);
      return { v: wp, trait: 0, lueur: smoothstep(0.58, 0.84, wp) };
    }
    case 'fumee': {
      const wp = warped(x * 5, y * 6, seed + 51, 2.6);
      return { v: wp, trait: 0, lueur: smoothstep(0.70, 0.94, wp) * 0.7 };
    }
    default:
      return { v: 0.5, trait: 0, lueur: 0 };
  }
}

/**
 * Ombrage en aplats : la lumière continue est écrasée en trois paliers, avec
 * des transitions très courtes. C'est ce qui distingue un dessin d'un rendu.
 */
function paliers(t) {
  // Deux seuils francs : trois valeurs, comme trois passages de couleur.
  const a = smoothstep(0.335, 0.365, t);
  const b = smoothstep(0.655, 0.685, t);
  return a * 0.5 + b * 0.5;
}

export function peindreSujet(cv, pal, rng, seed, type, centre) {
  const { w, h } = cv;
  const { prims, k, yeux, auSol } = construireSujet(type, w, h, rng);
  if (prims.length === 0) return;

  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of prims) {
    if (p.t === 'e') {
      const r = Math.max(p.rx, p.ry);
      x0 = Math.min(x0, p.x - r); x1 = Math.max(x1, p.x + r);
      y0 = Math.min(y0, p.y - r); y1 = Math.max(y1, p.y + r);
    } else {
      const r = Math.max(p.r1, p.r2);
      x0 = Math.min(x0, Math.min(p.x1, p.x2) - r); x1 = Math.max(x1, Math.max(p.x1, p.x2) + r);
      y0 = Math.min(y0, Math.min(p.y1, p.y2) - r); y1 = Math.max(y1, Math.max(p.y1, p.y2) + r);
    }
  }
  const marge = Math.round(h * 0.05);
  x0 = clamp(Math.floor(x0 - marge), 0, w - 1);
  y0 = clamp(Math.floor(y0 - marge), 0, h - 1);
  x1 = clamp(Math.ceil(x1 + marge), 0, w - 1);
  y1 = clamp(Math.ceil(y1 + marge), 0, h - 1);
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  if (bw < 6 || bh < 6) return;

  // Le contour est légèrement irrégulier — un trait tracé n'est jamais parfait.
  const irregularite = h * 0.010;

  const champ = new Float32Array(bw * bh);
  const mat = new Float32Array(bw * bh);
  const trait = new Float32Array(bw * bh);
  const lueur = new Float32Array(bw * bh);
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      const x = x0 + i;
      const y = y0 + j;
      const idx = j * bw + i;
      const dep = (fbm((x / h) * 6.5, (y / h) * 6.5, seed + 7, 3) - 0.5) * irregularite;
      champ[idx] = evalSDF(prims, x, y, k) + dep;
      const m = matiere(pal.texture, x / w, y / h, seed);
      mat[idx] = m.v;
      trait[idx] = m.trait;
      lueur[idx] = m.lueur;
    }
  }

  // Volume : la profondeur sous la surface donne le galbe à ombrer.
  const bombe = h * 0.14;
  const relief = new Float32Array(bw * bh);
  for (let i = 0; i < champ.length; i++) {
    const d = champ[i];
    relief[i] = d < 0 ? Math.sqrt(Math.min(1, -d / bombe)) : 0;
  }

  if (auSol) peindreOmbrePortee(cv, pal, x0, x1, bw, h);

  // Auréole : un halo clair déposé sur le fond, épousant le contour.
  const auroleEp = h * 0.030;
  for (let j = 0; j < bh; j++) {
    const y = y0 + j;
    for (let i = 0; i < bw; i++) {
      const d = champ[j * bw + i];
      if (d <= 0 || d > auroleEp) continue;
      cv.blend(x0 + i, y, pal.halo, Math.pow(1 - d / auroleEp, 2.0) * 0.55);
    }
  }

  // Lumière posée en haut à gauche, convention constante de l'illustration.
  const sens = centre.sx < w / 2 ? 1 : -1;
  let lx = -0.52 * sens, ly = -0.60, lz = 0.61;
  const ln = Math.hypot(lx, ly, lz);
  lx /= ln; ly /= ln; lz /= ln;

  // Un trait d'encre franc, plus sombre encore que la couleur de ligne.
  const encre = scale(pal.ligne, 0.72);
  const epaisseurTrait = h * 0.016;
  const pente = h * 0.075;

  for (let j = 1; j < bh - 1; j++) {
    const y = y0 + j;
    for (let i = 1; i < bw - 1; i++) {
      const x = x0 + i;
      const idx = j * bw + i;
      const d = champ[idx];
      const cov = smoothstep(0.9, -0.9, d);
      if (cov <= 0.002) continue;

      const gx = -(relief[idx + 1] - relief[idx - 1]) * 0.5 * pente;
      const gy = -(relief[idx + bw] - relief[idx - bw]) * 0.5 * pente;
      const nl = Math.hypot(gx, gy, 1);
      const nx = gx / nl, ny = gy / nl, nz = 1 / nl;

      // Éclairement, puis écrasement en paliers.
      const brut = Math.max(0, nx * lx + ny * ly + nz * lz);
      // Un peu de matière module l'éclairement avant l'écrasement : les paliers
      // suivent alors le motif au lieu de dessiner des bandes lisses.
      const module = clamp(brut * (0.86 + mat[idx] * 0.28), 0, 1);
      const val = paliers(module);

      // Trois aplats, mélangés seulement sur la largeur du seuil.
      const col = val < 0.5
        ? mix(pal.corpsOmbre, pal.corps, clamp(val * 2, 0, 1))
        : mix(pal.corps, pal.corpsClair, clamp((val - 0.5) * 2, 0, 1));

      // Lumière rebondie dans les ombres : sans elle, le dessin paraît sale.
      const rebond = Math.max(0, -(nx * lx + ny * ly)) * 0.30;
      let peint = mix(col, pal.accent, rebond * 0.18);

      // Trait de matière (écailles, veines d'écorce, éclats de roche).
      if (trait[idx] > 0) peint = mix(peint, encre, trait[idx] * 0.42 * (1 - val * 0.4));

      // Parties incandescentes.
      if (pal.emissif && lueur[idx] > 0) {
        peint = mix(peint, pal.emissif, clamp(lueur[idx] * 0.9, 0, 0.92));
      }

      // Liseré lumineux à contre-jour, du côté opposé à la lumière.
      const contre = Math.pow(1 - clamp(nz, 0, 1), 3.0) * smoothstep(0.0, 0.26, relief[idx]);
      const cote = clamp(-(nx * lx + ny * ly) * 1.6, 0, 1);
      peint = mix(peint, pal.corpsClair, contre * cote * 0.6);

      // Encrage du contour : une bande franche le long du bord intérieur.
      const bande = 1 - smoothstep(epaisseurTrait * 0.45, epaisseurTrait, -d);
      peint = mix(peint, encre, clamp(bande, 0, 1));

      cv.blend(x, y, peint, cov);
    }
  }

  peindreYeux(cv, pal, yeux, h);
}

/** Ombre de contact au sol : une ellipse plate, comme posée au pinceau. */
function peindreOmbrePortee(cv, pal, x0, x1, bw, h) {
  const solY = h * 0.845;
  const cxm = (x0 + x1) / 2;
  const larg = bw * 0.42;
  const ombre = mix(pal.sol, pal.ligne, 0.55);
  for (let y = Math.max(0, Math.floor(solY - h * 0.045)); y < Math.min(cv.h, solY + h * 0.055); y++) {
    for (let x = Math.max(0, Math.floor(cxm - larg)); x < Math.min(cv.w, cxm + larg); x++) {
      const dx = (x - cxm) / larg;
      const dy = (y - solY) / (h * 0.040);
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      cv.blend(x, y, ombre, smoothstep(1, 0.25, d2) * 0.55);
    }
  }
}

/**
 * Les yeux, dessinés en dernier : blanc, iris coloré, pupille encrée et un
 * gros reflet. C'est le détail qui transforme une silhouette en personnage.
 */
function peindreYeux(cv, pal, yeux, h) {
  if (!yeux || yeux.length === 0) return;
  const blanc = [0.98, 0.98, 0.96];
  const iris = pal.accent;
  const encre = pal.ligne;
  for (const oeil of yeux) {
    const R = oeil.r * 1.25;
    const bx0 = Math.max(0, Math.floor(oeil.x - R * 2.6));
    const bx1 = Math.min(cv.w - 1, Math.ceil(oeil.x + R * 2.6));
    const by0 = Math.max(0, Math.floor(oeil.y - R * 2.6));
    const by1 = Math.min(cv.h - 1, Math.ceil(oeil.y + R * 2.6));
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const d = Math.hypot(x - oeil.x, (y - oeil.y) * 0.92) / R;
        if (d > 1.65) continue;
        // Cerne encré.
        cv.blend(x, y, encre, smoothstep(1.45, 1.02, d) * 0.9);
        // Blanc de l'œil.
        cv.blend(x, y, blanc, smoothstep(1.05, 0.92, d));
        // Iris.
        cv.blend(x, y, iris, smoothstep(0.74, 0.62, d));
        // Pupille.
        cv.blend(x, y, encre, smoothstep(0.40, 0.30, d));
        // Reflet principal, en haut à gauche.
        const dr = Math.hypot(x - (oeil.x - R * 0.26), y - (oeil.y - R * 0.30)) / (R * 0.30);
        if (dr < 1) cv.blend(x, y, [1, 1, 1], smoothstep(1, 0.4, dr));
      }
    }
  }
}

/**
 * Motif d'énergie, pour les sorts, les reliques et les zones — les cartes sans
 * créature. Des rubans concentriques déformés par du bruit, encrés puis
 * remplis en aplats, avec un cœur incandescent.
 */
export function peindreMotif(cv, pal, rng, seed, centre) {
  const { w, h } = cv;
  const R = h * rng.range(0.30, 0.40);
  const rubans = 3 + rng.int(3);
  const torsion = rng.range(1.6, 4.2);
  const sens = rng.next() < 0.5 ? 1 : -1;
  const encre = scale(pal.ligne, 0.72);
  const chaud = pal.emissif ?? pal.accent;

  const x0 = Math.max(0, Math.floor(centre.sx - R * 1.5));
  const x1 = Math.min(w - 1, Math.ceil(centre.sx + R * 1.5));
  const y0 = Math.max(0, Math.floor(centre.sy - R * 1.5));
  const y1 = Math.min(h - 1, Math.ceil(centre.sy + R * 1.5));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - centre.sx) / R;
      const dy = (y - centre.sy) / R;
      const r = Math.hypot(dx, dy);
      if (r > 1.5) continue;
      const th = Math.atan2(dy, dx);

      // Spirale : l'angle dérive avec le rayon, puis on brouille au bruit.
      const bruit = (fbm(x / h * 4.2, y / h * 4.2, seed + 131, 3) - 0.5) * 1.4;
      const onde = Math.sin(th * rubans + sens * r * torsion * 3.14 + bruit * 2.2);

      // Épaisseur du ruban, qui s'affine vers l'extérieur.
      const largeur = 0.34 * (1 - smoothstep(0.35, 1.25, r));
      const dedans = smoothstep(largeur, largeur * 0.45, Math.abs(onde) * 0.5);
      if (dedans <= 0.004) continue;

      const attenuation = smoothstep(1.28, 0.25, r);
      const chaleur = smoothstep(0.9, 0.15, r);
      let col = mix(pal.corps, pal.corpsClair, chaleur * 0.75);
      col = mix(col, chaud, chaleur * 0.55);

      // Encrage du bord du ruban.
      const bord = 1 - smoothstep(largeur * 0.60, largeur * 0.95, Math.abs(onde) * 0.5);
      col = mix(col, encre, clamp(1 - bord, 0, 1) * 0.55);

      cv.blend(x, y, col, dedans * attenuation * 0.95);
    }
  }

  // Cœur lumineux.
  const coeur = R * 0.30;
  for (let y = Math.max(0, Math.floor(centre.sy - coeur * 2)); y < Math.min(h, centre.sy + coeur * 2); y++) {
    for (let x = Math.max(0, Math.floor(centre.sx - coeur * 2)); x < Math.min(w, centre.sx + coeur * 2); x++) {
      const d = Math.hypot(x - centre.sx, y - centre.sy) / coeur;
      if (d > 2) continue;
      cv.blend(x, y, pal.corpsClair, smoothstep(1.5, 0.55, d) * 0.55);
      cv.blend(x, y, pal.halo, smoothstep(0.65, 0.05, d) * 0.9);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Éclats et poussière lumineuse
// ---------------------------------------------------------------------------

export function peindreEclats(cv, pal, rng, centre) {
  const { w, h } = cv;
  const u = h / 480;

  // Étoiles à quatre branches : le vocabulaire graphique de la carte brillante.
  const n = 9 + rng.int(9);
  for (let i = 0; i < n; i++) {
    const cx = rng.range(w * 0.04, w * 0.96);
    const cy = rng.range(h * 0.04, h * 0.82);
    const L = rng.range(4, 15) * u;
    const ep = Math.max(0.7, L * 0.10);
    const inten = rng.range(0.35, 0.95);
    for (let t = -L; t <= L; t += 0.5) {
      const fondu = Math.pow(1 - Math.abs(t) / L, 1.9);
      for (let o = -ep; o <= ep; o += 0.5) {
        const a = fondu * (1 - Math.abs(o) / ep) * inten * 0.5;
        for (const [px, py] of [[cx + t, cy + o], [cx + o, cy + t]]) {
          const ix = Math.round(px);
          const iy = Math.round(py);
          if (ix < 0 || ix >= w || iy < 0 || iy >= h) continue;
          cv.add(ix, iy, pal.particule, a);
        }
      }
    }
  }

  // Poussière lumineuse en suspension, dense autour du sujet.
  const m = 90 + rng.int(90);
  for (let i = 0; i < m; i++) {
    const ang = rng.range(0, 6.28);
    const ray = Math.pow(rng.next(), 0.6) * h * 0.72;
    const x = centre.sx + Math.cos(ang) * ray;
    const y = centre.sy + Math.sin(ang) * ray * 0.8;
    const taille = rng.range(0.8, 2.8) * u;
    const inten = rng.range(0.18, 0.7);
    for (let dy = -taille; dy <= taille; dy++) {
      for (let dx = -taille; dx <= taille; dx++) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px < 0 || px >= w || py < 0 || py >= h) continue;
        const d = Math.hypot(dx, dy) / taille;
        if (d > 1) continue;
        cv.add(px, py, pal.particule, inten * (1 - d) * (1 - d) * 0.55);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Étalonnage
// ---------------------------------------------------------------------------

function flou(buf, w, h, rayon, passes = 2) {
  const tmp = new Float32Array(buf.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      for (let ch = 0; ch < 3; ch++) {
        let somme = 0;
        const ligne = y * w * 3 + ch;
        for (let x = -rayon; x <= rayon; x++) somme += buf[ligne + clamp(x, 0, w - 1) * 3];
        const inv = 1 / (rayon * 2 + 1);
        for (let x = 0; x < w; x++) {
          tmp[ligne + x * 3] = somme * inv;
          somme += buf[ligne + clamp(x + rayon + 1, 0, w - 1) * 3];
          somme -= buf[ligne + clamp(x - rayon, 0, w - 1) * 3];
        }
      }
    }
    for (let x = 0; x < w; x++) {
      for (let ch = 0; ch < 3; ch++) {
        let somme = 0;
        const col = x * 3 + ch;
        for (let y = -rayon; y <= rayon; y++) somme += tmp[clamp(y, 0, h - 1) * w * 3 + col];
        const inv = 1 / (rayon * 2 + 1);
        for (let y = 0; y < h; y++) {
          buf[y * w * 3 + col] = somme * inv;
          somme += tmp[clamp(y + rayon + 1, 0, h - 1) * w * 3 + col];
          somme -= tmp[clamp(y - rayon, 0, h - 1) * w * 3 + col];
        }
      }
    }
  }
}

/**
 * Étalonnage léger. Une illustration ne se traite pas comme une photographie :
 * pas de courbe filmique qui désature les hautes lumières, pas de grain
 * argentique — seulement un voile lumineux, un peu de saturation et un grain de
 * papier très fin.
 */
export function etalonner(cv, seed) {
  const { w, h, data } = cv;

  const bw = w >> 1;
  const bh = h >> 1;
  const voile = new Float32Array(bw * bh * 3);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const si = (y * 2 * w + x * 2) * 3;
      const di = (y * bw + x) * 3;
      for (let ch = 0; ch < 3; ch++) voile[di + ch] = Math.max(0, data[si + ch] - 0.90) * 1.0;
    }
  }
  flou(voile, bw, bh, Math.max(2, Math.round(bw * 0.02)), 2);

  const grain = new Rng(seed ^ 0x5bd1);
  const cxn = w / 2;
  const cyn = h / 2;
  const diag = Math.hypot(cxn, cyn);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const bi = (clamp(y >> 1, 0, bh - 1) * bw + clamp(x >> 1, 0, bw - 1)) * 3;

      let r = data[i] + voile[bi] * 0.16;
      let g = data[i + 1] + voile[bi + 1] * 0.16;
      let b = data[i + 2] + voile[bi + 2] * 0.16;

      // Vignettage discret, juste pour recentrer le regard.
      const vg = 1 - Math.pow(Math.hypot(x - cxn, y - cyn) / diag, 2.4) * 0.30;
      r *= vg; g *= vg; b *= vg;

      // Rehaut doux : compresse les hautes lumières sans écraser la couleur.
      // Rehaut appliqué seulement aux hautes lumières : les ombres gardent
      // leur densité, sinon l'image perd toute assise.
      r = r < 0.72 ? r : 0.72 + (1 - Math.exp(-(r - 0.72) * 2.6)) * 0.28;
      g = g < 0.72 ? g : 0.72 + (1 - Math.exp(-(g - 0.72) * 2.6)) * 0.28;
      b = b < 0.72 ? b : 0.72 + (1 - Math.exp(-(b - 0.72) * 2.6)) * 0.28;

      // Saturation : le dessin assume des couleurs plus franches que le réel.
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const sat = 1.22;
      r = clamp(lum + (r - lum) * sat, 0, 1);
      g = clamp(lum + (g - lum) * sat, 0, 1);
      b = clamp(lum + (b - lum) * sat, 0, 1);

      // Grain de papier, très fin, à peine perceptible.
      const n = (grain.next() - 0.5) * 0.012;
      data[i] = clamp(r + n, 0, 1);
      data[i + 1] = clamp(g + n, 0, 1);
      data[i + 2] = clamp(b + n, 0, 1);
    }
  }
}

/**
 * Écriture des octets. Les palettes sont déjà définies en espace d'affichage :
 * appliquer ici une correction gamma délaverait tout une seconde fois.
 */
export function versOctets(cv) {
  const out = Buffer.allocUnsafe(cv.w * cv.h * 3);
  for (let i = 0; i < cv.data.length; i++) {
    out[i] = Math.round(clamp(cv.data[i], 0, 1) * 255);
  }
  return out;
}

/** Peint une illustration complète et renvoie ses octets RVB bruts. */
export function rendreIllustration({ seed, palette, silhouette, w, h }) {
  const cv = new Canvas(w, h);
  const rng = new Rng(seed);
  const centre = peindreFond(cv, palette, rng, seed);
  if (silhouette && silhouette !== 'paysage') {
    peindreSujet(cv, palette, rng, seed, silhouette, centre);
  } else {
    peindreMotif(cv, palette, rng, seed, centre);
  }
  peindreEclats(cv, palette, rng, centre);
  etalonner(cv, seed);
  return versOctets(cv);
}
