/* ============================================================
   PLUGIN: NESTING (Optimisation de découpe de tôle — imbrication)
   Commandes : NESTING (panneau), NESTADD (ajouter la sélection),
               NESTRUN (lancer l'optimisation), NESTFMT (formats de tôle),
               NESTCLR (effacer le résultat)

   Deux stratégies :
     - « cisaille »  : pièces rectangulaires, bin-packing guillotine (bord à bord)
     - « laser »     : formes quelconques, imbrication vraie (No-Fit-Polygon + BLF)

   Deux listes de tôles :
     1. formats standards  → fichier livré plugins/nesting_formats.conf
                             + copie de travail localStorage['minicad_nesting_formats']
                             + bouton « Exporter .conf »
     2. chutes             → persistées dans le .mcad (S.pluginData.nesting.chutes)

   La liste des pièces + les paramètres + le mode sont aussi persistés dans le
   .mcad via le sac générique S.pluginData (voir buildSaveData/openJSON du cœur).

   Rendu du résultat = vraies entités MiniCAD sur des calques dédiés
   (NEST-TÔLE / NEST-PIÈCES / NEST-COUPE / NEST-TEXTE), un seul pushUndo().
   ============================================================ */

// ======== COMMANDES ========
const NESTING_COMMANDS = {
  NESTING:  { alias: ['IMBRIC', 'OPTIDECOUPE', 'IMBRICATION'],
              desc: 'Optimisation de découpe de tôle — ouvrir le panneau',
              exec: function () { _nestOpenPanel(); } },
  NESTADD:  { alias: ['NESTADDSEL'],
              desc: 'Ajouter la sélection courante à la liste des pièces à imbriquer',
              exec: function () { _nestAddSelection(); } },
  NESTRUN:  { alias: [],
              desc: 'Lancer l\'optimisation d\'imbrication',
              exec: function () { _nestOpenRun(); } },
  NESTFMT:  { alias: ['NESTFORMATS'],
              desc: 'Gérer les formats de tôle (standards + chutes)',
              exec: function () { _nestOpenFormats(); } },
  NESTCLR:  { alias: ['NESTCLEAR'],
              desc: 'Effacer le résultat d\'imbrication dessiné',
              exec: function () { _nestClearResult(); } },
};

// ======== ÉTAT / PERSISTANCE ========
const NEST_LAYERS = {
  tole:   { name: 'NEST-TÔLE',   color: '#5b8def', dashed: false },
  useful: { name: 'NEST-TÔLE',   color: '#5b8def', dashed: false },
  piece:  { name: 'NEST-PIÈCES', color: '#00e676', dashed: false },
  cut:    { name: 'NEST-COUPE',  color: '#ff5252', dashed: true  },
  text:   { name: 'NEST-TEXTE',  color: '#ffab40', dashed: false },
};
const NEST_LAYER_NAMES = ['NEST-TÔLE', 'NEST-PIÈCES', 'NEST-COUPE', 'NEST-TEXTE'];

function _nestDefaults() {
  return {
    mode: 'shear',
    params: { kerf: 0.2, sheetMargin: 5, partGap: 3, allowRotation: true, rotationStep: 90, groupByPart: false, edgeCutsOnly: false, cutThrough: 'auto', resultLandscape: false },
    chutes: [],
    parts: [],
    lastResult: null,
  };
}
function _nestData() {
  if (!S.pluginData || typeof S.pluginData !== 'object') S.pluginData = {};
  if (!S.pluginData.nesting) S.pluginData.nesting = _nestDefaults();
  const d = S.pluginData.nesting;
  if (!d.params) d.params = _nestDefaults().params;
  if (!Array.isArray(d.chutes)) d.chutes = [];
  if (!Array.isArray(d.parts)) d.parts = [];
  if (d.mode !== 'shear' && d.mode !== 'laser') d.mode = 'shear';
  return d;
}
function _nestPersist() { if (typeof autoSave === 'function') autoSave(); }

let _nestUid = 1;
function _nestId(pfx) { return (pfx || 'n') + '_' + Date.now().toString(36) + '_' + (_nestUid++); }

// Dernier résultat de solveur, conservé pour redessiner sans recalculer quand
// on bascule l'affichage portrait ↔ paysage.
let _nestLastResult = null;

// ======== FORMATS STANDARDS (.conf + localStorage) ========
const NEST_FMT_LS = 'minicad_nesting_formats';
let _nestStd = null;          // array of {name,width,height}
let _nestStdLoading = null;

function _nestFallbackFormats() {
  // Convention tôlerie : largeur (petit côté) x longueur (grand côté).
  return [
    { name: '1000 x 2000', width: 1000, height: 2000, enabled: true },
    { name: '1250 x 2500', width: 1250, height: 2500, enabled: true },
    { name: '1500 x 3000', width: 1500, height: 3000, enabled: true },
    { name: '2000 x 4000', width: 2000, height: 4000, enabled: true },
  ];
}
function _nestNormFormats(arr) {
  return (arr || [])
    .map(f => ({
      name: String(f.name || (f.width + ' x ' + f.height)),
      width: +f.width, height: +f.height,
      enabled: f.enabled !== false,   // absent → pris en compte par défaut
    }))
    .filter(f => f.width > 0 && f.height > 0);
}
async function _nestLoadStd() {
  if (_nestStd) return _nestStd;
  if (_nestStdLoading) return _nestStdLoading;
  _nestStdLoading = (async () => {
    try {
      const s = localStorage.getItem(NEST_FMT_LS);
      if (s) {
        const j = JSON.parse(s);
        const arr = _nestNormFormats(j.formats || j);
        if (arr.length) { _nestStd = arr; return _nestStd; }
      }
    } catch (e) { /* ignore */ }
    try {
      const r = await fetch('plugins/nesting_formats.conf', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        const arr = _nestNormFormats(j.formats || j);
        if (arr.length) { _nestStd = arr; return _nestStd; }
      }
    } catch (e) { /* ignore */ }
    _nestStd = _nestFallbackFormats();
    return _nestStd;
  })();
  const out = await _nestStdLoading;
  _nestStdLoading = null;
  return out;
}
function _nestSaveStd(silent) {
  try {
    localStorage.setItem(NEST_FMT_LS, JSON.stringify({ version: 1, units: 'mm', formats: _nestStd }, null, 2));
    if (!silent && typeof termPrint === 'function') termPrint('Imbrication : formats standards enregistrés (localStorage)', 'success');
  } catch (e) {
    if (typeof termPrint === 'function') termPrint('Imbrication : échec enregistrement des formats (' + e.message + ')', 'error');
  }
}
function _nestExportConf() {
  const content = JSON.stringify({ version: 1, units: 'mm', formats: (_nestStd || []).map(f => ({ name: f.name, width: f.width, height: f.height, enabled: f.enabled !== false })) }, null, 2);
  if (typeof saveWithPicker === 'function') {
    saveWithPicker(content, 'nesting_formats', 'conf', 'application/json', 'Config formats tôle (NESTING)', null)
      .then(name => { if (name && typeof termPrint === 'function') termPrint('Imbrication : formats exportés → ' + name + ' (à replacer dans src/plugins/ puis rebuild)', 'success'); });
  }
}
function _nestResetStd() {
  try { localStorage.removeItem(NEST_FMT_LS); } catch (e) { /* ignore */ }
  _nestStd = null;
  _nestLoadStd().then(() => _nestRenderFormats());
}

/* =====================================================================
   GÉOMÉTRIE — utilitaires polygones (locaux au plugin)
   Conventions : polygone = tableau de [x,y], NON fermé (dernier→premier
   implicite), CCW = aire signée positive.
   ===================================================================== */
function _polyArea(p) {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i++) { const j = (i + 1) % n; a += p[i][0] * p[j][1] - p[j][0] * p[i][1]; }
  return a / 2;
}
function _polyCCW(p) { return _polyArea(p) > 0; }
function _ensureCCW(p) { return _polyCCW(p) ? p.map(q => [q[0], q[1]]) : p.map(q => [q[0], q[1]]).reverse(); }
function _polyBBox(p) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const q of p) { if (q[0] < a) a = q[0]; if (q[1] < b) b = q[1]; if (q[0] > c) c = q[0]; if (q[1] > d) d = q[1]; }
  return { minX: a, minY: b, maxX: c, maxY: d, w: c - a, h: d - b };
}
function _polyCentroid(p) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = p.length; i < n; i++) {
    const j = (i + 1) % n;
    const f = p[i][0] * p[j][1] - p[j][0] * p[i][1];
    a += f; cx += (p[i][0] + p[j][0]) * f; cy += (p[i][1] + p[j][1]) * f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) {
    let sx = 0, sy = 0; for (const q of p) { sx += q[0]; sy += q[1]; }
    return [sx / p.length, sy / p.length];
  }
  return [cx / (6 * a), cy / (6 * a)];
}
function _rotPoly(p, angDeg) {
  const a = angDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  return p.map(q => [q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca]);
}
function _trPoly(p, dx, dy) { return p.map(q => [q[0] + dx, q[1] + dy]); }
function _dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function _cross3(ox, oy, ax, ay, bx, by) { return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox); }

