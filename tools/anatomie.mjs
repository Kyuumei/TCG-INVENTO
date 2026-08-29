/**
 * Anatomie : construction des squelettes de créatures.
 *
 * Chaque archétype est décrit par un assemblage de primitives (ellipses et
 * troncs coniques) fusionnées par union lisse. Le résultat est un champ de
 * distance signée, dont on tire aussi bien le contour à encrer que le volume à
 * ombrer en aplats.
 */
import { clamp, lerp } from './noise.mjs';

function sdEllipse(px, py, x, y, rx, ry, rot) {
  const dx = px - x;
  const dy = py - y;
  const c = Math.cos(-rot);
  const s = Math.sin(-rot);
  const ax = dx * c - dy * s;
  const ay = dx * s + dy * c;
  const k = Math.hypot(ax / rx, ay / ry);
  return (k - 1) * Math.min(rx, ry);
}

/** Capsule à rayon variable : donne des membres qui s'affinent naturellement. */
function sdCone(px, py, x1, y1, x2, y2, r1, r2) {
  const pax = px - x1;
  const pay = py - y1;
  const bax = x2 - x1;
  const bay = y2 - y1;
  const bb = bax * bax + bay * bay || 1e-6;
  const t = clamp((pax * bax + pay * bay) / bb, 0, 1);
  const r = r1 + (r2 - r1) * t;
  return Math.hypot(pax - bax * t, pay - bay * t) - r;
}

/** Union lisse : c'est elle qui soude les membres au corps sans arête. */
function smin(a, b, k) {
  const hh = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, hh) - k * hh * (1 - hh);
}

export function evalSDF(prims, px, py, k) {
  let d = 1e9;
  for (let i = 0; i < prims.length; i++) {
    const p = prims[i];
    const di =
      p.t === 'e'
        ? sdEllipse(px, py, p.x, p.y, p.rx, p.ry, p.rot || 0)
        : sdCone(px, py, p.x1, p.y1, p.x2, p.y2, p.r1, p.r2);
    d = d === 1e9 ? di : smin(d, di, p.k ?? k);
  }
  return d;
}

const E = (x, y, rx, ry, rot = 0, k) => ({ t: 'e', x, y, rx, ry, rot, k });
const C = (x1, y1, x2, y2, r1, r2, k) => ({ t: 'c', x1, y1, x2, y2, r1, r2, k });

/**
 * Construit le squelette du sujet. Toutes les valeurs sont en pixels, dérivées
 * de la hauteur d'image `H` pour rester indépendantes de la résolution.
 * Chaque archétype est paramétré par le générateur aléatoire : deux créatures
 * du même type ne se ressemblent jamais tout à fait.
 */
