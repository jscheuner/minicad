/* ============================================================
   PLUGIN: CHF_EXPORT (Export découpe laser SC2000 / Au3Tech)
   Commande : EXPORTCHF (alias ECHF)
   Exporte tout ou partie du dessin vers le format .chf lu par le logiciel
   de pilotage laser SC2000. Réglages par objet dans le panneau propriétés :
   Sens (normal/inversé), Compensation (mm), Point de départ (auto ou
   repositionné manuellement sur le contour, contours fermés seulement).
   Format .chf rétro-ingénierié à partir d'un fichier d'exemple fourni par
   l'utilisateur (aucune documentation publique) — voir suivi/CHANGELOG.md
   pour les réserves connues (sens sur cercle, compensation, points de
   départ non-défaut sur cercle : non confirmés sur machine réelle).
   ============================================================ */

// ======== COMMANDES ========
const CHF_EXPORT_COMMANDS = {
  EXPORTCHF: {
    alias: ['ECHF'],
    desc: 'Exporter vers un fichier .chf (découpe laser SC2000)',
    exec: function () { openChfExportDialog(); }
  },
  CHFCOMP: {
    alias: [],
    desc: 'Compenser auto (extérieur/intérieur) les objets sélectionnés',
    exec: function () { _chfApplyCompensationToSelection(); }
  },
  CHFREV: {
    alias: [],
    desc: 'Inverser le sens de coupe des objets sélectionnés',
    exec: function () { _chfToggleReverseSelection(); }
  },
  CHFSTART: {
    alias: [],
    desc: 'Choisir le point de départ manuel (amorce) sur le contour',
    exec: function () { _chfStartManualFromToolbar(); }
  },
  CHFSTARTAUTO: {
    alias: [],
    desc: 'Appliquer automatiquement la longueur/angle d\'amorce (champs toolbar) aux objets sélectionnés',
    exec: function () { _chfStartAutoApply(); }
  }
};

// ======== TYPES SUPPORTÉS ========
const CHF_SUPPORTED_TYPES = ['line', 'wall', 'rect', 'circle', 'arc', 'polyline', 'cable', 'spline', 'ellipse'];

// Tolérance de corde pour la tessellation des arcs/cercles/ellipses (mm),
// cohérente avec la constante 0.100000 observée sur chaque graphe de l'exemple.
const CHF_CHORD_TOL = 0.1;
function _chfArcSegCount(r, span, tol) {
  if (r <= 0) return 1;
  const dtheta = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - tol / r)));
  return Math.max(1, Math.ceil(Math.abs(span) / dtheta));
}
function _chfSegsToPoints(segs) {
  if (!segs || !segs.length) return [];
  const pts = [[segs[0][0], segs[0][1]]];
  for (const s of segs) pts.push([s[2], s[3]]);
  return pts;
}

// ======== RÉSOLUTION DE CONTOUR (partagée picking + export) ========
// Retourne {native:'circle', cx, cy, r} pour un cercle (ou un arc couvrant ~2π),
// ou {points:[[x,y]...], closed} pour tout le reste. Ne duplique jamais le point
// de fermeture dans `points` — le dernier segment d'un contour fermé est implicite
// (points[n-1] → points[0]), convention uniforme dans tout le plugin.
function _chfResolveContour(e) {
  switch (e.type) {
    case 'circle':
      return { native: 'circle', cx: e.cx, cy: e.cy, r: e.r };
    case 'arc': {
      const sa = e.startAngle;
      let ea = e.endAngle;
      while (ea < sa) ea += Math.PI * 2;
      if (Math.abs((ea - sa) - Math.PI * 2) < 1e-6) {
        return { native: 'circle', cx: e.cx, cy: e.cy, r: e.r };
      }
      const segs = _arcSampleSegs(e.cx, e.cy, e.r, sa, ea, _chfArcSegCount(e.r, ea - sa, CHF_CHORD_TOL));
      return { points: _chfSegsToPoints(segs), closed: false };
    }
    case 'line':
    case 'wall':
      return { points: [[e.x1, e.y1], [e.x2, e.y2]], closed: false };
    case 'rect': {
      const x1 = Math.min(e.x1, e.x2), x2 = Math.max(e.x1, e.x2);
      const y1 = Math.min(e.y1, e.y2), y2 = Math.max(e.y1, e.y2);
      return { points: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], closed: true };
    }
    case 'polyline':
    case 'cable': {
      if (!e.points || e.points.length < 2) return null;
      const p = e.points;
      // Convention cœur (cf. _propChangeClosed) : une polyligne/cable fermé(e) peut
      // dupliquer le 1er point en fin de tableau, en plus (ou à la place) du drapeau
      // `closed`. On détecte les deux signaux comme le fait _updatePropertiesSingle.
      const dup = p.length > 2 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 1e-9;
      const closedNow = e.closed === true || dup;
      let pts = flattenPolyPoints(dup ? p.slice(0, -1) : p, closedNow);
      if (pts.length > 1) {
        const a = pts[0], b = pts[pts.length - 1];
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) pts = pts.slice(0, -1);
      }
      return { points: pts, closed: closedNow };
    }
    case 'spline': {
      if (!e.points || e.points.length < 2) return null;
      return { points: catmullRom(e.points, !!e.closed, 16), closed: !!e.closed };
    }
    case 'ellipse': {
      const sa = e.startAngle || 0;
      const full = e.endAngle == null;
      let ea = full ? sa + Math.PI * 2 : e.endAngle;
      while (ea < sa) ea += Math.PI * 2;
      const closed = full || Math.abs((ea - sa) - Math.PI * 2) < 1e-6;
      const segs = ellipseSampleSegs({ cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry, ang: e.angle || 0, sa, ea }, 96);
      return { points: _chfSegsToPoints(segs), closed };
    }
    default:
      return null;
  }
}

// Point le plus proche de (qx,qy) sur le contour réel de l'entité — utilisé par le
// picking manuel du point de départ (handleClick, cœur) ET par le ré-ancrage d'un
// _chfStartPoint existant avant export (voir _chfOrderContourPoints). Exposé sur
// window : appelé depuis le handler intégré `handleClick` (scope différent).
window._chfNearestPointOnEntity = function (e, qx, qy) {
  const c = _chfResolveContour(e);
  if (!c) return null;
  if (c.native === 'circle') {
    const a = Math.atan2(qy - c.cy, qx - c.cx);
    return [c.cx + c.r * Math.cos(a), c.cy + c.r * Math.sin(a)];
  }
  const pts = c.points;
  if (!pts || !pts.length) return null;
  if (pts.length === 1) return [pts[0][0], pts[0][1]];
  const n = pts.length;
  const segCount = c.closed ? n : n - 1;
  let best = null, bestD = Infinity;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const p = projectOnSeg(qx, qy, a[0], a[1], b[0], b[1]);
    if (!p) continue;
    const d = Math.hypot(qx - p[0], qy - p[1]);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
};