// intersection PROPRE (stricte) de deux segments — le contact bord-à-bord ne compte pas
function _segProperInt(p1, p2, p3, p4) {
  const d1 = _cross3(p3[0], p3[1], p4[0], p4[1], p1[0], p1[1]);
  const d2 = _cross3(p3[0], p3[1], p4[0], p4[1], p2[0], p2[1]);
  const d3 = _cross3(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  const d4 = _cross3(p1[0], p1[1], p2[0], p2[1], p4[0], p4[1]);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
// 1 = strictement dedans, 0 = dehors / sur le bord (lancer de rayon)
function _ptInPoly(pt, poly) {
  let x = pt[0], y = pt[1], inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    const hit = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (hit) inside = !inside;
  }
  return inside ? 1 : 0;
}
// deux polygones se chevauchent-ils (contact bord à bord toléré) ?
function _polyOverlap(A, B) {
  for (let i = 0; i < A.length; i++) {
    const a1 = A[i], a2 = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) {
      const b1 = B[j], b2 = B[(j + 1) % B.length];
      if (_segProperInt(a1, a2, b1, b2)) return true;
    }
  }
  // sommets légèrement rentrés vers le centroïde : un sommet posé pile sur la
  // frontière de l'autre polygone (contact) ne doit pas compter comme recouvrement
  const ca = _polyCentroid(A), cb = _polyCentroid(B), eps = 1e-3;
  for (const v of A) { if (_ptInPoly([v[0] + (ca[0] - v[0]) * eps, v[1] + (ca[1] - v[1]) * eps], B) === 1) return true; }
  for (const v of B) { if (_ptInPoly([v[0] + (cb[0] - v[0]) * eps, v[1] + (cb[1] - v[1]) * eps], A) === 1) return true; }
  if (_ptInPoly(ca, B) === 1) return true;
  if (_ptInPoly(cb, A) === 1) return true;
  return false;
}
// enveloppe convexe (monotone chain) — renvoie CCW
function _hull(pts) {
  const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const hi = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  lo.pop(); hi.pop();
  return lo.concat(hi);
}
function _isConvex(poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = poly[(i + 2) % poly.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-9) continue;
    const s = z > 0 ? 1 : -1;
    if (sign === 0) sign = s; else if (s !== sign) return false;
  }
  return true;
}
function _ptSegDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function _dp(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let dmax = 0, idx = -1;
    for (let i = s + 1; i < e; i++) { const d = _ptSegDist(pts[i], pts[s], pts[e]); if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > tol && idx > -1) { keep[idx] = true; stack.push([s, idx]); stack.push([idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function _simplifyClosed(poly, tol) {
  if (poly.length < 4) return poly.map(q => [q[0], q[1]]);
  const open = poly.concat([poly[0]]);
  const r = _dp(open, tol);
  r.pop();
  return r.length >= 3 ? r : poly.map(q => [q[0], q[1]]);
}
// triangulation par ear-clipping (poly CCW simple) → tableau de triangles [[a,b,c],...]
function _triangulate(poly) {
  const pts = _ensureCCW(poly);
  const n = pts.length;
  if (n < 3) return [];
  if (n === 3) return [[pts[0], pts[1], pts[2]]];
  const V = []; for (let i = 0; i < n; i++) V.push(i);
  const tris = [];
  const ar = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p, a, b, c) => {
    const d1 = ar(p, a, b), d2 = ar(p, b, c), d3 = ar(p, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0, hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  };
  let guard = 0;
  while (V.length > 3 && guard++ < 4000) {
    let clipped = false;
    for (let i = 0; i < V.length; i++) {
      const a = V[(i + V.length - 1) % V.length], b = V[i], c = V[(i + 1) % V.length];
      const A = pts[a], B = pts[b], C = pts[c];
      if (ar(A, B, C) <= 1e-9) continue;
      let ok = true;
      for (let k = 0; k < V.length; k++) {
        const vi = V[k];
        if (vi === a || vi === b || vi === c) continue;
        if (inTri(pts[vi], A, B, C)) { ok = false; break; }
      }
      if (!ok) continue;
      tris.push([A, B, C]); V.splice(i, 1); clipped = true; break;
    }
    if (!clipped) break;
  }
  if (V.length === 3) tris.push([pts[V[0]], pts[V[1]], pts[V[2]]]);
  return tris;
}
// décomposition en morceaux convexes (pour le NFP)
function _convexPieces(poly) {
  let p = _simplifyClosed(_ensureCCW(poly), 0.5);
  if (p.length < 3) return [];
  if (_isConvex(p)) return [p];
  const tris = _triangulate(p);
  if (!tris.length) return [_hull(p)];
  // fusion gloutonne des triangles adjacents si le résultat reste convexe
  let pieces = tris.map(t => t.slice());
  let merged = true, guard = 0;
  while (merged && guard++ < 200) {
    merged = false;
    outer:
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const m = _tryMergeConvex(pieces[i], pieces[j]);
        if (m) { pieces.splice(j, 1); pieces.splice(i, 1, m); merged = true; break outer; }
      }
    }
  }
  if (pieces.length > 14) return [_hull(p)];   // garde-fou perf : trop concave → approx enveloppe
  return pieces;
}
function _tryMergeConvex(A, B) {
  // cherche une arête commune (deux sommets partagés consécutifs)
  const eq = (u, v) => Math.abs(u[0] - v[0]) < 1e-6 && Math.abs(u[1] - v[1]) < 1e-6;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      if (eq(A[i], B[(j + 1) % B.length]) && eq(A[(i + 1) % A.length], B[j])) {
        const merged = [];
        for (let k = 0; k < A.length; k++) { merged.push(A[k]); if (k === i) { for (let t = 1; t < B.length; t++) merged.push(B[(j + 1 + t) % B.length]); } }
        const clean = _dedupePoly(merged);
        if (clean.length >= 3 && _isConvex(clean) && Math.abs(_polyArea(clean)) > 1e-6) return clean;
      }
    }
  }
  return null;
}
function _dedupePoly(p) {
  const out = [];
  for (const q of p) { const last = out[out.length - 1]; if (!last || Math.abs(last[0] - q[0]) > 1e-6 || Math.abs(last[1] - q[1]) > 1e-6) out.push([q[0], q[1]]); }
  if (out.length > 1 && Math.abs(out[0][0] - out[out.length - 1][0]) < 1e-6 && Math.abs(out[0][1] - out[out.length - 1][1]) < 1e-6) out.pop();
  return out;
}
function _lowestFirst(poly) {
  let k = 0;
  for (let i = 1; i < poly.length; i++) {
    if (poly[i][1] < poly[k][1] || (poly[i][1] === poly[k][1] && poly[i][0] < poly[k][0])) k = i;
  }
  return poly.slice(k).concat(poly.slice(0, k));
}
// somme de Minkowski de deux polygones convexes CCW (fusion des arêtes par angle)
function _minkowskiConvex(A0, B0) {
  const A = _lowestFirst(_ensureCCW(A0));
  const B = _lowestFirst(_ensureCCW(B0));
  const na = A.length, nb = B.length;
  const ea = k => [A[(k + 1) % na][0] - A[k % na][0], A[(k + 1) % na][1] - A[k % na][1]];
  const eb = k => [B[(k + 1) % nb][0] - B[k % nb][0], B[(k + 1) % nb][1] - B[k % nb][1]];
  const res = [];
  let i = 0, j = 0, guard = 0;
  while ((i < na || j < nb) && guard++ < na + nb + 4) {
    res.push([A[i % na][0] + B[j % nb][0], A[i % na][1] + B[j % nb][1]]);
    const va = ea(i), vb = eb(j);
    const cr = va[0] * vb[1] - va[1] * vb[0];
    if (j >= nb || (i < na && cr > 1e-12)) i++;
    else if (i >= na || cr < -1e-12) j++;
    else { i++; j++; }
  }
  return _dedupePoly(res);
}
// No-Fit-Polygon : positions du point de référence (origine locale) de B
// telles que B touche A sans le recouvrir. Intérieur du NFP = recouvrement.
function _nfp(Aworld, Blocal) {
  const negB = Blocal.map(p => [-p[0], -p[1]]);
  return _minkowskiConvex(Aworld, negB);
}

/* =====================================================================
   RÉSOLUTION DU CONTOUR D'UNE PIÈCE
   ===================================================================== */
function _sampleArc(cx, cy, r, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  return pts;
}
function _entPts(e) {
  switch (e.type) {
    case 'line': case 'wall':
      return [[[e.x1, e.y1], [e.x2, e.y2]]];
    case 'rect': {
      const x1 = Math.min(e.x1, e.x2), x2 = Math.max(e.x1, e.x2);
      const y1 = Math.min(e.y1, e.y2), y2 = Math.max(e.y1, e.y2);
      return [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]];
    }
    case 'polyline': case 'cable': {
      if (!e.points || e.points.length < 2) return [];
      let pts = (typeof flattenPolyPoints === 'function')
        ? flattenPolyPoints(e.points, !!e.closed).map(p => [p[0], p[1]])
        : e.points.map(p => [p[0], p[1]]);
      if (e.closed && pts.length >= 2 && _dist(pts[0], pts[pts.length - 1]) > 1e-6) pts.push([pts[0][0], pts[0][1]]);
      return [pts];
    }
    case 'spline': {
      if (!e.points || e.points.length < 2) return [];
      const cp = e.points.map(p => [p[0], p[1]]);
      const pts = (typeof catmullRom === 'function') ? catmullRom(cp, !!e.closed, 16).map(p => [p[0], p[1]]) : cp;
      return [pts];
    }
    case 'circle': {
      const n = Math.max(20, Math.min(48, Math.ceil(Math.PI * 2 * e.r / Math.max(2, e.r * 0.14))));
      return [_sampleArc(e.cx, e.cy, e.r, 0, Math.PI * 2, n)];
    }
    case 'arc': {
      let sa = e.startAngle, ea = e.endAngle;
      while (ea < sa) ea += Math.PI * 2;
      return [_sampleArc(e.cx, e.cy, e.r, sa, ea, Math.max(4, Math.ceil((ea - sa) / 0.2)))];
    }
    case 'ellipse': {
      const n = 48, a = e.angle || 0, ca = Math.cos(a), sn = Math.sin(a), pts = [];
      let s = e.startAngle || 0, en = (e.endAngle == null) ? Math.PI * 2 : e.endAngle;
      while (en < s) en += Math.PI * 2;
      for (let i = 0; i <= n; i++) {
        const t = s + (en - s) * i / n, px = Math.cos(t) * e.rx, py = Math.sin(t) * e.ry;
        pts.push([e.cx + px * ca - py * sn, e.cy + px * sn + py * ca]);
      }
      return [pts];
    }
    default:
      return [];
  }
}
function _stitch(polylines, tol) {
  const segs = polylines.filter(p => p.length >= 2).map(p => p.map(q => [q[0], q[1]]));
  if (!segs.length) return null;
  const used = new Array(segs.length).fill(false);
  const near = (a, b) => _dist(a, b) <= tol;
  let chain = segs[0].slice(); used[0] = true;
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      const s = segs[i], a = s[0], b = s[s.length - 1];
      const head = chain[0], tail = chain[chain.length - 1];
      if (near(tail, a)) { chain = chain.concat(s.slice(1)); used[i] = true; progress = true; }
      else if (near(tail, b)) { chain = chain.concat(s.slice(0, -1).reverse()); used[i] = true; progress = true; }
      else if (near(head, b)) { chain = s.slice(0, -1).concat(chain); used[i] = true; progress = true; }
      else if (near(head, a)) { chain = s.slice(1).reverse().concat(chain); used[i] = true; progress = true; }
    }
  }
  const closed = near(chain[0], chain[chain.length - 1]);
  const allUsed = used.every(Boolean);
  if (closed) chain.pop();
  return { loop: chain, ok: closed && allUsed, closed };
}
function _nestResolveLoop(geoms) {
  const pls = [];
  geoms.forEach(e => _entPts(e).forEach(pl => { if (pl && pl.length >= 2) pls.push(pl); }));
  if (!pls.length) return null;
  let loop = null, approx = false;
  if (geoms.length === 1 && pls.length === 1) {
    const p = pls[0].map(q => [q[0], q[1]]);
    if (p.length >= 4) {
      if (_dist(p[0], p[p.length - 1]) < 1e-6) p.pop();
      loop = p;
    }
  }
  if (!loop) {
    const st = _stitch(pls, 0.8);
    if (st && st.loop.length >= 3 && st.closed) loop = st.loop;
  }
  if (!loop || loop.length < 3) {
    const all = []; pls.forEach(pl => pl.forEach(pt => all.push(pt)));
    loop = _hull(all); approx = true;
  }
  loop = _simplifyClosed(_ensureCCW(loop), 0.4);
  if (loop.length < 3) return null;
  return { loop, approx };
}

/* =====================================================================
   AJOUT D'UNE PIÈCE (sélection courante)
   ===================================================================== */
