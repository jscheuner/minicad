// Acier à U — section en U à ailes inclinées (pente 8 %)
// UNE SEULE polyligne fermée avec bulge pour les arcs
// Paramètres : h, b, d (âme), t (aile moy.), optionnels r1, r2, slope

function drawProfileU(p, x, y) {
  var api = window.minicadAPI;
  var m  = (p.slope != null ? p.slope : 0.08);
  var hh = p.h / 2, b = p.b, tw = p.d, tf = p.t;
  var r1 = (p.r1 != null ? p.r1 : tw);
  var r2 = (p.r2 != null ? p.r2 : tw / 2);
  var s1 = Math.sqrt(1 + m * m), PI = Math.PI;

  var c   = hh - tf - m * b / 2;
  var uc2 = b - r2,  vc2 = m * uc2 + c + r2 * s1;
  var uc1 = tw + r1, vc1 = m * uc1 + c - r1 * s1;
  var aT  = Math.atan2(-1,  m);
  var aR  = Math.atan2( 1, -m);

  // Extrémités d'arcs
  function ae(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  var toeTopEnd    = ae(uc2,  vc2, r2, aT);
  var rootTopStart = ae(uc1,  vc1, r1, aR);
  var rootBotEnd   = ae(uc1, -vc1, r1, -aR);
  var toeBotStart  = ae(uc2, -vc2, r2, -aT);

  // Bulge : |bulge| = tan(θ/4), θ = angle d'arc = |aT| pour tous les arcs
  // Signe : +CCW (racine, concave), −CW (orteil, convexe)
  var theta = Math.abs(aT);
  var bg = Math.tan(theta / 4);

  // ── Centroïde (polyline 6-segments, méthode éprouvée) ──
  function arcPts(cx, cy, r, a0, a1) {
    var pts = [];
    for (var i = 0; i <= 6; i++) {
      var a = a0 + (a1 - a0) * i / 6;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }
  var top = [[b, hh], [b, vc2]];
  arcPts(uc2, vc2, r2, 0, aT).forEach(function(q) { top.push(q); });
  arcPts(uc1, vc1, r1, aR, PI).forEach(function(q) { top.push(q); });
  var negV = function(q) { return [q[0], -q[1]]; };
  var rev  = function(a) { return a.slice().reverse(); };
  var L = [[0, hh]];
  top.forEach(function(q) { L.push(q); });
  rev(top.map(negV)).forEach(function(q) { L.push(q); });
  L.push([0, -hh], [0, hh]);
  var A = 0, Cu = 0, Cv = 0;
  for (var i = 0; i < L.length - 1; i++) {
    var p0 = L[i], p1 = L[i + 1];
    var cr = p0[0] * p1[1] - p1[0] * p0[1];
    A += cr; Cu += (p0[0] + p1[0]) * cr; Cv += (p0[1] + p1[1]) * cr;
  }
  A *= 0.5;
  var gu = Cu / (6 * A), gv = Cv / (6 * A);

  // ── Polyligne unique fermée avec bulge ──
  var ox = x - gu, oy = y - gv;
  api.polyline([
    [ox,                          hh + oy                      ],  // dos haut
    [b + ox,                      hh + oy                      ],  // face sup. aile haute
    [b + ox,                      vc2 + oy,               -bg  ],  // chant → orteil haut (CW)
    [toeTopEnd[0] + ox,           toeTopEnd[1] + oy            ],  // face inclinée haute
    [rootTopStart[0] + ox,        rootTopStart[1] + oy,    bg  ],  // → racine haut (CCW)
    [tw + ox,                     vc1 + oy                     ],  // âme haut
    [tw + ox,                    -vc1 + oy,                bg  ],  // âme bas → racine bas (CCW)
    [rootBotEnd[0] + ox,          rootBotEnd[1] + oy           ],  // face inclinée basse
    [toeBotStart[0] + ox,         toeBotStart[1] + oy,    -bg  ],  // → orteil bas (CW)
    [b + ox,                     -vc2 + oy                     ],  // chant aile basse
    [b + ox,                     -hh + oy                      ],  // coin bas-droit
    [ox,                         -hh + oy                      ],  // dos bas
    [ox,                          hh + oy                      ]   // dos (fermeture explicite)
  ], true);
}