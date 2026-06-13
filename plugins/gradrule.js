/* ============================================================
   PLUGIN: GRADRULE (Disques et Règles graduées)
   Commandes : GRADISC (disque gradué), GRADRULE (règle graduée)
   ============================================================ */

// État du plugin
let _gradMode = 'disk'; // 'disk' ou 'ruler'

// ======== COMMANDES ========
// Injectées dans CMD{}
const GRADRULE_COMMANDS = {
  GRADISC: {
    alias: ['GRADISK','GD','DISQUEGRADUE'],
    desc: 'Disque gradué (GRADISC)',
    exec: () => { openGradPopup('disk'); }
  },
  GRADRULE: {
    alias: ['GRADRULER','GR','REGLEGRADUE','RÈGLEGRADUÉE'],
    desc: 'Règle graduée (GRADRULE)',
    exec: () => { openGradPopup('ruler'); }
  }
};

// ======== FONCTIONS POPUP ========
function openGradPopup(mode) {
  _gradMode = mode || 'disk';
  const popup = document.getElementById('grad-popup');
  const title = document.getElementById('grad-popup-title');
  const diskP = document.getElementById('grad-disk-params');
  const rulerP = document.getElementById('grad-ruler-params');
  if (!popup || !title) {
    console.warn('GRADRULE: popup elements not found');
    return;
  }
  title.textContent = mode === 'ruler' ? 'Règle graduée' : 'Disque gradué';
  diskP.style.display  = mode === 'disk'  ? '' : 'none';
  rulerP.style.display = mode === 'ruler' ? '' : 'none';
  // Position near center of screen
  popup.style.left = '50%';
  popup.style.top  = '50%';
  popup.style.transform = 'translate(-50%,-50%)';
  popup.style.position = 'fixed';
  popup.classList.add('show');
  const firstInput = popup.querySelector('input');
  if (firstInput) setTimeout(() => firstInput.select(), 50);

  // Ajouter les event listeners pour le preview en temps réel
  attachGradPreviewListeners();
}

// Attache les listeners pour mettre à jour le preview en temps réel
function attachGradPreviewListeners() {
  const updatePreview = () => {
    if (_gradMode === 'disk') {
      const radius = parseFloat(document.getElementById('gd-radius').value) || 75;
      const count = parseInt(document.getElementById('gd-count').value) || 100;
      const labelEvery = parseInt(document.getElementById('gd-label-every').value) || 10;
      const gradScale = (parseFloat(document.getElementById('gd-grad-size').value) || 100) / 100;
      const textScale = (parseFloat(document.getElementById('gd-text-size').value) || 100) / 100;
      const pointX = parseFloat(document.getElementById('gd-point-x').value) || 0;
      const pointY = parseFloat(document.getElementById('gd-point-y').value) || 0;
      S._pendingGrad = { type:'grad_disk', radius, count, labelEvery, gradScale, textScale, pointX, pointY };
    } else {
      const length = parseFloat(document.getElementById('gr-length').value) || 200;
      const width = parseFloat(document.getElementById('gr-width').value) || 30;
      const count = parseInt(document.getElementById('gr-count').value) || 100;
      const labelEvery = parseInt(document.getElementById('gr-label-every').value) || 10;
      const gradScale = (parseFloat(document.getElementById('gr-grad-size').value) || 100) / 100;
      const textScale = (parseFloat(document.getElementById('gr-text-size').value) || 100) / 100;
      const pointX = parseFloat(document.getElementById('gr-point-x').value) || 0;
      const pointY = parseFloat(document.getElementById('gr-point-y').value) || 0;
      S._pendingGrad = { type:'grad_ruler', length, width, count, labelEvery, gradScale, textScale, pointX, pointY };
    }
    scheduleRender();
  };

  // Attaché les listeners sur tous les inputs du popup actif
  const activeParams = _gradMode === 'disk'
    ? document.getElementById('grad-disk-params')
    : document.getElementById('grad-ruler-params');

  if (activeParams) {
    activeParams.querySelectorAll('input').forEach(input => {
      input.removeEventListener('input', updatePreview); // Éviter les doublons
      input.addEventListener('input', updatePreview);
    });
  }

  // Déclencher un preview initial
  updatePreview();
}

function closeGradPopup() {
  const popup = document.getElementById('grad-popup');
  if (popup) popup.classList.remove('show');
}