// Le bouton « Point de départ » n'a de sens que sur un contour fermé (rect, circle
// toujours ; arc/ellipse pleins ; polyline/cable/spline fermé(e)s) — sur un contour
// ouvert, le départ est déjà entièrement déterminé par Sens.
function _chfSupportsStartPoint(e) {
  if (e.type === 'rect' || e.type === 'circle') return true;
  if (!CHF_SUPPORTED_TYPES.includes(e.type)) return false;
  const c = _chfResolveContour(e);
  return !!(c && (c.native === 'circle' || c.closed));
}

// ======== COMPENSATION AUTO (extérieur/intérieur selon imbrication) ========
// Point représentatif d'un contour résolu, pour les tests d'imbrication.
function _chfRepPoint(c) {
  if (c.native === 'circle') return [c.cx + c.r, c.cy];
  return c.points && c.points[0] ? [c.points[0][0], c.points[0][1]] : null;
}
function _chfPointInContour(qx, qy, c) {
  if (c.native === 'circle') return Math.hypot(qx - c.cx, qy - c.cy) < c.r;
  return pointInPolygon(qx, qy, c.points);
}
// Profondeur d'imbrication = nombre d'AUTRES contours (parmi `resolved`) qui contiennent
// le point représentatif de `target`. 0 = le plus extérieur.
function _chfNestDepth(target, resolved) {
  const p = _chfRepPoint(target.c);
  if (!p) return 0;
  let depth = 0;
  for (const other of resolved) {
    if (other === target) continue;
    if (_chfPointInContour(p[0], p[1], other.c)) depth++;
  }
  return depth;
}

// Applique la compensation (champ toolbar data-tbid="chf-comp-value") aux objets sélectionnés :
// signe déterminé automatiquement par la profondeur d'imbrication au sein de la sélection
// (data-tbid="chf-comp-mode" : "alt" = alterné à chaque niveau, "binary" = extérieur seulement
// si non imbriqué du tout). Contours ouverts (pas de notion d'intérieur/extérieur) ignorés.
// Ré-exécuter réécrit _chfCompensation : pas de cumul, la nouvelle valeur remplace l'ancienne.
function _chfApplyCompensationToSelection() {
  if (!S.selected.length) {
    S._chfCompPending = true; setTool('select');
    termPrint('CHFCOMP : sélectionner les objets à compenser, puis Entrée', 'warning'); return;
  }
  S._chfCompPending = false;

  const valInput = document.querySelector('[data-tbid="chf-comp-value"]');
  const mag = Math.abs(parseFloat(valInput && valInput.value)) || 0;
  if (!mag) { termPrint('CHF : entrez un décalage non nul dans le champ Compensation', 'warning'); return; }

  const modeSel = document.querySelector('[data-tbid="chf-comp-mode"]');
  const alternating = !modeSel || modeSel.value !== 'binary'; // "alt" = défaut

  const all = S.selected.map(id => S.entities.find(e => e.id === id)).filter(Boolean);
  const closed = all.filter(e => CHF_SUPPORTED_TYPES.includes(e.type) && _chfSupportsStartPoint(e));
  const resolved = closed.map(e => ({ e, c: _chfResolveContour(e) })).filter(r => r.c);
  if (!resolved.length) { termPrint('CHF : aucun contour fermé supporté dans la sélection', 'warning'); return; }

  pushUndo();
  resolved.forEach(target => {
    const depth = _chfNestDepth(target, resolved);
    const outward = alternating ? (depth % 2 === 0) : (depth === 0);
    target.e._chfCompensation = outward ? mag : -mag;
  });
  render(); autoSave(); updateProperties();

  const skipped = all.length - resolved.length;
  termPrint('CHF : compensation ' + mag + ' mm appliquée à ' + resolved.length + ' objet(s)' +
            (skipped ? ' (' + skipped + ' ignoré(s), contour ouvert)' : ''), 'success');
}

// ======== PANNEAU PROPRIÉTÉS (additif — pluginExtraPropsHandler[Multi]) ========
// Helpers exposés sur window : appelés depuis les onchange/onclick inline générés
// dans le HTML injecté par le cœur (c.innerHTML = h), donc hors du scope local du
// plugin — même contrainte que _gradPropReverse dans gradrule.js.

function _chfRevSelect(id, reverse) {
  return '<select class="prop-select" onchange="_chfPropReverse(' + id + ',this.value)">' +
    '<option value="false"' + (!reverse ? ' selected' : '') + '>Normal</option>' +
    '<option value="true"' + (reverse ? ' selected' : '') + '>Inversé</option></select>';
}

window._chfPropReverse = function (id, val) {
  const e = S.entities.find(en => en.id === id);
  if (!e) return;
  pushUndo();
  e._chfReverse = (val === 'true' || val === true);
  render(); autoSave();
};

window._chfPropReverseMulti = function (val) {
  const ents = S.selected.map(id => S.entities.find(e => e.id === id)).filter(Boolean);
  if (!ents.length) return;
  pushUndo();
  const rev = (val === 'true' || val === true);
  ents.forEach(e => { e._chfReverse = rev; });
  render(); autoSave(); updateProperties();
};

// Bouton toolbar CHFREV : inverse individuellement le Sens de chaque objet
// sélectionné (contrairement à _chfPropReverseMulti qui FORCE tous les objets à
// une même valeur choisie dans le select du panneau propriétés) — chacun bascule
// son propre état courant, comme MIRROR bascule chaque objet indépendamment.
function _chfToggleReverseSelection() {
  const ents = S.selected.map(id => S.entities.find(e => e.id === id))
    .filter(e => e && CHF_SUPPORTED_TYPES.includes(e.type));
  if (!ents.length) { termPrint('CHF : sélectionnez des objets pour inverser le sens de coupe', 'warning'); return; }
  pushUndo();
  ents.forEach(e => { e._chfReverse = !e._chfReverse; });
  render(); autoSave(); updateProperties();
  termPrint('CHF : sens de coupe inversé sur ' + ents.length + ' objet(s)', 'success');
}

window._chfPropCompensationMulti = function (val) {
  const n = parseFloat(val);
  if (isNaN(n)) return;
  const ents = S.selected.map(id => S.entities.find(e => e.id === id)).filter(Boolean);
  if (!ents.length) return;
  pushUndo();
  ents.forEach(e => { e._chfCompensation = n; });
  render(); autoSave(); updateProperties();
};