function _selEntities() {
  return (S.selected || []).map(id => S.entities.find(e => e.id === id)).filter(Boolean);
}
function _nestAddSelection() {
  const d = _nestData();
  const sel = _selEntities();
  if (!sel.length) { if (typeof termPrint === 'function') termPrint('Imbrication : rien de sélectionné', 'warning'); return; }

  const textEnt = sel.find(e => e.type === 'text' && (e.content || e.text));
  const geoms = sel.filter(e => e.type !== 'text' && e.type !== 'point' && !/^dim/.test(e.type || ''));
  if (!geoms.length) { if (typeof termPrint === 'function') termPrint('Imbrication : la sélection ne contient aucune géométrie', 'warning'); return; }

  // bbox globale
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  geoms.forEach(e => {
    const bb = (typeof getEntityBBox === 'function') ? getEntityBBox(e, true) : null;
    if (bb) { mnx = Math.min(mnx, bb.minX); mny = Math.min(mny, bb.minY); mxx = Math.max(mxx, bb.maxX); mxy = Math.max(mxy, bb.maxY); }
  });
  if (!isFinite(mnx)) { if (typeof termPrint === 'function') termPrint('Imbrication : bbox indéterminée', 'error'); return; }
  const w = +(mxx - mnx).toFixed(3), h = +(mxy - mny).toFixed(3);
  if (w <= 0 || h <= 0) { if (typeof termPrint === 'function') termPrint('Imbrication : pièce de taille nulle', 'warning'); return; }

  // contour (laser)
  const res = _nestResolveLoop(geoms);
  let loop = null, area = w * h, approx = true;
  if (res) {
    loop = _trPoly(res.loop, -mnx, -mny);
    approx = res.approx;
    if (!approx) area = Math.abs(_polyArea(loop));
  }

  // clones recentrés (origine = coin bas-gauche de la bbox)
  const entities = geoms.map(e => {
    const c = JSON.parse(JSON.stringify(e));
    delete c.id; delete c.layer;
    if (typeof offsetEntity === 'function') offsetEntity(c, -mnx, -mny);
    return c;
  });

  const label = (textEnt && String(textEnt.content || textEnt.text).trim()) || ('P' + (d.parts.length + 1));

  const doAdd = (qty) => {
    d.parts.push({ id: _nestId('part'), label, qty: Math.max(1, Math.round(qty || 1)), w, h, loop, area, approx, entities });
    _nestPersist();
    _nestRenderPanel();
    if (typeof termPrint === 'function') termPrint(`Imbrication : « ${label} » ajouté (${w}×${h} mm, ×${Math.max(1, Math.round(qty || 1))})` + (approx ? ' — contour approximé (enveloppe)' : ''), 'success');
  };

  if (typeof showValuePopup === 'function') {
    showValuePopup({ title: 'Ajouter la pièce « ' + label + ' »', label: 'Nombre de pièces', value: 1, unit: 'u', okLabel: 'Ajouter', onOk: v => doAdd(v) });
  } else {
    const v = parseInt(prompt('Nombre de pièces pour « ' + label + ' » :', '1'), 10);
    if (!isNaN(v)) doAdd(v);
  }
}

/* =====================================================================
   ORIENTATIONS
   ===================================================================== */
function _nestOrientations(params) {
  if (!params.allowRotation || !params.rotationStep || params.rotationStep <= 0) return [0];
  let step = params.rotationStep % 360;
  if (step <= 0) return [0];
  const list = [];
  for (let a = 0; a < 359.999; a += step) list.push(+a.toFixed(4));
  // garde-fou perf
  if (list.length > 24) {
    const keep = [];
    for (let i = 0; i < 24; i++) keep.push(+((i * 360) / 24).toFixed(4));
    return keep;
  }
  return list.length ? list : [0];
}
function _orient(loop, deg) {
  const r = deg ? _rotPoly(loop, deg) : loop.map(p => [p[0], p[1]]);
  const bb = _polyBBox(r);
  return { loop: _trPoly(r, -bb.minX, -bb.minY), w: bb.w, h: bb.h };
}

/* =====================================================================
   SOLVEUR CISAILLE — bin packing guillotine (rectangles)
   ===================================================================== */
function _solveShear(instances, pool, params) {
  const kerf = params.kerf, margin = params.sheetMargin, gap = params.partGap;
  const rot = params.allowRotation && params.rotationStep > 0;
  // Sens des coupes traversantes de la tôle : 'length' privilégie une coupe
  // verticale pleine hauteur (le long de la longueur), 'width' une coupe
  // horizontale pleine largeur, 'auto' coupe selon le plus grand reste (SAS).
  const cutPref = params.cutThrough === 'length' || params.cutThrough === 'width' ? params.cutThrough : 'auto';
  const mk = it => ({ partId: it.partId, w: it.w + gap, h: it.h + gap, rawW: it.w, rawH: it.h });
  const byAreaDesc = (a, b) => (b.w * b.h) - (a.w * a.h) || Math.max(b.w, b.h) - Math.max(a.w, a.h);

  // Un essai de placement complet pour une liste d'items DÉJÀ ordonnée.
  // Reconstruit son propre pool de quantités → réutilisable pour tester
  // plusieurs ordres (option « grouper par pièce »). Renvoie aussi un `score`
  // = surface totale de tôle engagée (chute minimale, l'aire des pièces étant
  // fixe), avec grosse pénalité si des pièces restent non placées.
  // `fcost(s)` classe les formats candidats à l'ouverture d'une nouvelle tôle
  // (coût le plus bas = essayé en premier). Plusieurs stratégies sont testées
  // par `solveOrdered` puis on garde la surface totale la plus faible : le
  // greedy « plus petit format qui contient la pièce » ouvrait parfois 3
  // petites tôles là où une seule grande suffisait.
  function packOrder(ordered, fcost) {
    const sheets = [];
    const P = pool.map(s => ({ name: s.name, w: s.w, h: s.h, qty: s.qty, kind: s.kind }));

    function newSheet(nw, nh) {
      let best = null;
      for (const s of P) {
        if (s.qty <= 0) continue;
        const UW = s.w - 2 * margin, UH = s.h - 2 * margin;
        const fits = (nw <= UW + 1e-6 && nh <= UH + 1e-6) || (rot && nh <= UW + 1e-6 && nw <= UH + 1e-6);
        if (!fits) continue;
        const score = fcost(s);
        if (!best || score < best.score) best = { s, score, UW, UH };
      }
      if (!best) return null;
      best.s.qty--;
      const sh = { format: { name: best.s.name, w: best.s.w, h: best.s.h, kind: best.s.kind },
        free: [{ x: margin, y: margin, w: best.UW, h: best.UH }], placements: [], cuts: [] };
      sheets.push(sh);
      return sh;
    }
    function tryPlace(sh, it) {
      let bf = null;
      const opts = rot ? [[it.w, it.h, false], [it.h, it.w, true]] : [[it.w, it.h, false]];
      for (let fi = 0; fi < sh.free.length; fi++) {
        const fr = sh.free[fi];
        for (const [pw, ph, r] of opts) {
          if (pw <= fr.w + 1e-6 && ph <= fr.h + 1e-6) {
            const leftover = Math.min(fr.w - pw, fr.h - ph);
            if (!bf || leftover < bf.leftover) bf = { fi, pw, ph, r, leftover };
          }
        }
      }
      if (!bf) return false;
      const fr = sh.free[bf.fi];
      const { pw, ph, r } = bf;
      sh.placements.push({ partId: it.partId, x: fr.x, y: fr.y, w: pw - gap, h: ph - gap, rotated: r });
      const rW = fr.w - pw, rH = fr.h - ph;
      sh.free.splice(bf.fi, 1);
      // Découpe guillotine : une coupe PRIMAIRE traverse toute l'étendue du
      // reste libre, une coupe SECONDAIRE ne traverse que la bande de la pièce.
      // 'length' force la primaire verticale (pleine hauteur = le long de la
      // longueur de la tôle), 'width' la force horizontale (pleine largeur),
      // 'auto' choisit selon le plus grand reste (règle SAS habituelle).
      const vertPrimary = cutPref === 'length' ? true : cutPref === 'width' ? false : (rW > rH);
      if (vertPrimary) {
        if (rW > 1e-6) sh.cuts.push([fr.x + pw - gap / 2, fr.y - margin / 2, fr.x + pw - gap / 2, fr.y + fr.h]);
        if (rH > 1e-6) sh.cuts.push([fr.x - margin / 2, fr.y + ph - gap / 2, fr.x + pw, fr.y + ph - gap / 2]);
        if (rW > kerf) sh.free.push({ x: fr.x + pw + kerf, y: fr.y, w: rW - kerf, h: fr.h });
        if (rH > kerf) sh.free.push({ x: fr.x, y: fr.y + ph + kerf, w: pw, h: rH - kerf });
      } else {
        if (rH > 1e-6) sh.cuts.push([fr.x - margin / 2, fr.y + ph - gap / 2, fr.x + fr.w, fr.y + ph - gap / 2]);
        if (rW > 1e-6) sh.cuts.push([fr.x + pw - gap / 2, fr.y - margin / 2, fr.x + pw - gap / 2, fr.y + ph - gap / 2]);
        if (rH > kerf) sh.free.push({ x: fr.x, y: fr.y + ph + kerf, w: fr.w, h: rH - kerf });
        if (rW > kerf) sh.free.push({ x: fr.x + pw + kerf, y: fr.y, w: rW - kerf, h: ph });
      }
      return true;
    }

    const failed = [];
    for (const it of ordered) {
      let placed = false;
      for (const sh of sheets) if (tryPlace(sh, it)) { placed = true; break; }
      if (!placed) {
        const sh = newSheet(it.w, it.h);
        if (sh && tryPlace(sh, it)) placed = true;
      }
      if (!placed) failed.push(it.partId);
    }
    let score = failed.length * 1e15;
    sheets.forEach(sh => { score += sh.format.w * sh.format.h; });
    return { sheets, failed, score };
  }

  // Stratégies de choix du format à l'ouverture d'une nouvelle tôle. Les chutes
  // gardent la priorité absolue (coût < 1e12, petites d'abord) ; pour les
  // formats standards on essaie : plus petit d'abord (historique), plus grand
  // d'abord, puis « privilégier CE format » pour chacun des standards du pool.
  const BIG = 1e12;
  const stdNames = [...new Set(pool.filter(s => s.kind !== 'chute').map(s => s.name))];
  const fcosts = [
    s => (s.kind === 'chute' ? 0 : BIG) + s.w * s.h,
    s => (s.kind === 'chute' ? 0 : BIG) - s.w * s.h,
  ];
  stdNames.slice(0, 6).forEach(nm => {
    fcosts.push(s => {
      if (s.kind === 'chute') return s.w * s.h;
      return (s.name === nm ? BIG : 2 * BIG + s.w * s.h);
    });
  });

  // Rejoue `ordered` avec chaque stratégie de format, garde la surface mini.
  function solveOrdered(ordered) {
    let best = null;
    for (const fc of fcosts) {
      const r = packOrder(ordered, fc);
      if (!best || r.score < best.score) best = r;
    }
    return best;
  }

  // Regroupe des items par `partId`, types triés par aire de lot décroissante.
  function groupOrder(items) {
    const gm = new Map();
    items.forEach(it => { if (!gm.has(it.partId)) gm.set(it.partId, []); gm.get(it.partId).push(it); });
    const gk = [...gm.keys()].sort((a, b) => {
      const A = gm.get(a), B = gm.get(b);
      return (B.length * B[0].w * B[0].h) - (A.length * A[0].w * A[0].h);
    });
    const out = [];
    gk.forEach(k => gm.get(k).forEach(it => out.push(it)));
    return out;
  }

  // --- Mode standard : deux ordres candidats (aire décroissante à plat, et
  //     regroupé par type) × stratégies de format ; on garde la surface mini. ---
  if (!params.groupByPart) {
    const flat = instances.map(mk);
    const cands = [flat.slice().sort(byAreaDesc), groupOrder(flat)];
    let best = null;
    for (const c of cands) { const r = solveOrdered(c); if (!best || r.score < best.score) best = r; }
    return { sheets: best.sheets, failed: best.failed };
  }

  // --- Grouper par pièce : chaque type est coupé en un bloc ; l'ordre des
  //     types est choisi pour minimiser la chute (essais bornés — permutations
  //     exhaustives jusqu'à 6 types, sinon brassages aléatoires + tris). ---
  const groups = new Map();
  instances.forEach(it => {
    if (!groups.has(it.partId)) groups.set(it.partId, []);
    groups.get(it.partId).push(mk(it));
  });
  const gkeys = [...groups.keys()];
  const gArea = k => { const g = groups.get(k); return g.length * g[0].w * g[0].h; };

  const orders = [];
  const seen = new Set();
  const addOrder = arr => { const s = arr.join(''); if (!seen.has(s)) { seen.add(s); orders.push(arr.slice()); } };
  addOrder([...gkeys].sort((a, b) => gArea(b) - gArea(a)));   // gros types d'abord
  addOrder([...gkeys].sort((a, b) => gArea(a) - gArea(b)));   // petits types d'abord
  if (gkeys.length <= 6) {
    const permute = (arr, acc) => {
      if (!arr.length) { addOrder(acc); return; }
      for (let i = 0; i < arr.length; i++) {
        const rest = arr.slice(); const [v] = rest.splice(i, 1);
        permute(rest, acc.concat(v));
      }
    };
    permute(gkeys, []);
  } else {
    for (let n = 0; n < 80; n++) {
      const a = gkeys.slice();
      for (let j = a.length - 1; j > 0; j--) { const k = (Math.random() * (j + 1)) | 0; const t = a[j]; a[j] = a[k]; a[k] = t; }
      addOrder(a);
    }
  }

  let best = null;
  for (const ord of orders) {
    const ordered = [];
    ord.forEach(k => groups.get(k).forEach(it => ordered.push(it)));
    const r = solveOrdered(ordered);
    if (!best || r.score < best.score) best = r;
  }
  return { sheets: best.sheets, failed: best.failed };
}

