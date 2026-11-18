/*
 * Courtside sample data
 * ---------------------
 * A basketball league simulated game-by-game from a fixed
 * seed so every visitor sees the same season. Change SEED for a new season.
 * Every number in the app is derived from these box scores, so standings,
 * leaders and charts always agree with each other.
 */
window.LEAGUE = (function () {
  'use strict';

  const SEED = 20261118;
  const ROUNDS = 24;

  // Small, fast, seedable PRNG (mulberry32)
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(SEED);
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = rand();
    while (!v) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const binom = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (rand() < p) k++; return k; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const TEAMS = [
    ['HAR', 'Harbor City', 'Herons'], ['RMC', 'Redmesa', 'Coyotes'],
    ['NGC', 'Northgate', 'Comets'], ['PAT', 'Port Alder', 'Tides'],
    ['SFL', 'Silver Falls', 'Lynx'], ['KBG', 'Kestrel Bay', 'Gulls'],
    ['IRW', 'Ironwood', 'Owls'], ['LKV', 'Lakeview', 'Lanterns'],
    ['CDR', 'Cedar Ridge', 'Stags'], ['SUM', 'Summit', 'Peaks'],
  ].map(([id, city, name]) => ({ id, city, name, def: gauss() * 0.015, games: [] }));

  const FIRST = ['Marcus', 'Theo', 'Jalen', 'Andre', 'Felix', 'Dorian', 'Malik', 'Owen', 'Isaiah', 'Rafael', 'Caleb', 'Nico', 'Darius', 'Elijah', 'Tobias', 'Xavier', 'Jonah', 'Silas', 'Adrian', 'Rowan', 'Kofi', 'Mateo', 'Desmond', 'Luca', 'Emeka', 'Quentin', 'Ravi', 'Hugo', 'Terrence', 'Bastian', 'Idris', 'Kenji', 'Lamar', 'Soren', 'Wesley', 'Zion'];
  const LAST = ['Okafor', 'Brennan', 'Castillo', 'Whitfield', 'Nakamura', 'Delacroix', 'Ashford', 'Mbeki', 'Lindqvist', 'Harrow', 'Vance', 'Moreau', 'Kowalski', 'Prescott', 'Abara', 'Ferreira', 'Calloway', 'Strand', 'Ivers', 'Toussaint', 'Reyes', 'Galloway', 'Osei', 'Hendricks', 'Marlowe', 'Petrov', 'Quinlan', 'Santos', 'Thorne', 'Underhill', 'Valdez', 'Wakefield', 'Yilmaz', 'Archer', 'Bishop', 'Conley', 'Draper', 'Ellison', 'Faulk', 'Grayson'];

  // Per-minute tendencies by position
  const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const PROF = {
    PG: { fga: 0.34, tp: 0.42, fg2: 0.49, tp3: 0.37, fta: 0.10, reb: 0.13, ast: 0.22, stl: 0.040, blk: 0.008 },
    SG: { fga: 0.36, tp: 0.45, fg2: 0.48, tp3: 0.38, fta: 0.10, reb: 0.14, ast: 0.12, stl: 0.035, blk: 0.010 },
    SF: { fga: 0.32, tp: 0.36, fg2: 0.50, tp3: 0.36, fta: 0.10, reb: 0.20, ast: 0.10, stl: 0.032, blk: 0.016 },
    PF: { fga: 0.30, tp: 0.22, fg2: 0.53, tp3: 0.34, fta: 0.12, reb: 0.27, ast: 0.08, stl: 0.026, blk: 0.030 },
    C:  { fga: 0.28, tp: 0.08, fg2: 0.58, tp3: 0.30, fta: 0.14, reb: 0.33, ast: 0.07, stl: 0.022, blk: 0.050 },
  };

  const usedNames = new Set();
  function uniqueName() {
    let n;
    do { n = pick(FIRST) + ' ' + pick(LAST); } while (usedNames.has(n));
    usedNames.add(n);
    return n;
  }

  const players = [];
  let pid = 0;
  TEAMS.forEach((t) => {
    const starIdx = Math.floor(rand() * 5);
    const roster = POS.map((pos, i) => ({ pos, starter: true, star: i === starIdx }))
      .concat([0, 1, 2, 3].map(() => ({ pos: pick(POS), starter: false, star: false })));
    const startMins = POS.map(() => 30 + rand() * 6);
    const benchBase = (240 - startMins.reduce((a, b) => a + b, 0)) / 4;
    const numbers = shuffle(Array.from({ length: 55 }, (_, i) => i));
    roster.forEach((r, i) => {
      const talent = r.star ? 1.3 + rand() * 0.2 : r.starter ? 0.92 + rand() * 0.3 : 0.7 + rand() * 0.3;
      players.push({
        id: 'p' + (++pid),
        name: uniqueName(),
        team: t.id,
        pos: r.pos,
        number: numbers[i],
        starter: r.starter,
        talent,
        baseMin: r.starter ? startMins[i] : benchBase * (0.75 + rand() * 0.5),
        fgAdj: gauss() * 0.025,
        tpAdj: gauss() * 0.03,
        ft: clamp(0.76 + gauss() * 0.07, 0.55, 0.93),
        log: [],
      });
    });
  });

  function simPlayer(p, home, oppDef) {
    const R = PROF[p.pos];
    const min = Math.round(clamp(p.baseMin + gauss() * 3.5, 3, 44));
    const usage = p.talent * (0.8 + rand() * 0.4);
    const fga = Math.max(0, Math.round(min * R.fga * usage));
    const boost = (home ? 0.012 : 0) - oppDef + (p.talent - 1) * 0.04;
    let fgm = 0, tpm = 0, tpa = 0;
    for (let i = 0; i < fga; i++) {
      if (rand() < R.tp) {
        tpa++;
        if (rand() < R.tp3 + p.tpAdj + boost) { tpm++; fgm++; }
      } else if (rand() < R.fg2 + p.fgAdj + boost) fgm++;
    }
    const fta = binom(min, R.fta * p.talent * 0.9);
    const ftm = binom(fta, p.ft);
    return {
      min,
      pts: 2 * fgm + tpm + ftm,
      reb: Math.round(min * R.reb * Math.sqrt(p.talent) * (0.6 + rand() * 0.8)),
      ast: Math.round(min * R.ast * p.talent * (0.6 + rand() * 0.8)),
      stl: binom(min, R.stl),
      blk: binom(min, R.blk),
      fgm, fga, tpm, tpa, ftm, fta,
    };
  }

  const rosterOf = (t) => players.filter((p) => p.team === t.id);
  const games = [];
  const start = Date.UTC(2026, 9, 21);
  for (let r = 1; r <= ROUNDS; r++) {
    const order = shuffle(TEAMS.slice());
    const date = new Date(start + (r - 1) * 3 * 864e5).toISOString().slice(0, 10);
    for (let i = 0; i < order.length; i += 2) {
      const h = order[i], a = order[i + 1];
      const hl = rosterOf(h).map((p) => [p, simPlayer(p, true, a.def)]);
      const al = rosterOf(a).map((p) => [p, simPlayer(p, false, h.def)]);
      let hs = hl.reduce((s, x) => s + x[1].pts, 0);
      const as = al.reduce((s, x) => s + x[1].pts, 0);
      if (hs === as) { // no ties: home top scorer hits the game-winner
        const top = hl.reduce((b, x) => (x[1].pts > b[1].pts ? x : b));
        top[1].pts += 2; top[1].fgm++; top[1].fga++; hs += 2;
      }
      games.push({ round: r, date, home: h.id, away: a.id, hs, as });
      h.games.push({ round: r, date, opp: a.id, home: true, pf: hs, pa: as, win: hs > as });
      a.games.push({ round: r, date, opp: h.id, home: false, pf: as, pa: hs, win: as > hs });
      hl.forEach(([p, s]) => p.log.push({ round: r, date, opp: a.id, home: true, pf: hs, pa: as, win: hs > as, ...s }));
      al.forEach(([p, s]) => p.log.push({ round: r, date, opp: h.id, home: false, pf: as, pa: hs, win: as > hs, ...s }));
    }
  }

  return { name: 'Meridian Basketball League', season: '2026–27', rounds: ROUNDS, teams: TEAMS, players, games };
})();
