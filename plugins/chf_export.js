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

// ======== COMPENSATION (valeur uniforme sur la sélection) ========
// Applique la valeur signée du champ toolbar (data-tbid="chf-comp-value") telle quelle à TOUS
// les objets à contour fermé de la sélection — plus de détection auto extérieur/trou.
// Retour terrain SC2000 réel (2026-08-27, export.chf vs export_corrigé.chf, ce dernier
// redécoupé et confirmé bon par l'utilisateur) : la version précédente inversait
// automatiquement le signe pour les objets détectés « trou » par profondeur d'imbrication
// (+mag extérieur / -mag intérieur). Le fichier de référence validé sur machine montre au
// contraire la MÊME valeur signée sur le contour extérieur et les 4 trous imbriqués
// (0.200000 partout, jamais -0.200000) — l'inversion auto était une hypothèse de conception
// non vérifiée, invalidée par ce test réel. Le champ toolbar n'est donc plus une magnitude
// (Math.abs) : le signe tapé par l'utilisateur est appliqué tel quel à toute la sélection.
// Contours ouverts (pas de notion d'intérieur/extérieur, donc pas de compensation exploitable)
// ignorés. Ré-exécuter réécrit _chfCompensation : pas de cumul, la nouvelle valeur remplace
// l'ancienne.
function _chfApplyCompensationToSelection() {
  if (!S.selected.length) {
    S._chfCompPending = true; setTool('select');
    termPrint('CHFCOMP : sélectionner les objets à compenser, puis Entrée', 'warning'); return;
  }
  S._chfCompPending = false;

  const valInput = document.querySelector('[data-tbid="chf-comp-value"]');
  const val = parseFloat(valInput && valInput.value);
  if (!val) { termPrint('CHF : entrez un décalage non nul dans le champ Compensation', 'warning'); return; }

  const targets = S.selected.map(id => S.entities.find(e => e.id === id))
    .filter(e => e && CHF_SUPPORTED_TYPES.includes(e.type) && _chfSupportsStartPoint(e));
  if (!targets.length) { termPrint('CHF : aucun contour fermé supporté dans la sélection', 'warning'); return; }

  pushUndo();
  targets.forEach(e => { e._chfCompensation = val; });
  render(); autoSave(); updateProperties();

  const skipped = S.selected.length - targets.length;
  termPrint('CHF : compensation ' + val + ' mm appliquée à ' + targets.length + ' objet(s)' +
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

// Bouton toolbar CHFSTARTAUTO : applique en lot la longueur/angle d'amorce saisis dans les
// champ toolbar (data-tbid="chf-start-length") à tous les objets sélectionnés
// — version batch, typée, de ce que le flux manuel (picking point de départ + 2e clic, voir
// handleClick coeur) fait objet par objet à la souris. Même patron que
// _chfApplyCompensationToSelection (CHFCOMP) : rien sélectionné → arme _chfStartAutoPending et
// bascule sur l'outil select.
// Angle appliqué tel quel à TOUS les objets, y compris cercles/rectangles. Retour terrain
// SC2000 réel (2026-08-27, export.chf vs export_corrigé.chf, ce dernier redécoupé et confirmé
// bon par l'utilisateur) : la version précédente pointait automatiquement l'amorce des trous
// détectés (cercle/rect en profondeur d'imbrication impaire) vers leur propre centre, angle
// recalculé au lieu de l'angle toolbar. Le fichier de référence validé sur machine montre au
// contraire l'angle toolbar brut (90°) sur les 4 trous, jamais un angle recalculé — le
// pointage auto vers le centre était une hypothèse de conception non vérifiée, invalidée par
// ce test réel.
function _chfStartAutoApply() {
  if (!S.selected.length) {
    S._chfStartAutoPending = true; setTool('select');
    termPrint('CHFSTARTAUTO : sélectionner les objets, puis Entrée', 'warning'); return;
  }
  S._chfStartAutoPending = false;

  const lenInput = document.querySelector('[data-tbid="chf-start-length"]');
  const len = parseFloat(lenInput && lenInput.value);
  if (isNaN(len) || len < 0) { termPrint('CHF : entrez une longueur d\'amorce valide (≥ 0) dans le champ dédié', 'warning'); return; }

  const ents = S.selected.map(id => S.entities.find(e => e.id === id))
    .filter(e => e && CHF_SUPPORTED_TYPES.includes(e.type));
  if (!ents.length) { termPrint('CHF : aucun objet supporté dans la sélection', 'warning'); return; }

  pushUndo();
  // Seule la LONGUEUR est appliquée : la direction est calculée par objet
  // (_chfAutoLeadAngle), à l'affichage comme à l'export. Plus aucun angle stocké.
  ents.forEach(e => {
    e._chfLeadLength = len;
    delete e._chfLeadAngle;
    delete e._chfLeadManual;
  });
  render(); autoSave(); updateProperties();
  termPrint('CHF : amorce ' + len + ' mm (direction auto) appliquée à ' + ents.length + ' objet(s)', 'success');
}

function _chfExtraRowsSingle(e, ctx) {
  const { row, inp, id } = ctx;
  let h = '<div class="chf-prop-sep">Export CHF</div>';
  h += row('Sens', _chfRevSelect(id, e._chfReverse));
  h += row('Compensation (mm)', inp('_chfCompensation', (e._chfCompensation ?? 0).toFixed(3)));
  h += row('Longueur amorce (mm)', inp('_chfLeadLength', (e._chfLeadLength ?? 0).toFixed(3)));
  // Pas de champ Angle : la direction est calculée par le plugin (_chfAutoLeadAngle),
  // affichée ici en lecture seule pour information.
  if (e._chfLeadLength) {
    h += row('Direction amorce', '<input class="ar-input" type="text" readonly value="' +
      _chfAutoLeadAngle(e).toFixed(1) + '° (auto)">');
  }
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

  // Pas de champ Angle en multi-sélection non plus : chaque objet reçoit sa propre
  // direction calculée (_chfAutoLeadAngle), il n'y a rien à saisir en commun.
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

// Aire signée du contour fermé (monde Y-haut) : > 0 = tableau ordonné en anti-horaire.
function _chfSignedArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

// Sens de PARCOURS effectif : +1 = anti-horaire, -1 = horaire. Combine l'orientation
// intrinsèque du contour résolu et le drapeau _chfReverse. Sur un cercle il n'y a pas
// d'orientation intrinsèque : `dir` de _chfCircleStart fait foi (+1 = CCW).
function _chfTravelCCW(e, contour) {
  const base = contour.native === 'circle' ? 1 : (_chfSignedArea(contour.points) >= 0 ? 1 : -1);
  return e._chfReverse ? -base : base;
}

// Point de départ PAR DÉFAUT d'un contour EXTÉRIEUR fermé — demande utilisateur
// (2026-08-27) : « pour les amorces extérieur j'aimerai qu'elle soit mise plutôt en haut
// à gauche pour le sens anti-horaire et en bas à gauche pour le sens horaire ». Règle
// unique : point du contour le plus proche du coin HAUT-GAUCHE (CCW) ou BAS-GAUCHE (CW)
// de sa bbox — sur un rectangle ça tombe exactement sur le coin, sur un cercle sur la
// diagonale (135° / 225°), sur un polygone quelconque sur le sommet le plus proche
// (jamais un point inséré au milieu d'une arête : le sommet donne la bissectrice
// diagonale que _chfIdealLeadAngle sait dégager proprement).
// Deux exclusions volontaires :
//   - un _chfStartPoint posé à la main (clic, CHFSTART) reste prioritaire — régression
//     déjà vécue en retour terrain, un point choisi ne doit jamais être recalculé ;
//   - les TROUS gardent leur comportement d'origine, la demande ne vise que l'extérieur.
// Ce choix est cohérent avec le fichier natif SC2000 (laser_6mm.chf), dont les contours
// à amorce activée démarrent tous au coin haut-gauche.
function _chfDefaultStartPoint(e, contour) {
  if (_chfIsHole(_chfNestDepth(e))) return null;
  const ccw = _chfTravelCCW(e, contour) > 0;
  if (contour.native === 'circle') {
    const a = ccw ? 3 * Math.PI / 4 : -3 * Math.PI / 4;
    return [contour.cx + contour.r * Math.cos(a), contour.cy + contour.r * Math.sin(a)];
  }
  const pts = contour.points;
  if (!pts || pts.length < 2) return null;
  let minX = Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const ty = ccw ? maxY : minY;
  let best = null, bestD = Infinity;
  for (const p of pts) {
    const d = Math.hypot(p[0] - minX, p[1] - ty);
    if (d < bestD - 1e-9) { bestD = d; best = p; }
  }
  return best ? [best[0], best[1]] : null;
}

// Applique Point de départ (si fermé : manuel s'il existe, sinon le défaut haut/bas-gauche
// ci-dessus pour un extérieur) puis Sens sur la liste de points résolue. Le point de départ
// est préservé sous inversion : seule la direction de parcours change (reverse
// "direction-preservant", pas une inversion brute du tableau).
function _chfOrderContourPoints(e, contour) {
  let pts = contour.points.slice();
  if (contour.closed) {
    const sp = e._chfStartPoint
      ? _chfNearestPointOnEntity(e, e._chfStartPoint.x, e._chfStartPoint.y)
      : _chfDefaultStartPoint(e, contour);
    if (sp) pts = _chfStartAtPoint(pts, sp);
  }
  if (e._chfReverse) {
    pts = contour.closed ? [pts[0]].concat(pts.slice(1).reverse()) : pts.slice().reverse();
  }
  return pts;
}

function _chfCircleStart(e, contour) {
  let ang = 0;
  if (e._chfStartPoint) {
    ang = Math.atan2(e._chfStartPoint.y - contour.cy, e._chfStartPoint.x - contour.cx);
  } else {
    const d = _chfDefaultStartPoint(e, contour);
    if (d) ang = Math.atan2(d[1] - contour.cy, d[0] - contour.cx);
  }
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

// Bloc <GuideCurve Para> ("Lead Line"/amorce hors-pièce) :
//   ligne 2 = angle (°), ligne 3 = longueur (mm), ligne 5 = flag actif/inactif (0/1).
// L'angle est RELATIF à la direction de parcours au point d'entrée, PAS absolu — voir la
// démonstration détaillée au-dessus de _chfExportLeadAngle (fichier natif SC2000 laser_6mm.chf :
// 90.000000 sur 38 graphes de formes toutes différentes ; export_corrigé.chf validé machine :
// 90.000000 sur les 4 trous ; notre ancien export, mauvais à la coupe : l'angle absolu écrit
// tel quel). Ça referme la réserve #4 sur le mapping du bloc.
// Piloté par _chfLeadLength (longueur en mm) + _chfExportLeadAngle (direction calculée) :
// longueur 0 (défaut) → bloc désactivé, valeurs figées comme avant.
function _chfBuildGuideCurve(e) {
  const len = e._chfLeadLength || 0;
  if (!len) return '<GuideCurve Para>\n1\n90.000000\n4.000000\n1.000000\n0\n<End GuideCurve Para>\n';
  // Angle recalculé à l'export depuis la MÊME direction absolue que l'aperçu
  // (_chfAutoLeadAngle) et non lu depuis un champ stocké : le champ Angle a été supprimé de
  // l'UI sur demande (« enlève le choix de l'angle, c'est au plugin de trouver la meilleure
  // solution »). Le recalcul au moment de l'export garantit aussi qu'un objet déplacé/pivoté
  // après coup exporte une amorce toujours cohérente avec sa position réelle.
  const ang = _chfExportLeadAngle(e);
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

// ======== DÉTECTION D'IMBRICATION (aperçu uniquement, n'affecte jamais l'export) ========
// Sert UNIQUEMENT à orienter visuellement le fantôme de compensation (decorateEntity, plus
// bas) : un trou détecté doit visuellement RÉTRÉCIR vers son centre (compensation "contre
// l'intérieur") même quand sa valeur _chfCompensation est numériquement identique à celle du
// contour extérieur qui le contient. Retour terrain SC2000 réel (2026-08-27) : export_corrigé.chf
// (redécoupé et confirmé bon) garde bien la MÊME valeur signée pour le carré extérieur et ses 4
// trous — mais le rendu MiniCAD, lui, doit quand même montrer le pointillé rétrécir pour un trou
// et grossir pour l'extérieur, sans quoi l'aperçu contredit visuellement ce que fera la machine
// (probablement une compensation relative au sens de parcours du contour côté SC2000, pas à un
// signe absolu). CHFCOMP/_chfApplyCompensationToSelection n'appelle RIEN de cette section : la
// valeur écrite dans le fichier .chf reste celle tapée par l'utilisateur, appliquée telle quelle,
// uniformément, quelle que soit la profondeur d'imbrication réelle.
function _chfRepPoint(c) {
  if (c.native === 'circle') return [c.cx + c.r, c.cy];
  return c.points && c.points[0] ? [c.points[0][0], c.points[0][1]] : null;
}
function _chfPointInContour(qx, qy, c) {
  if (c.native === 'circle') return Math.hypot(qx - c.cx, qy - c.cy) < c.r;
  return pointInPolygon(qx, qy, c.points);
}
// Profondeur d'imbrication de `e` au sein de TOUT le dessin (S.entities, pas seulement la
// sélection courante — un trou reste visuellement un trou même si son contour englobant n'est
// pas sélectionné au moment du rendu) : nombre d'autres contours CHF supportés qui contiennent
// le point représentatif de `e`. 0 = le plus extérieur.
function _chfNestDepth(e) {
  const c = _chfResolveContour(e);
  const p = c && _chfRepPoint(c);
  if (!p) return 0;
  let depth = 0;
  for (const other of S.entities) {
    if (other === e || !CHF_SUPPORTED_TYPES.includes(other.type)) continue;
    const oc = _chfResolveContour(other);
    if (oc && _chfPointInContour(p[0], p[1], oc)) depth++;
  }
  return depth;
}
// Règle Alterné (parité pair/impair, correcte à tout niveau d'imbrication : anneau + moyeu
// plein au centre = 3 niveaux, le moyeu redevient "extérieur") ou Binaire (seule la profondeur
// 0 est "extérieur", tout le reste est traité comme un trou) — sélecteur toolbar
// data-tbid="chf-comp-mode", "alt" par défaut.
function _chfIsHole(depth) {
  const modeSel = document.querySelector('[data-tbid="chf-comp-mode"]');
  const alternating = !modeSel || modeSel.value !== 'binary';
  return alternating ? (depth % 2 === 1) : (depth > 0);
}

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

// Tangente au contour au point d'entrée (radians, monde) : cercle → rayon+90° (formule
// déjà utilisée par _chfArrowSamples) ; sinon → direction vers le point SUIVANT de
// _chfOrderContourPoints (et non contour.points[1] : avec un point de départ manuel ou
// _chfReverse, l'ordre réel diffère du contour brut — l'entrée est pts[0] par construction
// de _chfEntryPoint, la tangente doit donc suivre le même ordre).
function _chfEntryTangent(e, contour, entry) {
  if (contour.native === 'circle') {
    return Math.atan2(entry[1] - contour.cy, entry[0] - contour.cx) + Math.PI / 2;
  }
  const pts = _chfOrderContourPoints(e, contour);
  if (!pts || pts.length < 2) return 0;
  return Math.atan2(pts[1][1] - entry[1], pts[1][0] - entry[0]);
}

// ======== DIRECTION D'AMORCE 100 % AUTOMATIQUE ========
// Retour terrain 2026-08-27 (2 captures d'écran successives) : *« les amorces intérieur
// (trous) doivent aller en direction du centre. et dans tout les cas l'amorce ne doit pas
// être par dessus un trait de la pièce. enlève le choix de l'angle. c'est au plugin de
// trouver la meilleure solution »*. Le champ Angle (toolbar + panneau propriétés) et le
// flag _chfLeadManual associé sont donc SUPPRIMÉS : la direction est intégralement
// calculée ici, par une seule fonction consommée à la fois par l'aperçu (_chfLeadInGeom)
// et par l'export (_chfBuildGuideCurve) — l'aperçu ne peut donc plus diverger du fichier.
//
// Cause racine du défaut résiduel de la 2e capture : sur un COIN de polygone, la
// perpendiculaire à une arête est exactement COLINÉAIRE avec l'arête voisine — l'amorce
// se posait donc dans le prolongement d'un trait de la pièce. Corrigé en distinguant
// sommet (→ bissectrice extérieure des 2 arêtes, jamais alignée avec aucune des deux) et
// milieu d'arête (→ perpendiculaire, correcte dans ce cas).

// Distance point→segment (monde), utilitaire local du contrôle anti-collision ci-dessous.
function _chfPtSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-18) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
// Distance d'un point au contour résolu (bord, pas surface) : le cercle est traité
// nativement (|d - r|) pour éviter de tessellier inutilement.
function _chfDistToContour(px, py, c) {
  if (c.native === 'circle') return Math.abs(Math.hypot(px - c.cx, py - c.cy) - c.r);
  const pts = c.points;
  if (!pts || pts.length < 2) return Infinity;
  const n = pts.length;
  const segCount = c.closed ? n : n - 1;
  let best = Infinity;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const d = _chfPtSegDist(px, py, a[0], a[1], b[0], b[1]);
    if (d < best) best = d;
  }
  return best;
}
// Tous les contours du dessin (pas seulement la sélection) : une amorce ne doit se poser
// sur AUCUN trait, y compris ceux d'objets non sélectionnés au moment du rendu.
// Résolu une seule fois par frame : decorateEntity appelle _chfAutoLeadAngle pour chaque
// objet amorcé, et sans cache on retesselerait tous les cercles/splines du dessin à chaque
// fois (coût O(N²)). Le cache est purgé par un microtask : une passe de rendu est
// synchrone, donc tous les appels d'une même frame le partagent, et il est relâché juste
// après — jamais de contour périmé au frame suivant (contrairement à une invalidation par
// signature, qui raterait une édition de sommet de polyligne).
// Double garde : le microtask couvre l'édition en place (drag de poignée — le tableau
// S.entities garde la même identité mais ses coordonnées changent), et la comparaison
// d'identité/longueur couvre le remplacement du tableau au sein d'un même tick
// (chargement de fichier, undo, et les scénarios de test enchaînés).
let _chfContourCache = null, _chfContourCacheSrc = null, _chfContourCacheLen = -1;
function _chfAllContours() {
  if (_chfContourCache && _chfContourCacheSrc === S.entities && _chfContourCacheLen === S.entities.length) {
    return _chfContourCache;
  }
  const out = [];
  for (const o of S.entities) {
    if (!CHF_SUPPORTED_TYPES.includes(o.type)) continue;
    const c = _chfResolveContour(o);
    if (c) out.push(c);
  }
  _chfContourCache = out;
  _chfContourCacheSrc = S.entities;
  _chfContourCacheLen = S.entities.length;
  Promise.resolve().then(() => { _chfContourCache = null; _chfContourCacheSrc = null; });
  return out;
}
// Le segment d'amorce entry→(entry + len·angle) est-il dégagé de tout trait du dessin ?
// Échantillonné à partir de 20 % de sa longueur : le point d'entrée lui-même est par
// définition SUR le contour, ce n'est pas une collision. `clear` exige une marge
// proportionnelle à la longueur d'amorce (min 0.05 mm) pour rejeter aussi le cas
// « parallèle très proche », pas seulement l'intersection franche.
function _chfLeadIsClear(entry, ang, len, obstacles) {
  const tol = Math.max(0.05, len * 0.15);
  const ux = Math.cos(ang), uy = Math.sin(ang);
  for (let k = 2; k <= 10; k++) {
    const t = (k / 10) * len;
    const px = entry[0] + t * ux, py = entry[1] + t * uy;
    for (const c of obstacles) {
      if (_chfDistToContour(px, py, c) < tol) return false;
    }
  }
  return true;
}

// Direction « idéale » avant contrôle anti-collision (radians, monde) :
//  - cercle  → radiale (vers le centre si trou détecté, en s'en éloignant sinon) ;
//  - sommet  → bissectrice des 2 arêtes adjacentes, côté voulu (jamais alignée avec
//              l'une d'elles, ce qui corrige le cas du coin de plaque) ;
//  - milieu d'arête → perpendiculaire à cette arête, côté voulu.
// Le côté voulu (dedans pour un trou, dehors sinon) est tranché par une sonde locale
// (_chfPointInContour à 0.01 mm) plutôt que par une convention de signe. Sur un contour
// OUVERT (ligne, mur, arc partiel) il n'y a pas de dedans/dehors : on part de la
// perpendiculaire à l'extrémité et c'est le contrôle anti-collision de _chfAutoLeadAngle
// qui départage les deux côtés.
function _chfIdealLeadAngle(e, contour, entry) {
  if (contour.native !== 'circle' && !contour.closed) {
    return _chfEntryTangent(e, contour, entry) + Math.PI / 2;
  }
  const hole = _chfIsHole(_chfNestDepth(e));
  if (contour.native === 'circle') {
    const radial = Math.atan2(entry[1] - contour.cy, entry[0] - contour.cx);
    return hole ? radial + Math.PI : radial;
  }
  const pts = _chfOrderContourPoints(e, contour);
  const n = pts && pts.length;
  if (!n || n < 2) return null;
  let cand;
  const next = pts[1], prev = pts[n - 1];
  const vx = next[0] - entry[0], vy = next[1] - entry[1];
  const ux = prev[0] - entry[0], uy = prev[1] - entry[1];
  const vl = Math.hypot(vx, vy), ul = Math.hypot(ux, uy);
  // Bissectrice = somme des 2 directions unitaires sortant du sommet. Quasi nulle quand
  // les 2 arêtes sont alignées (sommet « plat » d'un contour tesselé) : on retombe alors
  // sur la perpendiculaire, qui est le bon choix dans ce cas.
  let bx = 0, by = 0;
  if (vl > 1e-12 && ul > 1e-12) { bx = vx / vl + ux / ul; by = vy / vl + uy / ul; }
  const bl = Math.hypot(bx, by);
  if (bl > 1e-9) cand = Math.atan2(by, bx);
  else cand = Math.atan2(vy, vx) + Math.PI / 2;
  const probe = 0.01;
  const px = entry[0] + probe * Math.cos(cand), py = entry[1] + probe * Math.sin(cand);
  const candIsWantedSide = hole ? _chfPointInContour(px, py, contour) : !_chfPointInContour(px, py, contour);
  return candIsWantedSide ? cand : cand + Math.PI;
}

// Angle d'amorce définitif (degrés, convention monde 0°=+X, CCW+) — SEULE source de
// vérité, consommée par l'aperçu ET par l'export. Part de la direction idéale, puis, si
// le segment se pose sur un trait du dessin, balaie de part et d'autre par pas de 10°
// (±80° max, jamais au-delà : au-delà on repasserait du mauvais côté de la matière) et
// retient la première direction dégagée. Si aucune ne l'est (trou plus petit que
// l'amorce, zone très encombrée), garde l'idéale : mieux vaut une amorce imparfaite mais
// du bon côté qu'une direction arbitraire.
function _chfAutoLeadAngle(e) {
  const contour = _chfResolveContour(e);
  if (!contour) return 0;
  const entry = _chfEntryPoint(e, contour);
  if (!entry) return 0;
  const ideal = _chfIdealLeadAngle(e, contour, entry);
  if (ideal == null) return 0;
  const len = e._chfLeadLength || 0;
  if (!len) return ideal * 180 / Math.PI;
  const obstacles = _chfAllContours();
  if (_chfLeadIsClear(entry, ideal, len, obstacles)) return ideal * 180 / Math.PI;
  const step = 10 * Math.PI / 180;
  for (let k = 1; k <= 8; k++) {
    for (const sign of [1, -1]) {
      const a = ideal + sign * k * step;
      if (_chfLeadIsClear(entry, a, len, obstacles)) return a * 180 / Math.PI;
    }
  }
  return ideal * 180 / Math.PI;
}

// ======== CONVERSION MONDE → .chf (angle d'amorce RELATIF au sens de parcours) ========
// Convention établie par ÉLIMINATION CROISÉE sur trois fichiers .chf réels — les 8 conventions
// candidates (±parcours ±angle, +0/180) confrontées à 4 contraintes physiques indépendantes :
//   A. laser_6mm.chf (produit PAR le SC2000), graphes 13/18/28/33 : départ au coin haut-gauche
//      d'une pièce, parcours 0°, angle 90, amorce ACTIVÉE → doit sortir vers le haut, et
//      surtout pas longer une arête.
//   B. même fichier, graphes 5/9/23/38 : départ au coin haut-DROIT, parcours 180°, angle 90,
//      amorce DÉSACTIVÉE (flag 0) → la direction automatique doit y être MAUVAISE, sinon
//      l'opérateur n'aurait eu aucune raison de la couper. Contrainte très discriminante :
//      c'est elle qui élimine l'hypothèse « angle absolu ». (Ces 8 contours forment 4 PAIRES
//      de pièces identiques, une CW une CCW : des copies miroir, d'où l'inversion.)
//   C. export_corrigé.chf (corrigé main, redécoupé, CONFIRMÉ BON sur machine), graphe 1 :
//      seul échantillon à angle NON standard (20.074123°) — donc le seul qui sépare les
//      conventions que 90° rend indistinguables. Le point d'amorçage doit tomber hors matière.
//   D. même fichier, les 4 cercles (90°, validés machine) : amorce VERS LE CENTRE du trou.
// Une seule convention passe les quatre :
//        direction absolue de l'amorce = parcours − angle + 180        (donc :)
//        angle écrit                   = parcours − absolu  + 180
// Sens physique : `angle` est l'angle entre le TRAIT D'AMORCE et le CONTOUR au point d'entrée
// (90° = amorce perpendiculaire au contour) — d'où 90 comme défaut universel. Autrement dit le
// point d'amorçage se place à `180 − angle` du sens de parcours, soit à GAUCHE du parcours pour
// 90°. C'est aussi ce qui explique la contrainte B : sur les copies miroir (parcours inversé),
// « à gauche » bascule dans la matière, et l'amorce a dû être désactivée.
// ⚠ Pour un CERCLE cette formule et l'ancienne (absolu − parcours) donnent TOUJOURS le même
// résultat (parcours − absolu y vaut toujours ±90°) : c'est exactement pourquoi le retour
// terrain montrait le cercle correct et les deux rectangles faux dans le SC2000.
// L'aperçu MiniCAD reste en absolu (inchangé, sur demande) ; seule l'écriture du fichier
// applique la conversion.

// Direction de PARCOURS au point d'entrée (radians, monde) — contrairement à
// _chfEntryTangent, respecte _chfReverse aussi sur un cercle (dir ±1 de _chfCircleStart) ;
// sur un polygone, _chfOrderContourPoints a déjà appliqué le sens, la tangente ordonnée
// EST la direction de parcours.
function _chfTravelTangent(e, contour, entry) {
  if (contour.native === 'circle') {
    const radial = Math.atan2(entry[1] - contour.cy, entry[0] - contour.cx);
    return radial + (_chfCircleStart(e, contour).dir >= 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  return _chfEntryTangent(e, contour, entry);
}

// Angle à écrire dans <GuideCurve Para> : direction absolue voulue (_chfAutoLeadAngle,
// la même que l'aperçu) ramenée en relatif au sens de parcours, normalisée dans [0, 360[.
function _chfExportLeadAngle(e) {
  const contour = _chfResolveContour(e);
  if (!contour) return 0;
  const entry = _chfEntryPoint(e, contour);
  if (!entry) return 0;
  const abs = _chfAutoLeadAngle(e) * Math.PI / 180;
  const rel = (_chfTravelTangent(e, contour, entry) - abs) * 180 / Math.PI + 180;
  return ((rel % 360) + 360) % 360;
}

// Amorce = segment de _chfLeadLength mm, partant du point d'entrée VERS l'extérieur
// (hors-pièce) — le laser parcourt ce segment en sens inverse (extérieur → entrée) pour
// "rentrer dans la pièce" avant de suivre le contour, cf. demande utilisateur initiale.
// La direction n'est plus une saisie : elle vient intégralement de _chfAutoLeadAngle
// (voir cette section plus haut pour l'historique des retours terrain), la même fonction
// que celle utilisée par l'export — l'aperçu affiche donc exactement ce qui sera écrit
// dans le fichier .chf, par construction.
function _chfLeadInGeom(e) {
  const len = e._chfLeadLength || 0;
  if (!len) return null;
  const contour = _chfResolveContour(e);
  if (!contour) return null;
  const entry = _chfEntryPoint(e, contour);
  if (!entry) return null;
  const ang = _chfAutoLeadAngle(e) * Math.PI / 180;
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
        // Point de référence pour computeOffsetGeom : loin à l'extérieur de la bbox pour un
        // contour détecté extérieur (signe interne résolu toujours +1, dist=e._chfCompensation
        // signé pilote seul agrandir/rétrécir) ; à l'intérieur (centre) pour un trou détecté,
        // afin que le pointillé rétrécisse visuellement vers l'intérieur avec la MÊME valeur —
        // voir la section « détection d'imbrication » plus haut. Ne change jamais ce qui est
        // écrit dans le fichier exporté (e._chfCompensation lui-même, non touché ici).
        let refX = bbox.minX - 1e7, refY = bbox.minY - 1e7;
        if (_chfIsHole(_chfNestDepth(e))) {
          const c = _chfResolveContour(e);
          if (c && c.native === 'circle') { refX = c.cx; refY = c.cy; }
          else { refX = (bbox.minX + bbox.maxX) / 2; refY = (bbox.minY + bbox.maxY) / 2; }
        }
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
            `<select class="chf-comp-input" data-tbid="chf-comp-mode" title="Règle d'imbrication pour l'aperçu pointillé (extérieur/trou) — n'affecte pas la valeur exportée">
               <option value="alt" selected>Alterné</option>
               <option value="binary">Binaire</option>
             </select>`);
        }
        if (!cont.querySelector('[data-tbid="chf-comp-value"]')) {
          cont.insertAdjacentHTML('beforeend',
            `<input type="text" class="chf-comp-input" data-tbid="chf-comp-value" placeholder="mm"
                    title="Décalage compensation (mm, signé — même valeur appliquée à toute la sélection)"
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
