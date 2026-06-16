/* ============================================================
   PLUGIN: GRADRULE (Disques, règles et arcs gradués)
   Commandes : GRADISC (disque), GRADRULE (règle), GRADARC (arc partiel)
   Chaque type a un bouton d'inversion de sens (horaire/antihoraire ou
   gauche/droite) et peut être éclaté (EXPLODE) en primitives natives.
   ============================================================ */

// État du plugin
let _gradMode = 'disk'; // 'disk', 'ruler' ou 'arc'

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
  },
  GRADARC: {
    alias: ['GRADARC','GA','ARCGRADUE','ARCGRADUÉ'],
    desc: 'Arc gradué — graduation circulaire partielle (GRADARC)',
    exec: () => { openGradPopup('arc'); }
  }
};

// ======== FONCTIONS POPUP ========
function openGradPopup(mode) {
  _gradMode = mode || 'disk';
  const popup = document.getElementById('grad-popup');
  const title = document.getElementById('grad-popup-title');
  const diskP = document.getElementById('grad-disk-params');
  const rulerP = document.getElementById('grad-ruler-params');
  const arcP = document.getElementById('grad-arc-params');
  if (!popup || !title) {
    console.warn('GRADRULE: popup elements not found');
    return;
  }
  title.textContent = _gradMode === 'ruler' ? 'Règle graduée'
                    : _gradMode === 'arc'   ? 'Arc gradué'
                    : 'Disque gradué';
  diskP.style.display  = _gradMode === 'disk'  ? '' : 'none';
  rulerP.style.display = _gradMode === 'ruler' ? '' : 'none';
  if (arcP) arcP.style.display = _gradMode === 'arc' ? '' : 'none';
  // Position near center of screen
  popup.style.left = '50%';
  popup.style.top  = '50%';
  popup.style.transform = 'translate(-50%,-50%)';
  popup.style.position = 'fixed';
  popup.classList.add('show');
  const firstInput = popup.querySelector('input');
  if (firstInput) setTimeout(() => firstInput.select(), 50);
}

// Attache les listeners pour mettre à jour le preview en temps réel
function closeGradPopup() {
  const popup = document.getElementById('grad-popup');
  if (popup) popup.classList.remove('show');
}

function applyGradDef() {
  closeGradPopup();

  // On s'appuie sur le système de placement intégré (aiPendingEntities) :
  //  - drawAiPlacementPreview() affiche l'aperçu attaché à la souris
  //  - le mousedown intégré pose l'entité au point cliqué (via offsetEntity)
  // L'entité est créée à l'origine (0,0) et aiPendingCenter=[0,0] sert d'ancrage.
  const isRev = (id) => { const b = document.getElementById(id); return !!(b && b.dataset.rev === '1'); };
  let ent;
  if (_gradMode === 'disk') {
    const radius     = parseFloat(document.getElementById('gd-radius').value)     || 75;
    const count      = parseInt(document.getElementById('gd-count').value)        || 100;
    const labelEvery = parseInt(document.getElementById('gd-label-every').value)  || 10;
    const gradScale  = (parseFloat(document.getElementById('gd-grad-size').value) || 100) / 100;
    const textScale  = (parseFloat(document.getElementById('gd-text-size').value) || 100) / 100;
    const reverse    = isRev('gd-reverse');
    ent = { type:'grad_disk', layer:S.currentLayer,
            cx:0, cy:0, radius, count, labelEvery, gradScale, textScale, reverse };
    termPrint(`GRADISC — Cliquez pour placer le disque (Échap=annuler)`, 'info');
  } else if (_gradMode === 'arc') {
    const radius     = parseFloat(document.getElementById('ga-radius').value)     || 75;
    const spanAngle  = parseFloat(document.getElementById('ga-angle').value)      || 180;
    const count      = parseInt(document.getElementById('ga-count').value)        || 50;
    const labelEvery = parseInt(document.getElementById('ga-label-every').value)  || 5;
    const gradScale  = (parseFloat(document.getElementById('ga-grad-size').value) || 100) / 100;
    const textScale  = (parseFloat(document.getElementById('ga-text-size').value) || 100) / 100;
    const reverse    = isRev('ga-reverse');
    ent = { type:'grad_arc', layer:S.currentLayer,
            cx:0, cy:0, radius, spanAngle, startAngle:0, count, labelEvery, gradScale, textScale, reverse };
    termPrint(`GRADARC — Cliquez pour placer l'arc (Échap=annuler)`, 'info');
  } else {
    const length     = parseFloat(document.getElementById('gr-length').value)     || 200;
    const width      = parseFloat(document.getElementById('gr-width').value)      || 30;
    const count      = parseInt(document.getElementById('gr-count').value)        || 100;
    const labelEvery = parseInt(document.getElementById('gr-label-every').value)  || 10;
    const gradScale  = (parseFloat(document.getElementById('gr-grad-size').value) || 100) / 100;
    const textScale  = (parseFloat(document.getElementById('gr-text-size').value) || 100) / 100;
    const reverse    = isRev('gr-reverse');
    ent = { type:'grad_ruler', layer:S.currentLayer,
            x:0, y:0, length, width, count, labelEvery, gradScale, textScale, reverse };
    termPrint(`GRADRULE — Cliquez pour placer la règle (Échap=annuler)`, 'info');
  }
  S.aiPendingEntities = [ent];
  S.aiPendingCenter = [0, 0];
  S.tool = 'select'; // le placement intégré s'occupe du clic, pas d'outil custom
  scheduleRender();
}

