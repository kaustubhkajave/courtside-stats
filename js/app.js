(function () {
  'use strict';

  const L = window.LEAGUE;
  const { lineChart, showTip, hideTip, tipRows, esc } = window.Charts;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const QUALIFY = 12; // min games for leaderboards & percentiles

  /* ---------- Formatting ---------- */
  const f1 = (n) => n.toFixed(1);
  const fPct = (n) => (n * 100).toFixed(1);
  const fSigned = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(d);
  const fDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const initials = (t) => t.id;

  /* ---------- Aggregates ---------- */
  const teamById = Object.fromEntries(L.teams.map((t) => [t.id, t]));
  const playerById = Object.fromEntries(L.players.map((p) => [p.id, p]));
  const KEYS = ['min', 'pts', 'reb', 'ast', 'stl', 'blk', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta'];

  L.players.forEach((p) => {
    const s = { gp: p.log.length };
    KEYS.forEach((k) => {
      s[k + 'T'] = p.log.reduce((a, g) => a + g[k], 0);
      s[k] = s.gp ? s[k + 'T'] / s.gp : 0;
    });
    s.fgPct = s.fgaT ? s.fgmT / s.fgaT : 0;
    s.tpPct = s.tpaT ? s.tpmT / s.tpaT : 0;
    s.ftPct = s.ftaT ? s.ftmT / s.ftaT : 0;
    s.best = p.log.reduce((b, g) => (g.pts > b.pts ? g : b), p.log[0]);
    p.s = s;
  });

  L.teams.forEach((t) => {
    const g = t.games;
    const w = g.filter((x) => x.win).length;
    const pf = g.reduce((a, x) => a + x.pf, 0), pa = g.reduce((a, x) => a + x.pa, 0);
    let streak = 0;
    for (let i = g.length - 1; i >= 0 && g[i].win === g[g.length - 1].win; i--) streak++;
    t.s = {
      w, l: g.length - w, gp: g.length, pct: w / g.length,
      ppg: pf / g.length, opp: pa / g.length, diff: (pf - pa) / g.length,
      last5: g.slice(-5).map((x) => x.win),
      streak: (g[g.length - 1].win ? 'W' : 'L') + streak,
      cum: g.reduce((acc, x) => { acc.push((acc.length ? acc[acc.length - 1] : 0) + x.pf - x.pa); return acc; }, []),
    };
  });

  const standings = L.teams.slice().sort((a, b) => b.s.pct - a.s.pct || b.s.diff - a.s.diff);
  standings.forEach((t, i) => (t.s.rank = i + 1));
  const qualified = L.players.filter((p) => p.s.gp >= QUALIFY);

  function percentile(key, value) {
    const below = qualified.filter((p) => p.s[key] < value).length;
    const equal = qualified.filter((p) => p.s[key] === value).length;
    return Math.round(((below + equal / 2) / qualified.length) * 100);
  }

  const teamLabel = (id) => { const t = teamById[id]; return t.city + ' ' + t.name; };

  /* ---------- Header ---------- */
  $('#league-name').textContent = L.name;
  $('#season-line').textContent = `${L.season} season · through round ${L.rounds}`;

  /* ---------- KPIs ---------- */
  function renderKPIs() {
    const topScorer = qualified.slice().sort((a, b) => b.s.pts - a.s.pts)[0];
    const best = standings[0];
    const allScores = L.games.flatMap((g) => [g.hs, g.as]);
    const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    let bestGame = null;
    L.players.forEach((p) => p.log.forEach((g) => { if (!bestGame || g.pts > bestGame.g.pts) bestGame = { p, g }; }));

    const tiles = [
      { label: 'Scoring leader', value: f1(topScorer.s.pts), unit: 'PPG', note: `<button data-player="${topScorer.id}">${esc(topScorer.name)}</button> · ${topScorer.team}` },
      { label: 'Best record', value: `${best.s.w}–${best.s.l}`, unit: '', note: `${esc(teamLabel(best.id))} · ${fSigned(best.s.diff)} margin` },
      { label: 'Points per team per game', value: f1(avg), unit: '', note: `${L.games.length} games played` },
      { label: 'Single-game high', value: bestGame.g.pts, unit: 'PTS', note: `<button data-player="${bestGame.p.id}">${esc(bestGame.p.name)}</button> vs ${bestGame.g.opp}` },
    ];
    $('#kpis').innerHTML = tiles.map((t) => `
      <div class="kpi">
        <div class="kpi-label">${t.label}</div>
        <div class="kpi-value">${t.value}${t.unit ? `<small>${t.unit}</small>` : ''}</div>
        <div class="kpi-note">${t.note}</div>
      </div>`).join('');
  }

  /* ---------- Standings ---------- */
  function renderStandings() {
    const maxAbs = Math.max(...L.teams.map((t) => Math.abs(t.s.diff)));
    const rows = standings.map((t) => {
      const w = (Math.abs(t.s.diff) / maxAbs) * 50;
      const bar = t.s.diff >= 0
        ? `<i class="bar" style="left:50%;width:${w}%;background:var(--pos);border-radius:0 2px 2px 0"></i>`
        : `<i class="bar" style="right:50%;width:${w}%;background:var(--neg);border-radius:2px 0 0 2px"></i>`;
      return `<tr class="clickable" tabindex="0" data-team="${t.id}">
        <td class="l rank">${t.s.rank}</td>
        <td class="l"><div class="team-cell"><span class="badge">${initials(t)}</span><span><span class="nm">${esc(t.name)}</span><span class="city">${esc(t.city)}</span></span></div></td>
        <td><b>${t.s.w}</b>–${t.s.l}</td>
        <td class="hide-sm">${t.s.pct.toFixed(3).replace(/^0/, '')}</td>
        <td class="hide-sm">${f1(t.s.ppg)}</td>
        <td class="hide-sm">${f1(t.s.opp)}</td>
        <td><span class="diffbar"><span class="track">${bar}</span><span class="${t.s.diff >= 0 ? 'pos-t' : 'neg-t'}">${fSigned(t.s.diff)}</span></span></td>
        <td class="hide-sm"><span class="form" aria-label="Last five: ${t.s.last5.map((x) => (x ? 'win' : 'loss')).join(', ')}">${t.s.last5.map((x) => `<i class="${x ? 'w' : 'l'}">${x ? 'W' : 'L'}</i>`).join('')}</span></td>
      </tr>`;
    }).join('');
    $('#standings').innerHTML = `<thead><tr><th class="l">#</th><th class="l">Team</th><th>W–L</th><th class="hide-sm">Pct</th><th class="hide-sm">PPG</th><th class="hide-sm">Opp</th><th>Margin</th><th class="hide-sm">Last 5</th></tr></thead><tbody>${rows}</tbody>`;
    $$('#standings tbody tr').forEach((tr) => {
      const go = () => { selectedTeams = [tr.dataset.team]; slotOf = { [tr.dataset.team]: 1 }; location.hash = 'teams'; };
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
  }

  /* ---------- Leaders ---------- */
  const LEADER_CATS = [
    { key: 'pts', label: 'Points', fmt: f1 },
    { key: 'reb', label: 'Rebounds', fmt: f1 },
    { key: 'ast', label: 'Assists', fmt: f1 },
    { key: 'blk', label: 'Blocks', fmt: f1 },
    { key: 'tpPct', label: '3PT%', fmt: fPct, filter: (p) => p.s.tpaT >= 30 },
  ];
  let leaderCat = 'pts';
  function renderLeaders() {
    $('#leader-tabs').innerHTML = LEADER_CATS.map((c) =>
      `<button class="pill" role="tab" aria-selected="${c.key === leaderCat}" data-cat="${c.key}">${c.label}</button>`).join('');
    const cat = LEADER_CATS.find((c) => c.key === leaderCat);
    const list = qualified.filter(cat.filter || (() => true)).sort((a, b) => b.s[cat.key] - a.s[cat.key]).slice(0, 6);
    const top = list[0].s[cat.key];
    $('#leaders').innerHTML = list.map((p, i) => `
      <li><button class="leader${i === 0 ? ' first' : ''}" data-player="${p.id}">
        <span class="pos">${i + 1}</span>
        <span class="who"><b>${esc(p.name)}</b><span>${esc(teamLabel(p.team))} · ${p.pos}</span></span>
        <span class="val">${cat.fmt(p.s[cat.key])}</span>
        <span class="meter" aria-hidden="true"><i style="width:${(p.s[cat.key] / top) * 100}%"></i></span>
      </button></li>`).join('');
  }
  $('#leader-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (b) { leaderCat = b.dataset.cat; renderLeaders(); }
  });

  /* ---------- Players table ---------- */
  const COLS = [
    { key: 'name', label: 'Player', l: true, get: (p) => p.name },
    { key: 'team', label: 'Team', l: true, get: (p) => p.team },
    { key: 'pos', label: 'Pos', l: true, get: (p) => p.pos },
    { key: 'gp', label: 'GP', get: (p) => p.s.gp, fmt: (v) => v },
    { key: 'min', label: 'Min', get: (p) => p.s.min, fmt: f1 },
    { key: 'pts', label: 'Pts', get: (p) => p.s.pts, fmt: f1 },
    { key: 'reb', label: 'Reb', get: (p) => p.s.reb, fmt: f1 },
    { key: 'ast', label: 'Ast', get: (p) => p.s.ast, fmt: f1 },
    { key: 'stl', label: 'Stl', get: (p) => p.s.stl, fmt: f1 },
    { key: 'blk', label: 'Blk', get: (p) => p.s.blk, fmt: f1 },
    { key: 'fgPct', label: 'FG%', get: (p) => p.s.fgPct, fmt: fPct },
    { key: 'tpPct', label: '3P%', get: (p) => p.s.tpPct, fmt: fPct },
    { key: 'ftPct', label: 'FT%', get: (p) => p.s.ftPct, fmt: fPct },
  ];
  let sort = { key: 'pts', dir: -1 };
  const teamSelect = $('#f-team');
  L.teams.slice().sort((a, b) => a.city.localeCompare(b.city)).forEach((t) => teamSelect.add(new Option(teamLabel(t.id), t.id)));

  function renderPlayers() {
    const q = $('#f-search').value.trim().toLowerCase();
    const team = teamSelect.value, pos = $('#f-pos').value, minM = +$('#f-min').value;
    const col = COLS.find((c) => c.key === sort.key);
    const rows = L.players
      .filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!team || p.team === team) && (!pos || p.pos === pos) && p.s.min >= minM)
      .sort((a, b) => {
        const va = col.get(a), vb = col.get(b);
        return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * sort.dir;
      });
    const head = COLS.map((c) => `<th class="${c.l ? 'l' : ''}" ${c.key === sort.key ? `aria-sort="${sort.dir < 0 ? 'descending' : 'ascending'}"` : ''}><button data-sort="${c.key}">${c.label}</button></th>`).join('');
    const body = rows.map((p) => `<tr class="clickable" tabindex="0" data-player="${p.id}">${COLS.map((c) => {
      const v = c.get(p);
      const cls = [c.l ? 'l' : '', c.key === sort.key ? 'sorted' : ''].join(' ').trim();
      if (c.key === 'name') return `<td class="${cls}"><b style="font-weight:600">${esc(v)}</b></td>`;
      return `<td class="${cls}">${c.fmt ? c.fmt(v) : esc(v)}</td>`;
    }).join('')}</tr>`).join('');
    $('#players-table').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body || `<tr><td class="l" colspan="${COLS.length}" style="padding:28px 20px;color:var(--muted)">No players match these filters.</td></tr>`}</tbody>`;
    $('#players-count').textContent = `${rows.length} of ${L.players.length} players · click a row for the full profile`;
  }
  $('#players-table').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sort]');
    if (!b) return;
    const key = b.dataset.sort;
    sort = sort.key === key ? { key, dir: -sort.dir } : { key, dir: COLS.find((c) => c.key === key).l ? 1 : -1 };
    renderPlayers();
  });
  ['#f-search', '#f-team', '#f-pos', '#f-min'].forEach((s) => $(s).addEventListener('input', renderPlayers));

  /* ---------- Teams ---------- */
  const SLOTS = 4;
  let selectedTeams = standings.slice(0, 3).map((t) => t.id);
  let slotOf = Object.fromEntries(selectedTeams.map((id, i) => [id, i + 1]));

  function renderTeamChips() {
    const full = selectedTeams.length >= SLOTS;
    $('#team-chips').innerHTML = standings.map((t) => {
      const on = selectedTeams.includes(t.id);
      return `<button class="chip" aria-pressed="${on}" data-team="${t.id}" ${!on && full ? 'disabled' : ''}>
        <span class="dot" style="${on ? `background:var(--s${slotOf[t.id]})` : ''}"></span>${esc(t.name)}</button>`;
    }).join('') + (full ? '<span class="hint">Max 4. Deselect one to swap.</span>' : '');
  }
  $('#team-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-team]');
    if (!b || b.disabled) return;
    const id = b.dataset.team;
    if (selectedTeams.includes(id)) {
      selectedTeams = selectedTeams.filter((x) => x !== id);
      delete slotOf[id];
    } else {
      // color follows the team: take the first free slot, survivors keep theirs
      const used = new Set(Object.values(slotOf));
      let s = 1; while (used.has(s)) s++;
      slotOf[id] = s; selectedTeams.push(id);
    }
    renderTeams();
  });

  function renderTeams() {
    renderTeamChips();
    const xs = Array.from({ length: L.rounds }, (_, i) => i + 1);
    lineChart($('#team-trend'), {
      label: 'Cumulative point differential by round',
      xs,
      xLabel: (r) => 'R' + r,
      xTitle: (r) => 'Round ' + r,
      yFmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v),
      height: 300,
      series: selectedTeams.map((id) => ({ name: teamLabel(id), short: teamById[id].name, color: `var(--s${slotOf[id]})`, values: teamById[id].s.cum })),
    });
    if (!selectedTeams.length) $('#team-trend').insertAdjacentHTML('afterbegin', '<p class="sub" style="position:absolute;inset:40% 0 auto;text-align:center">Pick a team above to plot its season.</p>');

    const sorted = L.teams.slice().sort((a, b) => b.s.diff - a.s.diff);
    const maxAbs = Math.ceil(Math.max(...sorted.map((t) => Math.abs(t.s.diff))));
    $('#team-margin').innerHTML = sorted.map((t) => {
      const w = (Math.abs(t.s.diff) / maxAbs) * 50;
      return `<div class="dv-row" data-team="${t.id}">
        <div class="dv-name">${esc(t.city)} <span style="color:var(--muted);font-weight:500">${esc(t.name)}</span></div>
        <div class="dv-track"><i class="dv-bar ${t.s.diff >= 0 ? 'p' : 'n'}" style="width:${w}%"></i></div>
        <div class="dv-val ${t.s.diff >= 0 ? 'pos-t' : 'neg-t'}">${fSigned(t.s.diff)}</div>
      </div>`;
    }).join('') + `<div class="dv-scale"><span></span><div><span>−${maxAbs}</span><span>0</span><span>+${maxAbs}</span></div><span></span></div>`;
  }
  $('#team-margin').addEventListener('pointermove', (e) => {
    const r = e.target.closest('.dv-row');
    if (!r) return hideTip();
    const t = teamById[r.dataset.team];
    showTip(`<div class="t-h">${esc(teamLabel(t.id))}</div><div class="t-s">${t.s.w}–${t.s.l} · ${ordinal(t.s.rank)} in standings</div>` +
      tipRows([{ name: 'Points for', value: f1(t.s.ppg) }, { name: 'Points against', value: f1(t.s.opp) }, { name: 'Margin', value: fSigned(t.s.diff) }]), e.clientX, e.clientY);
  });
  $('#team-margin').addEventListener('pointerleave', hideTip);

  /* ---------- Compare ---------- */
  const CMP = [
    { key: 'pts', label: 'PTS', fmt: f1 }, { key: 'reb', label: 'REB', fmt: f1 }, { key: 'ast', label: 'AST', fmt: f1 },
    { key: 'stl', label: 'STL', fmt: f1 }, { key: 'blk', label: 'BLK', fmt: f1 }, { key: 'fgPct', label: 'FG%', fmt: fPct },
    { key: 'tpPct', label: '3P%', fmt: fPct }, { key: 'ftPct', label: 'FT%', fmt: fPct }, { key: 'min', label: 'MIN', fmt: f1 },
  ];
  const byScoring = qualified.slice().sort((a, b) => b.s.pts - a.s.pts);
  let cmpA = byScoring[0].id, cmpB = byScoring[1].id;

  function fillCompareSelects() {
    ['#cmp-a', '#cmp-b'].forEach((sel) => {
      const el = $(sel);
      el.innerHTML = '';
      L.teams.slice().sort((a, b) => a.city.localeCompare(b.city)).forEach((t) => {
        const og = document.createElement('optgroup');
        og.label = teamLabel(t.id);
        L.players.filter((p) => p.team === t.id).sort((a, b) => b.s.pts - a.s.pts)
          .forEach((p) => og.appendChild(new Option(`${p.name} · ${p.pos} · ${f1(p.s.pts)} ppg`, p.id)));
        el.appendChild(og);
      });
    });
    $('#cmp-a').value = cmpA; $('#cmp-b').value = cmpB;
  }
  $('#cmp-a').addEventListener('input', (e) => { cmpA = e.target.value; renderCompare(); });
  $('#cmp-b').addEventListener('input', (e) => { cmpB = e.target.value; renderCompare(); });

  const rolling = (arr, k) => arr.map((_, i) => (i < k - 1 ? null : arr.slice(i - k + 1, i + 1).reduce((a, b) => a + b, 0) / k));

  function renderCompare() {
    const A = playerById[cmpA], B = playerById[cmpB];
    const rows = CMP.map((c) => {
      const pa = percentile(c.key, A.s[c.key]), pb = percentile(c.key, B.s[c.key]);
      const aBetter = A.s[c.key] > B.s[c.key], bBetter = B.s[c.key] > A.s[c.key];
      return `<div class="bf-row" data-key="${c.key}">
        <span class="v a ${aBetter ? 'better' : ''}">${c.fmt(A.s[c.key])}</span>
        <span class="bf-track a"><i style="width:${pa}%"></i></span>
        <span class="lbl">${c.label}</span>
        <span class="bf-track b"><i style="width:${pb}%"></i></span>
        <span class="v b ${bBetter ? 'better' : ''}">${c.fmt(B.s[c.key])}</span>
      </div>`;
    }).join('');
    $('#butterfly').innerHTML =
      `<div class="bf-head"><span><i class="sw s1"></i><em>${esc(A.name)}</em></span><span><em>${esc(B.name)}</em><i class="sw s2"></i></span></div>` +
      rows +
      `<div class="bf-scale"><span></span><div><span>100</span><span>50</span><span>0</span></div><span></span><div><span>0</span><span>50</span><span>100</span></div><span></span></div>`;

    // Align both players by round so the x-axis is shared
    const byRound = (p) => { const m = {}; p.log.forEach((g) => (m[g.round] = g.pts)); return Array.from({ length: L.rounds }, (_, i) => m[i + 1] ?? null); };
    const ra = rolling(byRound(A), 5), rb = rolling(byRound(B), 5);
    lineChart($('#cmp-trend'), {
      label: 'Five-game rolling scoring average',
      xs: Array.from({ length: L.rounds }, (_, i) => i + 1),
      xLabel: (r) => 'R' + r, xTitle: (r) => 'Round ' + r,
      height: 300,
      series: [
        { name: A.name, short: A.name.split(' ')[1], color: 'var(--s1)', values: ra },
        { name: B.name, short: B.name.split(' ')[1], color: 'var(--s2)', values: rb },
      ],
    });
  }
  $('#butterfly').addEventListener('pointermove', (e) => {
    const r = e.target.closest('.bf-row');
    if (!r) return hideTip();
    const c = CMP.find((x) => x.key === r.dataset.key);
    const A = playerById[cmpA], B = playerById[cmpB];
    showTip(`<div class="t-h">${c.label}</div><div class="t-s">Percentile among ${qualified.length} qualified players</div>` +
      tipRows([
        { name: A.name, value: `${c.fmt(A.s[c.key])} · ${ordinal(percentile(c.key, A.s[c.key]))}`, color: 'var(--s1)' },
        { name: B.name, value: `${c.fmt(B.s[c.key])} · ${ordinal(percentile(c.key, B.s[c.key]))}`, color: 'var(--s2)' },
      ]), e.clientX, e.clientY);
  });
  $('#butterfly').addEventListener('pointerleave', hideTip);

  /* ---------- Player dialog ---------- */
  const dlg = $('#player-dialog');
  function openPlayer(id) {
    const p = playerById[id];
    const t = teamById[p.team];
    const tiles = [
      ['PTS', f1(p.s.pts), 'pts'], ['REB', f1(p.s.reb), 'reb'], ['AST', f1(p.s.ast), 'ast'],
      ['FG%', fPct(p.s.fgPct), 'fgPct'], ['3P%', fPct(p.s.tpPct), 'tpPct'], ['MIN', f1(p.s.min), 'min'],
    ];
    dlg.innerHTML = `
      <div class="pd-head">
        <div class="pd-num">${p.number}</div>
        <div><h2 id="pd-name">${esc(p.name)}</h2><p>${esc(teamLabel(t.id))} · ${p.pos} · ${p.starter ? 'Starter' : 'Bench'} · ${p.s.gp} games</p></div>
        <button class="icon-btn" type="button" aria-label="Close" data-close><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="pd-body">
        <div class="pd-tiles">${tiles.map(([k, v, key]) => `<div class="pd-tile"><div class="k">${k}</div><div class="v">${v}</div><div class="p">${p.s.gp >= QUALIFY ? ordinal(percentile(key, p.s[key])) + ' pct' : '&nbsp;'}</div></div>`).join('')}</div>
        <h3>Points by game</h3>
        <div class="chart" id="pd-chart"></div>
        <div class="pd-log"><table class="table">
          <thead><tr><th class="l">Rd</th><th class="l">Date</th><th class="l">Opp</th><th class="l">Result</th><th>Min</th><th>Pts</th><th>Reb</th><th>Ast</th><th>FG</th><th>3PT</th><th>FT</th></tr></thead>
          <tbody>${p.log.slice().reverse().map((g) => `<tr>
            <td class="l">${g.round}</td><td class="l">${fDate(g.date)}</td><td class="l">${g.home ? 'vs' : '@'} ${g.opp}</td>
            <td class="l"><span class="wl ${g.win ? 'w' : 'l'}">${g.win ? 'W' : 'L'}</span> ${g.pf}–${g.pa}</td>
            <td>${g.min}</td><td><b>${g.pts}</b></td><td>${g.reb}</td><td>${g.ast}</td>
            <td>${g.fgm}-${g.fga}</td><td>${g.tpm}-${g.tpa}</td><td>${g.ftm}-${g.fta}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    if (!dlg.open) dlg.showModal();
    const pts = p.log.map((g) => g.pts);
    lineChart($('#pd-chart'), {
      label: `${p.name} points per game`,
      xs: p.log.map((g) => g.round),
      xLabel: (r) => 'R' + r,
      xTitle: (r, i) => `Round ${r} · ${p.log[i].home ? 'vs' : '@'} ${teamLabel(p.log[i].opp)}`,
      xSub: (i) => `${fDate(p.log[i].date)} · ${p.log[i].win ? 'Won' : 'Lost'} ${p.log[i].pf}–${p.log[i].pa}`,
      height: 220,
      bars: { name: 'Points', color: 'var(--s1)', values: pts },
      series: [{ name: '5-game average', short: '5-game avg', color: 'var(--s2)', values: rolling(pts, 5) }],
    });
  }
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
  dlg.addEventListener('close', hideTip);

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-player]');
    if (el && !dlg.contains(el)) openPlayer(el.dataset.player);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const el = e.target.closest && e.target.closest('tr[data-player]');
    if (el) openPlayer(el.dataset.player);
  });

  /* ---------- Theme ---------- */
  $('#theme-btn').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    try { localStorage.setItem('cs-theme', root.dataset.theme); } catch (err) { /* storage unavailable */ }
  });

  /* ---------- Routing ---------- */
  const VIEWS = ['overview', 'players', 'teams', 'compare'];
  const rendered = {};
  function route() {
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
    VIEWS.forEach((name) => { $('#view-' + name).hidden = name !== v; });
    $$('.tabs a').forEach((a) => (a.dataset.view === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    hideTip();
    if (dlg.open) dlg.close();
    if (v === 'overview' && !rendered.overview) { renderKPIs(); renderStandings(); renderLeaders(); rendered.overview = true; }
    if (v === 'players' && !rendered.players) { renderPlayers(); rendered.players = true; }
    if (v === 'teams') renderTeams();
    if (v === 'compare' && !rendered.compare) { fillCompareSelects(); renderCompare(); rendered.compare = true; }
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);
  route();
})();