window._chfPropLeadLengthMulti = function (val) {
  const n = parseFloat(val);
  if (isNaN(n)) return;
  const ents = S.selected.map(id => S.entities.find(e => e.id === id)).filter(Boolean);
  if (!ents.length) return;
  pushUndo();
  ents.forEach(e => { e._chfLeadLength = n; });
  render(); autoSave(); updateProperties();
};

window._chfPropLeadAngleMulti = function (val) {
  const n = parseFloat(val);
  if (isNaN(n)) return;
  const ents = S.selected.map(id => S.entities.find(e => e.id === id)).filter(Boolean);
  if (!ents.length) return;
  pushUndo();
  ents.forEach(e => { e._chfLeadAngle = n; });
  render(); autoSave(); updateProperties();
};

// Arme le picking : le clic suivant est intercepté par la branche `chf_startpoint`
// de handleClick (cœur), qui pose e._chfStartPoint et rafraîchit le panneau.
window._chfPickStartPoint = function (id) {
  S._chfPickTargetId = id;
  setTool('chf_startpoint');
  termPrint('CHF : cliquez un point sur le contour de l\'objet #' + id + ' (Échap pour annuler)', 'info');
};

window._chfClearStartPoint = function (id) {
  const e = S.entities.find(en => en.id === id);
  if (!e) return;
  pushUndo();
  delete e._chfStartPoint;
  render(); autoSave(); updateProperties();
};

// Bouton toolbar CHFSTART : raccourci vers le même picking que le bouton ⌖ du
// panneau propriétés (_chfPickStartPoint), sans avoir besoin d'ouvrir le panneau —
// nécessite exactement UN objet sélectionné, à contour supporté. Rien sélectionné
// → arme _chfStartPending (même patron que CHFCOMP/WBLOCK : bascule sur l'outil
// select standard, donc carré de sélection/fenêtre/croisement disponibles tels
// quels, Entrée relance cette même fonction une fois la sélection faite).
function _chfStartManualFromToolbar() {
  const ents = S.selected.map(id => S.entities.find(e => e.id === id)).filter(Boolean);
  if (!ents.length) {
    S._chfStartPending = true; setTool('select');
    termPrint('CHFSTART : sélectionner l\'objet (clic ou fenêtre), puis Entrée', 'info');
    return;
  }
  if (ents.length !== 1) { termPrint('CHF : sélectionnez un seul objet pour choisir son point de départ', 'warning'); return; }
  const e = ents[0];
  if (!CHF_SUPPORTED_TYPES.includes(e.type) || !_chfSupportsStartPoint(e)) {
    termPrint('CHF : ce type de contour ne supporte pas de point de départ manuel', 'warning'); return;
  }
  window._chfPickStartPoint(e.id);
}

// Centre d'un contour rond/rectangulaire résolu (seuls cas où « centre » est non
// ambigu — cf. _chfStartAutoApply) : trivial pour un cercle natif ; moyenne des 4
// sommets pour un rect (exact, un rect étant centro-symétrique — pas la formule
// générale de centroïde de polygone, volontairement pas nécessaire ici).
function _chfHoleCenter(e, c) {
  if (c.native === 'circle') return [c.cx, c.cy];
  if (e.type !== 'rect' || !c.points || !c.points.length) return null;
  let cx = 0, cy = 0;
  for (const p of c.points) { cx += p[0]; cy += p[1]; }
  return [cx / c.points.length, cy / c.points.length];
}

// Bouton toolbar CHFSTARTAUTO : applique en lot la longueur/angle d'amorce
// saisis dans les champs toolbar (data-tbid="chf-start-length"/"chf-start-angle")
// à tous les objets sélectionnés — version batch, typée, de ce que le flux manuel
// (picking point de départ + 2e clic, voir handleClick coeur) fait objet par objet
// à la souris. Même patron que _chfApplyCompensationToSelection (CHFCOMP) : rien
// sélectionné → arme _chfStartAutoPending et bascule sur l'outil select.
// Angle : détection trou/extérieur par profondeur d'imbrication, EXACTEMENT le
// mécanisme de CHFCOMP (_chfNestDepth + mode toolbar data-tbid="chf-comp-mode",
// partagé — pas de second sélecteur redondant). Un objet rond ou rectangulaire
// détecté « trou » (imbriqué) ignore l'angle toolbar et pointe automatiquement vers
// son propre centre (perce dans la zone rebut plutôt que dans la matière conservée) ;
// un objet « extérieur » (non imbriqué), ou d'un autre type, garde l'angle toolbar.
function _chfStartAutoApply() {
  if (!S.selected.length) {
    S._chfStartAutoPending = true; setTool('select');
    termPrint('CHFSTARTAUTO : sélectionner les objets, puis Entrée', 'warning'); return;
  }
  S._chfStartAutoPending = false;

  const lenInput = document.querySelector('[data-tbid="chf-start-length"]');
  const angInput = document.querySelector('[data-tbid="chf-start-angle"]');
  const len = parseFloat(lenInput && lenInput.value);
  const ang = parseFloat(angInput && angInput.value);
  if (isNaN(len) || len < 0) { termPrint('CHF : entrez une longueur d\'amorce valide (≥ 0) dans le champ dédié', 'warning'); return; }

  const ents = S.selected.map(id => S.entities.find(e => e.id === id))
    .filter(e => e && CHF_SUPPORTED_TYPES.includes(e.type));
  if (!ents.length) { termPrint('CHF : aucun objet supporté dans la sélection', 'warning'); return; }

  const modeSel = document.querySelector('[data-tbid="chf-comp-mode"]');
  const alternating = !modeSel || modeSel.value !== 'binary'; // "alt" = défaut
  const resolved = ents.filter(_chfSupportsStartPoint).map(e => ({ e, c: _chfResolveContour(e) })).filter(r => r.c);

  pushUndo();
  const angVal = isNaN(ang) ? 0 : ang;
  let holeCount = 0;
  ents.forEach(e => {
    e._chfLeadLength = len;
    let a = angVal;
    const target = (e.type === 'circle' || e.type === 'rect') && resolved.find(r => r.e === e);
    if (target) {
      const depth = _chfNestDepth(target, resolved);
      const outward = alternating ? (depth % 2 === 0) : (depth === 0);
      if (!outward) {
        const center = _chfHoleCenter(e, target.c);
        const entry = _chfEntryPoint(e, target.c);
        if (center && entry) { a = Math.atan2(center[1] - entry[1], center[0] - entry[0]) * 180 / Math.PI; holeCount++; }
      }
    }
    e._chfLeadAngle = a;
  });
  render(); autoSave(); updateProperties();
  termPrint(holeCount
    ? 'CHF : amorce (' + len + ' mm) appliquée à ' + ents.length + ' objet(s) — ' + holeCount + ' trou(s) : angle auto vers le centre, autres : ' + angVal + '°'
    : 'CHF : amorce (' + len + ' mm, ' + angVal + '°) appliquée à ' + ents.length + ' objet(s)', 'success');
}