// Repère local d'une règle graduée : origine (x,y) + rotation (degrés).
// ux = direction de la longueur, uy = direction de la largeur (+y à rotation 0).
// P(f,g) renvoie le point MONDE à la fraction f de longueur et g de largeur.
function _gradRulerFrame(e) {
  const th = (e.rotation || 0) * Math.PI / 180;
  const ux = [Math.cos(th), Math.sin(th)];
  const uy = [-Math.sin(th), Math.cos(th)];
  const L = e.length, W = e.width, ox = e.x, oy = e.y;
  return { th, ux, uy, L, W, ox, oy,
           P: (f, g) => [ox + f*L*ux[0] + g*W*uy[0], oy + f*L*ux[1] + g*W*uy[1]] };
}

// ======== RENDU (à injecter dans drawEntity) ========
const GRADRULE_RENDER_CASES = {
  grad_disk: function(e) {
    // ── Disque gradué ──────────────────────────────────────────────────
    const { cx:gcx, cy:gcy, radius:gr, count:gn=100, labelEvery:gle=10, gradScale:ggs=1, textScale:gts=1, reverse:grev=false, rotation:grot=0 } = e;
    const dir = grev ? -1 : 1;   // sens horaire (1) / antihoraire (-1)
    const rotOff = -grot * Math.PI / 180;  // orientation (rotation monde → angle écran)
    const [scx2, scy2] = w2s(gcx, gcy);
    const sr = gr * S.zoom;
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
      const ang = rotOff + dir * (i / gn) * Math.PI * 2;
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
    // ── Règle graduée (orientable via e.rotation) ─────────────────────
    const { length:rlen=200, width:rwid=30, count:rn=100,
            labelEvery:rle=10, gradScale:rgs=1, textScale:rts=1, reverse:rrev=false } = e;
    const fr = _gradRulerFrame({ ...e, length:rlen, width:rwid });
    const S2 = (f, g) => w2s(...fr.P(f, g));
    ctx.save();
    // Cadre (rectangle éventuellement tourné)
    const c0 = S2(0,0), c1 = S2(1,0), c2 = S2(1,1), c3 = S2(0,1);
    ctx.beginPath(); ctx.moveTo(c0[0],c0[1]); ctx.lineTo(c1[0],c1[1]);
    ctx.lineTo(c2[0],c2[1]); ctx.lineTo(c3[0],c3[1]); ctx.closePath(); ctx.stroke();
    // Graduations : g = fraction de la largeur (vers l'intérieur depuis chaque bord)
    const rMedEvery = Math.max(1, Math.floor(rle / 2));
    const gMajor = 0.42 * rgs, gMed = 0.28 * rgs, gMinor = 0.16 * rgs;
    const rfontSize = Math.max(5, rwid * S.zoom * 0.22 * rts);
    ctx.font = `600 ${rfontSize}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= rn; i++) {
      const f = i / rn;
      let g = gMinor;
      if (i % rle === 0) g = gMajor; else if (i % rMedEvery === 0) g = gMed;
      const a = S2(f, 0), b = S2(f, g);            // bord bas → intérieur
      ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
      const c = S2(f, 1), d = S2(f, 1 - g);        // bord haut → intérieur
      ctx.beginPath(); ctx.moveTo(c[0],c[1]); ctx.lineTo(d[0],d[1]); ctx.stroke();
      if (i % rle === 0) {
        // Un seul label, centré dans la règle (orienté selon la rotation).
        const lp = S2(f, 0.5);
        ctx.save(); ctx.translate(lp[0], lp[1]); ctx.rotate(-fr.th);
        ctx.fillText(String(rrev ? rn - i : i), 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  },

  grad_arc: function(e) {
    // ── Arc gradué (graduation circulaire partielle) ───────────────────
    // Angles en convention MONDE (0 = est, sens trigo/antihoraire positif).
    // reverse = false → antihoraire (CCW), true → horaire (CW).
    const { cx:gcx, cy:gcy, radius:gr, spanAngle:gspan=180, startAngle:gstart=0,
            count:gn=50, labelEvery:gle=5, gradScale:ggs=1, textScale:gts=1, reverse:grev=false } = e;
    const a0 = gstart * Math.PI / 180;
    const span = gspan * Math.PI / 180 * (grev ? -1 : 1);
    const sr = gr * S.zoom;
    ctx.save();
    // Arc principal — échantillonné en coordonnées monde (w2s gère l'inversion Y)
    const steps = Math.max(8, Math.ceil(Math.abs(span) / (Math.PI / 90)));
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) {
      const a = a0 + span * (k / steps);
      const [px, py] = w2s(gcx + gr * Math.cos(a), gcy + gr * Math.sin(a));
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Point central
    const [csx, csy] = w2s(gcx, gcy);
    ctx.beginPath(); ctx.arc(csx, csy, Math.max(2, ctx.lineWidth * 1.5), 0, Math.PI * 2); ctx.fill();
    // Graduations
    const medEvery = Math.max(1, Math.floor(gle / 2));
    const majorLen = gr * 0.13 * ggs, medLen = gr * 0.08 * ggs, minorLen = gr * 0.04 * ggs;
    const textDist = gr - majorLen - gr * 0.07 * ggs;
    const fontSize = Math.max(6, sr * 0.09 * gts);
    ctx.font = `600 ${fontSize}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= gn; i++) {
      const a = a0 + span * (i / gn);
      const ca = Math.cos(a), sa2 = Math.sin(a);
      let tl = minorLen;
      if (i % gle === 0) tl = majorLen;
      else if (i % medEvery === 0) tl = medLen;
      const [ox, oy] = w2s(gcx + gr * ca, gcy + gr * sa2);
      const [ix, iy] = w2s(gcx + (gr - tl) * ca, gcy + (gr - tl) * sa2);
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ix, iy); ctx.stroke();
      if (i % gle === 0) {
        const [tx, ty] = w2s(gcx + textDist * ca, gcy + textDist * sa2);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(-a + Math.PI / 2);  // tangentiel (axe Y écran inversé → -a)
        ctx.fillText(String(i), 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }
};

// ======== GÉOMÉTRIE: BBOX ========
const GRADRULE_BBOX_HANDLERS = {
  grad_disk: function(e) {
    const { cx, cy, radius } = e;
    return { xmin: cx - radius, ymin: cy - radius, xmax: cx + radius, ymax: cy + radius };
  },
  grad_ruler: function(e) {
    // Cadre éventuellement tourné : bbox des 4 coins.
    const fr = _gradRulerFrame(e);
    const pts = [fr.P(0,0), fr.P(1,0), fr.P(1,1), fr.P(0,1)];
    let xmin=Infinity, ymin=Infinity, xmax=-Infinity, ymax=-Infinity;
    pts.forEach(([x,y]) => { if(x<xmin)xmin=x; if(x>xmax)xmax=x; if(y<ymin)ymin=y; if(y>ymax)ymax=y; });
    return { xmin, ymin, xmax, ymax };
  },
  grad_arc: function(e) {
    // Bbox serrée de l'arc : centre + points échantillonnés sur l'arc (coords monde).
    const { cx, cy, radius:r, spanAngle:span=180, startAngle:st=0, reverse=false } = e;
    const a0 = st * Math.PI / 180, sp = span * Math.PI / 180 * (reverse ? -1 : 1);
    let xmin = cx, xmax = cx, ymin = cy, ymax = cy;
    const steps = Math.max(8, Math.ceil(Math.abs(sp) / (Math.PI / 12)));
    for (let k = 0; k <= steps; k++) {
      const a = a0 + sp * (k / steps);
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      if (x < xmin) xmin = x; if (x > xmax) xmax = x;
      if (y < ymin) ymin = y; if (y > ymax) ymax = y;
    }
    return { xmin, ymin, xmax, ymax };
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
  },
  grad_arc: function(e, dx, dy) {
    e.cx += dx;
    e.cy += dy;
  }
};

// ======== ÉCLATEMENT (EXPLODE → primitives natives) ========
// Décompose un disque/règle gradué en entités natives (cercle/rect + lignes + textes)
// EN COORDONNÉES MONDE, fidèles au rendu. Le rendu travaille en pixels écran via w2s,
// qui inverse l'axe Y : un offset écran (ox,oy) correspond à un offset monde (ox, -oy)/zoom.
// D'où le -sin(ang) pour le disque et la règle dessinée vers le haut (y → y+width).
const GRADRULE_EXPLODE_HANDLERS = {
  grad_disk: function(e) {
    const { cx, cy, radius:gr, count:gn=100, labelEvery:gle=10, gradScale:ggs=1, textScale:gts=1, reverse:grev=false, rotation:grot=0, layer } = e;
    const dir = grev ? -1 : 1;
    const rotOff = -grot * Math.PI / 180;
    const out = [];
    out.push({ type:'circle', layer, cx, cy, r:gr });   // cercle principal
    out.push({ type:'point',  layer, x:cx, y:cy });      // point central
    const medEvery = Math.max(1, Math.floor(gle / 2));
    const majorLen = gr * 0.13 * ggs, medLen = gr * 0.08 * ggs, minorLen = gr * 0.04 * ggs;
    const textDist = gr - majorLen - gr * 0.07 * ggs;
    const tsize = Math.max(0.5, gr * 0.09 * gts);
    for (let i = 0; i < gn; i++) {
      const ang = rotOff + dir * (i / gn) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
      let tl = minorLen;
      if (i % gle === 0) tl = majorLen; else if (i % medEvery === 0) tl = medLen;
      out.push({ type:'line', layer, x1: cx + gr*ca, y1: cy - gr*sa,
                                     x2: cx + (gr-tl)*ca, y2: cy - (gr-tl)*sa });
      if (i % gle === 0) {
        const s = String(i), lx = cx + textDist*ca, ly = cy - textDist*sa;
        const w = s.length * tsize * 0.6;
        out.push({ type:'text', layer, x: lx - w/2, y: ly - tsize*0.35,
                   content: s, size: tsize, font: 'monospace' });
      }
    }
    return out;
  },
  grad_ruler: function(e) {
    const { length:rlen=200, width:rwid=30, count:rn=100,
            labelEvery:rle=10, gradScale:rgs=1, textScale:rts=1, reverse:rrev=false, layer } = e;
    const fr = _gradRulerFrame({ ...e, length:rlen, width:rwid });
    const out = [];
    // Cadre (polyligne fermée — gère le cas tourné comme axé)
    const k0=fr.P(0,0), k1=fr.P(1,0), k2=fr.P(1,1), k3=fr.P(0,1);
    out.push({ type:'polyline', layer, closed:true, points:[k0, k1, k2, k3, k0.slice()] });
    const medEvery = Math.max(1, Math.floor(rle / 2));
    const gMajor = 0.42 * rgs, gMed = 0.28 * rgs, gMinor = 0.16 * rgs;
    const tsize = Math.max(0.5, rwid * 0.22 * rts);
    for (let i = 0; i <= rn; i++) {
      const f = i / rn;
      let g = gMinor;
      if (i % rle === 0) g = gMajor; else if (i % medEvery === 0) g = gMed;
      const a = fr.P(f, 0), b = fr.P(f, g);
      out.push({ type:'line', layer, x1:a[0], y1:a[1], x2:b[0], y2:b[1] });        // bord bas
      const c = fr.P(f, 1), d = fr.P(f, 1 - g);
      out.push({ type:'line', layer, x1:c[0], y1:c[1], x2:d[0], y2:d[1] });        // bord haut
      if (i % rle === 0) {
        const s = String(rrev ? rn - i : i), w = s.length * tsize * 0.6;
        const lp = fr.P(f, 0.5);
        out.push({ type:'text', layer, x: lp[0] - w/2, y: lp[1] - tsize*0.35,
                   content: s, size: tsize, font: 'monospace' });
      }
    }
    return out;
  },
  grad_arc: function(e) {
    // Arc gradué → arc natif + point central + traits + labels (coords monde, angles monde).
    const { cx, cy, radius:gr, spanAngle:gspan=180, startAngle:gstart=0, count:gn=50,
            labelEvery:gle=5, gradScale:ggs=1, textScale:gts=1, reverse:grev=false, layer } = e;
    const a0 = gstart * Math.PI / 180;
    const span = gspan * Math.PI / 180 * (grev ? -1 : 1);
    const out = [];
    // Arc principal natif (stocké en angles monde, sa < ea)
    const sa = span >= 0 ? a0 : a0 + span;
    const ea = span >= 0 ? a0 + span : a0;
    out.push({ type:'arc', layer, cx, cy, r:gr, startAngle:sa, endAngle:ea });
    out.push({ type:'point', layer, x:cx, y:cy });
    const medEvery = Math.max(1, Math.floor(gle / 2));
    const majorLen = gr * 0.13 * ggs, medLen = gr * 0.08 * ggs, minorLen = gr * 0.04 * ggs;
    const textDist = gr - majorLen - gr * 0.07 * ggs;
    const tsize = Math.max(0.5, gr * 0.09 * gts);
    for (let i = 0; i <= gn; i++) {
      const a = a0 + span * (i / gn), ca = Math.cos(a), s2 = Math.sin(a);
      let tl = minorLen;
      if (i % gle === 0) tl = majorLen; else if (i % medEvery === 0) tl = medLen;
      out.push({ type:'line', layer, x1: cx + gr*ca, y1: cy + gr*s2,
                                     x2: cx + (gr-tl)*ca, y2: cy + (gr-tl)*s2 });
      if (i % gle === 0) {
        const str = String(i), w = str.length * tsize * 0.6;
        out.push({ type:'text', layer, x: cx + textDist*ca - w/2, y: cy + textDist*s2 - tsize*0.35,
                   content: str, size: tsize, font: 'monospace' });
      }
    }
    return out;
  }
};

// ======== DÉTECTION (hitTest — délégué depuis le cœur via pluginHitHandler) ========
// Chaque handler reçoit (e, wx, wy, tol) et renvoie une distance (pour la sélection) ou null.
const GRADRULE_HITTEST_HANDLERS = {
  grad_disk: function(e, wx, wy, tol) {
    const d = Math.hypot(wx - e.cx, wy - e.cy);
    if (Math.abs(d - e.radius) < tol) return Math.abs(d - e.radius); // près du cercle
    if (d < tol) return d;                                            // près du centre
    return null;
  },
  grad_ruler: function(e, wx, wy, tol) {
    // Projection du clic dans le repère local (gère la rotation). Intérieur sélectionnable.
    const fr = _gradRulerFrame(e);
    const dx = wx - fr.ox, dy = wy - fr.oy;
    const f = (dx*fr.ux[0] + dy*fr.ux[1]) / fr.L;   // 0..1 le long de la longueur
    const g = (dx*fr.uy[0] + dy*fr.uy[1]) / fr.W;   // 0..1 en travers
    const tf = tol / fr.L, tg = tol / fr.W;
    if (f >= -tf && f <= 1 + tf && g >= -tg && g <= 1 + tg) {
      const dEdge = Math.min(Math.abs(g), Math.abs(1 - g)) * fr.W;
      return Math.min(dEdge, tol * 0.5);
    }
    return null;
  },
  grad_arc: function(e, wx, wy, tol) {
    const r = e.radius;
    const d = Math.hypot(wx - e.cx, wy - e.cy);
    const inner = r - r * 0.13 * (e.gradScale || 1);
    if (d > r + tol || d < inner - tol) return null;
    // Dans la plage angulaire de l'arc ? (angles monde)
    const a0 = (e.startAngle || 0) * Math.PI / 180;
    const span = (e.spanAngle != null ? e.spanAngle : 180) * Math.PI / 180 * (e.reverse ? -1 : 1);
    const lo = Math.min(a0, a0 + span), hi = Math.max(a0, a0 + span);
    let a = Math.atan2(wy - e.cy, wx - e.cx);
    while (a < lo - 1e-9) a += Math.PI * 2;
    while (a > hi + 1e-9) a -= Math.PI * 2;
    if (a < lo - 1e-9 || a > hi + 1e-9) return null;
    return Math.abs(d - r);
  }
};

// ======== POIGNÉES (grips — délégué via pluginGripHandler) ========
// Chaque handler reçoit (e) et renvoie [{x, y, apply(ent,nx,ny)}].
const GRADRULE_GRIP_HANDLERS = {
  grad_disk: function(e) {
    const rot = (e.rotation || 0) * Math.PI / 180;
    return [
      { x: e.cx, y: e.cy, apply: (ent, nx, ny) => { ent.cx = nx; ent.cy = ny; } },           // déplacer
      { x: e.cx + e.radius*Math.cos(rot), y: e.cy + e.radius*Math.sin(rot),                   // rayon + orientation (repère 0)
        apply: (ent, nx, ny) => { ent.radius = Math.max(1, Math.hypot(nx-ent.cx, ny-ent.cy));
                                  ent.rotation = Math.atan2(ny-ent.cy, nx-ent.cx) * 180/Math.PI; } }
    ];
  },
  grad_arc: function(e) {
    const a0 = (e.startAngle || 0) * Math.PI / 180;
    const span = (e.spanAngle != null ? e.spanAngle : 180) * Math.PI / 180 * (e.reverse ? -1 : 1);
    const mid = a0 + span / 2;
    return [
      { x: e.cx, y: e.cy, apply: (ent, nx, ny) => { ent.cx = nx; ent.cy = ny; } },           // déplacer
      { x: e.cx + e.radius*Math.cos(a0), y: e.cy + e.radius*Math.sin(a0),                     // début (rayon + orientation)
        apply: (ent, nx, ny) => { ent.radius = Math.max(1, Math.hypot(nx-ent.cx, ny-ent.cy));
                                  ent.startAngle = Math.atan2(ny-ent.cy, nx-ent.cx) * 180/Math.PI; } },
      { x: e.cx + e.radius*Math.cos(mid), y: e.cy + e.radius*Math.sin(mid),                   // rayon (milieu d'arc)
        apply: (ent, nx, ny) => { ent.radius = Math.max(1, Math.hypot(nx-ent.cx, ny-ent.cy)); } }
    ];
  },
  grad_ruler: function(e) {
    const fr = _gradRulerFrame(e);
    const A = fr.P(1, 0), B = fr.P(0, 1);
    return [
      { x: fr.ox, y: fr.oy, apply: (ent, nx, ny) => { ent.x = nx; ent.y = ny; } },            // déplacer (origine)
      { x: A[0], y: A[1], apply: (ent, nx, ny) => {                                            // longueur + orientation
          const vx = nx-ent.x, vy = ny-ent.y;
          ent.length = Math.max(1, Math.hypot(vx, vy));
          ent.rotation = Math.atan2(vy, vx) * 180/Math.PI; } },
      { x: B[0], y: B[1], apply: (ent, nx, ny) => {                                            // largeur
          const f = _gradRulerFrame(ent);
          ent.width = Math.max(1, (nx-ent.x)*f.uy[0] + (ny-ent.y)*f.uy[1]); } }
    ];
  }
};

// ======== TRANSFORMATIONS (scale / rotate / mirror — via pluginTransformHandler) ========
// Méthode par points de contrôle : on transforme le centre/origine + un point de
// référence avec la transformation `tf` fournie par le cœur, puis on recalcule
// rayon/longueur/largeur/orientation. La réflexion inverse le sens de graduation.
const GRADRULE_TRANSFORM_HANDLERS = {
  grad_disk: function(e, tf, kind) {
    const rot = (e.rotation || 0) * Math.PI / 180;
    const c = tf(e.cx, e.cy);
    const r = tf(e.cx + e.radius*Math.cos(rot), e.cy + e.radius*Math.sin(rot));
    e.cx = c[0]; e.cy = c[1];
    e.radius = Math.max(0.1, Math.hypot(r[0]-c[0], r[1]-c[1]));
    e.rotation = Math.atan2(r[1]-c[1], r[0]-c[0]) * 180/Math.PI;
    if (kind === 'mirror') e.reverse = !e.reverse;
  },
  grad_arc: function(e, tf, kind) {
    const st = (e.startAngle || 0) * Math.PI / 180;
    const c = tf(e.cx, e.cy);
    const r = tf(e.cx + e.radius*Math.cos(st), e.cy + e.radius*Math.sin(st));
    e.cx = c[0]; e.cy = c[1];
    e.radius = Math.max(0.1, Math.hypot(r[0]-c[0], r[1]-c[1]));
    e.startAngle = Math.atan2(r[1]-c[1], r[0]-c[0]) * 180/Math.PI;
    if (kind === 'mirror') e.reverse = !e.reverse;
  },
  grad_ruler: function(e, tf, kind) {
    const fr = _gradRulerFrame(e);
    const O = tf(fr.ox, fr.oy);
    const A = tf(...fr.P(1, 0));
    const B = tf(...fr.P(0, 1));
    e.x = O[0]; e.y = O[1];
    e.length = Math.max(0.1, Math.hypot(A[0]-O[0], A[1]-O[1]));
    e.rotation = Math.atan2(A[1]-O[1], A[0]-O[0]) * 180/Math.PI;
    e.width = Math.max(0.1, Math.hypot(B[0]-O[0], B[1]-O[1]));
  }
};

// ======== ACCROCHE OBJET (OSNAP — via pluginSnapHandler) ========
// Chaque handler reçoit (e, wx, wy, check, modes) et appelle check(x, y, type, e)
// pour chaque point candidat à l'accroche.
const GRADRULE_SNAP_HANDLERS = {
  grad_disk: function(e, wx, wy, check, modes) {
    if (modes.center) check(e.cx, e.cy, 'center', e);
    if (modes.quadrant) {
      const r = e.radius;
      check(e.cx + r, e.cy, 'quadrant', e);   // E
      check(e.cx - r, e.cy, 'quadrant', e);   // O
      check(e.cx, e.cy + r, 'quadrant', e);   // S (Y monde)
      check(e.cx, e.cy - r, 'quadrant', e);   // N
    }
  },
  grad_arc: function(e, wx, wy, check, modes) {
    if (modes.center) check(e.cx, e.cy, 'center', e);
    const a0  = (e.startAngle || 0) * Math.PI / 180;
    const sp  = (e.spanAngle != null ? e.spanAngle : 180) * Math.PI / 180 * (e.reverse ? -1 : 1);
    const a1  = a0 + sp;
    const mid = a0 + sp / 2;
    const r   = e.radius;
    if (modes.endpoint) {
      check(e.cx + r * Math.cos(a0),  e.cy + r * Math.sin(a0),  'endpoint', e);
      check(e.cx + r * Math.cos(a1),  e.cy + r * Math.sin(a1),  'endpoint', e);
    }
    if (modes.midpoint) {
      check(e.cx + r * Math.cos(mid), e.cy + r * Math.sin(mid), 'midpoint', e);
    }
    if (modes.quadrant) {
      // Points de quadrant inclus dans la plage angulaire de l'arc
      const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
      for (const qa of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
        let a = qa; while (a < lo) a += 2 * Math.PI;
        if (a <= hi + 1e-9) check(e.cx + r * Math.cos(qa), e.cy + r * Math.sin(qa), 'quadrant', e);
      }
    }
  },
  grad_ruler: function(e, wx, wy, check, modes) {
    const fr = _gradRulerFrame(e);
    if (modes.endpoint) {
      const corners = [fr.P(0, 0), fr.P(1, 0), fr.P(1, 1), fr.P(0, 1)];
      corners.forEach(([x, y]) => check(x, y, 'endpoint', e));
    }
    if (modes.midpoint) {
      const [mx0, my0] = fr.P(0.5, 0);   check(mx0, my0, 'midpoint', e);  // bas
      const [mx1, my1] = fr.P(0.5, 1);   check(mx1, my1, 'midpoint', e);  // haut
      const [mx2, my2] = fr.P(0,   0.5); check(mx2, my2, 'midpoint', e);  // gauche
      const [mx3, my3] = fr.P(1,   0.5); check(mx3, my3, 'midpoint', e);  // droite
    }
  }
};

// ======== PROPRIÉTÉS (panneau Propriétés — via pluginPropsHandler) ========
// Chaque handler reçoit (e, {row, inp, id}) et renvoie une chaîne HTML de lignes
// .prop-row éditables. `inp(field,val)` câble le _propChange générique du cœur
// (champs numériques/texte directs). Les champs en % (gradScale/textScale) et le
// sens (reverse) passent par des handlers dédiés exposés sur window (ci-dessous),
// car les onchange inline sont résolus dans le scope global.
// On expose ici TOUTES les propriétés du dessin (comme dans le popup de création)
// + la position (CX/CY ou X/Y) et la rotation, qui définissent aussi le tracé.
const GRADRULE_PROPS_HANDLERS = {
  grad_disk: function(e, ui) {
    const { row, inp, id } = ui;
    let s  = row('CX', inp('cx', e.cx.toFixed(2)));
    s += row('CY', inp('cy', e.cy.toFixed(2)));
    s += row('Rayon', inp('radius', (e.radius || 0).toFixed(2)));
    s += row('Graduations', inp('count', e.count ?? 100));
    s += row('Label tous les', inp('labelEvery', e.labelEvery ?? 10));
    s += row('Taille grad.', _gradPctInput(id, 'gradScale', e.gradScale));
    s += row('Taille texte', _gradPctInput(id, 'textScale', e.textScale));
    s += row('Rotation (°)', inp('rotation', (e.rotation || 0)));
    s += row('Sens', _gradRevSelect(id, e.reverse, 'Horaire ↻', 'Antihoraire ↺'));
    return s;
  },
  grad_arc: function(e, ui) {
    const { row, inp, id } = ui;
    let s  = row('CX', inp('cx', e.cx.toFixed(2)));
    s += row('CY', inp('cy', e.cy.toFixed(2)));
    s += row('Rayon', inp('radius', (e.radius || 0).toFixed(2)));
    s += row('Angle (°)', inp('spanAngle', e.spanAngle ?? 180));
    s += row('Angle départ (°)', inp('startAngle', e.startAngle || 0));
    s += row('Graduations', inp('count', e.count ?? 50));
    s += row('Label tous les', inp('labelEvery', e.labelEvery ?? 5));
    s += row('Taille grad.', _gradPctInput(id, 'gradScale', e.gradScale));
    s += row('Taille texte', _gradPctInput(id, 'textScale', e.textScale));
    s += row('Sens', _gradRevSelect(id, e.reverse, 'Antihoraire ↺', 'Horaire ↻'));
    return s;
  },
  grad_ruler: function(e, ui) {
    const { row, inp, id } = ui;
    let s  = row('X', inp('x', e.x.toFixed(2)));
    s += row('Y', inp('y', e.y.toFixed(2)));
    s += row('Longueur', inp('length', (e.length || 0).toFixed(2)));
    s += row('Largeur', inp('width', (e.width || 0).toFixed(2)));
    s += row('Graduations', inp('count', e.count ?? 100));
    s += row('Label tous les', inp('labelEvery', e.labelEvery ?? 10));
    s += row('Taille grad.', _gradPctInput(id, 'gradScale', e.gradScale));
    s += row('Taille texte', _gradPctInput(id, 'textScale', e.textScale));
    s += row('Rotation (°)', inp('rotation', (e.rotation || 0)));
    s += row('Sens', _gradRevSelect(id, e.reverse, '0 à gauche →', '0 à droite ←'));
    return s;
  }
};

// — Helpers exposés sur window (appelés depuis les onchange inline du panneau) —

// Champ pourcentage pour les échelles (stockées en ratio : 1 = 100 %).
function _gradPctInput(id, field, ratio) {
  const pct = Math.round((ratio == null ? 1 : ratio) * 100);
  return '<input type="number" class="prop-input" step="any" value="' + pct +
         '" onchange="_gradPropScale(' + id + ',\'' + field + '\',this.value)" />' +
         '<span style="color:var(--text-dim);font-size:10px;margin-left:2px">%</span>';
}
window._gradPropScale = function(id, field, valPct) {
  const e = S.entities.find(en => en.id === id);
  if (!e) return;
  const n = parseFloat(valPct);
  if (isNaN(n) || n <= 0) return;
  pushUndo();
  e[field] = n / 100;
  render(); autoSave();
};

// Sélecteur de sens (reverse) avec libellés propres au type.
function _gradRevSelect(id, reverse, lbl0, lbl1) {
  return '<select class="prop-select" onchange="_gradPropReverse(' + id + ',this.value)">' +
    '<option value="false"' + (!reverse ? ' selected' : '') + '>' + lbl0 + '</option>' +
    '<option value="true"'  + ( reverse ? ' selected' : '') + '>' + lbl1 + '</option></select>';
}
window._gradPropReverse = function(id, val) {
  const e = S.entities.find(en => en.id === id);
  if (!e) return;
  pushUndo();
  e.reverse = (val === 'true' || val === true);
  render(); autoSave();
};

// ======== HTML POPUP (à injecter dans HTML) ========
// Style du bouton d'inversion de sens (auto-contenu, pas de CSS dans minicad.html)
const GRADRULE_REV_BTN_STYLE = 'flex:1;cursor:pointer;background:var(--input-bg);border:1px solid color-mix(in srgb,var(--ink) 16%,transparent);border-radius:4px;color:var(--text);padding:3px 6px;font-size:11px';
const GRADRULE_HTML = `
<div class="tube-def-popup" id="grad-popup">
  <div class="tdp-title" id="grad-popup-title">Disque gradué</div>
  <div id="grad-disk-params">
    <div class="tdp-row"><span class="tdp-lbl">Rayon</span><input type="text" inputmode="decimal" id="gd-radius" value="75"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Graduations</span><input type="text" inputmode="decimal" id="gd-count" value="100"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Label tous les</span><input type="text" inputmode="decimal" id="gd-label-every" value="10"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille grad.</span><input type="text" inputmode="decimal" id="gd-grad-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille texte</span><input type="text" inputmode="decimal" id="gd-text-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Sens</span><button type="button" class="grad-rev-btn" id="gd-reverse" data-rev="0" data-lbl0="Horaire ↻" data-lbl1="Antihoraire ↺" style="${GRADRULE_REV_BTN_STYLE}">Horaire ↻</button></div>
  </div>
  <div id="grad-ruler-params" style="display:none">
    <div class="tdp-row"><span class="tdp-lbl">Longueur</span><input type="text" inputmode="decimal" id="gr-length" value="200"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Largeur</span><input type="text" inputmode="decimal" id="gr-width" value="30"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Graduations</span><input type="text" inputmode="decimal" id="gr-count" value="100"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Label tous les</span><input type="text" inputmode="decimal" id="gr-label-every" value="10"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille grad.</span><input type="text" inputmode="decimal" id="gr-grad-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille texte</span><input type="text" inputmode="decimal" id="gr-text-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Sens</span><button type="button" class="grad-rev-btn" id="gr-reverse" data-rev="0" data-lbl0="0 à gauche →" data-lbl1="0 à droite ←" style="${GRADRULE_REV_BTN_STYLE}">0 à gauche →</button></div>
  </div>
  <div id="grad-arc-params" style="display:none">
    <div class="tdp-row"><span class="tdp-lbl">Rayon</span><input type="text" inputmode="decimal" id="ga-radius" value="75"><span class="tdp-unit">mm</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Angle</span><input type="text" inputmode="decimal" id="ga-angle" value="180"><span class="tdp-unit">°</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Graduations</span><input type="text" inputmode="decimal" id="ga-count" value="50"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Label tous les</span><input type="text" inputmode="decimal" id="ga-label-every" value="5"><span class="tdp-unit">traits</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille grad.</span><input type="text" inputmode="decimal" id="ga-grad-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Taille texte</span><input type="text" inputmode="decimal" id="ga-text-size" value="100"><span class="tdp-unit">%</span></div>
    <div class="tdp-row"><span class="tdp-lbl">Sens</span><button type="button" class="grad-rev-btn" id="ga-reverse" data-rev="0" data-lbl0="Antihoraire ↺" data-lbl1="Horaire ↻" style="${GRADRULE_REV_BTN_STYLE}">Antihoraire ↺</button></div>
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
  gradrule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="8" width="20" height="8" rx="1"/><line x1="6" y1="8" x2="6" y2="13"/><line x1="10" y1="8" x2="10" y2="11"/><line x1="14" y1="8" x2="14" y2="13"/><line x1="18" y1="8" x2="18" y2="11"/><line x1="6" y1="16" x2="6" y2="11"/><line x1="10" y1="16" x2="10" y2="13"/><line x1="14" y1="16" x2="14" y2="11"/><line x1="18" y1="16" x2="18" y2="13"/></svg>',
  gradarc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 19 A 11 11 0 0 1 21 19"/><line x1="3" y1="19" x2="3" y2="15.5"/><line x1="7.6" y1="12" x2="8.7" y2="15"/><line x1="12" y1="8" x2="12" y2="11.5"/><line x1="16.4" y1="12" x2="15.3" y2="15"/><line x1="21" y1="19" x2="21" y2="15.5"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></svg>'
};

// ======== ÉVÉNEMENTS ========
// Bascule un bouton d'inversion de sens (met à jour data-rev + libellé)
function _gradToggleRev(btn) {
  const rev = btn.dataset.rev === '1';
  btn.dataset.rev = rev ? '0' : '1';
  btn.textContent = rev ? btn.dataset.lbl0 : btn.dataset.lbl1;
}

function initGradPopupButtons() {
  const okBtn = document.getElementById('grad-popup-ok');
  const cancelBtn = document.getElementById('grad-popup-cancel');
  if (okBtn) okBtn.addEventListener('click', applyGradDef);
  if (cancelBtn) cancelBtn.addEventListener('click', closeGradPopup);
  // Boutons d'inversion de sens (délégation : survivent aux ré-affichages)
  const popup = document.getElementById('grad-popup');
  if (popup) popup.addEventListener('click', (ev) => {
    const b = ev.target.closest('.grad-rev-btn');
    if (b) { ev.preventDefault(); _gradToggleRev(b); }
  });
}

// Close on outside click
document.addEventListener('mousedown', (e) => {
  const p = document.getElementById('grad-popup');
  if (p && p.classList.contains('show') && !p.contains(e.target)) {
    closeGradPopup();
  }
}, true);

// Close on ESC (l'annulation du placement aiPendingEntities est gérée par le handler intégré)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const p = document.getElementById('grad-popup');
    if (p && p.classList.contains('show')) {
      closeGradPopup();
      e.preventDefault();
    }
  }
});

// Export plugin (enregistre en global pour que loadPlugin le trouve)
window.GRADRULE_PLUGIN = {
  name: 'gradrule',
  version: '1.1',
  desc: 'Disques, règles et arcs gradués (GRADISC, GRADRULE, GRADARC)',
  commands: GRADRULE_COMMANDS,
  renderCases: GRADRULE_RENDER_CASES,
  bboxHandlers: GRADRULE_BBOX_HANDLERS,
  moveHandlers: GRADRULE_MOVE_HANDLERS,
  explodeHandlers: GRADRULE_EXPLODE_HANDLERS,
  hitTestHandlers: GRADRULE_HITTEST_HANDLERS,
  gripHandlers: GRADRULE_GRIP_HANDLERS,
  transformHandlers: GRADRULE_TRANSFORM_HANDLERS,
  snapHandlers: GRADRULE_SNAP_HANDLERS,
  propsHandlers: GRADRULE_PROPS_HANDLERS,
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

    // Créer / compléter la barre d'outils du plugin.
    // Note : _tbApplyLayout (chargé avant le plugin) peut avoir recréé une coquille
    // VIDE de la barre depuis un layout sauvegardé, car les boutons n'étaient pas
    // encore enregistrés. On gère ce cas en remplissant la barre si nécessaire.
    const dockArea = document.getElementById('dock-area');
    let tb = document.getElementById('tb-gradrule');
    if (!tb && dockArea) {
      tb = document.createElement('div');
      tb.className = 'cad-toolbar docked';
      tb.id = 'tb-gradrule';
      tb.dataset.name = 'Graduations';
      tb.innerHTML = `
        <div class="tb-grip" onmousedown="startTBDrag(event,'tb-gradrule')" ondblclick="toggleTBDock('tb-gradrule')">⋮⋮</div>
        <div class="tb-header" onmousedown="startTBDrag(event,'tb-gradrule')" ondblclick="toggleTBDock('tb-gradrule')">
          <span class="tb-title">Graduations</span><span class="tb-close" onclick="hideToolbar('tb-gradrule')">×</span>
        </div>
        <div class="tb-buttons"></div>`;
      dockArea.appendChild(tb);
    }
    // S'assurer que CHAQUE bouton existe (coquille vide, barre neuve, ou ancienne
    // barre d'une version précédente du plugin → on ajoute le bouton manquant).
    if (tb) {
      const cont = tb.querySelector('.tb-buttons');
      if (cont) {
        const ensure = (id, title, cmd, icon) => {
          if (!cont.querySelector(`[data-tbid="${id}"]`))
            cont.insertAdjacentHTML('beforeend',
              `<button class="tool-btn" data-tbid="${id}" title="${title}" onclick="executeCommand('${cmd}')">${icon}</button>`);
        };
        ensure('gradisc', 'Disque gradué (GRADISC)', 'GRADISC', GRADRULE_ICONS.gradisc);
        ensure('gradrule', 'Règle graduée (GRADRULE)', 'GRADRULE', GRADRULE_ICONS.gradrule);
        ensure('gradarc', 'Arc gradué (GRADARC)', 'GRADARC', GRADRULE_ICONS.gradarc);
        // Enregistrer les boutons dans le registre des toolbars personnalisables
        if (typeof TB_REGISTRY === 'object' && TB_REGISTRY) {
          cont.querySelectorAll('[data-tbid]').forEach(btn => {
            const id = btn.dataset.tbid;
            TB_REGISTRY[id] = { el: btn,
              label: (btn.getAttribute('title')||id).replace(/\s*\(.*?\)\s*$/,'').trim(),
              group: 'Graduations' };
          });
        }
      }
    }
  }
};
