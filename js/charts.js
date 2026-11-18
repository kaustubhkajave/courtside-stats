/*
 * Tiny SVG chart kit: a responsive line/column chart with a crosshair tooltip,
 * plus a shared tooltip helper. No dependencies.
 */
window.Charts = (function () {
  'use strict';

  const tip = document.getElementById('tip');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function showTip(html, cx, cy) {
    tip.innerHTML = html;
    tip.style.display = 'block';
    const r = tip.getBoundingClientRect();
    let x = cx + 16, y = cy + 16;
    if (x + r.width > innerWidth - 8) x = cx - r.width - 16;
    if (y + r.height > innerHeight - 8) y = cy - r.height - 16;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }

  function tipRows(rows) {
    return rows.map((r) =>
      `<div class="t-r"><span>${r.color ? `<i class="sw" style="background:${r.color}"></i>` : ''}${esc(r.name)}</span><b>${esc(r.value)}</b></div>`
    ).join('');
  }

  function niceTicks(min, max, count) {
    if (min === max) max = min + 1;
    const raw = (max - min) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return { lo, hi, ticks };
  }

  // Column with rounded data-end, anchored on the baseline
  function barPath(cx, top, base, w, r) {
    const h = base - top;
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    const x0 = cx - w / 2, x1 = cx + w / 2;
    return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`;
  }

  /**
   * lineChart(el, {
   *   xs: [...],                      x categories
   *   xLabel: (x, i) => string,       tick label
   *   xTitle: (x, i) => string,       tooltip heading
   *   xSub:   (i) => string|'',       optional tooltip sub-heading
   *   series: [{name, color, values}] lines (values aligned to xs, null = gap)
   *   bars:   {name, color, values}   optional column series behind lines
   *   yFmt, height, label
   * })
   */
  function lineChart(el, opt) {
    el._opt = opt;
    if (!el._ro) {
      let lastW = 0;
      el._ro = new ResizeObserver(() => {
        const w = el.clientWidth;
        if (w && w !== lastW) { lastW = w; draw(el); }
      });
      el._ro.observe(el);
    }
    if (el.clientWidth) draw(el);
  }

  function draw(el) {
    const opt = el._opt;
    const W = el.clientWidth;
    const H = opt.height || 260;
    const yFmt = opt.yFmt || ((v) => v);
    const series = opt.series || [];
    const bars = opt.bars || null;
    const n = opt.xs.length;

    const all = series.flatMap((s) => s.values).concat(bars ? bars.values : []).filter((v) => v != null);
    let mn = Math.min(...all), mx = Math.max(...all);
    mn = Math.min(0, mn); mx = Math.max(0, mx);
    const { lo, hi, ticks } = niceTicks(mn, mx, 4);

    const wantLabels = series.length > 0 && series.length <= 4 && W > 520;
    const m = { l: 40, r: wantLabels ? 118 : 12, t: 10, b: 26 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const band = iw / n;
    const x = (i) => m.l + band * (i + 0.5);
    const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;

    // Legend (always for 2+ series, counting bars)
    const legendItems = [];
    if (bars) legendItems.push(`<span><i class="bx" style="background:${bars.color}"></i>${esc(bars.name)}</span>`);
    series.forEach((s) => legendItems.push(`<span><i class="ln" style="background:${s.color}"></i>${esc(s.name)}</span>`));
    const legend = legendItems.length >= 2 ? `<div class="legend">${legendItems.join('')}</div>` : '';

    let g = '';
    ticks.forEach((t) => {
      g += `<line class="${t === 0 ? 'svg-axis' : 'svg-grid'}" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`;
      g += `<text class="svg-tick" x="${m.l - 8}" y="${y(t)}" text-anchor="end" dominant-baseline="middle">${esc(yFmt(t))}</text>`;
    });
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 52))));
    opt.xs.forEach((xv, i) => {
      if (i % every === 0) g += `<text class="svg-tick" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(opt.xLabel(xv, i))}</text>`;
    });

    if (bars) {
      const bw = Math.max(3, Math.min(22, band - 2)); // >= 2px surface gap between columns
      bars.values.forEach((v, i) => {
        if (v == null || v <= 0) return;
        g += `<path class="svg-bar" data-i="${i}" d="${barPath(x(i), y(v), y(0), bw, 4)}" style="fill:${bars.color}"/>`;
      });
    }

    series.forEach((s) => {
      let d = '', pen = false;
      s.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1);
        pen = true;
      });
      g += `<path class="svg-line" d="${d}" style="stroke:${s.color}"/>`;
    });

    // Direct labels at line ends, nudged apart to avoid collisions
    if (wantLabels) {
      const labs = series.map((s) => {
        let i = s.values.length - 1;
        while (i >= 0 && s.values[i] == null) i--;
        return { s, i, y: y(s.values[i]) };
      }).filter((l) => l.i >= 0).sort((a, b) => a.y - b.y);
      for (let k = 1; k < labs.length; k++) if (labs[k].y - labs[k - 1].y < 15) labs[k].y = labs[k - 1].y + 15;
      labs.forEach((l) => {
        const name = l.s.short || l.s.name;
        g += `<text class="svg-dlabel" x="${x(l.i) + 10}" y="${l.y}" dominant-baseline="middle">${esc(name)} <tspan style="fill:var(--muted);font-weight:500">${esc(yFmt(Math.round(l.s.values[l.i] * 10) / 10))}</tspan></text>`;
      });
    }

    // Hover layer
    g += `<g class="hov" style="display:none"><line class="svg-cross" y1="${m.t}" y2="${m.t + ih}"/>` +
      series.map((s) => `<circle class="svg-dot" r="5" style="fill:${s.color}"/>`).join('') + '</g>';
    g += `<rect class="hit" x="${m.l}" y="0" width="${iw}" height="${H}" fill="transparent"/>`;

    el.innerHTML = legend + `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || '')}">${g}</svg>`;

    const svg = el.querySelector('svg');
    const hov = svg.querySelector('.hov');
    const cross = hov.querySelector('line');
    const dots = hov.querySelectorAll('circle');
    const barEls = svg.querySelectorAll('.svg-bar');
    const hit = svg.querySelector('.hit');

    function move(ev) {
      const rect = svg.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const i = Math.max(0, Math.min(n - 1, Math.floor((px - m.l) / band)));
      hov.style.display = '';
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
      series.forEach((s, k) => {
        const v = s.values[i];
        dots[k].style.display = v == null ? 'none' : '';
        if (v != null) { dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', y(v)); }
      });
      el.classList.toggle('hovering', !!bars);
      barEls.forEach((b) => b.classList.toggle('on', +b.dataset.i === i));
      const rows = [];
      if (bars && bars.values[i] != null) rows.push({ name: bars.name, value: yFmt(bars.values[i]), color: bars.color });
      series.forEach((s) => { if (s.values[i] != null) rows.push({ name: s.name, value: yFmt(Math.round(s.values[i] * 10) / 10), color: s.color }); });
      const sub = opt.xSub ? opt.xSub(i) : '';
      showTip(`<div class="t-h">${esc(opt.xTitle ? opt.xTitle(opt.xs[i], i) : opt.xLabel(opt.xs[i], i))}</div>${sub ? `<div class="t-s">${esc(sub)}</div>` : ''}${tipRows(rows)}`, ev.clientX, ev.clientY);
    }
    function leave() {
      hov.style.display = 'none';
      el.classList.remove('hovering');
      hideTip();
    }
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', leave);
  }

  return { lineChart, showTip, hideTip, tipRows, esc };
})();