function _chfExtraRowsSingle(e, ctx) {
  const { row, inp, id } = ctx;
  let h = '<div class="chf-prop-sep">Export CHF</div>';
  h += row('Sens', _chfRevSelect(id, e._chfReverse));
  h += row('Compensation (mm)', inp('_chfCompensation', (e._chfCompensation ?? 0).toFixed(3)));
  h += row('Longueur amorce (mm)', inp('_chfLeadLength', (e._chfLeadLength ?? 0).toFixed(3)));
  h += row('Angle amorce (°)', inp('_chfLeadAngle', (e._chfLeadAngle ?? 0).toFixed(3)));
  if (_chfSupportsStartPoint(e)) {
    const sp = e._chfStartPoint;
    const label = sp ? (sp.x.toFixed(2) + ', ' + sp.y.toFixed(2)) : 'Auto (défaut)';
    h += row('Point de départ', '<div class="ar-pick-row">' +
      '<input class="ar-input" type="text" readonly value="' + label + '">' +
      '<button class="ar-pick-btn" type="button" title="Choisir sur le contour" onclick="_chfPickStartPoint(' + id + ')">⌖</button>' +
      '<button class="ar-pick-btn" type="button" title="Réinitialiser (défaut auto)" onclick="_chfClearStartPoint(' + id + ')">↺</button>' +
      '</div>');
  }
  return h;
}

function _chfExtraRowsMulti(ents, ctx) {
  const { row } = ctx;
  const revVals = ents.map(e => !!e._chfReverse);
  const revCommon = revVals.every(v => v === revVals[0]) ? revVals[0] : null;
  const compVals = ents.map(e => e._chfCompensation ?? 0);
  const compCommon = compVals.every(v => v === compVals[0]) ? compVals[0] : null;

  let h = '<div class="chf-prop-sep">Export CHF</div>';
  h += row('Sens', '<select class="prop-select" onchange="_chfPropReverseMulti(this.value)">' +
    (revCommon === null ? '<option value="" disabled selected>*Valeurs différentes*</option>' : '') +
    '<option value="false"' + (revCommon === false ? ' selected' : '') + '>Normal</option>' +
    '<option value="true"' + (revCommon === true ? ' selected' : '') + '>Inversé</option></select>');
  const differs = compCommon === null;
  h += row('Compensation (mm)', '<input type="number" class="prop-input" step="any"' +
    (differs ? ' style="color:var(--text-dim);font-style:italic" placeholder="*Valeurs différentes*"' : '') +
    ' value="' + (differs ? '' : compCommon.toFixed(3)) + '"' +
    ' onchange="_chfPropCompensationMulti(this.value)" />');

  const leadLenVals = ents.map(e => e._chfLeadLength ?? 0);
  const leadLenCommon = leadLenVals.every(v => v === leadLenVals[0]) ? leadLenVals[0] : null;
  const leadLenDiffers = leadLenCommon === null;
  h += row('Longueur amorce (mm)', '<input type="number" class="prop-input" step="any"' +
    (leadLenDiffers ? ' style="color:var(--text-dim);font-style:italic" placeholder="*Valeurs différentes*"' : '') +
    ' value="' + (leadLenDiffers ? '' : leadLenCommon.toFixed(3)) + '"' +
    ' onchange="_chfPropLeadLengthMulti(this.value)" />');

  const leadAngVals = ents.map(e => e._chfLeadAngle ?? 0);
  const leadAngCommon = leadAngVals.every(v => v === leadAngVals[0]) ? leadAngVals[0] : null;
  const leadAngDiffers = leadAngCommon === null;
  h += row('Angle amorce (°)', '<input type="number" class="prop-input" step="any"' +
    (leadAngDiffers ? ' style="color:var(--text-dim);font-style:italic" placeholder="*Valeurs différentes*"' : '') +
    ' value="' + (leadAngDiffers ? '' : leadAngCommon.toFixed(3)) + '"' +
    ' onchange="_chfPropLeadAngleMulti(this.value)" />');
  return h;
}

const CHF_EXTRA_PROPS_HANDLERS = {};
const CHF_EXTRA_PROPS_HANDLERS_MULTI = {};
CHF_SUPPORTED_TYPES.forEach(t => {
  CHF_EXTRA_PROPS_HANDLERS[t] = _chfExtraRowsSingle;
  CHF_EXTRA_PROPS_HANDLERS_MULTI[t] = _chfExtraRowsMulti;
});

// ======== ORDONNANCEMENT DU CONTOUR (Sens + Point de départ) ========
function _chfRotateArray(pts, idx) {
  if (idx <= 0 || idx >= pts.length) return pts.slice();
  return pts.slice(idx).concat(pts.slice(0, idx));
}

// Fait démarrer le contour fermé `pts` exactement en `p` (déjà re-projeté sur la
// géométrie courante par l'appelant) : rotation simple si p coïncide avec un sommet
// existant, sinon insertion du point projeté exact (pas d'arrondi sur un sommet voisin).
function _chfStartAtPoint(pts, p) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) < 1e-6) return _chfRotateArray(pts, i);
  }
  let bestI = -1, bestD = Infinity, bestPt = null;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const proj = projectOnSeg(p[0], p[1], a[0], a[1], b[0], b[1]);
    if (!proj) continue;
    const d = Math.hypot(p[0] - proj[0], p[1] - proj[1]);
    if (d < bestD) { bestD = d; bestI = i; bestPt = proj; }
  }
  if (bestI < 0) return pts.slice();
  return [bestPt].concat(_chfRotateArray(pts, bestI + 1));
}

// Applique Point de départ (si fermé + défini) puis Sens sur la liste de points
// résolue. Le point de départ est préservé sous inversion : seule la direction de
// parcours change (reverse "direction-preservant", pas une inversion brute du tableau).
function _chfOrderContourPoints(e, contour) {
  let pts = contour.points.slice();
  if (contour.closed && e._chfStartPoint) {
    const sp = _chfNearestPointOnEntity(e, e._chfStartPoint.x, e._chfStartPoint.y);
    if (sp) pts = _chfStartAtPoint(pts, sp);
  }
  if (e._chfReverse) {
    pts = contour.closed ? [pts[0]].concat(pts.slice(1).reverse()) : pts.slice().reverse();
  }
  return pts;
}