/* =====================================================================
   SOLVEUR LASER — No-Fit-Polygon + Bottom-Left-Fill
   ===================================================================== */
function _solveLaser(instances, pool, params, partsById) {
  const margin = params.sheetMargin;
  const grow = params.kerf / 2 + params.partGap / 2;   // demi-saignée + demi-espace
  const orients = _nestOrientations(params);
  const P = pool.map(s => ({ name: s.name, w: s.w, h: s.h, qty: s.qty, kind: s.kind }));
  const t0 = Date.now(), TIME_BUDGET = 6000;

  // pré-calcul par pièce : boucle "gonflée" + orientations
  const cache = {};
  function prep(partId) {
    if (cache[partId]) return cache[partId];
    const part = partsById[partId];
    let base = part.loop && part.loop.length >= 3 ? part.loop : _rectLoop(part.w, part.h);
    base = _inflate(base, grow);
    const oris = orients.map(deg => {
      const o = _orient(base, deg);
      return { deg, loop: o.loop, w: o.w, h: o.h, pieces: _convexPieces(o.loop) };
    });
    return (cache[partId] = { oris, area: part.area || (part.w * part.h) });
  }

  function place(order) {
    const poolLocal = P.map(s => ({ ...s }));       // pool neuf pour cet essai
    const solver = { sheets: [], failed: [] };
    const localNew = (need) => {
      let best = null;
      for (const s of poolLocal) {
        if (s.qty <= 0) continue;
        const UW = s.w - 2 * margin, UH = s.h - 2 * margin;
        const fits = orients.some(deg => { const o = _orient(need, deg); return o.w <= UW + 1e-6 && o.h <= UH + 1e-6; });
        if (!fits) continue;
        const score = (s.kind === 'chute' ? 0 : 1e12) + s.w * s.h;
        if (!best || score < best.score) best = { s, score, UW, UH };
      }
      if (!best) return null;
      best.s.qty--;
      const sh = { format: { name: best.s.name, w: best.s.w, h: best.s.h, kind: best.s.kind }, UW: best.UW, UH: best.UH, placed: [] };
      solver.sheets.push(sh);
      return sh;
    };

    for (const inst of order) {
      if (Date.now() - t0 > TIME_BUDGET) { solver.failed.push(inst.partId); continue; }
      const pc = prep(inst.partId);
      let done = false;
      for (const sh of solver.sheets) {
        const spot = _blf(sh, pc.oris, margin);
        if (spot) { sh.placed.push({ partId: inst.partId, rot: spot.deg, tx: spot.tx, ty: spot.ty, oloop: spot.oloop }); done = true; break; }
      }
      if (!done) {
        const need = pc.oris[0].loop;
        const sh = localNew(need);
        if (sh) {
          const spot = _blf(sh, pc.oris, margin);
          if (spot) { sh.placed.push({ partId: inst.partId, rot: spot.deg, tx: spot.tx, ty: spot.ty, oloop: spot.oloop }); done = true; }
        }
      }
      if (!done) solver.failed.push(inst.partId);
    }
    return solver;
  }

  // essais avec quelques ordres, on garde le meilleur
  const orders = [
    instances.slice().sort((a, b) => (prep(b.partId).area) - (prep(a.partId).area)),
    instances.slice().sort((a, b) => Math.max(partsById[b.partId].w, partsById[b.partId].h) - Math.max(partsById[a.partId].w, partsById[a.partId].h)),
    instances.slice().sort((a, b) => partsById[b.partId].h - partsById[a.partId].h),
  ];
  let best = null;
  for (const ord of orders) {
    if (Date.now() - t0 > TIME_BUDGET && best) break;
    const r = place(ord);
    const score = r.sheets.length * 1e9 + r.failed.length * 1e12 + _totalWaste(r, partsById);
    if (!best || score < best.score) best = { r, score };
  }
  return best.r;
}
function _rectLoop(w, h) { return [[0, 0], [w, 0], [w, h], [0, h]]; }
function _inflate(loop, d) {
  if (d <= 0) return loop.map(p => [p[0], p[1]]);
  // offset simple : chaque sommet poussé le long de la bissectrice extérieure
  const p = _ensureCCW(loop), n = p.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n];
    let v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    v1 = [v1[0] / l1, v1[1] / l1]; v2 = [v2[0] / l2, v2[1] / l2];
    // normales extérieures (CCW → normale = (dy,-dx))
    const nrm1 = [v1[1], -v1[0]], nrm2 = [v2[1], -v2[0]];
    let bis = [nrm1[0] + nrm2[0], nrm1[1] + nrm2[1]];
    const bl = Math.hypot(bis[0], bis[1]);
    if (bl < 1e-6) { out.push([b[0] + nrm1[0] * d, b[1] + nrm1[1] * d]); continue; }
    bis = [bis[0] / bl, bis[1] / bl];
    const cosH = Math.max(0.35, bis[0] * nrm1[0] + bis[1] * nrm1[1]);
    out.push([b[0] + bis[0] * d / cosH, b[1] + bis[1] * d / cosH]);
  }
  return out;
}
function _totalWaste(solver, partsById) {
  let used = 0, sheetArea = 0;
  for (const sh of solver.sheets) {
    sheetArea += sh.format.w * sh.format.h;
    for (const pl of (sh.placed || sh.placements || [])) {
      const p = partsById[pl.partId];
      used += p ? (p.area || p.w * p.h) : 0;
    }
  }
  return sheetArea - used;
}
// Bottom-Left-Fill : renvoie {deg,tx,ty,oloop} ou null
function _blf(sheet, oris, margin) {
  let best = null;
  for (const o of oris) {
    const ifpX0 = margin, ifpY0 = margin;
    const ifpX1 = margin + sheet.UW - o.w, ifpY1 = margin + sheet.UH - o.h;
    if (ifpX1 < ifpX0 - 1e-6 || ifpY1 < ifpY0 - 1e-6) continue;

    const cands = [[ifpX0, ifpY0], [ifpX1, ifpY0], [ifpX0, ifpY1], [ifpX1, ifpY1]];
    for (const pp of sheet.placed) {
      const ppPieces = _convexPieces(_trPoly(pp.oloop, pp.tx, pp.ty));
      for (const pa of ppPieces) {
        for (const pb of o.pieces) {
          const nf = _nfp(pa, pb);
          for (const v of nf) cands.push([v[0], v[1]]);
        }
      }
    }
    // dédup + clamp
    const seen = new Set(), list = [];
    for (const c of cands) {
      let tx = Math.min(ifpX1, Math.max(ifpX0, c[0]));
      let ty = Math.min(ifpY1, Math.max(ifpY0, c[1]));
      tx = +tx.toFixed(2); ty = +ty.toFixed(2);
      const k = tx + '|' + ty;
      if (seen.has(k)) continue;
      seen.add(k); list.push([tx, ty]);
    }
    for (const [tx, ty] of list) {
      const world = _trPoly(o.loop, tx, ty);
      let ok = true;
      for (const pp of sheet.placed) {
        if (_polyOverlap(world, _trPoly(pp.oloop, pp.tx, pp.ty))) { ok = false; break; }
      }
      if (!ok) continue;
      if (!best || ty < best.ty - 1e-6 || (Math.abs(ty - best.ty) < 1e-6 && tx < best.tx - 1e-6)) {
        best = { deg: o.deg, tx, ty, oloop: o.loop, _w: o.w, _h: o.h };
      }
    }
  }
  return best;
}

/* =====================================================================
   RENDU DU RÉSULTAT
   ===================================================================== */