function applyGradDef() {
  // Vérifier si on est en train d'éditer une entité existante
  const editingEntId = S.selected.length === 1 ? S.selected[0] : null;
  const editingEnt = editingEntId ? S.entities.find(e => e.id === editingEntId) : null;
  const isEditing = editingEnt && (editingEnt.type === 'grad_disk' || editingEnt.type === 'grad_ruler') && editingEnt._isEditing;

  closeGradPopup();

  if (_gradMode === 'disk') {
    const radius     = parseFloat(document.getElementById('gd-radius').value)     || 75;
    const count      = parseInt(document.getElementById('gd-count').value)        || 100;
    const labelEvery = parseInt(document.getElementById('gd-label-every').value)  || 10;
    const gradScale  = (parseFloat(document.getElementById('gd-grad-size').value) || 100) / 100;
    const textScale  = (parseFloat(document.getElementById('gd-text-size').value) || 100) / 100;
    const pointX     = parseFloat(document.getElementById('gd-point-x').value)     || 0;
    const pointY     = parseFloat(document.getElementById('gd-point-y').value)     || 0;

    if (isEditing && editingEnt.type === 'grad_disk') {
      // Édition : mettre à jour l'entité existante
      addToHistory();
      editingEnt.radius = radius;
      editingEnt.count = count;
      editingEnt.labelEvery = labelEvery;
      editingEnt.gradScale = gradScale;
      editingEnt.textScale = textScale;
      editingEnt.pointX = pointX;
      editingEnt.pointY = pointY;
      delete editingEnt._isEditing;
      termPrint('Disque gradué modifié', 'success');
    } else {
      // Nouvelle entité
      const ent = { type:'grad_disk', id:S.nextId++, layer:S.currentLayer,
                    cx:0, cy:0, radius, count, labelEvery, gradScale, textScale, pointX, pointY };
      S.aiPendingEntities = [ent];
      S.aiPendingCenter   = [0, 0];
      S._pendingGrad = { type:'grad_disk', radius, count, labelEvery, gradScale, textScale, pointX, pointY };
      setTool('grad_place');
      startGradMouseTracking();
      termPrint(`GRADISC — Disque Ø${(radius*2).toFixed(0)} mm, ${count} traits — Bougez la souris pour prévisualiser, cliquez pour placer (Échap=annuler)`, 'info');
    }
  } else {
    const length     = parseFloat(document.getElementById('gr-length').value)     || 200;
    const width      = parseFloat(document.getElementById('gr-width').value)      || 30;
    const count      = parseInt(document.getElementById('gr-count').value)        || 100;
    const labelEvery = parseInt(document.getElementById('gr-label-every').value)  || 10;
    const gradScale  = (parseFloat(document.getElementById('gr-grad-size').value) || 100) / 100;
    const textScale  = (parseFloat(document.getElementById('gr-text-size').value) || 100) / 100;
    const pointX     = parseFloat(document.getElementById('gr-point-x').value)     || 0;
    const pointY     = parseFloat(document.getElementById('gr-point-y').value)     || 0;

    if (isEditing && editingEnt.type === 'grad_ruler') {
      // Édition : mettre à jour l'entité existante
      addToHistory();
      editingEnt.length = length;
      editingEnt.width = width;
      editingEnt.count = count;
      editingEnt.labelEvery = labelEvery;
      editingEnt.gradScale = gradScale;
      editingEnt.textScale = textScale;
      editingEnt.pointX = pointX;
      editingEnt.pointY = pointY;
      delete editingEnt._isEditing;
      termPrint('Règle graduée modifiée', 'success');
    } else {
      // Nouvelle entité
      const ent = { type:'grad_ruler', id:S.nextId++, layer:S.currentLayer,
                    x:0, y:0, length, width, count, labelEvery, gradScale, textScale, pointX, pointY };
      S.aiPendingEntities = [ent];
      S.aiPendingCenter   = [0, 0];
      S._pendingGrad = { type:'grad_ruler', length, width, count, labelEvery, gradScale, textScale, pointX, pointY };
      setTool('grad_place');
      startGradMouseTracking();
      termPrint(`GRADRULE — Règle ${length}×${width} mm, ${count} traits — Bougez la souris pour prévisualiser, cliquez pour placer (Échap=annuler)`, 'info');
    }
  }
  scheduleRender();
}