function _chfCircleStart(e, contour) {
  let ang = 0;
  if (e._chfStartPoint) ang = Math.atan2(e._chfStartPoint.y - contour.cy, e._chfStartPoint.x - contour.cx);
  return {
    x: contour.cx + contour.r * Math.cos(ang),
    y: contour.cy + contour.r * Math.sin(ang),
    dir: e._chfReverse ? -1 : 1
  };
}

// ======== GRAMMAIRE .chf ========
function _chfNum(n) {
  const s = n.toFixed(6);
  return s === '-0.000000' ? '0.000000' : s;
}
function _chfPt(x, y) { return _chfNum(x) + ',' + _chfNum(y); }

// Blocs hors-périmètre de la demande (PWM / Cool Point) : recopiés verbatim
// depuis l'exemple fourni, aucune UI dédiée.
const CHF_TAIL_HEAD = '<PWM Control>\n1\n0\n0\n<End PWM Control>\n0.0\n0.0\n';
const CHF_TAIL_FOOT = '<coolPos Para>\n0\n<End coolPos Para>';

// Bloc <GuideCurve Para> ("Lead Line"/amorce hors-pièce) : dans l'exemple fourni
// (1 seul graphe exploité, hors-périmètre de la demande initiale), ce bloc valait
// verbatim `1 / 90.000000 / 4.000000 / 1.000000 / 0`. RÉSERVE FORTE (mapping non
// confirmé, un seul point de donnée) : on suppose ligne 2 = angle (°), ligne 3 =
// longueur (mm), ligne 5 = flag actif/inactif (0/1) — cohérent avec les 2 valeurs
// qui ressemblent à un angle et une longueur, mais jamais vérifié contre plusieurs
// graphes différents ni contre une machine réelle (contrairement aux autres champs
// du format, recoupés sur les 38 graphes de l'exemple). Piloté par _chfLeadLength/
// _chfLeadAngle (mm/°, UI dédiée : panneau propriétés + prévisualisation en
// pointillé) : longueur 0 (défaut) → bloc désactivé, valeurs figées comme avant.
function _chfBuildGuideCurve(e) {
  const len = e._chfLeadLength || 0;
  if (!len) return '<GuideCurve Para>\n1\n90.000000\n4.000000\n1.000000\n0\n<End GuideCurve Para>\n';
  const ang = e._chfLeadAngle || 0;
  return '<GuideCurve Para>\n1\n' + _chfNum(ang) + '\n' + _chfNum(len) + '\n1.000000\n1\n<End GuideCurve Para>\n';
}

