/* =============================================================================
   Hero field: the homepage background is a topographic map of a non-convex
   objective f(x, y). A click or tap drops a start point x0 and two solvers race
   downhill from it:
     Newton  Newton's method with an eigenvalue-modified Hessian (every step is a
             descent direction, even near saddles) and Armijo backtracking.
     SGD     gradient descent with annealed Gaussian gradient noise.
   When both settle, the note under the portrait reports iterations, final f,
   and whether each solver reached the global minimum or a local one.
   No dependencies.
   ========================================================================== */
(() => {
  'use strict';

  const hero = document.querySelector('[data-field]');
  const wrap = hero && hero.querySelector('.field');
  const cBase = wrap && wrap.querySelector('.field-base');
  const cPath = wrap && wrap.querySelector('.field-paths');
  if (!cBase || !cPath || !cBase.getContext || typeof Path2D === 'undefined') return;
  const gBase = cBase.getContext('2d');
  const gPath = cPath.getContext('2d');
  if (!gBase || !gPath) return;

  const note = document.querySelector('[data-field-note]');
  const outN = note && note.querySelector('[data-out="newton"]');
  const outS = note && note.querySelector('[data-out="sgd"]');
  const outStatus = note && note.querySelector('[data-out="status"]');
  const runBtn = note && note.querySelector('[data-field-run]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------ Terrain -- */
  // Coordinates are in "units": canvas px divided by U. The surface is a field
  // of Gaussian wells and hills on a jittered grid, plus a low ripple that adds
  // shallow local minima, plus soft quadratic walls that keep paths on screen.
  let W = 0, H = 0, DPR = 1, U = 150, XW = 0, YH = 0;
  let wells = [];
  let minima = [], fMin = Infinity;
  let built = false;
  const RIP = { a: 0.1, wx: 2.05, px: 0.7, wy: 1.75, py: -0.4 };
  const KW = 4, MW = 0.12;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (rnd) => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

  function buildTerrain() {
    U = Math.max(96, Math.min(165, W / 8));
    XW = W / U;
    YH = H / U;
    const rnd = mulberry32(20260705);
    const D = 1.75;
    wells = [];
    // Row-major with a fixed row length, so a taller canvas only appends rows.
    for (let gy = -1; gy * D < YH + D; gy++) {
      for (let gx = -1; gx * D < XW + D; gx++) {
        const hill = rnd() < 0.28;
        const s = 0.42 + rnd() * 0.42;
        const a = hill ? -(0.32 + rnd() * 0.4) : 0.6 + rnd() * 0.8;
        const x = (gx + 0.5 + (rnd() - 0.5) * 0.8) * D;
        const y = (gy + 0.5 + (rnd() - 0.5) * 0.8) * D;
        wells.push({ x, y, a, k: 1 / (2 * s * s), cut: 18 * s * s });
      }
    }
  }

  const wall = (t, lo, hi) => (t < lo ? (lo - t) * (lo - t) : t > hi ? (t - hi) * (t - hi) : 0);

  function f(x, y) {
    let v = 0;
    for (let i = 0; i < wells.length; i++) {
      const w = wells[i], dx = x - w.x, dy = y - w.y, d2 = dx * dx + dy * dy;
      if (d2 < w.cut) v -= w.a * Math.exp(-d2 * w.k);
    }
    v += RIP.a * Math.sin(RIP.wx * x + RIP.px) * Math.cos(RIP.wy * y + RIP.py);
    return v + KW * (wall(x, MW, XW - MW) + wall(y, MW, YH - MW));
  }

  // Value, gradient and Hessian in one pass (all analytic).
  const E = { v: 0, gx: 0, gy: 0, hxx: 0, hxy: 0, hyy: 0 };
  function evalAll(x, y) {
    let v = 0, gx = 0, gy = 0, hxx = 0, hxy = 0, hyy = 0;
    for (let i = 0; i < wells.length; i++) {
      const w = wells[i], dx = x - w.x, dy = y - w.y, d2 = dx * dx + dy * dy;
      if (d2 >= w.cut) continue;
      const k2 = 2 * w.k, e = w.a * Math.exp(-d2 * w.k);
      v -= e;
      gx += k2 * dx * e;
      gy += k2 * dy * e;
      hxx += k2 * e * (1 - k2 * dx * dx);
      hyy += k2 * e * (1 - k2 * dy * dy);
      hxy -= k2 * k2 * dx * dy * e;
    }
    const p = RIP.wx * x + RIP.px, q = RIP.wy * y + RIP.py, r = RIP.a;
    const sp = Math.sin(p), cp = Math.cos(p), sq = Math.sin(q), cq = Math.cos(q);
    v += r * sp * cq;
    gx += r * RIP.wx * cp * cq;
    gy -= r * RIP.wy * sp * sq;
    hxx -= r * RIP.wx * RIP.wx * sp * cq;
    hyy -= r * RIP.wy * RIP.wy * sp * cq;
    hxy -= r * RIP.wx * RIP.wy * cp * sq;
    const hx = XW - MW, hy = YH - MW;
    if (x < MW) { v += KW * (MW - x) * (MW - x); gx -= 2 * KW * (MW - x); hxx += 2 * KW; }
    else if (x > hx) { v += KW * (x - hx) * (x - hx); gx += 2 * KW * (x - hx); hxx += 2 * KW; }
    if (y < MW) { v += KW * (MW - y) * (MW - y); gy -= 2 * KW * (MW - y); hyy += 2 * KW; }
    else if (y > hy) { v += KW * (y - hy) * (y - hy); gy += 2 * KW * (y - hy); hyy += 2 * KW; }
    E.v = v; E.gx = gx; E.gy = gy; E.hxx = hxx; E.hxy = hxy; E.hyy = hyy;
    return E;
  }

  /* ------------------------------------------------------------ Solvers -- */
  const DELTA = 0.2;   // curvature floor for the modified Hessian
  const CAP = 0.65;    // longest step, in units

  function newton(x, y, maxIt = 40) {
    const pts = [x, y];
    for (let it = 0; it < maxIt; it++) {
      const o = evalAll(x, y);
      const gx = o.gx, gy = o.gy, f0 = o.v;
      if (gx * gx + gy * gy < 1e-14) break;
      // Eigen-decompose the 2x2 Hessian and replace each eigenvalue by
      // max(|lambda|, DELTA): positive definite, so -H^-1 g always descends.
      const a = o.hxx, b = o.hxy, c = o.hyy;
      const m = (a + c) / 2, rad = Math.sqrt(((a - c) * (a - c)) / 4 + b * b);
      const l1 = m + rad, l2 = m - rad;
      let vx, vy;
      if (Math.abs(b) > 1e-12) { vx = l1 - c; vy = b; }
      else if (a >= c) { vx = 1; vy = 0; }
      else { vx = 0; vy = 1; }
      const n = Math.hypot(vx, vy);
      vx /= n; vy /= n;
      const m1 = Math.max(Math.abs(l1), DELTA), m2 = Math.max(Math.abs(l2), DELTA);
      const g1 = vx * gx + vy * gy, g2 = -vy * gx + vx * gy;
      let dx = -(vx * g1 / m1 - vy * g2 / m2);
      let dy = -(vy * g1 / m1 + vx * g2 / m2);
      let dl = Math.hypot(dx, dy);
      if (dl > CAP) { dx *= CAP / dl; dy *= CAP / dl; dl = CAP; }
      // Armijo backtracking
      const slope = gx * dx + gy * dy;
      let t = 1;
      while (t > 1e-3 && f(x + t * dx, y + t * dy) > f0 + 1e-4 * t * slope) t *= 0.5;
      x += t * dx;
      y += t * dy;
      pts.push(x, y);
      if (t * dl < 1e-7) break;
    }
    return { pts, n: pts.length / 2 - 1, x, y, f: f(x, y) };
  }

  function sgd(x, y, rnd) {
    const pts = [x, y], eta = 0.032, sig0 = 1.6, maxIt = 900, cap = 0.12;
    let k;
    for (k = 1; k <= maxIt; k++) {
      const o = evalAll(x, y);
      const sig = sig0 / (1 + k / 28);
      let sx = eta * (o.gx + sig * gauss(rnd));
      let sy = eta * (o.gy + sig * gauss(rnd));
      const sl = Math.hypot(sx, sy);
      if (sl > cap) { sx *= cap / sl; sy *= cap / sl; }
      x -= sx;
      y -= sy;
      pts.push(x, y);
      if (k > 80) {
        // settled: moved less than 0.02 units over the last 30 steps
        const j = pts.length - 62;
        const ddx = x - pts[j], ddy = y - pts[j + 1];
        if (ddx * ddx + ddy * ddy < 4e-4) break;
      }
    }
    return { pts, n: Math.min(k, maxIt), x, y, f: f(x, y) };
  }

  // Which local minimum does a point drain into? Newton-polish it and match it
  // against the minima found so far (adding it if new).
  function basin(x, y) {
    let p = newton(x, y, 60);
    const h = evalAll(p.x, p.y);
    if (!(h.hxx > 0 && h.hxx * h.hyy - h.hxy * h.hxy > 0)) p = newton(p.x + 0.011, p.y + 0.013, 60);
    let best = -1, bd = Infinity;
    for (let i = 0; i < minima.length; i++) {
      const dx = minima[i].x - p.x, dy = minima[i].y - p.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0 || bd > 0.0064) {
      minima.push({ x: p.x, y: p.y, f: p.f });
      if (p.f < fMin) fMin = p.f;
      best = minima.length - 1;
    }
    return best;
  }

  function findMinima() {
    minima = [];
    fMin = Infinity;
    for (let y = 0.25; y < YH; y += 0.5) for (let x = 0.25; x < XW; x += 0.5) basin(x, y);
  }

  /* ----------------------------------------------------------- Drawing -- */
  const colors = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    colors.minor = v('--line', '#DFD6C7');
    colors.major = v('--line-strong', '#CABFAD');
    colors.newton = v('--accent', '#8C1515');
    colors.sgd = v('--ink-2', '#4A443C');
    colors.ink = v('--ink', '#1C1915');
    colors.bg = v('--bg', '#F5F1E8');
    colors.mono = v('--font-mono', 'monospace');
  }

  const NLEV = 22;
  const segment = (p, x1, y1, x2, y2) => { p.moveTo(x1, y1); p.lineTo(x2, y2); };

  // Marching squares for one level in one cell (a b / d c, clockwise from top left).
  function cell(p, L, a, b, c, d, x, y, s) {
    const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
    if (idx === 0 || idx === 15) return;
    const tx = x + (s * (L - a)) / (b - a), ty = y;
    const rx = x + s, ry = y + (s * (L - b)) / (c - b);
    const bx = x + (s * (L - d)) / (c - d), by = y + s;
    const lx = x, ly = y + (s * (L - a)) / (d - a);
    switch (idx) {
      case 1: case 14: segment(p, lx, ly, bx, by); break;
      case 2: case 13: segment(p, bx, by, rx, ry); break;
      case 3: case 12: segment(p, lx, ly, rx, ry); break;
      case 4: case 11: segment(p, tx, ty, rx, ry); break;
      case 6: case 9: segment(p, tx, ty, bx, by); break;
      case 7: case 8: segment(p, lx, ly, tx, ty); break;
      default: { // saddles (5, 10): the cell centre decides how the corners connect
        const centreAbove = (a + b + c + d) / 4 > L;
        if ((idx === 5) === centreAbove) { segment(p, lx, ly, tx, ty); segment(p, bx, by, rx, ry); }
        else { segment(p, tx, ty, rx, ry); segment(p, lx, ly, bx, by); }
      }
    }
  }

  function drawBase() {
    const step = W < 760 ? 6 : 5;
    const nx = Math.ceil(W / step) + 1, ny = Math.ceil(H / step) + 1;
    const val = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[j * nx + i] = f((i * step) / U, (j * step) / U);

    // Evenly spaced levels between robust quantiles, like a topographic map.
    const sample = [];
    for (let i = 0; i < val.length; i += 7) sample.push(val[i]);
    sample.sort((p, q) => p - q);
    const lo = sample[Math.floor(sample.length * 0.015)];
    const hi = sample[Math.floor(sample.length * 0.985)];
    const dl = (hi - lo) / NLEV, l0 = lo + dl / 2;

    const paths = Array.from({ length: NLEV }, () => new Path2D());
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = val[j * nx + i], b = val[j * nx + i + 1];
        const c = val[(j + 1) * nx + i + 1], d = val[(j + 1) * nx + i];
        const k0 = Math.max(0, Math.ceil((Math.min(a, b, c, d) - l0) / dl));
        const k1 = Math.min(NLEV - 1, Math.floor((Math.max(a, b, c, d) - l0) / dl));
        for (let k = k0; k <= k1; k++) cell(paths[k], l0 + k * dl, a, b, c, d, i * step, j * step, step);
      }
    }

    gBase.setTransform(1, 0, 0, 1, 0, 0);
    gBase.clearRect(0, 0, cBase.width, cBase.height);
    gBase.setTransform(DPR, 0, 0, DPR, 0, 0);
    gBase.lineCap = 'round';
    gBase.lineJoin = 'round';
    paths.forEach((p, k) => {
      const index = k % 5 === 2; // every fifth level is an index contour
      gBase.strokeStyle = index ? colors.major : colors.minor;
      gBase.lineWidth = index ? 1.2 : 0.9;
      gBase.stroke(p);
    });
  }

  /* --------------------------------------------------------------- Runs -- */
  const NEWTON_MS = 190;   // per Newton iteration
  const SGD_RATE = 0.3;    // SGD iterations per ms
  let runs = [];
  let raf = 0;
  let touched = false;
  const TAU = Math.PI * 2;
  const easeOut = (t) => 1 - (1 - t) * (1 - t);

  function dot(g, x, y, r, fill) {
    g.beginPath(); g.arc(x, y, r + 1.6, 0, TAU); g.fillStyle = colors.bg; g.fill();
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = fill; g.fill();
  }

  // Draws one run at time `now`; returns true while it is still animating.
  function drawRun(run, now, alpha, newest) {
    const e = run.instant ? Infinity : now - run.t0;
    const S = run.sgd.pts, N = run.newton.pts;
    const sN = S.length / 2, nN = N.length / 2;
    const ns = Math.min(sN, 1 + Math.floor(e * SGD_RATE));
    const tn = e / NEWTON_MS;
    const nk = Math.min(nN - 1, Math.floor(tn));
    const fr = nk < nN - 1 ? tn - nk : 0;
    const g = gPath;

    // SGD: thin, jittery
    g.globalAlpha = alpha * 0.72;
    g.strokeStyle = colors.sgd;
    g.lineWidth = 1.1;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(S[0] * U, S[1] * U);
    for (let i = 1; i < ns; i++) g.lineTo(S[2 * i] * U, S[2 * i + 1] * U);
    g.stroke();

    // Newton: few, long, deliberate steps
    g.globalAlpha = alpha;
    g.strokeStyle = colors.newton;
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(N[0] * U, N[1] * U);
    for (let i = 1; i <= nk; i++) g.lineTo(N[2 * i] * U, N[2 * i + 1] * U);
    let hx = N[2 * nk] * U, hy = N[2 * nk + 1] * U;
    if (fr > 0) {
      const q = easeOut(fr);
      hx += (N[2 * nk + 2] * U - hx) * q;
      hy += (N[2 * nk + 3] * U - hy) * q;
      g.lineTo(hx, hy);
    }
    g.stroke();
    for (let i = 1; i <= nk; i++) dot(g, N[2 * i] * U, N[2 * i + 1] * U, 2.3, colors.newton);

    const sDone = ns >= sN, nDone = nk >= nN - 1;
    g.globalAlpha = alpha * 0.9;
    dot(g, S[2 * (ns - 1)] * U, S[2 * (ns - 1) + 1] * U, sDone ? 3.2 : 2.4, colors.sgd);
    g.globalAlpha = alpha;
    dot(g, hx, hy, nDone ? 4.2 : 3.4, colors.newton);

    // start point x0
    g.beginPath();
    g.arc(S[0] * U, S[1] * U, 5.5, 0, TAU);
    g.fillStyle = colors.bg;
    g.fill();
    g.lineWidth = 1.4;
    g.strokeStyle = colors.ink;
    g.stroke();
    if (newest) {
      g.font = '500 11px ' + colors.mono;
      g.fillStyle = colors.ink;
      g.fillText('x₀', S[0] * U + 9, S[1] * U - 8);
    }
    g.globalAlpha = 1;
    return !(sDone && nDone);
  }

  function frame(now) {
    raf = 0;
    gPath.setTransform(1, 0, 0, 1, 0, 0);
    gPath.clearRect(0, 0, cPath.width, cPath.height);
    gPath.setTransform(DPR, 0, 0, DPR, 0, 0);
    let busy = false;
    const n = runs.length;
    runs.forEach((run, r) => {
      const age = n - 1 - r;
      const live = drawRun(run, now, age === 0 ? 1 : age === 1 ? 0.4 : 0.16, age === 0);
      if (live) busy = true;
      else if (age === 0 && !run.reported) { run.reported = true; report(run); }
    });
    if (busy) raf = requestAnimationFrame(frame);
  }
  const paint = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const paintNow = () => { if (raf) cancelAnimationFrame(raf); frame(performance.now()); };

  function drop(px, py, seed, instant) {
    if (!built) return;
    const x = px / U, y = py / U;
    const run = {
      newton: newton(x, y),
      sgd: sgd(x, y, mulberry32(seed)),
      t0: performance.now(),
      instant: !!instant || reduceMotion.matches,
      reported: false,
    };
    run.bN = basin(run.newton.x, run.newton.y);
    run.bS = basin(run.sgd.x, run.sgd.y);
    run.gN = minima[run.bN].f <= fMin + 1e-9;
    run.gS = minima[run.bS].f <= fMin + 1e-9;
    runs.push(run);
    if (runs.length > 3) runs.shift();
    setStatus('', 'SolverStatus: solving…');
    paint();
  }

  /* ------------------------------------------------------------ Readout -- */
  const ICON = {
    warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.3 14.5 13.5h-13z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.6v3.2M8 11.6v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m5.3 8.2 1.9 1.9 3.6-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const num = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(3);

  function setStatus(kind, text) {
    if (!outStatus) return;
    outStatus.className = 'field-status' + (kind ? ' is-' + kind : '');
    outStatus.innerHTML = kind ? ICON[kind] : '';
    outStatus.appendChild(document.createTextNode(text));
  }

  function report(run) {
    if (!note) return;
    if (outN) outN.textContent = run.newton.n + ' iters · f = ' + num(run.newton.f);
    if (outS) outS.textContent = run.sgd.n + ' iters · f = ' + num(run.sgd.f);
    if (run.gN && run.gS) setStatus('ok', 'SolverStatus: optimal, global minimum');
    else if (!run.gN && !run.gS) {
      setStatus('warn', run.bN === run.bS
        ? 'SolverStatus: converged to local optimum'
        : 'SolverStatus: two local optima, two basins');
    } else {
      setStatus('ok', run.gS
        ? 'SGD found the global minimum; Newton stopped at a local one'
        : 'Newton found the global minimum; SGD stopped at a local one');
    }
  }

  /* ---------------------------------------------------------- Pointing -- */
  // Open paper? Blank space beside a short line of text counts as open: only
  // the boxes of the rendered lines themselves (plus a little air) are taken.
  const range = document.createRange();
  const isEmptyAt = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) return false;
    const el = document.elementFromPoint(cx, cy);
    if (!el || el.closest('a, button, img, figure, ul, .site-header, [data-field-note]')) return false;
    const block = el.closest('p, h1, h2');
    if (!block) return true;
    range.selectNodeContents(block);
    for (const rc of range.getClientRects()) {
      if (cx > rc.left - 14 && cx < rc.right + 14 && cy > rc.top - 10 && cy < rc.bottom + 10) return false;
    }
    return true;
  };

  // A start point worth watching: visible, on open background, with a path of
  // a readable length, ideally ending in a local (not global) minimum.
  function pickStart(rnd) {
    const r = wrap.getBoundingClientRect();
    const header = document.querySelector('[data-header]');
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    let top = Math.max(0, headerBottom - r.top) + 30;
    let bot = Math.min(H, window.innerHeight - r.top) - 40;
    if (bot - top < 80) { top = 40; bot = Math.min(H - 40, 640); }
    let best = null, bestScore = -Infinity;
    for (let t = 0; t < 48; t++) {
      const px = 30 + rnd() * (W - 60), py = top + rnd() * (bot - top);
      const nt = newton(px / U, py / U);
      let len = 0, minY = py;
      for (let i = 2; i < nt.pts.length; i += 2) {
        len += Math.hypot(nt.pts[i] - nt.pts[i - 2], nt.pts[i + 1] - nt.pts[i - 1]);
        minY = Math.min(minY, nt.pts[i + 1] * U);
      }
      len *= U;
      if (minY < top - 20) continue; // would wander up under the header
      const ex = nt.x * U, ey = nt.y * U;
      let score = rnd() * 0.5;
      // penalise paths that run across text, the caption or the portrait
      for (let i = 2; i < nt.pts.length; i += 2) {
        const mx = (nt.pts[i] + nt.pts[i - 2]) / 2 * U, my = (nt.pts[i + 1] + nt.pts[i - 1]) / 2 * U;
        if (!isEmptyAt(r.left + mx, r.top + my)) score -= 0.6;
      }
      if (isEmptyAt(r.left + px, r.top + py)) score += 3;
      if (px < 90 || px > W - 90) score -= 2;   // keep clear of the page edges
      if (px > W * 0.55) score += 1.5;          // the right side has more open paper
      if (len > 120 && len < 420) score += 2;
      if (ey > top && ey < bot) score += 1;
      if (isEmptyAt(r.left + ex, r.top + ey)) score += 1;
      if (nt.f > fMin + 1e-9) score += 1;
      if (score > bestScore) { bestScore = score; best = [px, py]; }
    }
    return best;
  }

  hero.addEventListener('click', (e) => {
    if (!built || e.button !== 0) return;
    if (e.target.closest('a, button, input, select, textarea, label, summary, video, .portrait, [data-field-note]')) return;
    const sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed && String(sel).trim()) return; // the visitor was selecting text
    const r = wrap.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (px < 0 || py < 0 || px > W || py > H) return;
    touched = true;
    drop(px, py, (Math.random() * 4294967296) >>> 0, false);
  });

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (!built) return;
      touched = true;
      const p = pickStart(Math.random);
      if (p) drop(p[0], p[1], (Math.random() * 4294967296) >>> 0, false);
    });
  }

  /* -------------------------------------------------------- Lifecycle -- */
  function rebuild() {
    const r = wrap.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h || (built && w === W && h === H)) return;
    const widthChanged = w !== W;
    W = w;
    H = h;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    [cBase, cPath].forEach((c) => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    buildTerrain();
    findMinima();
    readColors();
    drawBase();
    if (widthChanged && runs.length) {
      runs = []; // a new width rescales the terrain, so old paths no longer fit
      if (outN) outN.textContent = outN.getAttribute('data-idle') || '';
      if (outS) outS.textContent = outS.getAttribute('data-idle') || '';
      setStatus('', 'SolverStatus: idle');
    }
    built = true;
    paintNow();
  }

  let resizeTimer = 0;
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, built ? 140 : 0);
  }) : null;

  new MutationObserver(() => {
    if (!built) return;
    readColors();
    drawBase();
    paintNow();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // One demonstration run, once the hero is on screen and the fonts have settled.
  // Skipped on phones, where any path would cross the portrait or the text.
  let demoDone = false;
  function demo() {
    if (demoDone || touched || !built || W < 760) return;
    demoDone = true;
    const p = pickStart(mulberry32(42));
    if (p) drop(p[0], p[1], 7, false);
  }

  function start() {
    rebuild();
    if (ro) ro.observe(wrap);
    else window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(rebuild, 140); });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => {
      if (!('IntersectionObserver' in window)) { setTimeout(demo, 900); return; }
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        setTimeout(demo, 900);
      }, { threshold: 0.2 });
      io.observe(hero);
    });
  }

  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 700 });
  else setTimeout(start, 60);
})();
