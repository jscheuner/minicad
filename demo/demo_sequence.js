// demo/demo_sequence.js — Séquence démo automatique MiniCAD
// Injecté par build.py --demo entre @@DEMO_BEGIN / @@DEMO_END
// Activé par ?demo dans l'URL (ex: minicad.html?demo)

(function () {
  const IS_DEMO = location.search.includes('demo') || location.hash.includes('demo');

  // ── Bouton DÉMO toujours visible (même sans ?demo) ────────────────────
  window.addEventListener('load', () => {
    // Conteneur groupé en bas à droite, au-dessus de la zone terminal
    const wrap = document.createElement('div');
    wrap.style.cssText = [
      'position:fixed', 'bottom:52px', 'right:14px',
      'display:flex', 'flex-direction:column', 'align-items:flex-end',
      'gap:6px', 'z-index:9998'
    ].join(';');

    const btn = document.createElement('button');
    btn.id = 'demo-launch-entry';
    btn.textContent = '▶  DÉMO';
    btn.style.cssText = [
      'background:#ffd700', 'color:#0a0f1a',
      'border:none', 'border-radius:4px', 'padding:6px 14px',
      'font:700 12px "JetBrains Mono",monospace',
      'cursor:pointer',
      'box-shadow:0 2px 8px rgba(0,0,0,0.45)',
      'letter-spacing:.04em',
      'transition:background .2s'
    ].join(';');
    btn.onmouseenter = () => { btn.style.background = '#ffe94d'; };
    btn.onmouseleave = () => { btn.style.background = '#ffd700'; };
    btn.onclick = () => {
      if (!IS_DEMO) { location.href = location.pathname + '?demo'; }
      else if (_demoRunning) { _demoRunning = false; location.href = location.pathname; }
      else { S.entities = []; render(); startDemo(); }
    };
    wrap.appendChild(btn);

    const lp = document.createElement('a');
    lp.href = 'https://liberapay.com/MiniCAD/donate';
    lp.target = '_blank';
    lp.rel = 'noopener';
    lp.title = 'Donate using Liberapay';
    lp.style.cssText = 'display:block;line-height:0';
    const lpImg = document.createElement('img');
    lpImg.alt = 'Donate using Liberapay';
    lpImg.src = 'https://liberapay.com/assets/widgets/donate.svg';
    lpImg.style.cssText = 'height:26px;display:block';
    lp.appendChild(lpImg);
    wrap.appendChild(lp);

    document.body.appendChild(wrap);

    // remplacer par le bouton géré par la démo si on est en mode démo
    if (IS_DEMO) window._demoBtnEntry = btn;
  });

  if (!IS_DEMO) return;

  // ── Utilitaires ──────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function worldToCanvas(wx, wy) {
    // Coordonnées canvas (pixels, pas screen)
    const sx = (wx - S.panX) * S.zoom + canvas.width  / 2;
    const sy = -(wy - S.panY) * S.zoom + canvas.height / 2;
    return [sx, sy];
  }

  function worldToScreen(wx, wy) {
    const rect = canvas.getBoundingClientRect();
    const [sx, sy] = worldToCanvas(wx, wy);
    return [
      rect.left + sx * (rect.width  / canvas.width),
      rect.top  + sy * (rect.height / canvas.height)
    ];
  }

  function addEnt(e) {
    e.id    = S.nextId++;
    e.layer = S.currentLayer;
    S.entities.push(e);
    render();
  }

  // ── Curseur flottant (pour navigation toolbar) ────────────────────────
  let dot;
  function createDot() {
    dot = document.createElement('div');
    dot.id = 'demo-dot';
    dot.style.cssText = [
      'position:fixed', 'width:16px', 'height:16px', 'border-radius:50%',
      'background:rgba(255,215,0,0.92)', 'border:2px solid rgba(0,0,0,0.5)',
      'box-shadow:0 0 10px #ffd70099', 'pointer-events:none', 'z-index:9999',
      'transform:translate(-50%,-50%)',
      'display:none'
    ].join(';');
    document.body.appendChild(dot);
  }

  function dotPos(px, py) {
    dot.style.left = px + 'px';
    dot.style.top  = py + 'px';
  }

  async function dotMoveTo(px, py, ms) {
    dot.style.display = 'block';
    dot.style.transition = `left ${ms}ms cubic-bezier(.4,0,.2,1), top ${ms}ms cubic-bezier(.4,0,.2,1)`;
    dotPos(px, py);
    await sleep(ms + 80);
  }

  async function dotClick() {
    dot.style.transition = 'transform .12s';
    dot.style.transform = 'translate(-50%,-50%) scale(1.6)';
    await sleep(140);
    dot.style.transform = 'translate(-50%,-50%) scale(1)';
    await sleep(320);
  }

  // ── Curseur canvas MiniCAD (vrais réticules) ──────────────────────────
  // Anime S.mouseScreen avec easing et appelle render() à chaque frame
  let _cursorAnim = null;

  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  async function moveCursor(wx, wy, ms) {
    if (_cursorAnim) { _cursorAnim.cancel = true; }
    dot.style.display = 'none';   // cacher le dot pendant qu'on dessine
    mouseOnCanvas = true;

    const startX = S.mouseScreen ? S.mouseScreen[0] : canvas.width  / 2;
    const startY = S.mouseScreen ? S.mouseScreen[1] : canvas.height / 2;
    const [endX, endY] = worldToCanvas(wx, wy);

    const anim = { cancel: false };
    _cursorAnim = anim;
    const t0 = performance.now();

    await new Promise(resolve => {
      function frame(now) {
        if (anim.cancel) { resolve(); return; }
        const t = Math.min(1, (now - t0) / ms);
        const e = easeInOut(t);
        S.mouseScreen = [
          startX + (endX - startX) * e,
          startY + (endY - startY) * e
        ];
        render();
        if (t < 1) requestAnimationFrame(frame);
        else { resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  async function clickWorld(wx, wy, moveMs) {
    await moveCursor(wx, wy, moveMs || 1600);
    // Pulse visuel : cercle flash sur le canvas
    const [cx, cy] = worldToCanvas(wx, wy);
    const ctx = canvas.getContext('2d');
    for (let r = 4; r <= 18; r += 7) {
      render();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,215,0,0.7)';
      ctx.lineWidth   = 2;
      ctx.stroke();
      await sleep(50);
    }
    await sleep(120);
  }

  // ── Sélection style de cote dans le panneau latéral ─────────────────
  async function selectDimStyle(name) {
    const sel = document.querySelector('#dimstyle-panel select');
    if (!sel) { _dsSet(name); return; }

    mouseOnCanvas = false;
    S.mouseScreen = null;
    render();

    const rect = sel.getBoundingClientRect();
    const px   = rect.left + rect.width  / 2;
    const py   = rect.top  + rect.height / 2;

    dot.style.display = 'block';
    dot.style.transition = 'left 840ms cubic-bezier(.4,0,.2,1), top 840ms cubic-bezier(.4,0,.2,1)';
    dotPos(px, py);
    await sleep(960);

    sel.style.outline = '2px solid #ffd700';
    sel.style.boxShadow = '0 0 8px #ffd70088';
    await dotClick();

    _dsSet(name);          // applique le style + rafraîchit le select
    sel.value = name;      // met le select à jour visuellement

    await sleep(500);
    sel.style.outline = '';
    sel.style.boxShadow = '';
    dot.style.display = 'none';
    await sleep(400);
  }

  // ── Clic sur un bouton toolbar ────────────────────────────────────────
  async function clickToolBtn(toolName) {
    const btn = document.querySelector(`[data-tool="${toolName}"]`);
    if (!btn) return;

    mouseOnCanvas = false;
    S.mouseScreen = null;
    render();

    const rect  = btn.getBoundingClientRect();
    const px    = rect.left + rect.width  / 2;
    const py    = rect.top  + rect.height / 2;

    // Déplacer le dot vers le bouton
    dot.style.display = 'block';
    dot.style.transition = 'left 840ms cubic-bezier(.4,0,.2,1), top 840ms cubic-bezier(.4,0,.2,1)';
    dotPos(px, py);
    await sleep(960);

    // Flash doré sur le bouton
    const origOutline = btn.style.outline;
    btn.style.outline = '2px solid #ffd700';
    btn.style.boxShadow = '0 0 8px #ffd70088';
    await dotClick();
    await sleep(240);
    btn.style.outline = origOutline || '';
    btn.style.boxShadow = '';

    dot.style.display = 'none';
    await sleep(400);
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

  function demoBtnRunning(running) {
    const btn = window._demoBtnEntry;
    if (!btn) return;
    btn.textContent  = running ? '✕  Sortir du mode démo' : '▶  DÉMO';
    btn.style.background = running ? '#ffb300' : '#ffd700';
    btn.style.cursor = 'pointer';
  }

  // ── IPE 160 simplifié ─────────────────────────────────────────────────
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
    demoBtnRunning(true);

    S.entities = []; S.selected = [];
    S.panX = 0; S.panY = 0; S.zoom = 1.1;
    mouseOnCanvas = false;
    S.mouseScreen = null;
    termPrint('━━ Démo MiniCAD ━━', 'info');
    render();
    await sleep(1000);

    // ── 1. Lignes — LINE ──────────────────────────────────────────────
    await explain('Lignes — LINE');
    await clickToolBtn('line');
    S.tool = 'line';

    termPrint('LINE', 'info');
    await clickWorld(-220, -130);
    await clickWorld( 220, -130, 1400);
    addEnt({ type:'line', x1:-220, y1:-130, x2: 220, y2:-130 });
    await clickWorld( 220,  130, 1400);
    addEnt({ type:'line', x1: 220, y1:-130, x2: 220, y2: 130 });
    await clickWorld(-220,  130, 1400);
    addEnt({ type:'line', x1: 220, y1: 130, x2:-220, y2: 130 });
    await clickWorld(-220, -130, 1400);
    addEnt({ type:'line', x1:-220, y1: 130, x2:-220, y2:-130 });
    await sleep(600);

    if (!_demoRunning) return;

    // ── 2. Cercle — CIRCLE ────────────────────────────────────────────
    await explain('Cercle — CIRCLE', 0);
    await clickToolBtn('circle');
    S.tool = 'circle';

    termPrint('CIRCLE', 'info');
    await clickWorld(0, 0, 1400);
    await moveCursor(0, 65, 1200);
    addEnt({ type:'circle', cx:0, cy:0, r:65 });
    await sleep(700);

    if (!_demoRunning) return;

    // ── 3. Polyligne — POLYLINE ───────────────────────────────────────
    await explain('Polyligne — POLYLINE', 0);
    await clickToolBtn('polyline');
    S.tool = 'polyline';

    termPrint('PL', 'info');
    const tri = [[-190,-120],[-90,-120],[-140,-30],[-190,-120]];
    for (const [tx,ty] of tri.slice(0,-1)) await clickWorld(tx, ty, 1400);
    addEnt({ type:'polyline', points:tri, closed:false });
    await sleep(600);

    if (!_demoRunning) return;

    // ── 4. Arc — ARC ──────────────────────────────────────────────────
    await explain('Arc — ARC', 0);
    await clickToolBtn('arc');
    S.tool = 'arc';

    termPrint('ARC', 'info');
    await moveCursor(110, 60, 1400);
    addEnt({ type:'arc', cx:110, cy:0, r:60, startAngle: Math.PI/6, endAngle: 5*Math.PI/6 });
    await sleep(700);

    if (!_demoRunning) return;

    // ── 5. Hachures — HATCH ───────────────────────────────────────────
    await explain('Hachures — HATCH', 0);
    await clickToolBtn('hatch');
    S.tool = 'pick';

    termPrint('H', 'info');
    await moveCursor(-140, -90, 1400);
    addEnt({ type:'hatch', points:[[-190,-120],[-90,-120],[-140,-30]], angle:45, spacing:14, pattern:'lines' });
    await sleep(700);

    if (!_demoRunning) return;

    // ── 6. Raccord — FILLET ───────────────────────────────────────────
    await explain('Raccord — FILLET (r=30)', 0);
    await clickToolBtn('fillet');
    S.tool = 'pick';

    termPrint('F 30', 'info');
    await clickWorld(-220, -50, 1400);   // clic sur la ligne verticale gauche
    await clickWorld(-160, -130, 1400);  // clic sur la ligne horizontale basse

    // Raccourcir les deux lignes aux points de tangence (r=30)
    const bLine = S.entities.find(e => e.type==='line' && Math.abs(e.x1+220)<1 && Math.abs(e.y1+130)<1 && Math.abs(e.y2+130)<1);
    if (bLine) bLine.x1 = -190;   // tangente sur ligne basse
    const lLine = S.entities.find(e => e.type==='line' && Math.abs(e.x1+220)<1 && Math.abs(e.x2+220)<1 && Math.abs(e.y2+130)<1);
    if (lLine) lLine.y2 = -100;   // tangente sur ligne gauche

    addEnt({ type:'arc', cx:-190, cy:-100, r:30, startAngle:-Math.PI, endAngle:-Math.PI/2 });
    await sleep(700);

    if (!_demoRunning) return;

    // ── 7. Cotation 1:10 — DIMLINEAR ─────────────────────────────────
    await explain('Cotation 1:10 — DIMLINEAR', 0);
    S.tool = 'pick';
    await selectDimStyle('1:10');

    termPrint('DIMLINEAR', 'info');
    await clickWorld(-220, -130, 1400);
    await clickWorld( 220, -130, 1400);
    addEnt({ type:'dim_linear', x1:-220, y1:-130, x2:220, y2:-130, isHoriz:true, offset:-40, dimStyle:'1:10' });
    await sleep(700);

    if (!_demoRunning) return;

    // ── 8. Offset cercle — OFFSET ─────────────────────────────────────
    await explain('Décalage — OFFSET 20', 0);
    await clickToolBtn('offset');
    S.tool = 'pick';

    termPrint('OFFSET 20', 'info');
    await moveCursor(0, 65, 1400);
    addEnt({ type:'circle', cx:0, cy:0, r:85 });
    await sleep(700);

    if (!_demoRunning) return;

    // ── 9. Profilé IPE 160 ────────────────────────────────────────────
    await explain('Bibliothèque — IPE 160', 0);
    mouseOnCanvas = false;
    S.mouseScreen = null;
    render();

    termPrint('ipe 160', 'info');
    await sleep(700);
    dot.style.display = 'none';
    await moveCursor(140, 0, 1400);
    ipeProfile(140, 0);
    await sleep(800);

    if (!_demoRunning) return;

    // ── 10. Texte — TEXT ─────────────────────────────────────────────
    await explain('Annotation — TEXT', 0);
    await clickToolBtn('text_place');
    S.tool = 'text_place';

    termPrint('TEXT', 'info');
    await clickWorld(-205, 118, 1400);
    addEnt({ type:'text', x:-205, y:118, content:'MiniCAD v0.09', size:14 });
    await sleep(800);

    if (!_demoRunning) return;

    // ── Fin ───────────────────────────────────────────────────────────
    mouseOnCanvas = false;
    S.mouseScreen = null;
    S.tool = 'select';
    dot.style.display = 'none';
    render();

    await explain('✓  Dessin technique 2D — un seul fichier HTML', 3600);
    termPrint('━━ Fin démo — rechargement… ━━', 'success');

    await sleep(2000);
    _demoRunning = false;
    demoBtnRunning(false);
    startDemo();
  }

  // ── Démarrage après init MiniCAD ──────────────────────────────────────
  window.addEventListener('load', () => {
    setTimeout(() => {
      createDot();
      createPanel();
      startDemo();
    }, 900);
  });

})();