// Construit le texte d'un bloc-graphe pour une entité, ou null si l'entité n'a pas
// de contour exploitable (type non résolu, contour dégénéré...).
function _chfBuildGraph(e, idx) {
  const contour = _chfResolveContour(e);
  if (!contour) return null;
  const comp = e._chfCompensation || 0;

  let totalLen = 0, minX, minY, maxX, maxY, startPt, endPt;
  const glyBlocks = [];

  if (contour.native === 'circle') {
    const st = _chfCircleStart(e, contour);
    totalLen = 2 * Math.PI * contour.r;
    minX = contour.cx - contour.r; minY = contour.cy - contour.r;
    maxX = contour.cx + contour.r; maxY = contour.cy + contour.r;
    startPt = [st.x, st.y]; endPt = [st.x, st.y];
    glyBlocks.push({ dir: st.dir, type: 4, cx: contour.cx, cy: contour.cy, r: contour.r });
  } else {
    const pts = _chfOrderContourPoints(e, contour);
    if (!pts || pts.length < 2) return null;
    const n = pts.length;
    const segCount = contour.closed ? n : n - 1;
    minX = maxX = pts[0][0]; minY = maxY = pts[0][1];
    for (const p of pts) {
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }
    for (let i = 0; i < segCount; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d < 1e-9) continue;
      totalLen += d;
      glyBlocks.push({ dir: 1, type: 2, x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
    }
    if (!glyBlocks.length) return null;
    startPt = [glyBlocks[0].x1, glyBlocks[0].y1];
    endPt = [glyBlocks[glyBlocks.length - 1].x2, glyBlocks[glyBlocks.length - 1].y2];
    // Bbox élargie de ±compensation (non-cercle uniquement) — comportement observé
    // sur l'exemple (graph NO:5 : nominal [8,8]-[356,356] → déclaré ±0.25 exact).
    minX -= comp; minY -= comp; maxX += comp; maxY += comp;
  }

  const lines = [];
  lines.push('####graph NO:' + idx);
  lines.push('8');
  lines.push('0.100000');
  lines.push('<Glyphs>');
  lines.push(_chfNum(totalLen));
  lines.push(_chfPt(minX, minY));
  lines.push(_chfPt(maxX, maxY));
  lines.push(_chfPt(startPt[0], startPt[1]));
  lines.push(_chfPt(endPt[0], endPt[1]));
  lines.push(String(glyBlocks.length));
  glyBlocks.forEach((g, i) => {
    lines.push('####Gly: ' + (i + 1));
    lines.push(String(g.dir));
    lines.push(String(g.type));
    if (g.type === 4) { lines.push(_chfPt(g.cx, g.cy)); lines.push(_chfNum(g.r)); }
    else { lines.push(_chfPt(g.x1, g.y1)); lines.push(_chfPt(g.x2, g.y2)); }
  });
  lines.push('<End Glyphs>');
  lines.push('0');
  lines.push(contour.native === 'circle' ? '2' : '1'); // code craft : 2 = cercle natif, 1 sinon
  lines.push('<Crafts>');
  lines.push('1');
  lines.push(_chfNum(comp));
  lines.push(CHF_TAIL_HEAD + _chfBuildGuideCurve(e) + CHF_TAIL_FOOT);
  lines.push('<End Crafts>');
  return lines.join('\n');
}

function chfBuildFileContent(ents) {
  const graphs = [];
  let idx = 0;
  for (const e of ents) {
    const g = _chfBuildGraph(e, idx + 1);
    if (g) { graphs.push(g); idx++; }
  }
  const lines = ['scFlie', '5', '<Begin Graphs>', String(graphs.length)];
  if (graphs.length) lines.push(graphs.join('\n'));
  lines.push('<End Graphs>', '0', '0.0', '0.000000,0.000000', '0.000000,0.000000', 'eof');
  return lines.join('\n') + '\n';
}

// ======== PORTÉE (sélection / dessin, aplatissement des blocs) ========
function _chfFlattenScope(ents, depth) {
  const out = [];
  for (const e of ents) {
    if (e.type === 'insert') {
      if (depth < 5) {
        const children = insertWorldEntities(e);
        if (children && children.length) out.push(..._chfFlattenScope(children, depth + 1));
      }
      continue;
    }
    if (CHF_SUPPORTED_TYPES.includes(e.type)) out.push(e);
  }
  return out;
}

function _chfGatherScope(scope) {
  const src = scope === 'drawing'
    ? S.entities
    : S.selected.map(id => S.entities.find(e => e.id === id)).filter(Boolean);
  return _chfFlattenScope(src, 0);
}

// ======== DIALOGUE D'EXPORT ========
// Boutons câblés via addEventListener (initChfDialogButtons, appelé une seule fois
// à l'injection) plutôt qu'en onclick inline : contrairement au panneau propriétés
// (re-généré à chaque sélection, donc obligatoirement câblé via window.*), ce
// dialogue est injecté une seule fois et reste en place — même patron que le popup
// de gradrule (initGradPopupButtons), pas besoin d'exposer ces handlers sur window.
const CHF_DIALOG_HTML = `
<style>
#chf-export-dialog {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
  background: var(--bg-elev); border: 1px solid color-mix(in srgb, var(--ink) 13%, transparent); border-radius: 8px;
  z-index: 952; width: 320px; box-shadow: 0 12px 48px rgba(0,0,0,0.8);
  font-family: 'IBM Plex Sans', sans-serif; display: none; flex-direction: column;
}
.chf-prop-sep {
  margin-top: 6px; padding: 8px 0 2px; border-top: 1px solid color-mix(in srgb, var(--ink) 9%, transparent);
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px;
  color: color-mix(in srgb, var(--ink) 33%, transparent);
}
.chf-comp-input {
  height: 28px; margin: 0 2px; padding: 0 6px; border-radius: 4px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; text-align: center;
  background: var(--bg-elev); color: var(--ink);
  border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
}
input.chf-comp-input { width: 56px; }
</style>
<div id="chf-export-dialog">
  <div class="ar-header">
    <span>Export CHF (découpe laser)</span>
    <span class="lm-close" id="chf-close-x">×</span>
  </div>
  <div class="ar-body" style="grid-template-columns:1fr">
    <div class="ar-group">
      <div class="ar-label">Portée</div>
      <select id="chf-scope" class="ar-input">
        <option value="selection">Sélection courante</option>
        <option value="drawing">Tout le dessin</option>
      </select>
    </div>
    <div class="ar-group">
      <div class="ar-label">Fichier</div>
      <div class="ar-pick-row">
        <input id="chf-path" class="ar-input" type="text" readonly placeholder="(nom par défaut à l'enregistrement)">
        <button class="ar-pick-btn" type="button" id="chf-pick-path" title="Choisir l'emplacement">📁</button>
      </div>
    </div>
  </div>
  <div class="ar-info" id="chf-info"></div>
  <div class="ar-footer">
    <button class="ar-btn cancel" type="button" id="chf-cancel-btn">Annuler</button>
    <button class="ar-btn ok" type="button" id="chf-ok-btn">Exporter</button>
  </div>
</div>`;

function _chfDialogOpen() {
  const d = document.getElementById('chf-export-dialog');
  return !!d && d.style.display === 'flex';
}

function openChfExportDialog() {
  const d = document.getElementById('chf-export-dialog');
  if (!d) return;
  const scopeSel = document.getElementById('chf-scope');
  const pathInp = document.getElementById('chf-path');
  if (pathInp) pathInp.value = '';
  S._chfSaveHandle = null;
  if (scopeSel) scopeSel.value = (S.selected && S.selected.length) ? 'selection' : 'drawing';
  d.style.display = 'flex';
  _chfScopeChanged();
}

function closeChfExportDialog() {
  const d = document.getElementById('chf-export-dialog');
  if (d) d.style.display = 'none';
}

function _chfScopeChanged() {
  const scope = document.getElementById('chf-scope').value;
  const ents = _chfGatherScope(scope);
  const info = document.getElementById('chf-info');
  const okBtn = document.getElementById('chf-ok-btn');
  if (info) info.textContent = ents.length + ' objet(s) exportable(s)';
  if (okBtn) okBtn.disabled = ents.length === 0;
}

// Bouton « Chemin » : pré-sélectionne la destination (comme wbPickPath pour WBLOCK).
async function chfPickPath() {
  if (!('showSaveFilePicker' in window)) {
    termPrint('Choix de l\'emplacement non disponible dans ce navigateur — le fichier sera téléchargé dans le dossier de téléchargements.', 'warning');
    return;
  }
  try {
    const fh = await window.showSaveFilePicker({
      suggestedName: currentDrawingBaseName('export') + '.chf',
      types: [{ description: 'Fichier CHF (SC2000)', accept: { 'application/octet-stream': ['.chf'] } }]
    });
    S._chfSaveHandle = fh;
    const pathInp = document.getElementById('chf-path');
    if (pathInp) pathInp.value = fh.name;
  } catch (err) {
    if (err && err.name !== 'AbortError') termPrint('Erreur de sélection du fichier : ' + (err.message || err.name), 'error');
  }
}

async function confirmChfExportDialog() {
  const scope = document.getElementById('chf-scope').value;
  const ents = _chfGatherScope(scope);
  if (!ents.length) { termPrint('CHF : aucun objet exportable dans la portée choisie', 'warning'); return; }
  const content = chfBuildFileContent(ents);
  const baseName = currentDrawingBaseName('export');
  const savedName = await saveWithPicker(content, baseName, 'chf', 'application/octet-stream', 'Fichier CHF (SC2000)', S._chfSaveHandle);
  S._chfSaveHandle = null;
  if (savedName) {
    termPrint('CHF : ' + ents.length + ' objet(s) exporté(s) vers ' + savedName, 'success');
    closeChfExportDialog();
  }
}

function initChfDialogButtons() {
  const closeX = document.getElementById('chf-close-x');
  const cancelBtn = document.getElementById('chf-cancel-btn');
  const okBtn = document.getElementById('chf-ok-btn');
  const pickBtn = document.getElementById('chf-pick-path');
  const scopeSel = document.getElementById('chf-scope');
  if (closeX) closeX.addEventListener('click', closeChfExportDialog);
  if (cancelBtn) cancelBtn.addEventListener('click', closeChfExportDialog);
  if (okBtn) okBtn.addEventListener('click', confirmChfExportDialog);
  if (pickBtn) pickBtn.addEventListener('click', chfPickPath);
  if (scopeSel) scopeSel.addEventListener('change', _chfScopeChanged);
}

document.addEventListener('mousedown', (ev) => {
  const d = document.getElementById('chf-export-dialog');
  if (_chfDialogOpen() && !d.contains(ev.target)) closeChfExportDialog();
}, true);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && _chfDialogOpen()) { closeChfExportDialog(); ev.preventDefault(); }
});

