// animations/tool_anim.js — Aperçus animés au survol des outils (MiniCAD)
// Injecté par build.py entre les marqueurs @@ANIM_BEGIN / @@ANIM_END (TOUS les builds).
// Source de vérité : ÉDITER CE FICHIER puis relancer build.py — ne jamais éditer le bloc généré.
//
// Au survol d'un bouton .tool-btn connu, une petite fenêtre s'ouvre sous l'icône et rejoue
// le geste sur un mini-canvas (curseur fléché + clics + élastique), pour aider l'utilisateur
// qui ne connaît pas le dessin DAO.
//
// Deux familles de scénarios :
//   • création  : { kind, pts:[...] }      → le curseur clique les points, la forme se construit
//   • modif.    : { type:'modify', kind }  → une forme existante, puis l'opération avant→après

(function () {
  'use strict';

  const ANIM = {
    // ── Dessin ──────────────────────────────────────────────────────────────
    line:        { kind: 'line',    pts: [[.16, .78], [.84, .26]] },
    rect:        { kind: 'rect',    pts: [[.20, .74], [.80, .26]] },
    rectcenter:  { kind: 'rectc',   pts: [[.50, .50], [.82, .26]] },
    polygon:     { kind: 'polygon', n: 6, pts: [[.50, .54], [.50, .20]] },
    circle:      { kind: 'circle',  pts: [[.50, .54], [.82, .54]] },
    ellipse:     { kind: 'ellipse', pts: [[.50, .52], [.84, .52], [.50, .22]] },
    arc:         { kind: 'arc3',    pts: [[.16, .70], [.50, .20], [.84, .70]] },
    polyline:    { kind: 'poly',    pts: [[.14, .74], [.38, .34], [.60, .62], [.86, .26]] },
    spline:      { kind: 'spline',  pts: [[.14, .72], [.36, .32], [.60, .68], [.86, .30]] },
    xline:       { kind: 'xline',   pts: [[.32, .64], [.66, .36]] },
    ray:         { kind: 'ray',     pts: [[.24, .70], [.62, .40]] },
    ray_rev:     { kind: 'ray',     pts: [[.76, .40], [.38, .70]] },
    point:       { kind: 'point',   pts: [[.50, .50]] },
    hatch:       { kind: 'hatch',   pts: [[.50, .52]] },
    tube:        { kind: 'tube',    pts: [[.16, .62], [.84, .42]] },
    text_place:  { kind: 'text',    pts: [[.24, .58]] },
    leader:      { kind: 'leader',  pts: [[.24, .72], [.74, .34]] },
    // ── Architecture ─────────────────────────────────────────────────────────
    wall:        { kind: 'wall',    pts: [[.16, .64], [.84, .40]] },
    door:        { kind: 'door',    pts: [[.32, .76], [.32, .30]] },
    window_place:{ kind: 'window',  pts: [[.18, .50], [.82, .50]] },
    // ── Électricité ────────────────────────────────────────────────────────
    outlet:      { kind: 'outlet',  pts: [[.50, .52]] },
    switch_place:{ kind: 'switch',  pts: [[.50, .52]] },
    cable:       { kind: 'cable',   pts: [[.14, .40], [.38, .66], [.62, .36], [.86, .62]] },
    // ── Cotation / mesure ────────────────────────────────────────────────────
    measure:     { kind: 'measure', pts: [[.18, .64], [.82, .64]] },
    // ── Modification (forme existante → opération) ────────────────────────────
    move_obj:    { type: 'modify', kind: 'move' },
    mirror:      { type: 'modify', kind: 'mirror' },
    offset:      { type: 'modify', kind: 'offset' },
    trim:        { type: 'modify', kind: 'trim' },
    extend:      { type: 'modify', kind: 'extend' },
    fillet:      { type: 'modify', kind: 'fillet',  clicks: [[.58, .70], [.30, .46]] },
    chamfer:     { type: 'modify', kind: 'chamfer', clicks: [[.58, .70], [.30, .46]] },
    scale:       { type: 'modify', kind: 'scale' },
    stretch:     { type: 'modify', kind: 'stretch' },
    rotate:      { type: 'modify', kind: 'rotate' },
    join:        { type: 'modify', kind: 'join' },
    divide_pick: { type: 'modify', kind: 'divide' },
    copy:        { type: 'modify', kind: 'copy' },
    array:       { type: 'modify', kind: 'array' },
    array_polar: { type: 'modify', kind: 'array_polar' },
    explode:     { type: 'modify', kind: 'explode' },
    group:       { type: 'modify', kind: 'group' },
    ungroup:     { type: 'modify', kind: 'ungroup' },
    erase:       { type: 'modify', kind: 'erase' },
    // ── Cotation ──────────────────────────────────────────────────────────────
    dimlinear:   { kind: 'dimlin',   pts: [[.18, .64], [.82, .64]] },
    dimaligned:  { kind: 'dimalign', pts: [[.20, .76], [.80, .34]] },
    dimangular:  { type: 'modify', kind: 'dimangular' },
    dimradius:   { type: 'modify', kind: 'dimradius' },
    dimdiameter: { type: 'modify', kind: 'dimdiameter' }
  };

  // Boutons sans data-tool (COPY, ARRAY, dim…) → résolution via leur onclick
  const CMD_KEY = {
    COPY: 'copy', ARRAY: 'array', ARRAY_POLAR: 'array_polar', EXPLODE: 'explode',
    GROUP: 'group', UNGROUP: 'ungroup', ERASE: 'erase',
    DIMLINEAR: 'dimlinear', DIMALIGNED: 'dimaligned', DIMANGULAR: 'dimangular',
    DIMRADIUS: 'dimradius', DIMDIAMETER: 'dimdiameter'
  };
  function keyOf(btn) {
    const dt = btn.dataset.tool;
    if (dt && ANIM[dt]) return dt;
    const oc = btn.getAttribute('onclick') || '';
    let m, re = /executeCommand\('([A-Za-z_ ]+)'\)/g, found = [];
    while ((m = re.exec(oc))) found.push(m[1].trim());
    re = /CMD\.([A-Z_]+)\.exec/g;
    while ((m = re.exec(oc))) found.push(m[1]);
    for (const c of found) if (CMD_KEY[c]) return CMD_KEY[c];
    return null;
  }

  // ── Réglages ──────────────────────────────────────────────────────────────
  const W = 120, H = 120, PAD = 18;
  const OPEN_DELAY = 350, CLICK_DUR = 420, HOLD_DUR = 1100;
  const OP_DUR = 1150, MHOLD0 = 650, MHOLD1 = 950;

  let ACCENT = '#00d4ff';
  const RUBBER = 'rgba(0,212,255,0.55)';
  const GHOST  = 'rgba(0,212,255,0.30)';
  const FILL   = 'rgba(0,212,255,0.10)';
  const CUR_FILL = '#f4f8ff', CUR_STROKE = '#0a0f1a';

  let el = null, cv = null, ctx = null, label = null;
  let timer = null, curBtn = null;
  let raf = null, scn = null, timeline = [], segI = 0, segStart = 0;

  // ── Helpers de base ─────────────────────────────────────────────────────────
  const X = nx => PAD + nx * (W - 2 * PAD);
  const Y = ny => PAD + ny * (H - 2 * PAD);
  const DX = d => d * (W - 2 * PAD);
  const DY = d => d * (H - 2 * PAD);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp2 = (a, b, e) => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  function seg(a, b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  function dot(P, r) { ctx.beginPath(); ctx.arc(P[0], P[1], r || 2.4, 0, 2 * Math.PI); ctx.fill(); }
  function cross(P, s) { s = s || 4; seg([P[0] - s, P[1]], [P[0] + s, P[1]]); seg([P[0], P[1] - s], [P[0], P[1] + s]); }

  function setSolid()  { ctx.setLineDash([]);     ctx.strokeStyle = ACCENT;  ctx.fillStyle = FILL; ctx.lineWidth = 2; }
  function setRubber() { ctx.setLineDash([4, 3]);  ctx.strokeStyle = RUBBER;  ctx.fillStyle = FILL; ctx.lineWidth = 1.4; }
  function setGhost()  { ctx.setLineDash([3, 3]);  ctx.strokeStyle = GHOST;   ctx.lineWidth = 1.3; }

  function arrowHead(tip, from, s) {
    s = s || 6; const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
    ctx.beginPath(); ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(tip[0] - s * Math.cos(a - .4), tip[1] - s * Math.sin(a - .4));
    ctx.lineTo(tip[0] - s * Math.cos(a + .4), tip[1] - s * Math.sin(a + .4));
    ctx.closePath(); ctx.fill();
  }
  function parallel(a, b, off) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * off, ny = dx / L * off;
    return [[[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]], [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny]]];
  }
  function smooth(P) {
    if (P.length < 3) { if (P.length === 2) seg(P[0], P[1]); return; }
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
                        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    ctx.stroke();
  }
  function regularPoly(c, v, n) {
    const R = dist(c, v), a0 = Math.atan2(v[1] - c[1], v[0] - c[0]);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = a0 + i * 2 * Math.PI / n, x = c[0] + R * Math.cos(a), y = c[1] + R * Math.sin(a);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function infinite(a, b, both) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, BIG = 260;
    const ux = dx / L, uy = dy / L;
    const p1 = both ? [a[0] - ux * BIG, a[1] - uy * BIG] : a;
    seg(p1, [b[0] + ux * BIG, b[1] + uy * BIG]);
  }
  const circle3 = (P0, P1, P2) => {
    const ax = P0[0], ay = P0[1], bx = P1[0], by = P1[1], cx = P2[0], cy = P2[1];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-6) return null;
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    return { cx: ux, cy: uy, r: Math.hypot(ax - ux, ay - uy) };
  };
  const norm = a => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
  function strokeArc3(P0, P1, P2) {
    const c = circle3(P0, P1, P2);
    if (!c) { ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.lineTo(P2[0], P2[1]); ctx.stroke(); return; }
    const a0 = Math.atan2(P0[1] - c.cy, P0[0] - c.cx), a1 = Math.atan2(P1[1] - c.cy, P1[0] - c.cx), a2 = Math.atan2(P2[1] - c.cy, P2[0] - c.cx);
    ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, a0, a2, norm(a1 - a0) > norm(a2 - a0)); ctx.stroke();
  }

  // Symboles métier ─────────────────────────────────────────────────────────
  function wallSym(a, b, off) { const [l, r] = parallel(a, b, off || 4.5); seg(l[0], l[1]); seg(r[0], r[1]); seg(l[0], r[0]); seg(l[1], r[1]); }
  function tubeSym(a, b) { const [l, r] = parallel(a, b, 4.5); seg(l[0], l[1]); seg(r[0], r[1]); ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 1; seg(a, b); ctx.restore(); }
  function doorSym(h, e) { seg(h, e); const r = dist(h, e), a0 = Math.atan2(e[1] - h[1], e[0] - h[0]); ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(h[0], h[1], r, a0, a0 + Math.PI / 2); ctx.stroke(); ctx.restore(); }
  function outletSym(p) { ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 2 * Math.PI); ctx.stroke(); seg([p[0] - 3.5, p[1] - 4], [p[0] - 3.5, p[1] + 4]); seg([p[0] + 3.5, p[1] - 4], [p[0] + 3.5, p[1] + 4]); seg([p[0], p[1] + 9], [p[0], p[1] + 15]); }
  function switchSym(p) { ctx.fillStyle = ACCENT; dot([p[0] - 7, p[1] + 7], 2.6); ctx.fillStyle = FILL; seg([p[0] - 7, p[1] + 7], [p[0] + 7, p[1] - 7]); seg([p[0] + 7, p[1] - 7], [p[0] + 12, p[1] - 7]); }
  function dimSym(a, b) {
    const yL = Math.min(a[1], b[1]) - 16;
    ctx.save(); ctx.lineWidth = 1;
    seg([a[0], a[1]], [a[0], yL - 2]); seg([b[0], b[1]], [b[0], yL - 2]);
    ctx.restore();
    seg([a[0], yL], [b[0], yL]);
    ctx.fillStyle = ACCENT; arrowHead([a[0], yL], [b[0], yL], 5); arrowHead([b[0], yL], [a[0], yL], 5);
    ctx.save(); ctx.fillStyle = ACCENT; ctx.font = '10px "JetBrains Mono",monospace'; ctx.textAlign = 'center';
    ctx.fillText(Math.round(dist(a, b)) || '120', (a[0] + b[0]) / 2, yL - 3); ctx.restore();
  }
  function dimAligned(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, off = 16;
    const nx = -dy / L * off, ny = dx / L * off;
    const a2 = [a[0] + nx, a[1] + ny], b2 = [b[0] + nx, b[1] + ny];
    ctx.save(); ctx.lineWidth = 1; seg(a, a2); seg(b, b2); ctx.restore();
    seg(a2, b2);
    ctx.fillStyle = ACCENT; arrowHead(a2, b2, 5); arrowHead(b2, a2, 5);
    ctx.save(); ctx.fillStyle = ACCENT; ctx.font = '10px "JetBrains Mono",monospace'; ctx.textAlign = 'center';
    ctx.translate((a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2); ctx.rotate(Math.atan2(dy, dx));
    ctx.fillText(Math.round(L) || '120', 0, -3); ctx.restore();
  }

  // ── Rendu CRÉATION ──────────────────────────────────────────────────────────
  function render(placed, cursor) {
    ctx.clearRect(0, 0, W, H);
    const pts = scn.pts, P = pts.map(p => [X(p[0]), Y(p[1])]);
    const C = cursor ? [X(cursor[0]), Y(cursor[1])] : null;
    ctx.lineJoin = ctx.lineCap = 'round';
    setSolid(); drawCommitted(P, placed);
    if (C && placed >= 1 && placed < pts.length) { setRubber(); drawRubber(P, placed, C); }
    ctx.setLineDash([]); ctx.fillStyle = ACCENT;
    if (scn.kind !== 'point' && scn.kind !== 'text' && scn.kind !== 'outlet' && scn.kind !== 'switch')
      for (let i = 0; i < placed; i++) dot(P[i]);
  }

  function drawCommitted(P, placed) {
    const k = scn.kind;
    if (k === 'hatch') { // contour toujours visible (contexte)
      const bx = X(.22), by = Y(.28), bw = X(.78) - X(.22), bh = Y(.76) - Y(.28);
      ctx.strokeRect(bx, by, bw, bh);
      if (placed >= 1) { ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip(); ctx.lineWidth = 1; for (let x = bx - bh; x < bx + bw; x += 7) seg([x, by + bh], [x + bh, by]); ctx.restore(); }
      return;
    }
    switch (k) {
      case 'line':    if (placed >= 2) seg(P[0], P[1]); break;
      case 'rect':    if (placed >= 2) { ctx.beginPath(); ctx.rect(P[0][0], P[0][1], P[1][0] - P[0][0], P[1][1] - P[0][1]); ctx.fill(); ctx.stroke(); } break;
      case 'rectc':   if (placed >= 2) { const c = P[0], q = P[1]; ctx.beginPath(); ctx.rect(2 * c[0] - q[0], 2 * c[1] - q[1], 2 * (q[0] - c[0]), 2 * (q[1] - c[1])); ctx.fill(); ctx.stroke(); cross(c); } break;
      case 'polygon': if (placed >= 2) regularPoly(P[0], P[1], scn.n || 6); break;
      case 'circle':  if (placed >= 2) { ctx.beginPath(); ctx.arc(P[0][0], P[0][1], dist(P[0], P[1]), 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); } break;
      case 'ellipse': if (placed >= 3) { ctx.beginPath(); ctx.ellipse(P[0][0], P[0][1], Math.abs(P[1][0] - P[0][0]), Math.abs(P[2][1] - P[0][1]), 0, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); cross(P[0]); } break;
      case 'arc3':    if (placed >= 3) strokeArc3(P[0], P[1], P[2]); break;
      case 'poly':    if (placed >= 2) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < placed; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.stroke(); } break;
      case 'spline':
      case 'cable':   if (placed >= 2) smooth(P.slice(0, placed)); break;
      case 'xline':   if (placed >= 2) infinite(P[0], P[1], true); break;
      case 'ray':     if (placed >= 2) infinite(P[0], P[1], false); break;
      case 'point':   if (placed >= 1) { ctx.fillStyle = ACCENT; cross(P[0], 7); } break;
      case 'tube':    if (placed >= 2) tubeSym(P[0], P[1]); break;
      case 'text':    if (placed >= 1) { ctx.save(); ctx.fillStyle = ACCENT; ctx.font = 'italic bold 18px serif'; ctx.fillText('Abc', P[0][0], P[0][1]); ctx.restore(); } break;
      case 'leader':  if (placed >= 2) { seg(P[0], P[1]); ctx.fillStyle = ACCENT; arrowHead(P[0], P[1], 6); ctx.save(); ctx.fillStyle = ACCENT; ctx.font = '10px "JetBrains Mono",monospace'; ctx.fillText('Ø', P[1][0] + 3, P[1][1] - 2); ctx.restore(); } break;
      case 'wall':    if (placed >= 2) wallSym(P[0], P[1]); break;
      case 'door':    if (placed >= 2) doorSym(P[0], P[1]); break;
      case 'window':  if (placed >= 2) wallSym(P[0], P[1], 3); break;
      case 'outlet':  if (placed >= 1) outletSym(P[0]); break;
      case 'switch':  if (placed >= 1) switchSym(P[0]); break;
      case 'measure':
      case 'dimlin':  if (placed >= 2) dimSym(P[0], P[1]); break;
      case 'dimalign':if (placed >= 2) dimAligned(P[0], P[1]); break;
    }
  }

  function drawRubber(P, placed, C) {
    switch (scn.kind) {
      case 'line':    seg(P[0], C); break;
      case 'rect':    ctx.beginPath(); ctx.rect(P[0][0], P[0][1], C[0] - P[0][0], C[1] - P[0][1]); ctx.fill(); ctx.stroke(); break;
      case 'rectc':   { const c = P[0]; ctx.beginPath(); ctx.rect(2 * c[0] - C[0], 2 * c[1] - C[1], 2 * (C[0] - c[0]), 2 * (C[1] - c[1])); ctx.fill(); ctx.stroke(); } break;
      case 'polygon': regularPoly(P[0], C, scn.n || 6); break;
      case 'circle':  { ctx.beginPath(); ctx.arc(P[0][0], P[0][1], dist(P[0], C), 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); seg(P[0], C); } break;
      case 'ellipse': if (placed === 1) seg(P[0], C); else if (placed === 2) { ctx.beginPath(); ctx.ellipse(P[0][0], P[0][1], Math.abs(P[1][0] - P[0][0]), Math.abs(C[1] - P[0][1]), 0, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); } break;
      case 'poly':    seg(P[placed - 1], C); break;
      case 'spline':
      case 'cable':   smooth(P.slice(0, placed).concat([C])); break;
      case 'xline':   infinite(P[0], C, true); break;
      case 'ray':     infinite(P[0], C, false); break;
      case 'tube':    tubeSym(P[0], C); break;
      case 'wall':    wallSym(P[0], C); break;
      case 'window':  wallSym(P[0], C, 3); break;
      case 'door':    doorSym(P[0], C); break;
      case 'leader':  seg(P[0], C); ctx.fillStyle = ACCENT; arrowHead(P[0], C, 6); break;
      case 'measure':
      case 'dimlin':  dimSym(P[0], C); break;
      case 'dimalign':dimAligned(P[0], C); break;
      case 'arc3':    if (placed === 1) seg(P[0], C); else if (placed === 2) strokeArc3(P[0], P[1], C); break;
    }
  }

  // ── Rendu MODIFICATION (forme existante → opération, progression p ∈ [0,1]) ──
  function renderModify(kind, p, cursorOut) {
    ctx.lineJoin = ctx.lineCap = 'round';
    let cur = null;
    switch (kind) {
      case 'move': {
        const x = X(.12), y = Y(.34), w = DX(.34), h = DY(.30);
        setGhost(); ctx.strokeRect(x, y, w, h);
        const ox = x + DX(.42) * p, oy = y + DY(.18) * p;
        setSolid(); ctx.beginPath(); ctx.rect(ox, oy, w, h); ctx.fill(); ctx.stroke();
        cur = [ox + w / 2, oy + h / 2]; break;
      }
      case 'scale': {
        const c = [X(.5), Y(.52)], w = DX(.30), h = DY(.28), f = 1 + .55 * p;
        setGhost(); ctx.strokeRect(c[0] - w / 2, c[1] - h / 2, w, h);
        setSolid(); ctx.beginPath(); ctx.rect(c[0] - w * f / 2, c[1] - h * f / 2, w * f, h * f); ctx.fill(); ctx.stroke();
        cur = [c[0] + w * f / 2, c[1] + h * f / 2]; break;
      }
      case 'rotate': {
        const piv = [X(.30), Y(.72)], w = DX(.40), h = DY(.26);
        setGhost(); ctx.strokeRect(piv[0], piv[1] - h, w, h);
        ctx.save(); ctx.translate(piv[0], piv[1]); ctx.rotate(-p * 1.1);
        setSolid(); ctx.beginPath(); ctx.rect(0, -h, w, h); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.fillStyle = ACCENT; dot(piv, 2.6);
        cur = [piv[0] + Math.cos(-p * 1.1) * w, piv[1] + Math.sin(-p * 1.1) * w]; break;
      }
      case 'mirror': {
        const ax = X(.5);
        setSolid(); const tri = o => { ctx.beginPath(); ctx.moveTo(X(.30) + o, Y(.30)); ctx.lineTo(X(.30) + o, Y(.72)); ctx.lineTo(X(.44) + o, Y(.72)); ctx.closePath(); ctx.fill(); ctx.stroke(); };
        tri(0);
        ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = RUBBER; ctx.lineWidth = 1.2; seg([ax, Y(.18)], [ax, Y(.84)]); ctx.restore();
        ctx.save(); ctx.globalAlpha = p; setSolid();
        ctx.beginPath(); ctx.moveTo(X(.70), Y(.30)); ctx.lineTo(X(.70), Y(.72)); ctx.lineTo(X(.56), Y(.72)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        break;
      }
      case 'offset': {
        const x = X(.16), y = Y(.30), w = DX(.50), h = DY(.44), d = DX(.11) * p;
        setSolid(); ctx.strokeRect(x, y, w, h);                 // original
        if (p > .02) { setSolid(); ctx.strokeRect(x + d, y + d, w - 2 * d, h - 2 * d); } // ligne décalée (pleine)
        cur = [x + w, y + h / 2]; break;
      }
      case 'trim': {
        const i = [X(.5), Y(.52)], e1 = [X(.84), Y(.78)];
        setSolid(); seg([X(.18), Y(.74)], [X(.82), Y(.30)]);      // ligne coupante
        seg([X(.16), Y(.26)], i);                                 // partie conservée
        ctx.save(); ctx.globalAlpha = 1 - p; setSolid(); seg(i, e1); ctx.restore(); // tronçon retiré
        cur = lerp2(i, e1, .5); break;
      }
      case 'extend': {
        const y = Y(.5), x0 = X(.18), xb = X(.80);
        ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; ctx.strokeStyle = RUBBER; seg([xb, Y(.22)], [xb, Y(.78)]); ctx.restore(); // limite
        setSolid(); seg([x0, y], [x0 + (xb - x0) * (.45 + .55 * p), y]); // le trait se prolonge seul (pas de curseur)
        break;
      }
      case 'fillet':
      case 'chamfer': {
        const cx = X(.30), cy = Y(.70), r = DX(.16) * p;
        setSolid();
        seg([cx + r, cy], [X(.84), cy]);              // horizontale rognée
        seg([cx, cy - r], [cx, Y(.22)]);              // verticale rognée
        if (kind === 'fillet') { ctx.beginPath(); ctx.arc(cx + r, cy - r, r, Math.PI / 2, Math.PI); ctx.stroke(); }
        else seg([cx + r, cy], [cx, cy - r]);
        break;                                         // curseur géré par les clics (pré-phase)
      }
      case 'stretch': {
        const x = X(.16), y = Y(.34), w = DX(.40), h = DY(.32), ext = DX(.24) * p;
        setSolid(); ctx.beginPath(); ctx.rect(x, y, w + ext, h); ctx.fill(); ctx.stroke();
        cur = [x + w + ext, y + h / 2]; break;
      }
      case 'join': {
        const y = Y(.5);
        setSolid(); seg([X(.16), y], [X(.40), y]); seg([X(.60), y], [X(.84), y]);
        ctx.save(); ctx.strokeStyle = RUBBER; setRubber(); if (p > .02) seg([X(.40), y], [X(.40) + DX(.20) * p, y]); ctx.restore();
        break;
      }
      case 'divide': {
        const a = [X(.16), Y(.5)], b = [X(.84), Y(.5)], n = 5;
        setSolid(); seg(a, b); ctx.fillStyle = ACCENT;
        for (let i = 1; i < n; i++) if (p > i / n) { const q = lerp2(a, b, i / n); dot([q[0], q[1]], 2.6); seg([q[0], q[1] - 4], [q[0], q[1] + 4]); }
        break;
      }
      case 'copy': {
        const x = X(.12), y = Y(.36), w = DX(.32), h = DY(.30);
        setSolid(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();   // original conservé
        const ox = x + DX(.44) * p, oy = y + DY(.18) * p;
        ctx.save(); ctx.globalAlpha = .45 + .55 * p; setSolid(); ctx.beginPath(); ctx.rect(ox, oy, w, h); ctx.fill(); ctx.stroke(); ctx.restore();
        cur = [ox + w / 2, oy + h / 2]; break;
      }
      case 'array': {
        const w = DX(.18), h = DY(.18), gx = DX(.26), gy = DY(.32), x0 = X(.12), y0 = Y(.12), cols = 3, rows = 2, tot = cols * rows;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = r * cols + c; if (i > 0 && p * tot < i) continue;
          ctx.save(); if (i > 0) ctx.globalAlpha = Math.min(1, p * tot - i + 1);
          setSolid(); ctx.beginPath(); ctx.rect(x0 + c * gx, y0 + r * gy, w, h); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'array_polar': {
        const C = [X(.5), Y(.54)], R = DX(.30), n = 6, s = DX(.075);
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = GHOST; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(C[0], C[1], R, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
        ctx.fillStyle = ACCENT; dot(C, 2.4);
        for (let i = 0; i < n; i++) {
          if (i > 0 && p * n < i) continue;
          const a = -Math.PI / 2 + i * 2 * Math.PI / n, px = C[0] + R * Math.cos(a), py = C[1] + R * Math.sin(a);
          ctx.save(); if (i > 0) ctx.globalAlpha = Math.min(1, p * n - i + 1);
          setSolid(); ctx.beginPath(); ctx.rect(px - s, py - s, 2 * s, 2 * s); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'explode': {
        const x = X(.26), y = Y(.30), w = DX(.48), h = DY(.40), d = DX(.10) * p;
        setSolid();
        seg([x, y - d], [x + w, y - d]);              // haut
        seg([x, y + h + d], [x + w, y + h + d]);       // bas
        seg([x - d, y], [x - d, y + h]);              // gauche
        seg([x + w + d, y], [x + w + d, y + h]);       // droite
        break;
      }
      case 'group':
      case 'ungroup': {
        const ug = kind === 'ungroup', o = ug ? DX(.06) * p : 0;
        setSolid();
        ctx.beginPath(); ctx.rect(X(.18) - o, Y(.28) - o, DX(.18), DY(.16)); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(X(.66) + o, Y(.40) - o, DX(.10), 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X(.40), Y(.80) + o); ctx.lineTo(X(.58), Y(.80) + o); ctx.lineTo(X(.49), Y(.60) + o); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.globalAlpha = ug ? 1 - p : p; ctx.setLineDash([5, 3]); ctx.strokeStyle = RUBBER; ctx.lineWidth = 1.4;
        ctx.strokeRect(X(.12), Y(.20), DX(.64), DY(.68)); ctx.restore();
        break;
      }
      case 'erase': {
        const x = X(.20), y = Y(.30), w = DX(.50), h = DY(.40);
        ctx.save(); ctx.globalAlpha = 1 - p; setSolid(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke(); ctx.restore();
        cur = [x + w / 2, y + h / 2]; break;
      }
      case 'dimangular': {
        const V = [X(.20), Y(.82)], r1 = [X(.88), Y(.66)], r2 = [X(.50), Y(.16)];
        setSolid(); seg(V, r1); seg(V, r2);
        const a1 = Math.atan2(r1[1] - V[1], r1[0] - V[0]), a2 = Math.atan2(r2[1] - V[1], r2[0] - V[0]), R = DX(.34);
        if (p > .02) { ctx.beginPath(); ctx.arc(V[0], V[1], R, a1, a1 + (a2 - a1) * p, (a2 - a1) < 0); ctx.stroke(); }
        if (p > .85) { ctx.save(); ctx.fillStyle = ACCENT; ctx.font = '10px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; const am = (a1 + a2) / 2; ctx.fillText('45°', V[0] + (R + 13) * Math.cos(am), V[1] + (R + 13) * Math.sin(am)); ctx.restore(); }
        break;
      }
      case 'dimradius': {
        const c = [X(.48), Y(.56)], R = DX(.30), e = [c[0] + R * Math.cos(-.6), c[1] + R * Math.sin(-.6)];
        setSolid(); ctx.beginPath(); ctx.arc(c[0], c[1], R, 0, 2 * Math.PI); ctx.stroke();
        if (p > .02) seg(c, lerp2(c, e, p));
        if (p > .6) { ctx.fillStyle = ACCENT; arrowHead(e, c, 5); }
        if (p > .85) { ctx.save(); ctx.fillStyle = ACCENT; ctx.font = '10px "JetBrains Mono",monospace'; ctx.fillText('R' + Math.round(R), c[0] + 5, c[1] - 4); ctx.restore(); }
        break;
      }
      case 'dimdiameter': {
        const c = [X(.48), Y(.56)], R = DX(.30), ang = -.6;
        const e1 = [c[0] + R * Math.cos(ang), c[1] + R * Math.sin(ang)], e2 = [c[0] - R * Math.cos(ang), c[1] - R * Math.sin(ang)];
        setSolid(); ctx.beginPath(); ctx.arc(c[0], c[1], R, 0, 2 * Math.PI); ctx.stroke();
        if (p > .02) seg(lerp2(c, e2, p), lerp2(c, e1, p));
        if (p > .6) { ctx.fillStyle = ACCENT; arrowHead(e1, c, 5); arrowHead(e2, c, 5); }
        if (p > .85) { ctx.save(); ctx.fillStyle = ACCENT; ctx.font = '10px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.fillText('Ø' + Math.round(2 * R), c[0], c[1] - 4); ctx.restore(); }
        break;
      }
    }
    if (cursorOut && cur) cursorOut.p = cur;
  }

  // ── Curseur + pulse ─────────────────────────────────────────────────────────
  function drawCursorPx(x, y, pressed) {
    const s = pressed ? .82 : .92;
    ctx.save(); ctx.setLineDash([]); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(4, 11.5);
    ctx.lineTo(6.6, 17.5); ctx.lineTo(9, 16.4); ctx.lineTo(6.2, 10.6); ctx.lineTo(11, 10.6); ctx.closePath();
    ctx.fillStyle = CUR_FILL; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = CUR_STROKE; ctx.stroke();
    ctx.restore();
  }
  function drawClickPulse(at, t) {
    ctx.save(); ctx.setLineDash([]); ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.beginPath(); ctx.arc(X(at[0]), Y(at[1]), 3 + 11 * t, 0, 2 * Math.PI);
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
  }

  // ── Timelines & boucle ──────────────────────────────────────────────────────
  const moveDur = (a, b) => Math.max(280, Math.min(280 + dist(a, b) * 820, 820));
  function buildCreateTimeline(s) {
    const pts = s.pts, segs = []; let prev = [1.12, 1.18];
    for (let i = 0; i < pts.length; i++) {
      segs.push({ type: 'move', from: prev, to: pts[i], placed: i, dur: moveDur(prev, pts[i]) });
      segs.push({ type: 'click', at: pts[i], placed: i + 1, dur: CLICK_DUR });
      prev = pts[i];
    }
    segs.push({ type: 'hold', at: prev, placed: pts.length, dur: HOLD_DUR });
    return segs;
  }
  function buildModifyTimeline(s) {
    const segs = [];
    if (s.clicks) {
      let prev = [1.12, 1.18];
      s.clicks.forEach(c => {
        segs.push({ type: 'mmove', from: prev, to: c, dur: moveDur(prev, c) });
        segs.push({ type: 'mclick', at: c, dur: CLICK_DUR });
        prev = c;
      });
    }
    segs.push({ type: 'mhold', p: 0, dur: MHOLD0 });
    segs.push({ type: 'op', dur: OP_DUR });
    segs.push({ type: 'mhold', p: 1, dur: MHOLD1 });
    return segs;
  }

  function loop() {
    const now = performance.now();
    let seg = timeline[segI];
    let t = (now - segStart) / seg.dur;
    if (t >= 1) { segI = (segI + 1) % timeline.length; segStart = now; seg = timeline[segI]; t = 0; }
    t = Math.min(t, 1);

    if (scn.type === 'modify') {
      ctx.clearRect(0, 0, W, H);
      let p, cursor = null, pulse = 0;
      if (seg.type === 'op') p = easeInOut(t);
      else if (seg.type === 'mhold') p = seg.p;
      else { p = 0; cursor = seg.type === 'mmove' ? lerp2(seg.from, seg.to, easeInOut(t)) : seg.at; if (seg.type === 'mclick') pulse = t; }
      const out = {}; renderModify(scn.kind, p, out);
      if (cursor) { if (seg.type === 'mclick') drawClickPulse(seg.at, pulse); drawCursorPx(X(cursor[0]), Y(cursor[1]), seg.type === 'mclick' && t < .3); }
      else if (out.p) drawCursorPx(out.p[0], out.p[1], seg.type === 'op');
    } else {
      let cursor, pulse = 0;
      if (seg.type === 'move') cursor = lerp2(seg.from, seg.to, easeInOut(t));
      else if (seg.type === 'click') { cursor = seg.at; pulse = t; }
      else cursor = seg.at;
      render(seg.placed, cursor);
      if (seg.type === 'click') drawClickPulse(seg.at, pulse);
      drawCursorPx(X(cursor[0]), Y(cursor[1]), seg.type === 'click' && t < .3);
    }
    raf = requestAnimationFrame(loop);
  }

  function play(s) { scn = s; timeline = s.type === 'modify' ? buildModifyTimeline(s) : buildCreateTimeline(s); segI = 0; segStart = performance.now(); loop(); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

  // ── Fenêtre + survol ─────────────────────────────────────────────────────────
  function injectStyle() {
    const css = `
.tool-preview{position:fixed;z-index:10000;pointer-events:none;background:var(--bg-panel,#16213e);
  border:1px solid #ffffff20;border-radius:8px;padding:8px 8px 6px;box-shadow:0 6px 20px #000a;
  display:flex;flex-direction:column;align-items:center;gap:5px;opacity:0;
  transform:translateY(-4px) scale(.96);transition:opacity .14s ease,transform .14s ease;}
.tool-preview.show{opacity:1;transform:none;}
.tool-preview canvas{display:block;}
.tool-preview .tp-label{font:10px/1 'JetBrains Mono',monospace;color:var(--text-dim,#576a80);
  letter-spacing:.3px;max-width:130px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }
  function ensureEl() {
    if (el) return;
    const a = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (a) ACCENT = a;
    el = document.createElement('div'); el.className = 'tool-preview';
    cv = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    label = document.createElement('div'); label.className = 'tp-label';
    el.appendChild(cv); el.appendChild(label); document.body.appendChild(el);
  }
  function show(btn) {
    const s = ANIM[keyOf(btn)]; if (!s) return;
    ensureEl(); label.textContent = btn.getAttribute('title') || '';
    el.classList.add('show');
    const r = btn.getBoundingClientRect(), pw = el.offsetWidth, ph = el.offsetHeight;
    let left = Math.max(6, Math.min(r.left + r.width / 2 - pw / 2, window.innerWidth - pw - 6));
    let top = r.bottom + 6; if (top + ph > window.innerHeight - 6) top = r.top - ph - 6;
    el.style.left = left + 'px'; el.style.top = top + 'px';
    play(s);
  }
  function hide() { clearTimeout(timer); timer = null; curBtn = null; stop(); if (el) el.classList.remove('show'); }

  function setup() {
    injectStyle();
    document.addEventListener('mouseover', e => {
      const btn = e.target.closest && e.target.closest('.tool-btn');
      if (!btn || !keyOf(btn) || btn === curBtn) return;
      hide(); curBtn = btn; timer = setTimeout(() => { if (curBtn === btn) show(btn); }, OPEN_DELAY);
    }, true);
    document.addEventListener('mouseout', e => {
      const btn = e.target.closest && e.target.closest('.tool-btn');
      if (btn && btn === curBtn) { const to = e.relatedTarget; if (!to || !to.closest || to.closest('.tool-btn') !== btn) hide(); }
    }, true);
    document.addEventListener('mousedown', hide, true);
    document.addEventListener('wheel', hide, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