function _nestLayer(key) {
  const spec = NEST_LAYERS[key];
  let i = S.layers.findIndex(l => l.name === spec.name);
  if (i < 0) {
    S.layers.push({ name: spec.name, color: spec.color, printColor: '#000000', visible: true, lineWidth: 0.25, lineType: spec.dashed ? 'dashed' : 'solid' });
    i = S.layers.length - 1;
  }
  return i;
}
function _pushLine(x1, y1, x2, y2, layer, lineType) {
  const e = { type: 'line', id: S.nextId++, layer, x1, y1, x2, y2 };
  if (lineType) e.lineType = lineType;
  S.entities.push(e);
}
function _pushRect(x1, y1, x2, y2, layer, lineType) {
  const e = { type: 'rect', id: S.nextId++, layer, x1, y1, x2, y2 };
  if (lineType) e.lineType = lineType;
  S.entities.push(e);
}
function _pushText(x, y, content, size, layer) {
  S.entities.push({ type: 'text', id: S.nextId++, layer, x, y, content: String(content), size: size || 20, font: 'sans-serif' });
}
function _placeClones(part, rotDeg, cellX, cellY, layer) {
  const clones = part.entities.map(e => JSON.parse(JSON.stringify(e)));
  const rad = (rotDeg || 0) * Math.PI / 180;
  if (rotDeg && typeof rotateEntityInPlace === 'function') clones.forEach(c => rotateEntityInPlace(c, 0, 0, rad));
  let mnx = Infinity, mny = Infinity;
  clones.forEach(c => {
    const bb = (typeof getEntityBBox === 'function') ? getEntityBBox(c, true) : null;
    if (bb) { mnx = Math.min(mnx, bb.minX); mny = Math.min(mny, bb.minY); }
  });
  if (!isFinite(mnx)) { mnx = 0; mny = 0; }
  clones.forEach(c => {
    if (typeof offsetEntity === 'function') offsetEntity(c, cellX - mnx, cellY - mny);
    c.id = S.nextId++;
    c.layer = layer;
    S.entities.push(c);
  });
}
function _nestDrawResult(result) {
  const d = _nestData();
  const partsById = {};
  d.parts.forEach(p => (partsById[p.id] = p));

  if (typeof pushUndo === 'function') pushUndo();
  // purge résultat précédent
  const nestIdx = S.layers.map((l, i) => (NEST_LAYER_NAMES.includes(l.name) ? i : -1)).filter(i => i >= 0);
  if (nestIdx.length) S.entities = S.entities.filter(e => !nestIdx.includes(e.layer));

  const Ltole = _nestLayer('tole'), Lpiece = _nestLayer('piece'), Lcut = _nestLayer('cut'), Ltext = _nestLayer('text');
  const params = d.params;

  const dbb = (typeof drawingBBox === 'function') ? drawingBBox() : null;
  let ox = dbb ? dbb.mxx + 250 : 0;
  const oy = dbb ? dbb.mny : 0;
  const GAP = 200;

  let totalSheetArea = 0, totalUsed = 0, nSheets = 0;
  const perFormat = {};

  // Orientation d'affichage : le lot est dessiné en portrait puis, si demandé,
  // pivoté de -90° d'un bloc (textes non tournés → restent lisibles).
  const landscape = !!params.resultLandscape;
  const _batchStart = S.entities.length;

  result.sheets.forEach((sh, si) => {
    const W = sh.format.w, H = sh.format.h;
    const wx = ox, wy = oy;
    nSheets++;
    totalSheetArea += W * H;
    perFormat[sh.format.name] = (perFormat[sh.format.name] || 0) + 1;

    _pushRect(wx, wy, wx + W, wy + H, Ltole);
    _pushRect(wx + params.sheetMargin, wy + params.sheetMargin, wx + W - params.sheetMargin, wy + H - params.sheetMargin, Ltole, 'dashed');

    let sheetUsed = 0;
    const placements = sh.placed || sh.placements || [];
    placements.forEach(pl => {
      const part = partsById[pl.partId];
      if (!part) return;
      sheetUsed += part.area || (part.w * part.h);
      if (result.mode === 'laser') {
        _placeClones(part, pl.rot || 0, wx + pl.tx, wy + pl.ty, Lpiece);
        const c = _polyCentroid(_trPoly(part.loop && part.loop.length >= 3 ? _orient(part.loop, pl.rot || 0).loop : _rectLoop(part.w, part.h), wx + pl.tx, wy + pl.ty));
        _pushText(c[0], c[1], part.label, Math.min(40, Math.max(8, Math.min(part.w, part.h) / 3)), Ltext);
      } else {
        _placeClones(part, pl.rotated ? 90 : 0, wx + pl.x, wy + pl.y, Lpiece);
        const cw = pl.w, ch = pl.h;
        _pushText(wx + pl.x + cw / 2, wy + pl.y + ch / 2, part.label, Math.min(40, Math.max(8, Math.min(cw, ch) / 3)), Ltext);
      }
    });
    // Coupes guillotine numérotées dans l'ordre de la mise en tôle, le numéro
    // reporté à chaque extrémité du trait. Option « bord de tôle seulement » :
    // on ne numérote que les coupes dont une extrémité atteint le pourtour du
    // format complet (coupes traversantes de l'opérateur), pas les recoupes
    // internes. Les traits, eux, sont toujours tous tracés.
    const edgeOnly = !!params.edgeCutsOnly;
    const eTol = params.sheetMargin * 1.5 + 1;
    const onSheetEdge = (lx, ly) => lx <= eTol || lx >= W - eTol || ly <= eTol || ly >= H - eTol;
    let cutNo = 0;
    (sh.cuts || []).forEach(seg => {
      const ax = wx + seg[0], ay = wy + seg[1], bx = wx + seg[2], by = wy + seg[3];
      _pushLine(ax, ay, bx, by, Lcut, 'dashed');
      if (edgeOnly && !(onSheetEdge(seg[0], seg[1]) || onSheetEdge(seg[2], seg[3]))) return;
      cutNo++;
      const label = String(cutNo);
      const sz = 36;
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;          // le long de la coupe
      const px = -uy, py = ux;                  // perpendiculaire
      const along = 34, perp = 18;
      _pushText(ax - ux * along + px * perp, ay - uy * along + py * perp, label, sz, Lcut);
      _pushText(bx + ux * along + px * perp, by + uy * along + py * perp, label, sz, Lcut);
    });

    totalUsed += sheetUsed;
    const waste = W * H > 0 ? (1 - sheetUsed / (W * H)) * 100 : 0;
    _pushText(wx, wy + H + 40, `${sh.format.name}  ·  n°${si + 1}${sh.format.kind === 'chute' ? '  (chute)' : ''}  ·  chute ${waste.toFixed(1)} %`, 26, Ltext);

    ox += W + GAP;
  });

  // --- Rotation d'affichage (paysage) : pivote tout le lot -90° autour de
  //     l'origine puis recadre le coin bas-gauche sur (ax, ay). Les entités
  //     texte n'ont pas d'angle → seul leur ancrage bouge, elles restent à
  //     l'endroit et lisibles.
  const _batchEnd = S.entities.length;
  const ax = dbb ? dbb.mxx + 250 : 0;
  const ay = dbb ? dbb.mny : 0;
  let bMnx = Infinity, bMny = Infinity, bMxx = -Infinity, bMxy = -Infinity;
  for (let i = _batchStart; i < _batchEnd; i++) {
    const e = S.entities[i];
    if (landscape && typeof rotateEntityInPlace === 'function') rotateEntityInPlace(e, 0, 0, -Math.PI / 2);
    const bb = (typeof getEntityBBox === 'function') ? getEntityBBox(e, true) : null;
    if (bb) { bMnx = Math.min(bMnx, bb.minX); bMny = Math.min(bMny, bb.minY); bMxx = Math.max(bMxx, bb.maxX); bMxy = Math.max(bMxy, bb.maxY); }
  }
  if (isFinite(bMnx)) {
    const sdx = ax - bMnx, sdy = ay - bMny;
    if ((sdx || sdy) && typeof offsetEntity === 'function') {
      for (let i = _batchStart; i < _batchEnd; i++) offsetEntity(S.entities[i], sdx, sdy);
    }
    bMnx += sdx; bMny += sdy; bMxx += sdx; bMxy += sdy;
  } else { bMnx = bMny = 0; bMxx = ax; bMxy = ay; }

  // récap — dessiné après recadrage, à droite du lot, toujours à l'endroit
  const globalWaste = totalSheetArea > 0 ? (1 - totalUsed / totalSheetArea) * 100 : 0;
  const lines = [
    `IMBRICATION — ${result.mode === 'laser' ? 'laser (formes)' : 'cisaille (guillotine)'}`,
    `Tôles utilisées : ${nSheets}`,
    ...Object.entries(perFormat).map(([k, v]) => `   ${v} × ${k}`),
    `Surface tôle : ${(totalSheetArea / 1e6).toFixed(3)} m²   ·   pièces : ${(totalUsed / 1e6).toFixed(3)} m²`,
    `Chute globale : ${globalWaste.toFixed(1)} %`,
  ];
  if (result.failed && result.failed.length) lines.push(`⚠ ${result.failed.length} pièce(s) non placée(s)`);
  lines.forEach((ln, i) => _pushText(bMxx + GAP, bMxy - i * 34, ln, 24, Ltext));

  if (typeof updateUI === 'function') updateUI();
  if (typeof render === 'function') render();
  _nestPersist();

  if (typeof termPrint === 'function') {
    lines.forEach(ln => termPrint(ln, 'info'));
    termPrint('Imbrication : résultat dessiné (calques NEST-*). NESTCLR pour l\'effacer.', 'success');
  }
}
function _nestClearResult() {
  const idx = S.layers.map((l, i) => (NEST_LAYER_NAMES.includes(l.name) ? i : -1)).filter(i => i >= 0);
  if (!idx.length) { if (typeof termPrint === 'function') termPrint('Imbrication : aucun résultat à effacer', 'info'); return; }
  if (typeof pushUndo === 'function') pushUndo();
  S.entities = S.entities.filter(e => !idx.includes(e.layer));
  if (typeof render === 'function') render();
  _nestPersist();
  if (typeof termPrint === 'function') termPrint('Imbrication : résultat effacé', 'info');
}

/* =====================================================================
   LANCEMENT
   ===================================================================== */
function _nestRun(pool) {
  const d = _nestData();
  if (!d.parts.length) { if (typeof termPrint === 'function') termPrint('Imbrication : aucune pièce dans la liste', 'warning'); return; }
  if (!pool.length) { if (typeof termPrint === 'function') termPrint('Imbrication : aucun format de tôle sélectionné', 'warning'); return; }

  const instances = [];
  d.parts.forEach(p => { for (let i = 0; i < p.qty; i++) instances.push({ partId: p.id, w: p.w, h: p.h }); });
  if (instances.length > 500) { if (typeof termPrint === 'function') termPrint('Imbrication : trop de pièces (' + instances.length + ' > 500)', 'error'); return; }

  const partsById = {};
  d.parts.forEach(p => (partsById[p.id] = p));

  let result;
  const runParams = _nestEffectiveParams(d);
  if (typeof termPrint === 'function') termPrint(`Imbrication : calcul (${d.mode}, ${instances.length} pièces)…`, 'info');
  try {
    if (d.mode === 'laser') {
      const r = _solveLaser(instances, pool, runParams, partsById);
      result = { mode: 'laser', sheets: r.sheets, failed: r.failed };
    } else {
      const r = _solveShear(instances, pool, runParams);
      result = { mode: 'shear', sheets: r.sheets, failed: r.failed };
    }
  } catch (e) {
    if (typeof termPrint === 'function') termPrint('Imbrication : erreur solveur — ' + (e && e.message || e), 'error');
    console.error(e);
    return;
  }
  if (!result.sheets.length) { if (typeof termPrint === 'function') termPrint('Imbrication : aucune tôle — vérifier que les pièces tiennent dans un format', 'warning'); return; }
  d.lastResult = { mode: result.mode, nSheets: result.sheets.length };
  _nestLastResult = result;
  _nestDrawResult(result);
}

// Bascule l'orientation d'affichage du résultat (portrait ↔ paysage) et
// redessine le dernier résultat si on en a un. La préférence est mémorisée
// même sans résultat courant : la prochaine optimisation la respectera.
function _nestToggleOrientation() {
  const d = _nestData();
  d.params.resultLandscape = !d.params.resultLandscape;
  _nestPersist();
  _nestRenderPanel();
  if (_nestLastResult) _nestDrawResult(_nestLastResult);
  else if (typeof termPrint === 'function')
    termPrint('Imbrication : lance d\'abord une optimisation (affichage ' + (d.params.resultLandscape ? 'paysage' : 'portrait') + ' pré-réglé)', 'info');
}

/* =====================================================================
   INTERFACE — panneau principal
   ===================================================================== */
