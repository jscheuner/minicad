// Acier à T (T-Stahl rundkantig) — à âme haute (b=h) OU à base large (b>h)
// UNE SEULE polyligne fermée avec bulge pour les arcs
// Paramètres : b (largeur de bride), h (hauteur totale), d (épaisseur bride = âme)
//   rayons optionnels : r1 (congé de raccordement), r2 (arrondis de bouts)
//   défauts : r1 = d, r2 = d/2
// Point d'insertion : centroïde (calcul par shoelace)

function drawProfileT(p, x, y) {
  var api = window.minicadAPI;
  var b  = p.b, h = p.h, d = p.d;
  var r1 = (p.r1 != null ? p.r1 : d);
  var r2 = (p.r2 != null ? p.r2 : d / 2);
  var bh = b / 2, wh = d / 2;          // demi-bride, demi-âme
  var PI = Math.PI;
  var BG = Math.tan(PI / 8);           // bulge d'un quart de cercle (90°)

  // ── Centroïde (polyline 6-segments, méthode éprouvée) ──
  function arc(cx, cy, r, a0, a1, out) {
    for (var i = 0; i <= 6; i++) {
      var t = a0 + (a1 - a0) * i / 6;
      out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
  }
  var L = [];
  L.push([-bh, 0]);
  L.push([ bh, 0]);
  L.push([ bh, -d + r2]);
  arc(bh - r2, -d + r2, r2, 0, -PI / 2, L);
  L.push([ wh + r1, -d]);
  arc(wh + r1, -d - r1, r1, PI / 2, PI, L);
  L.push([ wh, -h + r2]);
  arc(wh - r2, -h + r2, r2, 0, -PI / 2, L);
  L.push([-wh + r2, -h]);
  arc(-wh + r2, -h + r2, r2, -PI / 2, -PI, L);
  L.push([-wh, -d - r1]);
  arc(-(wh + r1), -d - r1, r1, 0, PI / 2, L);
  L.push([-bh + r2, -d]);
  arc(-bh + r2, -d + r2, r2, -PI / 2, -PI, L);
  L.push([-bh, 0]);

  var A = 0, Cu = 0, Cv = 0;
  for (var i = 0; i < L.length - 1; i++) {
    var p0 = L[i], p1 = L[i + 1];
    var cr = p0[0] * p1[1] - p1[0] * p0[1];
    A += cr; Cu += (p0[0] + p1[0]) * cr; Cv += (p0[1] + p1[1]) * cr;
  }
  A *= 0.5;
  var gu = Cu / (6 * A), gv = Cv / (6 * A);

  // ── Polyligne unique fermée avec bulge ──
  // bulge < 0 : arrondi de bout (convexe, CW) ; bulge > 0 : congé de raccordement (concave, CCW)
  var ox = x - gu, oy = y - gv;
  api.polyline([
    [-bh + ox,        0 + oy             ],   // coin haut-gauche bride
    [ bh + ox,        0 + oy             ],   // face supérieure
    [ bh + ox,       -d + r2 + oy,  -BG  ],   // → arrondi bas-droit bride
    [ bh - r2 + ox,  -d + oy             ],   // sous-face bride (droite)
    [ wh + r1 + ox,  -d + oy,        BG  ],   // → congé de raccordement droit
    [ wh + ox,       -d - r1 + oy        ],   // flanc droit d'âme
    [ wh + ox,       -h + r2 + oy,  -BG  ],   // → arrondi bas-droit d'âme
    [ wh - r2 + ox,  -h + oy             ],   // bas d'âme (droite)
    [-wh + r2 + ox,  -h + oy,       -BG  ],   // → arrondi bas-gauche d'âme
    [-wh + ox,       -h + r2 + oy        ],   // flanc gauche d'âme
    [-wh + ox,       -d - r1 + oy,   BG  ],   // → congé de raccordement gauche
    [-(wh + r1) + ox,-d + oy             ],   // sous-face bride (gauche)
    [-bh + r2 + ox,  -d + oy,       -BG  ],   // → arrondi bas-gauche bride
    [-bh + ox,       -d + r2 + oy        ],   // bout bride gauche
    [-bh + ox,        0 + oy             ]    // fermeture explicite
  ], true);
}