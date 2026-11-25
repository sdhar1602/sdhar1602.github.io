/* Interactive figure for:
   S. Dhar, A. Parmar, H. Qiu, J. R. L. Senga, S. Viswanathan,
   "A Methodology for Long-Term Hourly Electricity Demand Forecasting Driven by GDP
   and Invariant Load Profiles", Applied Energy (2026).
   Every number is transcribed from the paper: Tables 4, 5, 6 and Appendix B (Tables 8 to 10). */
(() => {
  'use strict';

  const fig = document.querySelector('[data-paperfig]');
  if (!fig) return;

  /* ---------------------------------------------------------------- Data -- */
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Appendix B of the paper, rows = hour ending 1:00 ... 24:00, columns = Monday ... Sunday.
  // Table 8: mean hour-of-day seasonality index (mu)
  const MU = [
    [0.849, 0.867, 0.868, 0.872, 0.875, 0.946, 0.967],
    [0.819, 0.836, 0.836, 0.840, 0.844, 0.911, 0.933],
    [0.800, 0.816, 0.816, 0.820, 0.823, 0.886, 0.908],
    [0.789, 0.804, 0.804, 0.807, 0.810, 0.869, 0.891],
    [0.786, 0.801, 0.801, 0.803, 0.807, 0.862, 0.883],
    [0.807, 0.820, 0.819, 0.821, 0.824, 0.869, 0.886],
    [0.863, 0.868, 0.869, 0.870, 0.873, 0.894, 0.905],
    [0.924, 0.923, 0.925, 0.925, 0.926, 0.921, 0.911],
    [1.013, 1.014, 1.017, 1.016, 1.012, 0.993, 0.952],
    [1.067, 1.067, 1.069, 1.069, 1.065, 1.045, 0.992],
    [1.097, 1.095, 1.095, 1.096, 1.093, 1.078, 1.022],
    [1.106, 1.103, 1.102, 1.103, 1.102, 1.086, 1.032],
    [1.094, 1.089, 1.087, 1.090, 1.090, 1.071, 1.026],
    [1.103, 1.099, 1.098, 1.101, 1.100, 1.060, 1.030],
    [1.108, 1.104, 1.103, 1.107, 1.106, 1.053, 1.032],
    [1.104, 1.100, 1.100, 1.103, 1.101, 1.041, 1.029],
    [1.103, 1.099, 1.097, 1.100, 1.096, 1.030, 1.024],
    [1.087, 1.082, 1.080, 1.083, 1.076, 1.015, 1.020],
    [1.055, 1.049, 1.048, 1.049, 1.043, 1.011, 1.026],
    [1.058, 1.052, 1.052, 1.052, 1.043, 1.035, 1.062],
    [1.046, 1.041, 1.040, 1.040, 1.029, 1.036, 1.074],
    [1.023, 1.017, 1.018, 1.017, 1.008, 1.030, 1.074],
    [0.973, 0.968, 0.969, 0.970, 0.966, 0.998, 1.038],
    [0.924, 0.920, 0.920, 0.922, 0.926, 0.965, 0.997],
  ];
  // Table 9: largest pairwise year-to-year difference of the index (epsilon-hat)
  const EPS = [
    [0.053, 0.043, 0.046, 0.035, 0.048, 0.021, 0.036],
    [0.057, 0.048, 0.053, 0.040, 0.052, 0.025, 0.033],
    [0.060, 0.053, 0.057, 0.044, 0.054, 0.028, 0.029],
    [0.061, 0.054, 0.059, 0.047, 0.056, 0.031, 0.029],
    [0.064, 0.057, 0.061, 0.051, 0.056, 0.032, 0.027],
    [0.065, 0.060, 0.061, 0.057, 0.055, 0.033, 0.023],
    [0.067, 0.063, 0.062, 0.061, 0.057, 0.037, 0.025],
    [0.062, 0.062, 0.062, 0.061, 0.058, 0.034, 0.039],
    [0.020, 0.023, 0.019, 0.019, 0.021, 0.034, 0.030],
    [0.045, 0.042, 0.039, 0.038, 0.048, 0.061, 0.019],
    [0.057, 0.052, 0.050, 0.048, 0.057, 0.070, 0.022],
    [0.061, 0.059, 0.057, 0.054, 0.062, 0.072, 0.023],
    [0.051, 0.049, 0.045, 0.043, 0.052, 0.060, 0.017],
    [0.056, 0.054, 0.055, 0.047, 0.056, 0.039, 0.021],
    [0.060, 0.059, 0.060, 0.053, 0.058, 0.031, 0.021],
    [0.059, 0.057, 0.057, 0.050, 0.055, 0.025, 0.020],
    [0.057, 0.055, 0.055, 0.048, 0.056, 0.019, 0.022],
    [0.043, 0.038, 0.039, 0.035, 0.039, 0.037, 0.030],
    [0.023, 0.019, 0.021, 0.019, 0.022, 0.043, 0.031],
    [0.029, 0.024, 0.022, 0.024, 0.027, 0.029, 0.025],
    [0.019, 0.019, 0.014, 0.016, 0.019, 0.029, 0.025],
    [0.018, 0.022, 0.018, 0.018, 0.027, 0.028, 0.032],
    [0.021, 0.029, 0.027, 0.025, 0.036, 0.028, 0.035],
    [0.029, 0.035, 0.033, 0.031, 0.040, 0.026, 0.038],
  ];
  // Table 10: that difference as a percentage of the mean index (delta)
  const DELTA = [
    [6.24, 4.96, 5.30, 4.01, 5.48, 2.22, 3.72],
    [6.96, 5.74, 6.34, 4.76, 6.16, 2.75, 3.54],
    [7.50, 6.49, 6.98, 5.37, 6.56, 3.16, 3.19],
    [7.73, 6.72, 7.34, 5.82, 6.91, 3.57, 3.25],
    [8.14, 7.12, 7.62, 6.35, 6.94, 3.71, 3.06],
    [8.06, 7.32, 7.45, 6.95, 6.68, 3.80, 2.60],
    [7.77, 7.26, 7.13, 7.01, 6.53, 4.14, 2.76],
    [6.71, 6.72, 6.70, 6.59, 6.26, 3.69, 4.28],
    [1.97, 2.27, 1.87, 1.87, 2.08, 3.42, 3.15],
    [4.22, 3.94, 3.65, 3.56, 4.51, 5.84, 1.92],
    [5.20, 4.75, 4.57, 4.38, 5.21, 6.50, 2.15],
    [5.52, 5.35, 5.17, 4.89, 5.62, 6.63, 2.23],
    [4.66, 4.50, 4.14, 3.95, 4.77, 5.60, 1.66],
    [5.08, 4.91, 5.01, 4.27, 5.09, 3.68, 2.04],
    [5.42, 5.35, 5.44, 4.79, 5.25, 2.94, 2.03],
    [5.34, 5.18, 5.18, 4.53, 5.00, 2.40, 1.94],
    [5.17, 5.01, 5.01, 4.36, 5.11, 1.85, 2.15],
    [3.96, 3.51, 3.61, 3.23, 3.62, 3.64, 2.94],
    [2.18, 1.81, 2.00, 1.81, 2.11, 4.25, 3.02],
    [2.74, 2.28, 2.09, 2.28, 2.59, 2.80, 2.35],
    [1.82, 1.83, 1.35, 1.54, 1.85, 2.80, 2.33],
    [1.76, 2.16, 1.77, 1.77, 2.68, 2.72, 2.98],
    [2.16, 2.99, 2.79, 2.58, 3.73, 2.81, 3.37],
    [3.14, 3.80, 3.59, 3.36, 4.32, 2.69, 3.81],
  ];
  // Table 10, "Overall" row: average delta per weekday
  const DELTA_OVERALL = [4.98, 4.67, 4.67, 4.17, 4.79, 3.65, 2.77];

  // Table 4: Singapore five-year-ahead forecasts. Totals are sums of half-hourly MW,
  // so energy in MWh = total / 2 (the paper's own conversion).
  const SG = [
    { year: 2017, actual: 103147207, forecast: 101485969, total: 1.61, mape: 5.11 },
    { year: 2018, actual: 107482983, forecast: 102284277, total: 4.84, mape: 5.46 },
    { year: 2019, actual: 107965323, forecast: 104135499, total: 3.55, mape: 5.58 },
    { year: 2020, actual: 105666163, forecast: 102751430, total: 2.76, mape: 6.03 },
    { year: 2021, actual: 111352369, forecast: 104536553, total: 6.12, mape: 6.87 },
    { year: 2022, actual: 113587819, forecast: 112539730, total: 0.92, mape: 4.35 },
  ];

  // Table 5: GDP-load correlation and two-year-ahead hourly MAPE (label offsets are layout only)
  const EU = [
    { name: 'Croatia', iso: 'HR', r: 0.967, mape: 7.18, w: [-10, 15, 'end'], n: [-8, 15, 'end'] },
    { name: 'Spain', iso: 'ES', r: 0.953, mape: 7.71, w: [-10, 4, 'end'], n: [-8, 6, 'end'] },
    { name: 'Bulgaria', iso: 'BG', r: 0.920, mape: 5.64, w: [-10, 4, 'end'], n: [-8, 4, 'end'] },
    { name: 'Belgium', iso: 'BE', r: 0.808, mape: 6.81, w: [-10, 4, 'end'], n: [-8, 4, 'end'] },
    { name: 'Germany', iso: 'DE', r: 0.522, mape: 10.14, w: [10, 4, 'start'], n: [8, 4, 'start'] },
    { name: 'United Kingdom', iso: 'UK', r: 0.045, mape: 11.63, w: [10, 4, 'start'], n: [8, 4, 'start'] },
  ];

  // Table 6: day-ahead MAPE (%) per method, 2018 to 2022
  const ST_YEARS = [2018, 2019, 2020, 2021, 2022];
  const ST = [
    { label: 'Exponential smoothing (invariant SI)', v: [2.81, 3.32, 5.41, 3.52, 3.14], ours: true },
    { label: 'Seasonal naive', v: [5.70, 4.85, 4.03, 5.76, 3.23] },
    { label: 'ARIMA', v: [13.42, 34.90, 8.74, 81.91, 30.63] },
    { label: 'SARIMAX', v: [6.22, 4.94, 4.41, 7.45, 5.40] },
    { label: 'Dynamic harmonic regression', v: [3.61, 3.56, 4.54, 6.42, 3.27] },
    { label: 'FB Prophet', v: [3.65, 3.14, 4.35, 5.26, 6.15] },
    { label: 'MSTL + AutoARIMA', v: [3.35, 3.36, 4.49, 5.06, 2.85] },
  ];

  /* ------------------------------------------------------------- Helpers -- */
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(node);
    return node;
  }
  function label(parent, x, y, str, cls, anchor) {
    const t = svgEl('text', { x: x.toFixed(1), y: y.toFixed(1), class: cls, 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    return t;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const pad2 = (n) => String(n).padStart(2, '0');
  const hourSpan = (h) => `${pad2(h - 1)}:00–${pad2(h)}:00`; // h = hour ending, 1..24
  const pct = (v, d = 2) => `${v.toFixed(d)}%`;
  const twh = (units) => (units / 2 / 1e6).toFixed(2);
  const widthOf = (box) => Math.max(260, Math.floor(box.getBoundingClientRect().width));
  const centerOf = (node) => {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  function newSvg(box, W, H, aria, focusable) {
    box.replaceChildren();
    const attrs = { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'pf-svg', role: 'img', 'aria-label': aria };
    if (focusable) attrs.tabindex = '0';
    return svgEl('svg', attrs, box);
  }
  function columnPath(x, yTop, w, yBase, r = 4) { // rounded data-end, square at the baseline
    const rr = Math.min(r, w / 2, Math.max(0, yBase - yTop));
    return `M${x},${yBase}V${yTop + rr}A${rr},${rr} 0 0 1 ${x + rr},${yTop}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${yTop + rr}V${yBase}Z`;
  }
  function barPath(x, y, w, h, r = 4) { // horizontal: square at the baseline, rounded at the value end
    const rr = Math.min(r, h / 2, Math.max(0, w));
    return `M${x},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}V${y + h - rr}A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}H${x}Z`;
  }

  /* ------------------------------------------------------------- Tooltip -- */
  const tip = document.createElement('div');
  tip.className = 'pf-tip';
  tip.hidden = true;
  tip.setAttribute('aria-hidden', 'true');
  fig.appendChild(tip);

  function showTip(anchor, title, rows) {
    tip.replaceChildren();
    const head = document.createElement('div');
    head.className = 'pf-tip-h';
    head.textContent = title;
    tip.appendChild(head);
    rows.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'pf-tip-r';
      if (r.key) {
        const k = document.createElement('i');
        k.className = `pf-tip-k ${r.key}`;
        row.appendChild(k);
      }
      const v = document.createElement('b');
      v.textContent = r.value;
      row.appendChild(v);
      if (r.label) {
        const l = document.createElement('span');
        l.textContent = r.label;
        row.appendChild(l);
      }
      tip.appendChild(row);
    });
    tip.hidden = false;
    const fr = fig.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = anchor.x - fr.left + 14;
    let top = anchor.y - fr.top - th - 14;
    if (left + tw > fr.width - 10) left = anchor.x - fr.left - tw - 14;
    left = clamp(left, 10, Math.max(10, fr.width - tw - 10));
    if (top < 10) top = anchor.y - fr.top + 18;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  const hideTip = () => { tip.hidden = true; };

  /* -------------------------------------------------------------- State -- */
  const state = { view: 'a', metric: 'mu', day: 0, cell: { h: 14, d: 0 }, hour: 15 };
  let heatSelect = null;

  /* ------------------------------------------------ View A: heatmap -- */
  function drawHeat() {
    const box = fig.querySelector('[data-chart="heat"]');
    const W = widthOf(box);
    const labelW = 34;
    const top = 2;
    const cw = (W - labelW) / 24;
    const ch = clamp(cw * 1.1, 20, 30);
    const H = Math.round(top + ch * 7 + 24);
    const isMu = state.metric === 'mu';
    const data = isMu ? MU : DELTA;
    const flat = data.flat();
    const lo = Math.min(...flat);
    const hi = Math.max(...flat);
    const svg = newSvg(box, W, H, `Heatmap of the ${isMu ? 'mean hour-of-day seasonality index' : 'largest year-to-year deviation, in percent,'} for each weekday (rows) and hour (columns). Arrow keys move between cells; Enter selects that day.`, true);

    const daymark = svgEl('rect', { x: 0, y: top + state.day * ch + ch * 0.2, width: 3, height: ch * 0.6, rx: 1.5, class: 'pf-daymark' }, svg);
    const labels = [];
    const cells = [];
    for (let d = 0; d < 7; d += 1) {
      const y = top + d * ch;
      labels.push(label(svg, labelW - 8, y + ch / 2 + 4, DAYS_SHORT[d], `pf-lab${d === state.day ? ' is-on' : ''}`, 'end'));
      for (let h = 0; h < 24; h += 1) {
        const t = (data[h][d] - lo) / (hi - lo);
        const cell = svgEl('rect', {
          x: (labelW + h * cw + 1).toFixed(2),
          y: (y + 1).toFixed(2),
          width: Math.max(1, cw - 2).toFixed(2),
          height: (ch - 2).toFixed(2),
          rx: 2.5,
          class: 'pf-cell',
          style: `fill: color-mix(in oklab, var(--seq-hi) ${(t * 100).toFixed(1)}%, var(--seq-lo))`,
        }, svg);
        cell.dataset.h = String(h);
        cell.dataset.d = String(d);
        cells.push(cell);
      }
    }
    [1, 6, 12, 18, 24].forEach((h) => label(svg, labelW + (h - 0.5) * cw, top + 7 * ch + 16, String(h), 'pf-tick', 'middle'));

    fig.querySelector('[data-scale-lo]').textContent = isMu ? lo.toFixed(2) : pct(lo, 1);
    fig.querySelector('[data-scale-hi]').textContent = isMu ? hi.toFixed(2) : pct(hi, 1);
    fig.querySelector('[data-scale-label]').textContent = isMu ? 'mean index µ' : 'deviation δ';

    heatSelect = (d) => {
      labels.forEach((l, i) => l.classList.toggle('is-on', i === d));
      daymark.setAttribute('y', String(top + d * ch + ch * 0.2));
    };

    let hovered = null;
    const mark = (cell) => {
      if (hovered) hovered.classList.remove('is-hover');
      hovered = cell;
      if (cell) cell.classList.add('is-hover');
    };
    const cellTip = (cell, anchor) => {
      const h = Number(cell.dataset.h);
      const d = Number(cell.dataset.d);
      showTip(anchor, `${DAYS[d]} · ${hourSpan(h + 1)}`, [
        { value: MU[h][d].toFixed(3), label: 'mean index µ' },
        { value: `±${EPS[h][d].toFixed(3)}`, label: 'largest gap across years' },
        { value: pct(DELTA[h][d]), label: 'deviation δ' },
      ]);
    };
    const onPoint = (e) => {
      const cell = e.target.closest('.pf-cell');
      if (!cell) { mark(null); hideTip(); return; }
      mark(cell);
      cellTip(cell, { x: e.clientX, y: e.clientY });
    };
    svg.addEventListener('pointermove', onPoint);
    svg.addEventListener('pointerdown', onPoint);
    svg.addEventListener('pointerleave', () => { mark(null); hideTip(); });
    svg.addEventListener('click', (e) => {
      const cell = e.target.closest('.pf-cell');
      if (cell) setDay(Number(cell.dataset.d));
    });
    svg.addEventListener('focus', () => {
      const c = cells[state.cell.d * 24 + state.cell.h];
      mark(c);
      cellTip(c, centerOf(c));
    });
    svg.addEventListener('blur', () => { mark(null); hideTip(); });
    svg.addEventListener('keydown', (e) => {
      let { h, d } = state.cell;
      if (e.key === 'ArrowRight') h = Math.min(23, h + 1);
      else if (e.key === 'ArrowLeft') h = Math.max(0, h - 1);
      else if (e.key === 'ArrowDown') d = Math.min(6, d + 1);
      else if (e.key === 'ArrowUp') d = Math.max(0, d - 1);
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDay(d); return; }
      else return;
      e.preventDefault();
      state.cell = { h, d };
      const c = cells[d * 24 + h];
      mark(c);
      cellTip(c, centerOf(c));
    });
  }

  /* ------------------------------------------- View A: daily profile -- */
  function drawProfile() {
    const box = fig.querySelector('[data-chart="profile"]');
    const W = widthOf(box);
    const H = Math.round(clamp(W * 0.6, 220, 290));
    const m = { l: 34, r: 38, t: 10, b: 26 };
    const y0 = 0.7;
    const y1 = 1.2;
    const X = (h) => m.l + ((h - 1) / 23) * (W - m.l - m.r);
    const Y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
    const dd = state.day;
    const svg = newSvg(box, W, H, `Hourly profile of the mean seasonality index for ${DAYS[dd]}, with its band of largest year-to-year gaps; other weekdays in gray. Left and right arrow keys move between hours.`, true);

    const grid = svgEl('g', { class: 'pf-grid' }, svg);
    [0.8, 0.9, 1.0, 1.1].forEach((v) => {
      svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, grid);
      label(svg, m.l - 6, Y(v) + 4, v.toFixed(1), 'pf-tick', 'end');
    });
    [1, 6, 12, 18, 24].forEach((h) => label(svg, X(h), H - 7, String(h), 'pf-tick', 'middle'));

    const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${X(i + 1).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    for (let d = 0; d < 7; d += 1) {
      if (d !== dd) svgEl('path', { d: line(MU.map((r) => r[d])), class: 'pf-ctx' }, svg);
    }
    const upper = MU.map((r, h) => r[dd] + EPS[h][dd]);
    const lower = MU.map((r, h) => r[dd] - EPS[h][dd]);
    const band = line(upper) + lower.slice().reverse().map((v, i) => `L${X(24 - i).toFixed(1)},${Y(v).toFixed(1)}`).join('') + 'Z';
    svgEl('path', { d: band, class: 'pf-band' }, svg);
    svgEl('path', { d: line(MU.map((r) => r[dd])), class: 'pf-main' }, svg);
    label(svg, X(24) + 7, Y(MU[23][dd]) + 4, DAYS_SHORT[dd], 'pf-endlab');

    const cross = svgEl('g', { class: 'pf-cross', visibility: 'hidden' }, svg);
    const vline = svgEl('line', { y1: m.t, y2: H - m.b }, cross);
    const dot = svgEl('circle', { r: 4.5, class: 'pf-dot' }, cross);
    const place = (h, anchor) => {
      const v = MU[h - 1][dd];
      vline.setAttribute('x1', X(h));
      vline.setAttribute('x2', X(h));
      dot.setAttribute('cx', X(h));
      dot.setAttribute('cy', Y(v));
      cross.setAttribute('visibility', 'visible');
      showTip(anchor || centerOf(dot), `${DAYS[dd]} · ${hourSpan(h)}`, [
        { key: 'is-main', value: v.toFixed(3), label: 'mean index µ' },
        { key: 'is-band', value: `±${EPS[h - 1][dd].toFixed(3)}`, label: `largest gap across years (${pct(DELTA[h - 1][dd], 1)})` },
      ]);
    };
    const clear = () => { cross.setAttribute('visibility', 'hidden'); hideTip(); };
    const onPoint = (e) => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      state.hour = clamp(Math.round(((px - m.l) / (W - m.l - m.r)) * 23) + 1, 1, 24);
      place(state.hour, { x: e.clientX, y: e.clientY });
    };
    svg.addEventListener('pointermove', onPoint);
    svg.addEventListener('pointerdown', onPoint);
    svg.addEventListener('pointerleave', clear);
    svg.addEventListener('focus', () => place(state.hour));
    svg.addEventListener('blur', clear);
    svg.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      state.hour = clamp(state.hour + (e.key === 'ArrowRight' ? 1 : -1), 1, 24);
      place(state.hour);
    });
    fig.querySelectorAll('[data-day-name]').forEach((n) => { n.textContent = DAYS[dd]; });
  }

  /* ----------------------------------------- View B: forecast accuracy -- */
  function drawForecast() {
    const box = fig.querySelector('[data-chart="forecast"]');
    const W = widthOf(box);
    const H = Math.round(clamp(W * 0.34, 240, 300));
    const m = { l: 40, r: 6, t: 30, b: 28 };
    const yMax = 8;
    const band = (W - m.l - m.r) / SG.length;
    const bw = clamp(band * 0.22, 9, 24);
    const Y = (v) => m.t + (1 - v / yMax) * (H - m.t - m.b);
    const base = Y(0);
    const svg = newSvg(box, W, H, 'Grouped columns of hourly MAPE and annual-total error for Singapore five-year-ahead forecasts, 2017 to 2022.');

    const c0 = m.l + band * 3;
    const c1 = m.l + band * 5;
    svgEl('rect', { x: c0 + 4, y: m.t - 22, width: c1 - c0 - 8, height: base - m.t + 22, rx: 10, class: 'pf-covid' }, svg);
    label(svg, (c0 + c1) / 2, m.t - 8, 'COVID-19', 'pf-note', 'middle');

    const grid = svgEl('g', { class: 'pf-grid' }, svg);
    [0, 2, 4, 6, 8].forEach((v) => {
      svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, grid);
      label(svg, m.l - 6, Y(v) + 4, `${v}%`, 'pf-tick', 'end');
    });

    const worst = SG.reduce((b, r, i) => (r.mape > SG[b].mape ? i : b), 0);
    const best = SG.reduce((b, r, i) => (r.mape < SG[b].mape ? i : b), 0);
    const groups = [];
    SG.forEach((r, i) => {
      const cx = m.l + band * (i + 0.5);
      const g = svgEl('g', { class: 'pf-group' }, svg);
      svgEl('path', { d: columnPath(cx - 1 - bw, Y(r.mape), bw, base), class: 'pf-bar-main' }, g);
      svgEl('path', { d: columnPath(cx + 1, Y(r.total), bw, base), class: 'pf-bar-ctx' }, g);
      if (i === worst || i === best) label(g, cx - 1 - bw / 2, Y(r.mape) - 7, pct(r.mape), 'pf-val', 'middle');
      label(svg, cx, H - 8, String(r.year), 'pf-tick', 'middle');
      groups.push(g);

      const hit = svgEl('rect', {
        x: cx - band / 2, y: m.t - 22, width: band, height: base - m.t + 26, class: 'pf-hit', tabindex: '0', role: 'img',
        'aria-label': `${r.year}: hourly MAPE ${pct(r.mape)}, annual-total error ${pct(r.total)}, actual ${twh(r.actual)} TWh, forecast ${twh(r.forecast)} TWh`,
      }, svg);
      const show = (anchor) => {
        groups.forEach((o) => o.classList.toggle('pf-dim', o !== g));
        showTip(anchor, `${r.year} · five years ahead`, [
          { key: 'is-main', value: pct(r.mape), label: 'hourly MAPE' },
          { key: 'is-ctx', value: pct(r.total), label: 'annual-total error' },
          { value: `${twh(r.forecast)} TWh`, label: `forecast vs ${twh(r.actual)} TWh actual` },
        ]);
      };
      const hide = () => { groups.forEach((o) => o.classList.remove('pf-dim')); hideTip(); };
      hit.addEventListener('pointermove', (e) => show({ x: e.clientX, y: e.clientY }));
      hit.addEventListener('pointerdown', (e) => show({ x: e.clientX, y: e.clientY }));
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', () => show(centerOf(hit)));
      hit.addEventListener('blur', hide);
    });
  }

  /* -------------------------------------------- View C: across countries -- */
  function drawCountries() {
    const box = fig.querySelector('[data-chart="countries"]');
    const W = widthOf(box);
    const narrow = W < 560;
    const H = Math.round(clamp(W * 0.4, 260, 330));
    const m = { l: 40, r: narrow ? 12 : 24, t: 24, b: 46 };
    const yLo = 4;
    const yHi = 12;
    const X = (r) => m.l + r * (W - m.l - m.r);
    const Y = (v) => m.t + (1 - (v - yLo) / (yHi - yLo)) * (H - m.t - m.b);
    const svg = newSvg(box, W, H, 'Scatter of GDP to load correlation against two-year-ahead hourly MAPE for six European countries.');

    svgEl('rect', { x: X(0.8), y: m.t, width: X(1) - X(0.8), height: Y(yLo) - m.t, rx: 6, class: 'pf-region' }, svg);
    label(svg, X(0.8) + 7, m.t + 14, narrow ? 'r > 0.8' : 'GDP-coupled (r > 0.8)', 'pf-note');

    const grid = svgEl('g', { class: 'pf-grid' }, svg);
    [4, 6, 8, 10, 12].forEach((v) => {
      svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, grid);
      label(svg, m.l - 6, Y(v) + 4, `${v}%`, 'pf-tick', 'end');
    });
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach((r) => label(svg, X(r), Y(yLo) + 17, r === 0 || r === 1 ? String(r) : r.toFixed(1), 'pf-tick', 'middle'));
    label(svg, (m.l + W - m.r) / 2, H - 6, 'GDP–load correlation (Pearson r)', 'pf-axis', 'middle');
    svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(8), y2: Y(8), class: 'pf-thresh' }, svg);
    label(svg, m.l + 7, Y(8) - 7, '8% MAPE', 'pf-note');

    const pts = [];
    EU.forEach((c) => {
      const cx = X(c.r);
      const cy = Y(c.mape);
      const g = svgEl('g', { class: 'pf-pt' }, svg);
      svgEl('circle', { cx, cy, r: 5, class: 'pf-dot' }, g);
      const [dx, dy, anchor] = narrow ? c.n : c.w;
      label(g, cx + dx, cy + dy, narrow ? c.iso : c.name, 'pf-ptlab', anchor);
      pts.push(g);
      const hit = svgEl('circle', {
        cx, cy, r: 15, class: 'pf-hit', tabindex: '0', role: 'img',
        'aria-label': `${c.name}: GDP to load correlation ${c.r.toFixed(3)}, hourly MAPE ${pct(c.mape)}`,
      }, svg);
      const show = (anchor2) => {
        pts.forEach((o) => o.classList.toggle('pf-dim', o !== g));
        showTip(anchor2, c.name, [
          { value: pct(c.mape), label: 'hourly MAPE, two years ahead' },
          { value: c.r.toFixed(3), label: 'GDP–load correlation r' },
        ]);
      };
      const hide = () => { pts.forEach((o) => o.classList.remove('pf-dim')); hideTip(); };
      hit.addEventListener('pointermove', (e) => show({ x: e.clientX, y: e.clientY }));
      hit.addEventListener('pointerdown', (e) => show({ x: e.clientX, y: e.clientY }));
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', () => show(centerOf(hit)));
      hit.addEventListener('blur', hide);
    });
  }

  /* --------------------------------------------- View D: short-term -- */
  function drawShortTerm() {
    const box = fig.querySelector('[data-chart="shortterm"]');
    const W = widthOf(box);
    const narrow = W < 600;
    const rows = ST.map((r) => Object.assign({}, r, { avg: mean(r.v) })).sort((a, b) => a.avg - b.avg);
    const xMax = 7;
    const labelW = narrow ? 0 : 250;
    const valW = 58;
    const rowH = narrow ? 50 : 36;
    const barH = 16;
    const m = { t: 4, b: 26 };
    const left = labelW;
    const right = W - valW;
    const X = (v) => left + (Math.min(v, xMax) / xMax) * (right - left);
    const H = m.t + rows.length * rowH + m.b;
    const svg = newSvg(box, W, H, 'Ranked bars of mean day-ahead MAPE across 2018 to 2022 for seven forecasting methods.');

    const grid = svgEl('g', { class: 'pf-grid' }, svg);
    [0, 2, 4, 6].forEach((v) => {
      svgEl('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b }, grid);
      label(svg, X(v), H - 8, `${v}%`, 'pf-tick', 'middle');
    });

    const bars = [];
    rows.forEach((r, i) => {
      const y = m.t + i * rowH;
      const by = narrow ? y + 25 : y + (rowH - barH) / 2;
      const g = svgEl('g', { class: 'pf-group' }, svg);
      label(g, narrow ? 0 : labelW - 14, narrow ? y + 16 : y + rowH / 2 + 4.5, r.label, `pf-rowlab${r.ours ? ' is-ours' : ''}`, narrow ? 'start' : 'end');
      const off = r.avg > xMax;
      const x1 = X(r.avg);
      svgEl('path', { d: barPath(X(0), by, x1 - X(0), barH, off ? 0 : 4), class: r.ours ? 'pf-bar-main' : 'pf-bar-ctx' }, g);
      if (off) svgEl('path', { d: `M${x1 - 15},${by + barH + 3}l7,${-barH - 6}M${x1 - 8},${by + barH + 3}l7,${-barH - 6}`, class: 'pf-break' }, g);
      label(g, x1 + 8, by + barH / 2 + 4, pct(r.avg), 'pf-val');
      bars.push(g);

      const hit = svgEl('rect', {
        x: 0, y, width: W, height: rowH, class: 'pf-hit', tabindex: '0', role: 'img',
        'aria-label': `${r.label}: mean day-ahead MAPE ${pct(r.avg)}; yearly ${r.v.map((v, k) => `${ST_YEARS[k]} ${pct(v)}`).join(', ')}`,
      }, svg);
      const show = (anchor) => {
        bars.forEach((o) => o.classList.toggle('pf-dim', o !== g));
        showTip(anchor, r.label, [
          { key: r.ours ? 'is-main' : 'is-ctx', value: pct(r.avg), label: `mean, 2018–2022${off ? ' (off scale)' : ''}` },
          { value: r.v.map((v) => v.toFixed(2)).join(' · '), label: '' },
        ]);
      };
      const hide = () => { bars.forEach((o) => o.classList.remove('pf-dim')); hideTip(); };
      hit.addEventListener('pointermove', (e) => show({ x: e.clientX, y: e.clientY }));
      hit.addEventListener('pointerdown', (e) => show({ x: e.clientX, y: e.clientY }));
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', () => show(centerOf(hit)));
      hit.addEventListener('blur', hide);
    });
  }

  /* --------------------------------------------------------- Data tables -- */
  function table(head, body, highlight) {
    const t = document.createElement('table');
    t.className = 'pf-table';
    const thead = t.createTHead().insertRow();
    head.forEach((h) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = h;
      thead.appendChild(th);
    });
    const tb = t.createTBody();
    body.forEach((cells, i) => {
      const tr = tb.insertRow();
      if (highlight && highlight(i)) tr.className = 'is-ours';
      cells.forEach((c, k) => {
        const cell = k === 0 ? document.createElement('th') : document.createElement('td');
        if (k === 0) cell.scope = 'row';
        cell.textContent = c;
        tr.appendChild(cell);
      });
    });
    return t;
  }
  const builders = {
    a: () => {
      const isMu = state.metric === 'mu';
      const body = MU.map((r, h) => [hourSpan(h + 1)].concat(r.map((v, d) => (isMu ? v.toFixed(3) : DELTA[h][d].toFixed(2)))));
      if (!isMu) body.push(['Average'].concat(DELTA_OVERALL.map((v) => v.toFixed(2))));
      return table([isMu ? 'Hour · mean index µ' : 'Hour · deviation δ (%)'].concat(DAYS_SHORT), body);
    },
    b: () => table(['Year', 'Actual (TWh)', 'Forecast (TWh)', 'Annual-total error', 'Hourly MAPE'],
      SG.map((r) => [String(r.year), twh(r.actual), twh(r.forecast), pct(r.total), pct(r.mape)])),
    c: () => table(['Country', 'GDP–load r', 'Hourly MAPE (2 yrs ahead)'],
      EU.map((c) => [c.name, c.r.toFixed(3), pct(c.mape)])),
    d: () => table(['Method'].concat(ST_YEARS.map(String), ['Mean']),
      ST.map((r) => [r.label].concat(r.v.map((v) => v.toFixed(2)), [mean(r.v).toFixed(2)])), (i) => ST[i].ours),
  };
  function refreshTable(view) {
    const btn = fig.querySelector(`[data-table-toggle="${view}"]`);
    const wrap = btn && document.getElementById(btn.getAttribute('aria-controls'));
    if (wrap && !wrap.hidden) wrap.replaceChildren(builders[view]());
  }
  fig.querySelectorAll('[data-table-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.tableToggle;
      const wrap = document.getElementById(btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('[data-table-label]').textContent = open ? 'Hide data' : 'Data table';
      wrap.hidden = !open;
      if (open) wrap.replaceChildren(builders[view]());
    });
  });

  /* ------------------------------------------------------------ Controls -- */
  const chips = Array.from(fig.querySelectorAll('[data-day]'));
  function setDay(d) {
    state.day = d;
    state.cell.d = d;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.day) === d)));
    if (heatSelect) heatSelect(d);
    drawProfile();
  }
  chips.forEach((c) => c.addEventListener('click', () => setDay(Number(c.dataset.day))));

  fig.querySelectorAll('[data-metric]').forEach((b) => {
    b.addEventListener('click', () => {
      state.metric = b.dataset.metric;
      fig.querySelectorAll('[data-metric]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      drawHeat();
      refreshTable('a');
    });
  });

  const tabs = Array.from(fig.querySelectorAll('[role="tab"]'));
  function drawCurrent() {
    hideTip();
    if (state.view === 'a') { drawHeat(); drawProfile(); }
    else if (state.view === 'b') drawForecast();
    else if (state.view === 'c') drawCountries();
    else drawShortTerm();
  }
  function selectTab(i, focus) {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tabs[i].focus();
    state.view = tabs[i].dataset.view;
    drawCurrent();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j === null) return;
      e.preventDefault();
      selectTab(j, true);
    });
  });

  // Redraw on width changes only (heights follow from width).
  let lastW = 0;
  let raf = 0;
  if ('ResizeObserver' in window) {
    new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w === lastW) return;
      lastW = w;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(drawCurrent);
    }).observe(fig);
  }
  document.addEventListener('scroll', hideTip, { passive: true });
  fig.classList.add('is-ready');
  selectTab(0);
})();