// ======== RENDU (à injecter dans drawEntity) ========
const GRADRULE_RENDER_CASES = {
  grad_disk: function(e) {
    // ── Disque gradué ──────────────────────────────────────────────────
    const { cx:gcx, cy:gcy, radius:gr, count:gn=100, labelEvery:gle=10, gradScale:ggs=1, textScale:gts=1, pointX:gpx=0, pointY:gpy=0 } = e;
    const [scx2, scy2] = w2s(gcx + gpx, gcy + gpy); // Position du disque + offset du point
    const sr = gr * S.zoom;

    // Point d'insertion visible (petit croix)
    const selected = S.selected.includes(e.id);
    const isEditing = e._isEditing;
    if (selected || isEditing) {
      ctx.save();
      ctx.strokeStyle = isEditing ? '#ff9800' : '#4488ff';
      ctx.lineWidth = 2;
      const sz = 8;
      ctx.beginPath(); ctx.moveTo(scx2 - sz, scy2); ctx.lineTo(scx2 + sz, scy2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(scx2, scy2 - sz); ctx.lineTo(scx2, scy2 + sz); ctx.stroke();
      ctx.beginPath(); ctx.arc(scx2, scy2, 4, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    // Cercle principal
    ctx.save();
    ctx.beginPath(); ctx.arc(scx2, scy2, sr, 0, Math.PI * 2); ctx.stroke();
    // Point central
    ctx.beginPath(); ctx.arc(scx2, scy2, Math.max(2, ctx.lineWidth * 1.5), 0, Math.PI * 2); ctx.fill();
    // Graduations
    const medEvery = Math.max(1, Math.floor(gle / 2));
    const majorLen  = sr * 0.13 * ggs;
    const medLen    = sr * 0.08 * ggs;
    const minorLen  = sr * 0.04 * ggs;
    const textDist  = sr - majorLen - sr * 0.07 * ggs;
    const fontSize  = Math.max(6, sr * 0.09 * gts);
    ctx.font = `600 ${fontSize}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < gn; i++) {
      const ang = (i / gn) * Math.PI * 2;
      const ca = Math.cos(ang), sa2 = Math.sin(ang);
      let tl = minorLen;
      if (i % gle === 0) tl = majorLen;
      else if (i % medEvery === 0) tl = medLen;
      ctx.beginPath();
      ctx.moveTo(scx2 + (sr) * ca, scy2 + (sr) * sa2);
      ctx.lineTo(scx2 + (sr - tl) * ca, scy2 + (sr - tl) * sa2);
      ctx.stroke();
      if (i % gle === 0) {
        const tx = scx2 + textDist * ca;
        const ty = scy2 + textDist * sa2;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(ang + Math.PI / 2);
        ctx.fillText(String(i), 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  },

  grad_ruler: function(e) {
    // ── Règle graduée ─────────────────────────────────────────────────
    const { x:rx0, y:ry0, length:rlen=200, width:rwid=30, count:rn=100,
             labelEvery:rle=10, gradScale:rgs=1, textScale:rts=1, pointX:rpx=0, pointY:rpy=0 } = e;
    const [rsx, rsy] = w2s(rx0 + rpx, ry0 + rpy); // Position de la règle + offset du point
    const rlenpx = rlen * S.zoom, rwidpx = rwid * S.zoom;
    ctx.save();

    // Point d'insertion visible (petit croix)
    const selected = S.selected.includes(e.id);
    const isEditing = e._isEditing;
    if (selected || isEditing) {
      ctx.save();
      ctx.strokeStyle = isEditing ? '#ff9800' : '#4488ff';
      ctx.lineWidth = 2;
      const sz = 8;
      ctx.beginPath(); ctx.moveTo(rsx - sz, rsy); ctx.lineTo(rsx + sz, rsy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rsx, rsy - sz); ctx.lineTo(rsx, rsy + sz); ctx.stroke();
      ctx.beginPath(); ctx.arc(rsx, rsy, 4, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // Cadre de la règle
    ctx.beginPath(); ctx.rect(rsx, rsy, rlenpx, -rwidpx); ctx.stroke();
    // Graduations
    const rMedEvery  = Math.max(1, Math.floor(rle / 2));
    const rMajorH    = rwidpx * 0.42 * rgs;
    const rMedH      = rwidpx * 0.28 * rgs;
    const rMinorH    = rwidpx * 0.16 * rgs;
    const rfontSize  = Math.max(5, rwidpx * 0.22 * rts);
    ctx.font = `600 ${rfontSize}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= rn; i++) {
      const px2 = rsx + (i / rn) * rlenpx;
      let th = rMinorH;
      if (i % rle === 0) th = rMajorH;
      else if (i % rMedEvery === 0) th = rMedH;
      // Trait bord bas → vers l'intérieur (vers le haut en écran)
      ctx.beginPath(); ctx.moveTo(px2, rsy); ctx.lineTo(px2, rsy - th); ctx.stroke();
      // Trait bord haut → vers l'intérieur (vers le bas en écran)
      ctx.beginPath(); ctx.moveTo(px2, rsy - rwidpx); ctx.lineTo(px2, rsy - rwidpx + th); ctx.stroke();
      if (i % rle === 0) {
        // Label bord bas : après le trait, vers l'intérieur
        ctx.fillText(String(i), px2, rsy - rMajorH - rfontSize * 0.7);
        // Label bord haut : après le trait, vers l'intérieur
        ctx.fillText(String(i), px2, rsy - rwidpx + rMajorH + rfontSize * 0.7);
      }
    }
    ctx.restore();
  }
};

// ======== OUTILS (à injecter dans handleClick via toolHandlers) ========
const GRADRULE_TOOL_HANDLERS = {
  grad_place: function(x, y, ev) {
    const pg = S._pendingGrad;
    if (!pg) return;
    let ent;
    if (pg.type === 'grad_disk') {
      ent = { type:'grad_disk', id:S.nextId++, layer:S.currentLayer,
        cx:x, cy:y, radius:pg.radius, count:pg.count, labelEvery:pg.labelEvery,
        gradScale:pg.gradScale, textScale:pg.textScale, pointX:pg.pointX||0, pointY:pg.pointY||0 };
    } else {
      ent = { type:'grad_ruler', id:S.nextId++, layer:S.currentLayer,
        x:x, y:y, length:pg.length, width:pg.width, count:pg.count,
        labelEvery:pg.labelEvery, gradScale:pg.gradScale, textScale:pg.textScale, pointX:pg.pointX||0, pointY:pg.pointY||0 };
    }
    stopGradMouseTracking();
    addToHistory();
    S.entities.push(ent);
    S._pendingGrad = null;
    S.aiPendingEntities = [];
    setTool('select');
    termPrint((pg.type === 'grad_disk' ? 'Disque gradué' : 'Règle graduée') + ' placé(e)', 'success');
    scheduleRender();
  }
};

// ======== GÉOMÉTRIE: BBOX ========
const GRADRULE_BBOX_HANDLERS = {
  grad_disk: function(e) {
    const { cx, cy, radius } = e;
    return { xmin: cx - radius, ymin: cy - radius, xmax: cx + radius, ymax: cy + radius };
  },
  grad_ruler: function(e) {
    const { x, y, length, width } = e;
    return { xmin: x, ymin: y - width, xmax: x + length, ymax: y };
  }
};

// ======== GÉOMÉTRIE: MOVE (pour grip editing) ========
const GRADRULE_MOVE_HANDLERS = {
  grad_disk: function(e, dx, dy) {
    e.cx += dx;
    e.cy += dy;
  },
  grad_ruler: function(e, dx, dy) {
    e.x += dx;
    e.y += dy;
  }
};

// ======== DOUBLE-CLIC POUR MODIFIER ========
function handleGradDoubleClick() {
  document.addEventListener('dblclick', (ev) => {
    const [wx, wy] = s2w(ev.clientX, ev.clientY);
    // Chercher une entité grad_disk ou grad_ruler
    for (const e of S.entities) {
      if (e.type === 'grad_disk') {
        const dist = Math.hypot(wx - e.cx, wy - e.cy);
        if (dist <= e.radius * 1.2) { // Clic dans/près du disque
          selectAndEditGrad(e);
          return;
        }
      } else if (e.type === 'grad_ruler') {
        if (wx >= e.x && wx <= e.x + e.length && wy >= e.y - e.width && wy <= e.y) {
          selectAndEditGrad(e);
          return;
        }
      }
    }
  });
}

function selectAndEditGrad(ent) {
  S.selected = [ent.id];
  _gradMode = ent.type === 'grad_disk' ? 'disk' : 'ruler';
  // Pré-remplir le popup avec les valeurs de l'entité
  if (ent.type === 'grad_disk') {
    document.getElementById('gd-radius').value = ent.radius;
    document.getElementById('gd-count').value = ent.count;
    document.getElementById('gd-label-every').value = ent.labelEvery;
    document.getElementById('gd-grad-size').value = (ent.gradScale || 1) * 100;
    document.getElementById('gd-text-size').value = (ent.textScale || 1) * 100;
    document.getElementById('gd-point-x').value = ent.pointX || 0;
    document.getElementById('gd-point-y').value = ent.pointY || 0;
  } else {
    document.getElementById('gr-length').value = ent.length;
    document.getElementById('gr-width').value = ent.width;
    document.getElementById('gr-count').value = ent.count;
    document.getElementById('gr-label-every').value = ent.labelEvery;
    document.getElementById('gr-grad-size').value = (ent.gradScale || 1) * 100;
    document.getElementById('gr-text-size').value = (ent.textScale || 1) * 100;
    document.getElementById('gr-point-x').value = ent.pointX || 0;
    document.getElementById('gr-point-y').value = ent.pointY || 0;
  }
  // Ouvrir le popup en mode édition
  ent._isEditing = true;
  openGradPopup(ent.type === 'grad_disk' ? 'disk' : 'ruler');
  updateProperties();
  render();
}

// ======== HTML POPUP (à injecter dans HTML) ========
const GRADRULE_HTML = `
<div class="tube-def-popup" id="grad-popup">
  <div class="tdp-title" id="grad-popup-title">Disque gradué</div>
  <div id="grad-disk-params">
    <div class="tdp-row"><span class="tdp-lbl">Rayon</span><input type="text" inputmode="decimal" id="gd-radius" value="75"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Graduations</span><input type="text" inputmode="decimal" id="gd-count" value="100"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Label tous les</span><input type="text" inputmode="decimal" id="gd-label-every" value="10"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille grad.</span><input type="text" inputmode="decimal" id="gd-grad-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille texte</span><input type="text" inputmode="decimal" id="gd-text-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Point X</span><input type="text" inputmode="decimal" id="gd-point-x" value="0"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Point Y</span><input type="text" inputmode="decimal" id="gd-point-y" value="0"><span class="tdp-unit">mm</span></div>
  </div>
  <div id="grad-ruler-params" style="display:none">
    <div class="tdp-row"><span class="tdp-lbl">Longueur</span><input type="text" inputmode="decimal" id="gr-length" value="200"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Largeur</span><input type="text" inputmode="decimal" id="gr-width" value="30"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Graduations</span><input type="text" inputmode="decimal" id="gr-count" value="100"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Label tous les</span><input type="text" inputmode="decimal" id="gr-label-every" value="10"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille grad.</span><input type="text" inputmode="decimal" id="gr-grad-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille texte</span><input type="text" inputmode="decimal" id="gr-text-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Point X</span><input type="text" inputmode="decimal" id="gr-point-x" value="0"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Point Y</span><input type="text" inputmode="decimal" id="gr-point-y" value="0"><span class="tdp-unit">mm</span></div>
  </div>
  <div style="display:flex;gap:6px;margin-top:8px">
    <button class="tdp-ok" id="grad-popup-ok">Insérer ↵</button>
    <button class="tdp-cancel" id="grad-popup-cancel">Annuler</button>
  </div>
</div>
`;

// ======== ICÔNES (SVG des boutons de la barre d'outils) ========
const GRADRULE_ICONS = {
  gradisc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><line x1="12" y1="3" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="21"/><line x1="3" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="21" y2="12"/><line x1="5.3" y1="5.3" x2="7" y2="7"/><line x1="17" y1="17" x2="18.7" y2="18.7"/><line x1="18.7" y1="5.3" x2="17" y2="7"/><line x1="7" y1="17" x2="5.3" y2="18.7"/></svg>',
  gradrule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="8" width="20" height="8" rx="1"/><line x1="6" y1="8" x2="6" y2="13"/><line x1="10" y1="8" x2="10" y2="11"/><line x1="14" y1="8" x2="14" y2="13"/><line x1="18" y1="8" x2="18" y2="11"/><line x1="6" y1="16" x2="6" y2="11"/><line x1="10" y1="16" x2="10" y2="13"/><line x1="14" y1="16" x2="14" y2="11"/><line x1="18" y1="16" x2="18" y2="13"/></svg>'
};

// ======== ÉVÉNEMENTS ========
let _gradMouseTrackingActive = false;

function initGradPopupButtons() {
  const okBtn = document.getElementById('grad-popup-ok');
  const cancelBtn = document.getElementById('grad-popup-cancel');
  if (okBtn) okBtn.addEventListener('click', applyGradDef);
  if (cancelBtn) cancelBtn.addEventListener('click', closeGradPopup);
}

// Suivre la souris pour le preview en temps réel
let _gradUpdatePreviewPos = null;

function startGradMouseTracking() {
  if (_gradMouseTrackingActive) return;
  _gradMouseTrackingActive = true;

  _gradUpdatePreviewPos = (ev) => {
    if (!S._pendingGrad || !S.aiPendingEntities || S.aiPendingEntities.length === 0) return;

    // Convertir les coordonnées écran → monde
    const [wx, wy] = s2w(ev.clientX, ev.clientY);
    const ent = S.aiPendingEntities[0];

    if (S._pendingGrad.type === 'grad_disk') {
      ent.cx = wx;
      ent.cy = wy;
    } else {
      ent.x = wx;
      ent.y = wy;
    }
    scheduleRender();
  };

  document.addEventListener('mousemove', _gradUpdatePreviewPos);
}

function stopGradMouseTracking() {
  if (!_gradMouseTrackingActive) return;
  _gradMouseTrackingActive = false;
  if (_gradUpdatePreviewPos) {
    document.removeEventListener('mousemove', _gradUpdatePreviewPos);
    _gradUpdatePreviewPos = null;
  }
  S.aiPendingEntities = [];
  S._pendingGrad = null;
}

// Close on outside click
document.addEventListener('mousedown', (e) => {
  const p = document.getElementById('grad-popup');
  if (p && p.classList.contains('show') && !p.contains(e.target)) {
    closeGradPopup();
  }
}, true);

// Close on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const p = document.getElementById('grad-popup');
    if (p && p.classList.contains('show')) {
      closeGradPopup();
      e.preventDefault();
    }
    if (S.tool === 'grad_place') {
      stopGradMouseTracking();
      setTool('select');
      termPrint('Annulé', 'info');
      e.preventDefault();
    }
  }
});

