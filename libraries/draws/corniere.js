// Cornière (Winkelstahl) — section en L, ailes ÉGALES ou INÉGALES, à arêtes arrondies
// Paramètres : a (aile horizontale), b (aile verticale), d (épaisseur)
//   - cornière égale : fournir b = a (ou omettre b)
//   - rayons optionnels : r1 (congé de talon, intérieur), r2 (arrondi de bout d'aile)
//     défauts : r1 = d, r2 = d/2
// Point d'insertion : centroïde (calculé par shoelace sur contour local)
// UNE SEULE polyligne fermée avec bulge pour les arcs natifs
function drawProfileCORNIERE(p, x, y) {
  var api = window.minicadAPI;
  var a  = p.a;
  var b  = (p.b  != null ? p.b  : p.a);
  var d  = p.d;
  var r1 = (p.r1 != null ? p.r1 : d);
  var r2 = (p.r2 != null ? p.r2 : d / 2);
  var PI = Math.PI;

  // Bulge pour quart de cercle (90°) : tan(π/8)
  var bg = Math.tan(PI / 8);

  // ── Contour local pour calcul du centroïde (shoelace) ──
  // On garde la version discrétisée uniquement pour le calcul géométrique du centre
  var L = [];
  L.push([0, 0]);
  L.push([a, 0]);
  L.push([a, d - r2]);
  for (var i = 0; i <= 6; i++) {
    var t = (PI / 2) * i / 6;
    L.push([a - r2 + r2 * Math.cos(t), d - r2 + r2 * Math.sin(t)]);
  }
  L.push([d + r1, d]);
  for (var i = 0; i <= 6; i++) {
    var t = -PI / 2 + (-PI / 2) * i / 6;
    L.push([d + r1 + r1 * Math.cos(t), d + r1 + r1 * Math.sin(t)]);
  }
  L.push([d, b - r2]);
  for (var i = 0; i <= 6; i++) {
    var t = (PI / 2) * i / 6;
    L.push([d - r2 + r2 * Math.cos(t), b - r2 + r2 * Math.sin(t)]);
  }
  L.push([0, b]);
  L.push([0, 0]);

  // Centroïde (shoelace)
  var A = 0, Cu = 0, Cv = 0;
  for (var i = 0; i < L.length - 1; i++) {
    var p0 = L[i], p1 = L[i + 1];
    var cr = p0[0] * p1[1] - p1[0] * p0[1];
    A  += cr;
    Cu += (p0[0] + p1[0]) * cr;
    Cv += (p0[1] + p1[1]) * cr;
  }
  A *= 0.5;
  var gu = Cu / (6 * A), gv = Cv / (6 * A);

  // ── Polyligne unique avec arcs natifs via bulge ──
  var ox = x - gu, oy = y - gv;

  api.polyline([
    // Talon extérieur (angle vif) → LIGNE face inférieure aile horiz.
    [ox, oy],

    // Bout aile horiz. (bas) → LIGNE chant du bout
    [a + ox, oy],

    // Chant du bout → ARC convexe bout aile horiz. (CCW, +bg)
    [a + ox, d - r2 + oy, bg],

    // Fin arrondi bout horiz. → LIGNE face intérieure horiz.
    [a - r2 + ox, d + oy],

    // Face int. horiz. → ARC concave congé talon (CW, -bg)
    [d + r1 + ox, d + oy, -bg],

    // Fin congé talon → LIGNE face intérieure vert.
    [d + ox, d + r1 + oy],

    // Face int. vert. → ARC convexe bout aile vert. (CCW, +bg)
    [d + ox, b - r2 + oy, bg],

    // Fin arrondi bout vert. → LIGNE chant du bout aile vert.
    [d - r2 + ox, b + oy],

    // Chant aile vert. → LIGNE retour talon (fermeture)
    [ox, b + oy],

    // Retour explicite au talon
    [ox, oy]
  ], true);
}