// ======== ICÔNE TOOLBAR ========
const CHF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4"/><circle cx="12" cy="15" r="3.2"/><line x1="12" y1="10.5" x2="12" y2="8.2"/></svg>';
const CHF_COMP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="11" height="11" rx="1"/><rect x="9" y="9" width="12" height="12" rx="1" stroke-dasharray="2.2 2"/></svg>';
const CHF_REV_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12a8 8 0 0 1 14-5"/><path d="M20 12a8 8 0 0 1-14 5"/><path d="M15 4l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 20l-3-3 3-3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHF_START_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="14" cy="12" r="7" stroke-dasharray="2.2 2"/><path d="M2 12h10" stroke-linecap="round"/><path d="M8 8l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHF_START_AUTO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="15" r="6" stroke-dasharray="2.2 2"/><path d="M2 15h5" stroke-linecap="round"/><path d="M5 12l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 3.5l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1z" stroke-linejoin="round"/></svg>';

// ======== FLÈCHES DE SENS (prévisualisation du fantôme CHFCOMP) ========
// Quelques points échantillonnés par index le long du contour résolu du fantôme
// (_chfResolveContour, même fonction que pour le calcul d'imbrication) : tangente =
// direction vers le point suivant, inversée si _chfReverse. Le cercle n'a pas de
// tableau de points, traité à part avec des angles réguliers.
function _chfArrowSamples(contour) {
  if (contour.native === 'circle') {
    // Convention interne (CCW = angle croissant = "sens normal") : aucun autre code
    // n'attache de signification CW/CCW à `dir` sur un cercle (réserve déjà connue,
    // non confirmée sur machine réelle) — ce qui compte ici est que la flèche
    // s'inverse bien avec Sens, pas le CW/CCW absolu.
    return [0, 1, 2].map(i => {
      const a = (i / 3) * Math.PI * 2;
      return { x: contour.cx + contour.r * Math.cos(a), y: contour.cy + contour.r * Math.sin(a), tangent: a + Math.PI / 2 };
    });
  }
  const pts = contour.points;
  if (!pts || pts.length < 2) return [];
  const n = pts.length;
  const count = contour.closed ? 3 : Math.min(2, n - 1);
  const samples = [];
  for (let k = 0; k < count; k++) {
    const i = Math.floor((k / count) * (contour.closed ? n : n - 1));
    const a = pts[i], b = pts[(i + 1) % n];
    samples.push({ x: a[0], y: a[1], tangent: Math.atan2(b[1] - a[1], b[0] - a[0]) });
  }
  return samples;
}
// w2s applique une échelle uniforme + inversion de Y (pas de rotation) : l'angle écran
// correspondant à un angle monde `a` est donc simplement -a.
function _chfDrawDirArrow(x, y, worldTangent, reverse) {
  const ang = reverse ? worldTangent + Math.PI : worldTangent;
  const screenAng = -ang;
  const [tx, ty] = w2s(x, y);
  const d = 30;
  drawArrowHead(tx - d * Math.cos(screenAng), ty - d * Math.sin(screenAng), tx, ty, 21);
}
function _chfDrawDirectionArrows(ghost, reverse) {
  const contour = _chfResolveContour(ghost);
  if (!contour) return;
  _chfArrowSamples(contour).forEach(p => _chfDrawDirArrow(p.x, p.y, p.tangent, reverse));
}

// ======== AMORCE DE DÉPART (départ hors-pièce, entrée dans la pièce) ========
// Point d'entrée réel = même calcul que _chfBuildGraph (_chfCircleStart / point[0]
// de _chfOrderContourPoints, qui applique déjà Point de départ manuel + Sens) —
// réutilisé tel quel pour que la prévisualisation ne puisse jamais diverger de ce
// qui sera effectivement exporté.
function _chfEntryPoint(e, contour) {
  if (contour.native === 'circle') {
    const st = _chfCircleStart(e, contour);
    return [st.x, st.y];
  }
  const pts = _chfOrderContourPoints(e, contour);
  return (pts && pts.length) ? pts[0] : null;
}

// Amorce = segment de _chfLeadLength mm, à _chfLeadAngle° (monde, 0°=+X, CCW+),
// partant du point d'entrée VERS l'extérieur (hors-pièce) — le laser parcourt ce
// segment en sens inverse (extérieur → entrée) pour "rentrer dans la pièce" avant
// de suivre le contour, cf. demande utilisateur.
function _chfLeadInGeom(e) {
  const len = e._chfLeadLength || 0;
  if (!len) return null;
  const contour = _chfResolveContour(e);
  if (!contour) return null;
  const entry = _chfEntryPoint(e, contour);
  if (!entry) return null;
  const ang = (e._chfLeadAngle || 0) * Math.PI / 180;
  const outside = [entry[0] + len * Math.cos(ang), entry[1] + len * Math.sin(ang)];
  return { entry, outside };
}

// Repère "carré + croix" au point de percée (extrémité de l'amorce opposée à la
// flèche — celle-ci pointe déjà vers l'entrée dans le contour, cf. _chfDrawLeadInPreview).
// Trait plein (dash remis à zéro localement) pour rester lisible sur un petit symbole,
// même si la ligne d'amorce sous-jacente est pointillée.
function _chfDrawStartMarker(x, y, ctx) {
  const s = 7;
  ctx.save();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.rect(x - s, y - s, s * 2, s * 2);
  ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
  ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
  ctx.stroke();
  ctx.restore();
}

function _chfDrawLeadInPreview(e, ctx) {
  const lead = _chfLeadInGeom(e);
  if (!lead) return;
  const [ex, ey] = w2s(lead.entry[0], lead.entry[1]);
  const [ox, oy] = w2s(lead.outside[0], lead.outside[1]);
  ctx.save();
  ctx.globalAlpha = 0.85; ctx.lineWidth = 1.25; ctx.setLineDash([5, 3]);
  ctx.strokeStyle = S.layers[e.layer]?.color || '#00d4ff';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
  drawArrowHead(ox, oy, ex, ey, 21);
  _chfDrawStartMarker(ox, oy, ctx);
  ctx.restore();
}

