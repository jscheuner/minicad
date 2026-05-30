// demo/demo_sequence.js — Séquence démo automatique MiniCAD
// Injecté par build.py --demo entre @@DEMO_BEGIN / @@DEMO_END
// Activé par ?demo dans l'URL (ex: minicad.html?demo)

(function () {
  if (!location.search.includes('demo') && !location.hash.includes('demo')) return;

  // ── Utilitaires ──────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function worldToScreen(wx, wy) {
    const cv = document.getElementById('main-canvas');
    const rect = cv.getBoundingClientRect();
    const sx = (wx - S.panX) * S.zoom + cv.width  / 2;
    const sy = -(wy - S.panY) * S.zoom + cv.height / 2;
    return [rect.left + sx * (rect.width  / cv.width),
            rect.top  + sy * (rect.height / cv.height)];
  }

  function addEnt(e) {
    e.id    = S.nextId++;
    e.layer = S.currentLayer;
    S.entities.push(e);
    render();
  }

  // ── Curseur simulé ────────────────────────────────────────────────────
  let dot;
  function createCursor() {
    dot = document.createElement('div');
    dot.id = 'demo-cursor';
    dot.style.cssText = [
      'position:fixed', 'width:18px', 'height:18px', 'border-radius:50%',
      'background:rgba(255,215,0,0.9)', 'border:2px solid rgba(0,0,0,0.5)',
      'box-shadow:0 0 10px #ffd70099', 'pointer-events:none', 'z-index:9999',
      'transform:translate(-50%,-50%)',
      'transition:left .55s cubic-bezier(.4,0,.2,1),top .55s cubic-bezier(.4,0,.2,1)',
      'display:none'
    ].join(';');
    document.body.appendChild(dot);
  }

  async function moveTo(wx, wy, delay) {
    const [sx, sy] = worldToScreen(wx, wy);
    dot.style.display = 'block';
    dot.style.left = sx + 'px';
    dot.style.top  = sy + 'px';
    if (delay) await sleep(delay);
  }

  async function click(wx, wy) {
    await moveTo(wx, wy, 620);
    dot.style.transform = 'translate(-50%,-50%) scale(1.7)';
    dot.style.transition = 'transform .1s';
    await sleep(130);
    dot.style.transform = 'translate(-50%,-50%) scale(1)';
    dot.style.transition = [
      'left .55s cubic-bezier(.4,0,.2,1)',
      'top .55s cubic-bezier(.4,0,.2,1)',
      'transform .2s'
    ].join(',');
    await sleep(200);
  }

  // ── Bandeau d'explication ─────────────────────────────────────────────
  let panel;
  function createPanel() {
    panel = document.createElement('div');
    panel.id = 'demo-panel';
    panel.style.cssText = [
      'position:fixed', 'top:58px', 'left:50%', 'transform:translateX(-50%)',
      'background:rgba(10,15,26,0.93)', 'color:#ffd700',
      'padding:5px 22px', 'border-radius:20px',
      'font:600 13px/1.6 "JetBrains Mono",monospace',
      'z-index:9998', 'pointer-events:none',
      'border:1px solid rgba(255,215,0,0.35)',
      'transition:opacity .3s', 'opacity:0', 'white-space:nowrap'
    ].join(';');
    document.body.appendChild(panel);
  }

  async function explain(text, hold) {
    panel.textContent = text;
    panel.style.opacity = '1';
    if (hold) { await sleep(hold); panel.style.opacity = '0'; await sleep(280); }
  }

  // ── Bouton Rejouer ────────────────────────────────────────────────────
  function createReplayBtn() {
    const btn = document.createElement('button');
    btn.id = 'demo-replay';
    btn.textContent = '▶  Rejouer';
    btn.style.cssText = [
      'position:fixed', 'bottom:62px', 'right:18px',
      'background:#ffd700', 'color:#0a0f1a',
      'border:none', 'border-radius:4px', 'padding:7px 15px',
      'font:600 12px "JetBrains Mono",monospace',
      'cursor:pointer', 'z-index:9998',
      'box-shadow:0 2px 8px rgba(0,0,0,0.45)'
    ].join(';');
    btn.onclick = () => { _demoRunning = false; S.entities = []; render(); startDemo(); };
    document.body.appendChild(btn);
  }

  // ── IPE 160 simplifié (section en I sans congés) ──────────────────────
  function ipeProfile(cx, cy) {
    const h=160, b=82, tw=5.0, tf=7.4;
    const hh=h/2, bh=b/2, th=tw/2;
    addEnt({ type:'polyline', points:[
      [cx-bh, cy-hh], [cx+bh, cy-hh], [cx+bh, cy-hh+tf],
      [cx+th, cy-hh+tf], [cx+th, cy+hh-tf],
      [cx+bh, cy+hh-tf], [cx+bh, cy+hh],
      [cx-bh, cy+hh], [cx-bh, cy+hh-tf],
      [cx-th, cy+hh-tf], [cx-th, cy-hh+tf],
      [cx-bh, cy-hh+tf], [cx-bh, cy-hh]
    ], closed: false });
  }

  // ── Séquence principale ───────────────────────────────────────────────
  let _demoRunning = false;

  async function startDemo() {
    if (_demoRunning) return;
    _demoRunning = true;

    S.entities = []; S.selected = [];
    S.panX = 0; S.panY = 0; S.zoom = 1.1;
    termPrint('━━ Démo MiniCAD ━━', 'info');
    render();
    await sleep(500);

    // ── 1. Cadre de travail (4 lignes) ───────────────────────────────
    await explain('Lignes — LINE');
    termPrint('LINE', 'info');
    await click(-220, -130); await click( 220, -130);
    addEnt({ type:'line', x1:-220, y1:-130, x2: 220, y2:-130 });
    await click( 220,  130);
    addEnt({ type:'line', x1: 220, y1:-130, x2: 220, y2: 130 });
    await click(-220,  130);
    addEnt({ type:'line', x1: 220, y1: 130, x2:-220, y2: 130 });
    await click(-220, -130);
    addEnt({ type:'line', x1:-220, y1: 130, x2:-220, y2:-130 });
    await sleep(350);

    if (!_demoRunning) return;

    // ── 2. Cercle central ────────────────────────────────────────────
    await explain('Cercle — CIRCLE');
    termPrint('CIRCLE', 'info');
    await click(0, 0); await moveTo(0, 65, 550);
    addEnt({ type:'circle', cx:0, cy:0, r:65 });
    await sleep(350);

    if (!_demoRunning) return;

    // ── 3. Polyligne en triangle ──────────────────────────────────────
    await explain('Polyligne — POLYLINE');
    termPrint('PL', 'info');
    const tri = [[-190,-120],[-90,-120],[-140,-30],[-190,-120]];
    for (const [tx,ty] of tri.slice(0,-1)) await click(tx, ty);
    addEnt({ type:'polyline', points:tri, closed:false });
    await sleep(350);

    if (!_demoRunning) return;

    // ── 4. Hachures sur le triangle ───────────────────────────────────
    await explain('Hachures — HATCH');
    termPrint('H', 'info');
    await moveTo(-140, -90, 700);
    addEnt({ type:'hatch', points:[[-190,-120],[-90,-120],[-140,-30]], angle:45, spacing:14, pattern:'lines' });
    await sleep(400);

    if (!_demoRunning) return;

    // ── 5. Cotation linéaire ──────────────────────────────────────────
    await explain('Cotation — DIMLINEAR');
    termPrint('DIMLINEAR', 'info');
    await click(-220, -130); await click(220, -130);
    addEnt({ type:'dim_linear', x1:-220, y1:-130, x2:220, y2:-130, isHoriz:true, offset:-40 });
    await sleep(350);

    if (!_demoRunning) return;

    // ── 6. Décalage du cercle ─────────────────────────────────────────
    await explain('Décalage — OFFSET 20');
    termPrint('OFFSET 20', 'info');
    await moveTo(0, 65, 800);
    addEnt({ type:'circle', cx:0, cy:0, r:85 });
    await sleep(350);

    if (!_demoRunning) return;

    // ── 7. Profilé IPE 160 (bibliothèque) ────────────────────────────
    await explain('Bibliothèque — IPE 160');
    termPrint('ipe 160', 'info');
    await moveTo(140, 0, 800);
    ipeProfile(140, 0);
    await sleep(500);

    if (!_demoRunning) return;

    // ── 8. Texte ──────────────────────────────────────────────────────
    await explain('Annotation — TEXT');
    termPrint('TEXT', 'info');
    await click(-210, 115);
    addEnt({ type:'text', x:-210, y:115, content:'MiniCAD v0.09', size:14 });
    await sleep(500);

    if (!_demoRunning) return;

    // ── Fin et boucle ─────────────────────────────────────────────────
    dot.style.display = 'none';
    await explain('✓  Dessin technique 2D — un seul fichier HTML', 2800);
    termPrint('━━ Fin démo — rechargement… ━━', 'success');

    await sleep(1200);
    _demoRunning = false;
    startDemo();
  }

  // ── Démarrage après init MiniCAD ──────────────────────────────────────
  window.addEventListener('load', () => {
    setTimeout(() => {
      createCursor();
      createPanel();
      createReplayBtn();
      startDemo();
    }, 900);
  });

})();