const NEST_CSS = `
<style>
#nest-panel, #nest-fmt, #nest-run {
  position: fixed; z-index: 953; background: var(--bg-elev, #23262b);
  border: 1px solid color-mix(in srgb, var(--ink, #fff) 15%, transparent);
  border-radius: 8px; box-shadow: 0 12px 48px rgba(0,0,0,0.75);
  font-family: 'IBM Plex Sans', system-ui, sans-serif; color: var(--ink, #eee);
  display: none; flex-direction: column; max-height: 86vh;
}
#nest-panel { top: 104px; right: 210px; width: 330px; }
#nest-fmt   { top: 50%; left: 50%; transform: translate(-50%,-50%); width: 560px; }
#nest-run   { top: 50%; left: 50%; transform: translate(-50%,-50%); width: 420px; }
#nest-panel.show, #nest-fmt.show, #nest-run.show { display: flex; }
.nest-hd { display:flex; align-items:center; justify-content:space-between;
  padding:10px 12px; border-bottom:1px solid color-mix(in srgb,var(--ink,#fff) 10%,transparent);
  font-weight:600; font-size:13px; cursor:move; user-select:none; }
.nest-hd .x { cursor:pointer; opacity:.6; font-size:16px; padding:0 4px; }
.nest-hd .x:hover { opacity:1; }
.nest-in:disabled { opacity:.4; cursor:not-allowed; }
.nest-row label.nest-off { opacity:.4; }
.nest-bd { padding:10px 12px; overflow:auto; display:flex; flex-direction:column; gap:10px; }
.nest-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.nest-row label { font-size:11px; opacity:.75; }
.nest-seg { display:flex; border:1px solid color-mix(in srgb,var(--ink,#fff) 20%,transparent); border-radius:5px; overflow:hidden; }
.nest-seg button { flex:1; background:transparent; border:0; color:var(--ink,#eee); padding:5px 10px; font-size:12px; cursor:pointer; }
.nest-seg button.on { background:var(--accent,#5b8def); color:#fff; }
.nest-in { width:64px; background:var(--input-bg,#1b1e22); border:1px solid color-mix(in srgb,var(--ink,#fff) 20%,transparent);
  border-radius:4px; color:var(--ink,#eee); padding:3px 6px; font-family:'JetBrains Mono',monospace; font-size:12px; text-align:center; }
.nest-btn { background:var(--input-bg,#2a2e33); border:1px solid color-mix(in srgb,var(--ink,#fff) 18%,transparent);
  border-radius:5px; color:var(--ink,#eee); padding:6px 10px; font-size:12px; cursor:pointer; }
.nest-btn:hover { border-color:var(--accent,#5b8def); }
.nest-btn.primary { background:var(--accent,#5b8def); border-color:var(--accent,#5b8def); color:#fff; }
.nest-tbl { width:100%; border-collapse:collapse; font-size:11px; }
.nest-tbl th, .nest-tbl td { text-align:left; padding:4px 6px; border-bottom:1px solid color-mix(in srgb,var(--ink,#fff) 8%,transparent); }
.nest-tbl input { width:58px; background:var(--input-bg,#1b1e22); border:1px solid color-mix(in srgb,var(--ink,#fff) 18%,transparent);
  border-radius:3px; color:var(--ink,#eee); padding:2px 4px; font-family:'JetBrains Mono',monospace; font-size:11px; }
.nest-tbl input.nest-plabel { width:96px; text-align:left; font-family:inherit; }
.nest-tbl input.nest-name { width:118px; text-align:left; font-family:inherit; }
.nest-tbl th.ck, .nest-tbl td.ck { width:26px; text-align:center; }
.nest-tbl td.ck input, .nest-tbl th.ck input { width:auto; }
.nest-tbl .del { cursor:pointer; color:#ff6b6b; opacity:.7; }
.nest-tbl .del:hover { opacity:1; }
.nest-sec { font-size:10px; text-transform:uppercase; letter-spacing:.6px; opacity:.5; margin-top:4px; }
.nest-ft { padding:10px 12px; border-top:1px solid color-mix(in srgb,var(--ink,#fff) 10%,transparent); display:flex; gap:8px; justify-content:flex-end; }
.nest-hint { font-size:10px; opacity:.55; line-height:1.4; }
</style>`;

const NEST_PANEL_HTML = `
<div id="nest-panel">
  <div class="nest-hd"><span>⬒ Imbrication découpe tôle</span><span class="x" onclick="window._nestClose('nest-panel')">×</span></div>
  <div class="nest-bd">
    <div class="nest-row">
      <label>Type de coupe</label>
      <div class="nest-seg" style="flex:1">
        <button data-mode="shear" onclick="window._nestSetMode('shear')">Cisaille</button>
        <button data-mode="laser" onclick="window._nestSetMode('laser')">Laser</button>
      </div>
    </div>
    <div class="nest-hint" id="nest-mode-hint"></div>

    <div class="nest-sec">Formats de tôle</div>
    <div class="nest-row">
      <button class="nest-btn" onclick="window._nestOpenFormats()">Formats de tôle…</button>
      <span class="nest-hint" id="nest-fmt-count"></span>
    </div>

    <div class="nest-sec">Pièces à imbriquer</div>
    <div class="nest-row">
      <button class="nest-btn primary" onclick="window._nestAddSelection()">＋ Ajouter la sélection</button>
      <button class="nest-btn" onclick="window._nestClearParts()">Vider</button>
    </div>
    <table class="nest-tbl" id="nest-parts-tbl"><tbody></tbody></table>

    <div class="nest-sec">Paramètres</div>
    <div class="nest-row">
      <label>Saignée</label><input class="nest-in" id="nest-p-kerf" inputmode="decimal"><span class="nest-hint">mm</span>
      <label>Marge rive</label><input class="nest-in" id="nest-p-margin" inputmode="decimal"><span class="nest-hint">mm</span>
    </div>
    <div class="nest-row">
      <label>Espace pièces</label><input class="nest-in" id="nest-p-gap" inputmode="decimal"><span class="nest-hint">mm</span>
    </div>
    <div class="nest-row">
      <label><input type="checkbox" id="nest-p-rot"> Rotation</label>
      <label>pas</label><input class="nest-in" id="nest-p-step" inputmode="decimal"><span class="nest-hint">° (0–360)</span>
      <button class="nest-btn" onclick="window._nestSetStep(0)">0</button>
      <button class="nest-btn" onclick="window._nestSetStep(90)">90</button>
      <button class="nest-btn" onclick="window._nestSetStep(45)">45</button>
    </div>
    <div class="nest-row">
      <label id="nest-p-grp-lab"><input type="checkbox" id="nest-p-grp"> Grouper par pièce (couper chaque type ensemble)</label>
    </div>
    <div class="nest-row">
      <label id="nest-p-edgecut-lab"><input type="checkbox" id="nest-p-edgecut"> Numéroter seulement les coupes touchant un bord de la tôle</label>
    </div>
    <div class="nest-row">
      <label id="nest-p-cutdir-lab">Coupes traversantes</label>
      <select class="nest-in" id="nest-p-cutdir" style="width:auto">
        <option value="auto">auto (plus grand reste)</option>
        <option value="length">sur la longueur</option>
        <option value="width">sur la largeur</option>
      </select>
    </div>

    <div class="nest-sec">Affichage du résultat</div>
    <div class="nest-row">
      <button class="nest-btn" onclick="window._nestToggleOrientation()">⟳ Portrait / Paysage</button>
      <span class="nest-hint" id="nest-orient-lab"></span>
    </div>
  </div>
  <div class="nest-ft">
    <button class="nest-btn" onclick="window._nestClearResult()">Effacer résultat</button>
    <button class="nest-btn primary" onclick="window._nestOpenRun()">Lancer l'optimisation…</button>
  </div>
</div>`;

const NEST_FMT_HTML = `
<div id="nest-fmt">
  <div class="nest-hd"><span>Formats de tôle</span><span class="x" onclick="window._nestClose('nest-fmt')">×</span></div>
  <div class="nest-bd">
    <div class="nest-sec">1 · Formats standards (fichier .conf)</div>
    <table class="nest-tbl" id="nest-std-tbl"><thead><tr><th class="ck" title="Pris en compte dans l'optimisation">✓</th><th>Nom</th><th>Largeur</th><th>Longueur</th><th></th></tr></thead><tbody></tbody></table>
    <div class="nest-row">
      <button class="nest-btn" onclick="window._nestStdAdd()">＋ Ligne</button>
      <button class="nest-btn" onclick="window._nestStdSave()">Enregistrer</button>
      <button class="nest-btn" onclick="window._nestStdExport()">Exporter .conf</button>
      <button class="nest-btn" onclick="window._nestStdReset()">Réinitialiser</button>
    </div>
    <div class="nest-hint">Colonne <b>✓</b> = format proposé coché dans « Lancer l'optimisation » (mémorisé aussitôt). « Enregistrer » fige nom/dimensions (navigateur) ; « Exporter .conf » télécharge le fichier à replacer dans <code>src/plugins/nesting_formats.conf</code> puis <code>python build.py</code>.</div>

    <div class="nest-sec">2 · Chutes (enregistrées dans le .mcad)</div>
    <table class="nest-tbl" id="nest-chute-tbl"><thead><tr><th>Nom</th><th>Largeur</th><th>Longueur</th><th>Qté</th><th></th></tr></thead><tbody></tbody></table>
    <div class="nest-row">
      <button class="nest-btn" onclick="window._nestChuteAdd()">＋ Ligne</button>
      <button class="nest-btn" onclick="window._nestChuteFromSel()">＋ Depuis la sélection (bbox)</button>
    </div>
  </div>
  <div class="nest-ft"><button class="nest-btn primary" onclick="window._nestClose('nest-fmt')">Fermer</button></div>
</div>`;

const NEST_RUN_HTML = `
<div id="nest-run">
  <div class="nest-hd"><span>Lancer l'optimisation</span><span class="x" onclick="window._nestClose('nest-run')">×</span></div>
  <div class="nest-bd">
    <div class="nest-hint" id="nest-run-mode"></div>
    <div class="nest-sec">Formats standards à utiliser</div>
    <table class="nest-tbl" id="nest-run-std"><tbody></tbody></table>
    <div class="nest-sec">Chutes à utiliser</div>
    <table class="nest-tbl" id="nest-run-chute"><tbody></tbody></table>
    <div class="nest-hint">Cochez les formats à utiliser. Qté vide = disponibilité illimitée (formats standards).</div>
  </div>
  <div class="nest-ft">
    <button class="nest-btn" onclick="window._nestClose('nest-run')">Annuler</button>
    <button class="nest-btn primary" onclick="window._nestDoRun()">Optimiser</button>
  </div>
</div>`;

// ---- helpers UI ----
function _nestEl(id) { return document.getElementById(id); }
function _nestShow(id) { const e = _nestEl(id); if (e) e.classList.add('show'); }
function _nestClose(id) { const e = _nestEl(id); if (e) e.classList.remove('show'); }