export function construireSujet(type, W, H, rng) {
  const u = H; // unité de mesure
  const cx = W * rng.range(0.44, 0.56);
  const sol = H * 0.84;
  const P = [];
  const Y = []; // yeux : ils font la différence entre une forme et un être
  const K = u * 0.030;
  const sens = rng.next() < 0.5 ? 1 : -1; // orientation gauche/droite

  switch (type) {
    case 'quadrupede': {
      const bw = u * rng.range(0.19, 0.25);
      const bh = u * rng.range(0.11, 0.145);
      const by = sol - u * rng.range(0.19, 0.25);
      P.push(E(cx, by, bw, bh, rng.range(-0.08, 0.08)));
      // Croupe et poitrail, pour éviter le corps « saucisse ».
      P.push(E(cx - sens * bw * 0.55, by - bh * 0.15, bw * 0.5, bh * 0.95));
      P.push(E(cx + sens * bw * 0.55, by - bh * 0.2, bw * 0.45, bh * 0.9));
      for (let i = 0; i < 4; i++) {
        const avant = i < 2;
        const lx = cx + sens * (avant ? bw * 0.6 : -bw * 0.62) + (i % 2 ? u * 0.02 : -u * 0.015) * sens;
        const genou = u * rng.range(0.05, 0.08);
        P.push(C(lx, by + bh * 0.5, lx + sens * u * 0.015, by + bh * 0.5 + genou, u * 0.032, u * 0.026));
        P.push(C(lx + sens * u * 0.015, by + bh * 0.5 + genou, lx - sens * u * 0.005, sol, u * 0.026, u * 0.018));
      }
      const nx = cx + sens * bw * 0.92;
      const ny = by - bh * 0.55;
      const tx = nx + sens * u * rng.range(0.05, 0.10);
      const ty = ny - u * rng.range(0.09, 0.16);
      P.push(C(nx, ny, tx, ty, u * 0.055, u * 0.042));
      P.push(E(tx + sens * u * 0.025, ty - u * 0.01, u * rng.range(0.055, 0.075), u * rng.range(0.042, 0.055), sens * 0.2));
      P.push(C(tx + sens * u * 0.06, ty + u * 0.005, tx + sens * u * 0.105, ty + u * 0.02, u * 0.025, u * 0.012));
      // Cornes ou oreilles.
      if (rng.next() < 0.6) {
        for (const s2 of [-1, 1]) {
          P.push(C(tx + sens * 0.01 * u, ty - u * 0.03, tx + sens * u * rng.range(-0.02, 0.04) + s2 * u * 0.01, ty - u * rng.range(0.07, 0.14), u * 0.014, u * 0.004));
        }
      }
      Y.push({ x: tx + sens * u * 0.048, y: ty - u * 0.018, r: u * 0.0135 });
      const qx = cx - sens * bw * 1.0;
      P.push(C(qx, by - bh * 0.3, qx - sens * u * rng.range(0.08, 0.16), by - u * rng.range(0.0, 0.14), u * 0.022, u * 0.008));
      break;
    }

    case 'colosse': {
      const bw = u * rng.range(0.15, 0.19);
      const by = sol - u * rng.range(0.32, 0.40);
      P.push(E(cx, by, bw, u * rng.range(0.17, 0.21), 0));
      P.push(E(cx, by - u * 0.14, bw * 1.22, u * 0.075, 0)); // épaules
      const tyC = by - u * rng.range(0.24, 0.28);
      P.push(E(cx, tyC, u * 0.075, u * 0.072, 0)); // tête
      for (const s2 of [-1, 1]) Y.push({ x: cx + s2 * u * 0.030, y: tyC - u * 0.005, r: u * 0.0125 });
      for (const s2 of [-1, 1]) {
        const ex = cx + s2 * bw * 1.15;
        const cy2 = by - u * 0.13;
        const co = by + u * rng.range(0.02, 0.07);
        P.push(C(ex, cy2, ex + s2 * u * 0.05, co, u * 0.055, u * 0.045));
        P.push(C(ex + s2 * u * 0.05, co, ex + s2 * u * rng.range(0.01, 0.06), by + u * 0.16, u * 0.045, u * 0.05));
        const hx = cx + s2 * bw * 0.52;
        P.push(C(hx, by + u * 0.16, hx + s2 * u * 0.012, sol, u * 0.062, u * 0.048));
      }
      break;
    }

    case 'humanoide': {
      const by = sol - u * rng.range(0.30, 0.36);
      const bw = u * rng.range(0.075, 0.10);
      P.push(E(cx, by, bw, u * rng.range(0.115, 0.145), rng.range(-0.06, 0.06)));
      P.push(E(cx, by - u * 0.10, bw * 1.28, u * 0.042, 0));
      const tyH = by - u * rng.range(0.175, 0.20);
      P.push(E(cx + sens * u * 0.008, tyH, u * 0.048, u * 0.055, sens * 0.08));
      for (const s2 of [-1, 1]) Y.push({ x: cx + sens * u * 0.008 + s2 * u * 0.019, y: tyH - u * 0.006, r: u * 0.0085 });
      for (const s2 of [-1, 1]) {
        const ex = cx + s2 * bw * 1.25;
        const bras = rng.range(0.10, 0.19);
        P.push(C(ex, by - u * 0.095, ex + s2 * u * rng.range(0.01, 0.06), by + u * bras, u * 0.030, u * 0.020));
      }
      for (const s2 of [-1, 1]) {
        const hx = cx + s2 * bw * 0.5;
        P.push(C(hx, by + u * 0.11, hx + s2 * u * 0.02, sol - u * 0.02, u * 0.038, u * 0.028));
        P.push(C(hx + s2 * u * 0.02, sol - u * 0.02, hx + s2 * u * 0.035, sol, u * 0.028, u * 0.022));
      }
      break;
    }

    case 'oiseau': {
      const by = H * rng.range(0.46, 0.56);
      P.push(E(cx, by, u * rng.range(0.075, 0.10), u * rng.range(0.10, 0.13), sens * 0.15));
      // Ailes : trois plumes par côté, décalées, pour éviter la palette plate.
      for (const s2 of [-1, 1]) {
        const env = u * rng.range(0.30, 0.44);
        for (let i = 0; i < 3; i++) {
          const t = i / 2;
          const ang = lerp(-0.55, 0.28, t) * s2;
          const ex = cx + s2 * env * lerp(1.0, 0.72, t);
          const ey = by + Math.sin(ang) * env * 0.55 - u * 0.05;
          P.push(E((cx + ex) / 2, (by + ey) / 2 - u * 0.02, env * lerp(0.56, 0.44, t), u * lerp(0.055, 0.032, t), Math.atan2(ey - by, ex - cx)));
        }
      }
      const hx = cx + sens * u * 0.055;
      const hy = by - u * rng.range(0.115, 0.145);
      P.push(E(hx, hy, u * 0.045, u * 0.042, 0));
      P.push(C(hx + sens * u * 0.03, hy + u * 0.006, hx + sens * u * 0.085, hy + u * 0.026, u * 0.016, u * 0.004));
      Y.push({ x: hx + sens * u * 0.018, y: hy - u * 0.006, r: u * 0.011 });
      for (let i = 0; i < 3; i++) {
        const a = (i - 1) * 0.24;
        P.push(C(cx - sens * u * 0.05, by + u * 0.07, cx - sens * u * (0.05 + Math.cos(a) * 0.20), by + u * (0.07 + Math.sin(a + 0.6) * 0.16), u * 0.022, u * 0.006));
      }
      break;
    }

    case 'serpent': {
      // Corps en S : une chaîne de troncs coniques suivant une sinusoïde.
      const n = 13;
      const amp = u * rng.range(0.09, 0.16);
      const freq = rng.range(1.6, 2.6);
      const phase = rng.range(0, 6.28);
      const x0 = W * 0.14;
      const x1 = W * 0.86;
      let px = x0;
      let py = sol - u * 0.12 + Math.sin(phase) * amp;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const nx2 = lerp(x0, x1, t);
        const ny2 = sol - u * (0.10 + t * 0.30) + Math.sin(phase + t * freq * 6.28) * amp * (1 - t * 0.3);
        const r1 = u * lerp(0.055, 0.020, Math.max(0, t - 0.15));
        const r2 = u * lerp(0.055, 0.018, t);
        P.push(C(px, py, nx2, ny2, r1, r2));
        px = nx2;
        py = ny2;
      }
      P.push(E(px, py - u * 0.01, u * 0.055, u * 0.040, Math.atan2(-amp, 1) * 0.3));
      Y.push({ x: px + u * 0.020, y: py - u * 0.022, r: u * 0.011 });
      for (const s2 of [-1, 1]) {
        P.push(C(px, py - u * 0.03, px + u * 0.02, py - u * rng.range(0.06, 0.11) + s2 * u * 0.01, u * 0.012, u * 0.003));
      }
      break;
    }

    case 'poisson': {
      const by = H * rng.range(0.50, 0.58);
      const L = u * rng.range(0.26, 0.34);
      P.push(E(cx, by, L, u * rng.range(0.10, 0.14), rng.range(-0.12, 0.12)));
      P.push(E(cx + sens * L * 0.72, by - u * 0.01, u * 0.085, u * 0.075, 0));
      Y.push({ x: cx + sens * L * 0.80, y: by - u * 0.030, r: u * 0.014 });
      // Caudale.
      for (let i = 0; i < 3; i++) {
        const a = (i - 1) * 0.5;
        P.push(C(cx - sens * L * 0.85, by, cx - sens * (L * 1.25), by + Math.sin(a) * u * 0.17, u * 0.030, u * 0.008));
      }
      // Dorsale et pectorales.
      P.push(C(cx - L * 0.2 * sens, by - u * 0.09, cx + L * 0.15 * sens, by - u * rng.range(0.17, 0.24), u * 0.05, u * 0.012));
      P.push(C(cx, by + u * 0.06, cx - sens * u * 0.10, by + u * 0.17, u * 0.035, u * 0.010));
      break;
    }

    case 'insecte': {
      const by = sol - u * rng.range(0.20, 0.28);
      P.push(E(cx, by, u * rng.range(0.085, 0.11), u * rng.range(0.055, 0.075), rng.range(-0.15, 0.15)));
      P.push(E(cx - sens * u * 0.15, by + u * 0.02, u * rng.range(0.09, 0.13), u * 0.062, sens * 0.15));
      const hx = cx + sens * u * 0.115;
      P.push(E(hx, by - u * 0.02, u * 0.048, u * 0.042, 0));
      for (const s2 of [-1, 1]) Y.push({ x: hx + sens * u * 0.018, y: by - u * 0.032 + s2 * u * 0.016, r: u * 0.013 });
      for (const s2 of [-1, 1]) {
        P.push(C(hx + sens * u * 0.02, by - u * 0.05, hx + sens * u * rng.range(0.05, 0.12), by - u * rng.range(0.14, 0.21) + s2 * u * 0.02, u * 0.010, u * 0.003));
      }
      for (let i = 0; i < 3; i++) {
        for (const s2 of [-1, 1]) {
          const ax = cx + sens * (u * 0.06 - i * u * 0.075);
          const ay = by + u * 0.03;
          const gx = ax + sens * u * rng.range(0.03, 0.10) * (i === 0 ? 1.4 : 1);
          const gy = ay - u * rng.range(0.03, 0.09);
          P.push(C(ax, ay, gx, gy, u * 0.016, u * 0.011));
          P.push(C(gx, gy, gx + sens * u * rng.range(0.01, 0.07) + s2 * u * 0.01, sol, u * 0.011, u * 0.005));
        }
      }
      break;
    }

    case 'flore': {
      const th = u * rng.range(0.18, 0.30);
      P.push(C(cx, sol, cx + rng.range(-0.04, 0.04) * u, sol - th, u * rng.range(0.045, 0.075), u * rng.range(0.035, 0.06)));
      const cy2 = sol - th;
      P.push(E(cx, cy2 - u * 0.02, u * rng.range(0.16, 0.24), u * rng.range(0.07, 0.11), rng.range(-0.08, 0.08)));
      P.push(E(cx, cy2 - u * 0.07, u * rng.range(0.09, 0.15), u * rng.range(0.05, 0.08), 0));
      for (let i = 0; i < 4; i++) {
        const s2 = i % 2 ? 1 : -1;
        const py2 = sol - th * rng.range(0.25, 0.85);
        P.push(C(cx, py2, cx + s2 * u * rng.range(0.07, 0.16), py2 - u * rng.range(0.02, 0.09), u * 0.022, u * 0.006));
      }
      break;
    }

    case 'amorphe': {
      const n = 7 + rng.int(4);
      const by = sol - u * rng.range(0.16, 0.26);
      for (let i = 0; i < n; i++) {
        const a = rng.range(0, 6.28);
        const rr = rng.range(0, u * 0.17);
        P.push(E(cx + Math.cos(a) * rr, by + Math.sin(a) * rr * 0.75, u * rng.range(0.07, 0.14), u * rng.range(0.06, 0.12), rng.range(0, 3.14), u * 0.09));
      }
      for (const s2 of [-1, 1]) Y.push({ x: cx + s2 * u * 0.038, y: by - u * 0.045, r: u * 0.014 });
      break;
    }

    case 'objet': {
      // Socle + artefact central : présentation « objet de collection ».
      P.push(E(cx, sol - u * 0.02, u * rng.range(0.16, 0.22), u * 0.035, 0));
      P.push(E(cx, sol - u * 0.06, u * rng.range(0.10, 0.14), u * 0.030, 0));
      const forme = rng.int(3);
      if (forme === 0) {
        P.push(C(cx, sol - u * 0.08, cx + rng.range(-0.03, 0.03) * u, sol - u * rng.range(0.36, 0.48), u * 0.030, u * 0.012));
        P.push(C(cx - u * 0.06, sol - u * 0.30, cx + u * 0.06, sol - u * 0.30, u * 0.016, u * 0.016));
      } else if (forme === 1) {
        P.push(E(cx, sol - u * rng.range(0.22, 0.30), u * rng.range(0.09, 0.13), u * rng.range(0.09, 0.13), 0));
      } else {
        for (let i = 0; i < 5; i++) {
          const a = -0.4 + (i / 4) * 3.94;
          const rr = u * 0.14;
          P.push(C(cx + Math.cos(a) * rr, sol - u * 0.16 - Math.sin(a) * rr * 0.5, cx + Math.cos(a) * rr * 1.15, sol - u * 0.16 - Math.sin(a) * rr * 1.5, u * 0.018, u * 0.006));
        }
      }
      break;
    }

    default:
      return { prims: [], k: K, sens, yeux: [], auSol: false };
  }

  const auSol = !(type === 'oiseau' || type === 'poisson');
  return { prims: P, k: K, sens, yeux: Y, auSol };
}
