/**
 * Tests de bon fonctionnement du moteur.
 *
 * Ils s'exécutent sur le TypeScript transpilé à la volée par esbuild (fourni
 * avec Vite), ce qui évite d'ajouter une chaîne de compilation dédiée.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chargerMoteur } from './charger.mjs';

const M = await chargerMoteur();

test('le registre contient bien 151 cartes uniques', () => {
  assert.equal(M.TOUTES_LES_CARTES.length, 151);
  const ids = new Set(M.TOUTES_LES_CARTES.map((c) => c.id));
  assert.equal(ids.size, 151);
});

test('chaque deck préconstruit fait 20 cartes et respecte la limite de copies', () => {
  for (const d of M.DECKS) {
    const cartes = M.deplier(d.liste);
    assert.equal(cartes.length, 20, `${d.id} devrait faire 20 cartes`);
    const compte = new Map();
    for (const id of cartes) compte.set(id, (compte.get(id) ?? 0) + 1);
    for (const [id, n] of compte) {
      const max = M.exemplairesMax(M.getCardOrThrow(id).rarete);
      assert.ok(n <= max, `${d.id} : ${id} en ${n} exemplaires (max ${max})`);
    }
  }
});

test('chaque évolution pointe vers une carte existante du même lignage', () => {
  for (const c of M.TOUTES_LES_CARTES) {
    if (!c.evolueDe) continue;
    const base = M.getCard(c.evolueDe);
    assert.ok(base, `${c.id} évolue depuis ${c.evolueDe} qui n'existe pas`);
    assert.equal(base.lignee, c.lignee, `${c.id} : lignage incohérent`);
    assert.equal(base.stade, c.stade - 1, `${c.id} : stade incohérent`);
  }
});

test('le cycle élémentaire est cohérent : faiblesse et résistance sont réciproques', () => {
  for (const el of M.ELEMENTS) {
    const bat = M.BEATS[el];
    assert.ok(bat, `${el} devrait battre un élément`);
    assert.equal(M.WEAK_TO[bat], el, `${bat} devrait être faible à ${el}`);
  }
});

test('la faiblesse majore les dégâts et la résistance les réduit', () => {
  // La Flamme bat la Sylve.
  assert.deepEqual(M.modulerDegats(4, 'flamme', 'sylve'), { valeur: 6, faiblesse: true, resistance: false });
  // La Sylve bat le Roc, donc la Sylve résiste au Roc.
  assert.deepEqual(M.modulerDegats(4, 'roc', 'sylve'), { valeur: 3, faiblesse: false, resistance: true });
  // Aucune relation entre Flamme et Foudre.
  assert.deepEqual(M.modulerDegats(4, 'foudre', 'flamme'), { valeur: 4, faiblesse: false, resistance: false });
  // Le neutre n'est jamais modulé.
  assert.equal(M.modulerDegats(4, 'neutre', 'sylve').valeur, 4);
});

test('une partie complète IA contre IA se termine toujours', () => {
  for (let graine = 1; graine <= 30; graine++) {
    const a = M.DECKS[graine % M.DECKS.length];
    const b = M.DECKS[(graine + 3) % M.DECKS.length];
    let s = M.createGame(
      { nom: 'A', deck: M.deplier(a.liste), terrainId: a.terrainId },
      { nom: 'B', deck: M.deplier(b.liste), terrainId: b.terrainId },
      graine,
    );
    s = M.applyAction(s, { type: 'mulligan', rejeter: [] });

    let tours = 0;
    while (s.phase === 'jeu' && tours < 120) {
      for (const act of M.jouerTourIA(s, 'normal', graine * 31 + tours)) {
        s = M.applyAction(s, act);
        if (s.phase === 'termine') break;
      }
      tours++;
    }
    assert.equal(s.phase, 'termine', `graine ${graine} : partie non terminée après ${tours} tours`);
    assert.ok(s.vainqueur === 0 || s.vainqueur === 1);
  }
});

test('les points de vie ne descendent jamais sous zéro ni au-dessus du maximum', () => {
  let s = M.createGame(
    { nom: 'A', deck: M.deplier(M.DECKS[0].liste), terrainId: M.DECKS[0].terrainId },
    { nom: 'B', deck: M.deplier(M.DECKS[1].liste), terrainId: M.DECKS[1].terrainId },
    7,
  );
  s = M.applyAction(s, { type: 'mulligan', rejeter: [0, 1] });
  let tours = 0;
  while (s.phase === 'jeu' && tours < 60) {
    for (const act of M.jouerTourIA(s, 'difficile', 99 + tours)) {
      s = M.applyAction(s, act);
      for (const p of s.joueurs) {
        assert.ok(p.pv >= 0 && p.pv <= p.pvMax, 'PV hors bornes');
        assert.ok(p.main.length <= 8, 'main trop grande');
        assert.equal(p.lignes.length, 3, 'nombre de lignes incorrect');
      }
      if (s.phase === 'termine') break;
    }
    tours++;
  }
});

test('une action illégale laisse l état inchangé', () => {
  let s = M.createGame(
    { nom: 'A', deck: M.deplier(M.DECKS[0].liste), terrainId: M.DECKS[0].terrainId },
    { nom: 'B', deck: M.deplier(M.DECKS[1].liste), terrainId: M.DECKS[1].terrainId },
    3,
  );
  s = M.applyAction(s, { type: 'mulligan', rejeter: [] });
  const avant = JSON.stringify({ ...s, journal: [] });
  const apres = M.applyAction(s, { type: 'jouer-creature', uid: 99999, ligne: 0 });
  assert.equal(JSON.stringify({ ...apres, journal: [] }), avant);
  assert.equal(apres.journal.length, 0);
});