// Export plugin (enregistre en global pour que loadPlugin le trouve)
window.GRADRULE_PLUGIN = {
  name: 'gradrule',
  version: '1.0',
  desc: 'Disques et Règles graduées (GRADISC, GRADRULE)',
  commands: GRADRULE_COMMANDS,
  renderCases: GRADRULE_RENDER_CASES,
  bboxHandlers: GRADRULE_BBOX_HANDLERS,
  moveHandlers: GRADRULE_MOVE_HANDLERS,
  toolHandlers: GRADRULE_TOOL_HANDLERS,
  html: GRADRULE_HTML,
  init: function() {
    // Injecter le HTML du popup
    if (!document.getElementById('grad-popup')) {
      const container = document.body;
      const el = document.createElement('div');
      el.innerHTML = this.html;
      container.appendChild(el.firstElementChild);
      initGradPopupButtons();
    }
    // Injecter les commandes
    Object.assign(CMD, this.commands);

    // Créer une barre d'outils dynamique pour le plugin
    if (!document.getElementById('tb-gradrule')) {
      const dockArea = document.getElementById('dock-area');
      if (dockArea) {
        const tb = document.createElement('div');
        tb.className = 'cad-toolbar docked';
        tb.id = 'tb-gradrule';
        tb.dataset.name = 'Graduations';
        tb.innerHTML = `
          <div class="tb-grip" onmousedown="startTBDrag(event,'tb-gradrule')" ondblclick="toggleTBDock('tb-gradrule')">⋮⋮</div>
          <div class="tb-header" onmousedown="startTBDrag(event,'tb-gradrule')" ondblclick="toggleTBDock('tb-gradrule')">
            <span class="tb-title">Graduations</span><span class="tb-close" onclick="hideToolbar('tb-gradrule')">×</span>
          </div>
          <div class="tb-buttons">
            <button class="tool-btn" data-tbid="gradisc" title="Disque gradué (GRADISC)" onclick="executeCommand('GRADISC')">${GRADRULE_ICONS.gradisc}</button>
            <button class="tool-btn" data-tbid="gradrule" title="Règle graduée (GRADRULE)" onclick="executeCommand('GRADRULE')">${GRADRULE_ICONS.gradrule}</button>
          </div>
        `;
        dockArea.appendChild(tb);
        // Enregistrer la barre dans le système de toolbars personnalisables
        if (typeof _tbHarvest === 'function') {
          _tbHarvest();
        }
      }
    }

    // Ajouter les event listeners pour le double-clic
    handleGradDoubleClick();

    console.log('GRADRULE plugin loaded');
  }
};
