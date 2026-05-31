// Profilés UPN — section en U à ailes inclinées (pente 8 %)
// UNE SEULE polyligne fermée avec bulge pour les arcs
// Paramètres : h, b, tw (épaisseur âme), tf (épaisseur aile moy. à b/2), r1 (racine), r2 (orteil)
// Point d'insertion : centroïde (calculé par shoelace)

function drawProfileUPN(p, x, y) {
  var api = window.minicadAPI;
  var m  = 0.08;                          // pente intérieure des ailes (8 %)
  var hh = p.h / 2, b = p.b, tw = p.tw;
  var tf = p.tf, r1 = p.r1, r2 = p.r2;
  var s1 = Math.sqrt(1 + m * m);
  var PI = Math.PI;

  var c   = hh - tf - m * b / 2;
  var uc2 = b - r2,  vc2 = m * uc2 + c + r2 * s1;
  var uc1 = tw + r1, vc1 = m * uc1 + c - r1 * s1;
  var aT  = Math.atan2(-1,  m);
  var aR  = Math.atan2( 1, -m);

  // Bulge : tous les arcs du UPN ont |included angle| = |aT| ≈ 1.49 rad
  var theta = Math.abs(aT);
  var BG = Math.tan(theta / 4);           // ≈ 0.3927

  // Extrémités d'arcs
  function ae(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  var toeTopEnd    = ae(uc2,  vc2, r2, aT);
  var rootTopStart = ae(uc1,  vc1, r1, aR);
  var rootBotStart = ae(uc1, -vc1, r1, -aR);      // angles inversés
  var toeBotEnd    = ae(uc2, -vc2, r2, -aT);

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
  // Note: moitié inférieure = miroir avec angles inversés → bulge signs inversés
  var ox = x - gu, oy = y - gv;
  api.polyline([
    [0 + ox,                  hh + oy              ],  // dos haut
    [b + ox,                  hh + oy              ],  // face sup. aile
    [b + ox,                  vc2 + oy,        -BG ],  // → orteil haut (CW)
    [toeTopEnd[0] + ox,       toeTopEnd[1] + oy    ],  // face inclinée haut
    [rootTopStart[0] + ox,    rootTopStart[1] + oy, BG],// → racine haut (CCW)
    [tw + ox,                 vc1 + oy             ],  // âme haut
    [tw + ox,                -vc1 + oy,         BG ],  // → racine bas (CCW, inversé)
    [rootBotStart[0] + ox,    rootBotStart[1] + oy    ],  // face inclinée bas
    [toeBotEnd[0] + ox,       toeBotEnd[1] + oy, -BG],  // → orteil bas (CW, inversé)
    [b + ox,                 -vc2 + oy             ],  // chant aile basse
    [b + ox,                 -hh + oy              ],  // coin bas-droit
    [0 + ox,                 -hh + oy              ],  // dos bas
    [0 + ox,                  hh + oy              ]   // fermeture
  ], true);
}