// Rend un popup déplaçable en tirant sur son en-tête (.nest-hd). Les dialogues
// centrés utilisent transform:translate(-50%,-50%) — au 1er drag on bascule en
// left/top absolus et on neutralise transform/right pour un déplacement stable.
function _nestMakeDraggable(id) {
  const panel = _nestEl(id); if (!panel) return;
  const hd = panel.querySelector('.nest-hd'); if (!hd || hd._nestDragBound) return;
  hd._nestDragBound = true;
  hd.addEventListener('mousedown', ev => {
    if (ev.button !== 0 || ev.target.closest('.x')) return;   // clic gauche, hors bouton ×
    ev.preventDefault();
    const r = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = r.left + 'px';
    panel.style.top = r.top + 'px';
    const ox = ev.clientX - r.left, oy = ev.clientY - r.top;
    const move = e => {
      const maxX = window.innerWidth - 60, maxY = window.innerHeight - 40;
      panel.style.left = Math.max(0, Math.min(maxX, e.clientX - ox)) + 'px';
      panel.style.top = Math.max(0, Math.min(maxY, e.clientY - oy)) + 'px';
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}
function _nestNum(id, def) {
  const el = _nestEl(id); if (!el) return def;
  const v = (typeof safeEvalMath === 'function' ? safeEvalMath(el.value) : null);
  const n = (v == null || isNaN(v)) ? parseFloat(el.value) : v;
  return (n == null || isNaN(n)) ? def : n;
}

function _nestOpenPanel() {
  _nestLoadStd().then(() => { _nestRenderPanel(); });
  _nestShow('nest-panel');
  _nestRenderPanel();
}
function _nestSetMode(m) {
  const d = _nestData();
  _nestReadParams();                       // fige les saisies en cours (mode actuel)
  d.mode = (m === 'laser') ? 'laser' : 'shear';
  _nestPersist();
  _nestRenderPanel();
}
function _nestSetStep(v) {
  const el = _nestEl('nest-p-step'); if (el) el.value = v;
  const rot = _nestEl('nest-p-rot'); if (rot && v === 0) rot.checked = false; else if (rot) rot.checked = true;
  _nestReadParams();
}
function _nestReadParams() {
  const d = _nestData();
  d.params.sheetMargin = Math.max(0, _nestNum('nest-p-margin', d.params.sheetMargin));
  d.params.rotationStep = Math.max(0, Math.min(360, _nestNum('nest-p-step', d.params.rotationStep)));
  const rot = _nestEl('nest-p-rot'); d.params.allowRotation = rot ? rot.checked : d.params.allowRotation;
  const grp = _nestEl('nest-p-grp'); d.params.groupByPart = grp ? grp.checked : d.params.groupByPart;
  const ec = _nestEl('nest-p-edgecut'); d.params.edgeCutsOnly = ec ? ec.checked : d.params.edgeCutsOnly;
  const cd = _nestEl('nest-p-cutdir'); d.params.cutThrough = cd ? cd.value : (d.params.cutThrough || 'auto');
  // Saignée / espace pièces : ignorés en cisaille (champs à 0 et grisés) — on
  // garde les valeurs laser stockées intactes pour ne pas les perdre au retour.
  if (d.mode !== 'shear') {
    d.params.kerf = Math.max(0, _nestNum('nest-p-kerf', d.params.kerf));
    d.params.partGap = Math.max(0, _nestNum('nest-p-gap', d.params.partGap));
  }
  _nestPersist();
}
// Paramètres effectifs passés au solveur : en cisaille, saignée et espace
// pièces sont forcés à 0 (coupe guillotine bord à bord, sans jeu).
function _nestEffectiveParams(d) {
  return d.mode === 'shear' ? Object.assign({}, d.params, { kerf: 0, partGap: 0 }) : d.params;
}
function _nestClearParts() {
  const d = _nestData();
  if (!d.parts.length) return;
  if (!confirm('Vider la liste des pièces ?')) return;
  d.parts = [];
  _nestPersist();
  _nestRenderPanel();
}
function _nestRenderPanel() {
  const d = _nestData();
  const p = _nestEl('nest-panel'); if (!p) return;
  p.querySelectorAll('.nest-seg button[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === d.mode));
  const hint = _nestEl('nest-mode-hint');
  if (hint) hint.textContent = d.mode === 'laser'
    ? 'Laser : toutes formes. Imbrication vraie (NFP) — sélectionner un contour fermé par pièce.'
    : 'Cisaille : pièces rectangulaires, coupes guillotine bord à bord.';
  const fc = _nestEl('nest-fmt-count');
  if (fc) {
    const nStd = (_nestStd || []).length, nOn = (_nestStd || []).filter(f => f.enabled !== false).length;
    fc.textContent = `${nOn}/${nStd} standard(s) · ${d.chutes.length} chute(s)`;
  }

  const tb = _nestEl('nest-parts-tbl').querySelector('tbody');
  tb.innerHTML = d.parts.length ? '' : '<tr><td colspan="4" class="nest-hint">Aucune pièce. Sélectionnez une forme puis « Ajouter la sélection ».</td></tr>';
  d.parts.forEach((part, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input class="nest-plabel" data-i="${i}" title="Renommer la pièce"></td>
      <td class="nest-hint">${part.w.toFixed(0)}×${part.h.toFixed(0)}${part.approx ? ' <span class="nest-hint">(approx)</span>' : ''}</td>
      <td><input type="number" min="1" value="${part.qty}" data-i="${i}" class="nest-qty"></td>
      <td><span class="del" data-i="${i}">🗑</span></td>`;
    tr.querySelector('.nest-plabel').value = part.label;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('.nest-plabel').forEach(inp => inp.addEventListener('change', e => {
    const i = +e.target.dataset.i;
    const v = e.target.value.trim();
    d.parts[i].label = v || d.parts[i].label;   // jamais de nom vide
    e.target.value = d.parts[i].label;
    _nestPersist();
    if (_nestLastResult && typeof _nestDrawResult === 'function') _nestDrawResult(_nestLastResult);
  }));
  tb.querySelectorAll('.nest-qty').forEach(inp => inp.addEventListener('change', e => {
    const i = +e.target.dataset.i; const v = Math.max(1, Math.round(+e.target.value || 1));
    d.parts[i].qty = v; _nestPersist();
  }));
  tb.querySelectorAll('.del').forEach(x => x.addEventListener('click', e => {
    d.parts.splice(+e.target.dataset.i, 1); _nestPersist(); _nestRenderPanel();
  }));

  const set = (id, v) => { const el = _nestEl(id); if (el && document.activeElement !== el) el.value = v; };
  const shear = d.mode === 'shear';
  set('nest-p-kerf', shear ? 0 : d.params.kerf);
  set('nest-p-margin', d.params.sheetMargin);
  set('nest-p-gap', shear ? 0 : d.params.partGap);
  set('nest-p-step', d.params.rotationStep);
  // Cisaille : saignée + espace pièces à 0 et grisés (non pertinents pour une
  // coupe guillotine bord à bord) ; réactivés en laser.
  ['nest-p-kerf', 'nest-p-gap'].forEach(id => {
    const el = _nestEl(id); if (!el) return;
    el.disabled = shear;
    const lab = el.previousElementSibling;
    if (lab && lab.tagName === 'LABEL') lab.classList.toggle('nest-off', shear);
  });
  const rot = _nestEl('nest-p-rot'); if (rot) rot.checked = !!d.params.allowRotation;
  // « Grouper par pièce » : propre à la cisaille — désactivé et grisé en laser.
  const grp = _nestEl('nest-p-grp');
  if (grp) {
    grp.checked = !!d.params.groupByPart;
    grp.disabled = !shear;
    const gl = _nestEl('nest-p-grp-lab');
    if (gl) gl.classList.toggle('nest-off', !shear);
  }
  // « Coupes de bord seulement » : propre à la cisaille (pas de coupes en laser).
  const ec = _nestEl('nest-p-edgecut');
  if (ec) {
    ec.checked = !!d.params.edgeCutsOnly;
    ec.disabled = !shear;
    const el2 = _nestEl('nest-p-edgecut-lab');
    if (el2) el2.classList.toggle('nest-off', !shear);
  }
  // « Coupes traversantes » : sens de la coupe guillotine primaire — cisaille seulement.
  const cd = _nestEl('nest-p-cutdir');
  if (cd) {
    if (document.activeElement !== cd) cd.value = d.params.cutThrough || 'auto';
    cd.disabled = !shear;
    const cl = _nestEl('nest-p-cutdir-lab');
    if (cl) cl.classList.toggle('nest-off', !shear);
  }
  const ol = _nestEl('nest-orient-lab');
  if (ol) ol.textContent = d.params.resultLandscape ? 'paysage (résultat pivoté)' : 'portrait (feuilles debout)';
}

// ---- gestionnaire de formats ----
function _nestOpenFormats() {
  _nestLoadStd().then(() => { _nestRenderFormats(); _nestShow('nest-fmt'); });
}
function _nestRenderFormats() {
  const d = _nestData();
  const stb = _nestEl('nest-std-tbl') && _nestEl('nest-std-tbl').querySelector('tbody');
  if (stb) {
    stb.innerHTML = '';
    (_nestStd || []).forEach((f, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="ck"><input type="checkbox" data-i="${i}" data-k="enabled" title="Prendre ce format en compte"${f.enabled !== false ? ' checked' : ''}></td>
        <td><input class="nest-name" value="${f.name}" data-i="${i}" data-k="name"></td>
        <td><input type="number" value="${f.width}" data-i="${i}" data-k="width"></td>
        <td><input type="number" value="${f.height}" data-i="${i}" data-k="height"></td>
        <td><span class="del" data-i="${i}">🗑</span></td>`;
      stb.appendChild(tr);
    });
    stb.querySelectorAll('input').forEach(inp => inp.addEventListener('change', e => {
      const i = +e.target.dataset.i, k = e.target.dataset.k;
      if (k === 'enabled') {
        _nestStd[i].enabled = e.target.checked;
        _nestSaveStd(true);            // la sélection est mémorisée aussitôt (silencieux)
        _nestRenderPanel();
      } else {
        _nestStd[i][k] = (k === 'name') ? e.target.value : (+e.target.value || 0);
      }
    }));
    stb.querySelectorAll('.del').forEach(x => x.addEventListener('click', e => { _nestStd.splice(+e.target.dataset.i, 1); _nestRenderFormats(); }));
  }
  const ctb = _nestEl('nest-chute-tbl') && _nestEl('nest-chute-tbl').querySelector('tbody');
  if (ctb) {
    ctb.innerHTML = '';
    d.chutes.forEach((c, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input class="nest-name" value="${c.name}" data-i="${i}" data-k="name"></td>
        <td><input type="number" value="${c.width}" data-i="${i}" data-k="width"></td>
        <td><input type="number" value="${c.height}" data-i="${i}" data-k="height"></td>
        <td><input type="number" value="${c.qty}" data-i="${i}" data-k="qty"></td>
        <td><span class="del" data-i="${i}">🗑</span></td>`;
      ctb.appendChild(tr);
    });
    ctb.querySelectorAll('input').forEach(inp => inp.addEventListener('change', e => {
      const i = +e.target.dataset.i, k = e.target.dataset.k;
      d.chutes[i][k] = (k === 'name') ? e.target.value : (+e.target.value || 0);
      _nestPersist();
    }));
    ctb.querySelectorAll('.del').forEach(x => x.addEventListener('click', e => { d.chutes.splice(+e.target.dataset.i, 1); _nestPersist(); _nestRenderFormats(); _nestRenderPanel(); }));
  }
}
function _nestStdAdd() { if (!_nestStd) _nestStd = []; _nestStd.push({ name: 'Nouveau', width: 1000, height: 2000, enabled: true }); _nestRenderFormats(); }
function _nestStdSave() { _nestStd = _nestNormFormats(_nestStd); _nestSaveStd(); _nestRenderFormats(); _nestRenderPanel(); }
function _nestStdExport() { _nestStd = _nestNormFormats(_nestStd); _nestExportConf(); }
function _nestStdReset() { if (confirm('Réinitialiser les formats standards depuis le fichier .conf livré ?')) _nestResetStd(); }
function _nestChuteAdd() {
  const d = _nestData();
  d.chutes.push({ id: _nestId('chute'), name: 'Chute ' + (d.chutes.length + 1), width: 500, height: 300, qty: 1 });
  _nestPersist(); _nestRenderFormats(); _nestRenderPanel();
}
function _nestChuteFromSel() {
  const d = _nestData();
  const sel = _selEntities().filter(e => e.type !== 'text' && e.type !== 'point');
  if (!sel.length) { if (typeof termPrint === 'function') termPrint('Imbrication : rien de sélectionné', 'warning'); return; }
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  sel.forEach(e => { const bb = getEntityBBox && getEntityBBox(e, true); if (bb) { mnx = Math.min(mnx, bb.minX); mny = Math.min(mny, bb.minY); mxx = Math.max(mxx, bb.maxX); mxy = Math.max(mxy, bb.maxY); } });
  if (!isFinite(mnx)) return;
  d.chutes.push({ id: _nestId('chute'), name: 'Chute ' + (d.chutes.length + 1), width: +(mxx - mnx).toFixed(1), height: +(mxy - mny).toFixed(1), qty: 1 });
  _nestPersist(); _nestRenderFormats(); _nestRenderPanel();
  if (typeof termPrint === 'function') termPrint('Imbrication : chute ajoutée depuis la sélection', 'success');
}

// ---- dialogue de lancement ----
function _nestOpenRun() {
  _nestReadParams();
  _nestLoadStd().then(() => {
    const d = _nestData();
    if (!d.parts.length) { if (typeof termPrint === 'function') termPrint('Imbrication : ajoutez d\'abord des pièces', 'warning'); return; }
    const modeEl = _nestEl('nest-run-mode');
    if (modeEl) modeEl.textContent = 'Mode : ' + (d.mode === 'laser' ? 'laser (imbrication vraie)' : 'cisaille (guillotine)') + ' · ' + d.parts.reduce((s, p) => s + p.qty, 0) + ' pièces';
    const stb = _nestEl('nest-run-std').querySelector('tbody');
    stb.innerHTML = '';
    (_nestStd || []).forEach((f, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><label><input type="checkbox" class="nest-run-std-ck" data-i="${i}"${f.enabled !== false ? ' checked' : ''}> ${f.name}</label></td>
        <td class="nest-hint">${f.width}×${f.height}</td>
        <td><input type="number" class="nest-run-std-q" data-i="${i}" placeholder="∞" style="width:56px"></td>`;
      stb.appendChild(tr);
    });
    const ctb = _nestEl('nest-run-chute').querySelector('tbody');
    ctb.innerHTML = d.chutes.length ? '' : '<tr><td class="nest-hint">Aucune chute.</td></tr>';
    d.chutes.forEach((c, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><label><input type="checkbox" class="nest-run-ch-ck" data-i="${i}" checked> ${c.name}</label></td>
        <td class="nest-hint">${c.width}×${c.height}</td>
        <td><input type="number" class="nest-run-ch-q" data-i="${i}" value="${c.qty}" style="width:56px"></td>`;
      ctb.appendChild(tr);
    });
    _nestShow('nest-run');
  });
}
function _nestGatherPool() {
  const d = _nestData();
  const pool = [];
  document.querySelectorAll('#nest-run-chute .nest-run-ch-ck').forEach(ck => {
    if (!ck.checked) return;
    const i = +ck.dataset.i, c = d.chutes[i];
    const q = parseInt(document.querySelector(`#nest-run-chute .nest-run-ch-q[data-i="${i}"]`).value, 10);
    if (c && c.width > 0 && c.height > 0) pool.push({ name: c.name, w: c.width, h: c.height, qty: Math.max(1, isNaN(q) ? c.qty : q), kind: 'chute' });
  });
  document.querySelectorAll('#nest-run-std .nest-run-std-ck').forEach(ck => {
    if (!ck.checked) return;
    const i = +ck.dataset.i, f = (_nestStd || [])[i];
    const raw = document.querySelector(`#nest-run-std .nest-run-std-q[data-i="${i}"]`).value;
    const q = parseInt(raw, 10);
    if (f && f.width > 0 && f.height > 0) pool.push({ name: f.name, w: f.width, h: f.height, qty: (raw === '' || isNaN(q)) ? 999 : Math.max(1, q), kind: 'std' });
  });
  return pool;
}
function _nestDoRun() {
  _nestReadParams();
  const pool = _nestGatherPool();
  _nestClose('nest-run');
  _nestRun(pool);
}

/* =====================================================================
   ICÔNES + BARRE D'OUTILS
   ===================================================================== */
const NEST_ICONS = {
  panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><rect x="5.5" y="5.5" width="7" height="5"/><rect x="14" y="5.5" width="4.5" height="9"/><rect x="5.5" y="12.5" width="9" height="6"/></svg>',
  add:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="12" height="10" rx="1"/><line x1="19" y1="6" x2="19" y2="14"/><line x1="15" y1="10" x2="23" y2="10"/></svg>',
  fmt:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="7" rx="1"/><rect x="3" y="14" width="10" height="6" rx="1"/></svg>',
  run:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v16H4z"/><path d="M8 8h4v4H8zM13 13h3v3h-3z"/><path d="M8 13h3v3H8z"/></svg>',
  clr:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>',
};

function _nestInjectUI() {
  if (!_nestEl('nest-css-marker')) {
    const s = document.createElement('div');
    s.id = 'nest-css-marker';
    s.innerHTML = NEST_CSS;
    document.body.appendChild(s);
  }
  [NEST_PANEL_HTML, NEST_FMT_HTML, NEST_RUN_HTML].forEach(html => {
    const el = document.createElement('div');
    el.innerHTML = html;
    const node = el.firstElementChild;
    if (node && !_nestEl(node.id)) document.body.appendChild(node);
  });
  ['nest-panel', 'nest-fmt', 'nest-run'].forEach(_nestMakeDraggable);
  // fermeture sur Échap
  if (!window._nestEscBound) {
    window._nestEscBound = true;
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') ['nest-run', 'nest-fmt', 'nest-panel'].forEach(id => {
        const e = _nestEl(id); if (e && e.classList.contains('show')) { e.classList.remove('show'); ev.stopPropagation(); }
      });
    });
  }
}