// ======== EXPORT PLUGIN ========
window.CHF_EXPORT_PLUGIN = {
  name: 'chf_export',
  version: '1.0.0',
  desc: 'Export .chf pour découpe laser SC2000 (Au3Tech)',
  commands: CHF_EXPORT_COMMANDS,
  extraPropsHandlers: CHF_EXTRA_PROPS_HANDLERS,
  extraPropsHandlersMulti: CHF_EXTRA_PROPS_HANDLERS_MULTI,
  html: CHF_DIALOG_HTML,
  // Prévisualisation en pointillé du contour compensé (hook cœur pluginDecorateEntity,
  // appelé après chaque drawEntity() aux 2 couches de rendu). Recalculée à chaque appel
  // depuis la géométrie courante : jamais stockée, reste donc synchrone après une édition.
  decorateEntity: function (e, ctx) {
    if (!CHF_SUPPORTED_TYPES.includes(e.type)) return;
    // Fantôme de compensation (+ flèches de sens) : indépendant de l'amorce ci-dessous,
    // les deux prévisualisations peuvent coexister sur le même objet.
    if (e._chfCompensation) {
      const bbox = getEntityBBox(e);
      if (bbox) {
        // Point de référence loin à l'extérieur de la bbox → computeOffsetGeom résout
        // toujours un signe interne +1, donc dist=e._chfCompensation signé pilote seul
        // agrandir/rétrécir.
        const refX = bbox.minX - 1e7, refY = bbox.minY - 1e7;
        const ghost = computeOffsetGeom(e, e._chfCompensation, refX, refY);
        if (ghost) {
          ctx.save();
          ctx.globalAlpha = 0.75; ctx.lineWidth = 1.25; ctx.setLineDash([5, 3]);
          ctx.strokeStyle = S.layers[e.layer]?.color || '#00d4ff';
          ctx.fillStyle = ctx.strokeStyle;
          try {
            drawEntity(ghost);
            _chfDrawDirectionArrows(ghost, e._chfReverse);
          } finally { ctx.restore(); }
        }
      }
    }
    if (e._chfLeadLength) _chfDrawLeadInPreview(e, ctx);
  },
  init: function () {
    // Injecter le dialogue (deux nœuds racine <style>+<div> → boucle sur tous les
    // enfants, contrairement à gradrule.js qui n'a qu'un seul nœud à ajouter).
    if (!document.getElementById('chf-export-dialog')) {
      const container = document.body;
      const el = document.createElement('div');
      el.innerHTML = this.html;
      while (el.firstChild) container.appendChild(el.firstChild);
      initChfDialogButtons();
    }
    Object.assign(CMD, this.commands);

    // Barre d'outils : gérer la « coquille vide » que _tbApplyLayout peut avoir
    // recréée depuis un layout sauvegardé avant que ce plugin ne s'enregistre
    // (même piège que gradrule.js:762-806).
    const dockArea = document.getElementById('dock-area');
    let tb = document.getElementById('tb-chf-export');
    if (!tb && dockArea) {
      tb = document.createElement('div');
      tb.className = 'cad-toolbar docked';
      tb.id = 'tb-chf-export';
      tb.dataset.name = 'Export laser';
      tb.innerHTML = `
        <div class="tb-grip" onmousedown="startTBDrag(event,'tb-chf-export')" ondblclick="toggleTBDock('tb-chf-export')">⋮⋮</div>
        <div class="tb-header" onmousedown="startTBDrag(event,'tb-chf-export')" ondblclick="toggleTBDock('tb-chf-export')">
          <span class="tb-title">Export laser</span><span class="tb-close" onclick="hideToolbar('tb-chf-export')">×</span>
        </div>
        <div class="tb-buttons"></div>`;
      dockArea.appendChild(tb);
    }
    if (tb) {
      const cont = tb.querySelector('.tb-buttons');
      if (cont) {
        if (!cont.querySelector('[data-tbid="chf-export"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<button class="tool-btn" data-tbid="chf-export" title="Export CHF (EXPORTCHF)" onclick="executeCommand('EXPORTCHF')">${CHF_ICON}</button>`);
        }
        if (!cont.querySelector('[data-tbid="chf-comp-mode"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<select class="chf-comp-input" data-tbid="chf-comp-mode" title="Règle d'imbrication (compensation auto + amorce trous CHFSTARTAUTO)">
               <option value="alt" selected>Alterné</option>
               <option value="binary">Binaire</option>
             </select>`);
        }
        if (!cont.querySelector('[data-tbid="chf-comp-value"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<input type="text" class="chf-comp-input" data-tbid="chf-comp-value" placeholder="mm"
                    title="Décalage compensation (mm)"
                    onkeydown="if(event.key==='Enter'){executeCommand('CHFCOMP');event.preventDefault();}">`);
        }
        if (!cont.querySelector('[data-tbid="chf-comp-apply"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<button class="tool-btn" data-tbid="chf-comp-apply" title="Appliquer compensation (CHFCOMP)" onclick="executeCommand('CHFCOMP')">${CHF_COMP_ICON}</button>`);
        }
        if (!cont.querySelector('[data-tbid="chf-rev-toggle"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<button class="tool-btn" data-tbid="chf-rev-toggle" title="Inverser le sens de coupe (CHFREV)" onclick="executeCommand('CHFREV')">${CHF_REV_ICON}</button>`);
        }
        if (!cont.querySelector('[data-tbid="chf-start-pick"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<button class="tool-btn" data-tbid="chf-start-pick" title="Point de départ manuel (CHFSTART)" onclick="executeCommand('CHFSTART')">${CHF_START_ICON}</button>`);
        }
        if (!cont.querySelector('[data-tbid="chf-start-length"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<input type="text" class="chf-comp-input" data-tbid="chf-start-length" value="5" placeholder="mm"
                    title="Longueur d'amorce auto (mm)"
                    onkeydown="if(event.key==='Enter'){executeCommand('CHFSTARTAUTO');event.preventDefault();}">`);
        }
        if (!cont.querySelector('[data-tbid="chf-start-angle"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<input type="text" class="chf-comp-input" data-tbid="chf-start-angle" value="90" placeholder="°"
                    title="Angle d'amorce auto (°)"
                    onkeydown="if(event.key==='Enter'){executeCommand('CHFSTARTAUTO');event.preventDefault();}">`);
        }
        if (!cont.querySelector('[data-tbid="chf-start-auto"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<button class="tool-btn" data-tbid="chf-start-auto" title="Amorce auto sur la sélection (CHFSTARTAUTO)" onclick="executeCommand('CHFSTARTAUTO')">${CHF_START_AUTO_ICON}</button>`);
        }
        if (typeof TB_REGISTRY === 'object' && TB_REGISTRY) {
          cont.querySelectorAll('[data-tbid]').forEach(btn => {
            const id = btn.dataset.tbid;
            TB_REGISTRY[id] = { el: btn,
              label: (btn.getAttribute('title') || id).replace(/\s*\(.*?\)\s*$/, '').trim(),
              group: 'Export laser' };
          });
        }
      }
    }
  }
};