function _nestBuildToolbar() {
  const dockArea = document.getElementById('dock-area');
  let tb = document.getElementById('tb-nesting');
  if (!tb && dockArea) {
    tb = document.createElement('div');
    tb.className = 'cad-toolbar docked';
    tb.id = 'tb-nesting';
    tb.dataset.name = 'Imbrication';
    tb.innerHTML = `
      <div class="tb-grip" onmousedown="startTBDrag(event,'tb-nesting')" ondblclick="toggleTBDock('tb-nesting')">⋮⋮</div>
      <div class="tb-header" onmousedown="startTBDrag(event,'tb-nesting')" ondblclick="toggleTBDock('tb-nesting')">
        <span class="tb-title">Imbrication</span><span class="tb-close" onclick="hideToolbar('tb-nesting')">×</span>
      </div>
      <div class="tb-buttons"></div>`;
    dockArea.appendChild(tb);
  }
  if (!tb) return;
  const cont = tb.querySelector('.tb-buttons');
  if (!cont) return;
  const ensure = (id, title, cmd, icon) => {
    if (!cont.querySelector(`[data-tbid="${id}"]`))
      cont.insertAdjacentHTML('beforeend',
        `<button class="tool-btn" data-tbid="${id}" title="${title}" onclick="executeCommand('${cmd}')">${icon}</button>`);
  };
  ensure('nest-panel', 'Panneau imbrication (NESTING)', 'NESTING', NEST_ICONS.panel);
  ensure('nest-add', 'Ajouter la sélection (NESTADD)', 'NESTADD', NEST_ICONS.add);
  ensure('nest-fmt', 'Formats de tôle (NESTFMT)', 'NESTFMT', NEST_ICONS.fmt);
  ensure('nest-run', 'Lancer l\'optimisation (NESTRUN)', 'NESTRUN', NEST_ICONS.run);
  ensure('nest-clr', 'Effacer le résultat (NESTCLR)', 'NESTCLR', NEST_ICONS.clr);
  if (typeof TB_REGISTRY === 'object' && TB_REGISTRY) {
    cont.querySelectorAll('[data-tbid]').forEach(btn => {
      TB_REGISTRY[btn.dataset.tbid] = {
        el: btn,
        label: (btn.getAttribute('title') || btn.dataset.tbid).replace(/\s*\(.*?\)\s*$/, '').trim(),
        group: 'Imbrication',
      };
    });
  }
}

// ======== EXPORTS WINDOW (appelés depuis le HTML injecté) ========
window._nestOpenPanel = _nestOpenPanel;
window._nestClose = _nestClose;
window._nestSetMode = _nestSetMode;
window._nestSetStep = _nestSetStep;
window._nestAddSelection = _nestAddSelection;
window._nestClearParts = _nestClearParts;
window._nestOpenFormats = _nestOpenFormats;
window._nestOpenRun = _nestOpenRun;
window._nestDoRun = _nestDoRun;
window._nestClearResult = _nestClearResult;
window._nestStdAdd = _nestStdAdd;
window._nestStdSave = _nestStdSave;
window._nestStdExport = _nestStdExport;
window._nestStdReset = _nestStdReset;
window._nestChuteAdd = _nestChuteAdd;
window._nestChuteFromSel = _nestChuteFromSel;
window._nestReadParams = _nestReadParams;
window._nestEffectiveParams = _nestEffectiveParams;
window._nestData = _nestData;
window._nestRun = _nestRun;
window._nestGatherPool = _nestGatherPool;
window._solveShear = _solveShear;
window._nestToggleOrientation = _nestToggleOrientation;

// ======== PLUGIN ========
window.NESTING_PLUGIN = {
  name: 'nesting',
  version: '1.0.0',
  desc: 'Optimisation de découpe de tôle — imbrication cisaille (guillotine) + laser (NFP)',
  commands: NESTING_COMMANDS,
  init: function () {
    _nestInjectUI();
    Object.assign(CMD, this.commands);
    _nestBuildToolbar();
    _nestLoadStd().then(() => { if (_nestEl('nest-panel')) _nestRenderPanel(); });
    // bind live des champs paramètres
    ['nest-p-kerf', 'nest-p-margin', 'nest-p-gap', 'nest-p-step'].forEach(id => {
      const el = _nestEl(id);
      if (el && !el._nestBound) { el._nestBound = true; el.addEventListener('change', _nestReadParams); }
    });
    ['nest-p-rot', 'nest-p-grp', 'nest-p-edgecut', 'nest-p-cutdir'].forEach(id => {
      const el = _nestEl(id);
      if (el && !el._nestBound) { el._nestBound = true; el.addEventListener('change', _nestReadParams); }
    });
  },
};
