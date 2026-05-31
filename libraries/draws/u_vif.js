// Acier à coulisse (U-Stahl) — Section en U symétrique
// Paramètres : b (largeur), h (hauteur), d (épaisseur âme/fond), t (épaisseur brides/côtés)
// Point d'insertion : Centroïde de la section

function drawProfileUVIF(p, x, y) {
  var api = window.minicadAPI;
  
  var b = p.b;
  var h = p.h;
  var d = p.d; // Épaisseur du fond (âme)
  var t = p.t; // Épaisseur des côtés (brides)

  if (!b || !h || !d || !t) return;

  var half_b = b / 2;

  // Contour local (Ouvert vers le HAUT)
  // Sens horaire starting from Bottom-Left Outer
  var L = [
    [-half_b, 0],             // 1. Bas Gauche Extérieur
    [ half_b, 0],             // 2. Bas Droit Extérieur
    [ half_b, h],             // 3. Haut Droit Extérieur
    [ half_b - t, h],         // 4. Haut Droit Intérieur
    [ half_b - t, d],         // 5. Angle Intérieur Droit (jonction côté/fond)
    [-half_b + t, d],         // 6. Angle Intérieur Gauche
    [-half_b + t, h],         // 7. Haut Gauche Intérieur
    [-half_b, h],             // 8. Haut Gauche Extérieur
    [-half_b, 0]              // Fermeture
  ];

  // Calcul du centroïde (Méthode Shoelace)
  var A = 0, Cu = 0, Cv = 0;
  for (var i = 0; i < L.length - 1; i++) {
    var p0 = L[i], p1 = L[i + 1];
    var cr = p0[0] * p1[1] - p1[0] * p0[1];
    A  += cr;
    Cu += (p0[0] + p1[0]) * cr;
    Cv += (p0[1] + p1[1]) * cr;
  }
  A *= 0.5;
  
  if (Math.abs(A) < 1e-6) return;

  var gu = Cu / (6 * A);
  var gv = Cv / (6 * A);

  // Dessin déplacé au centroïde
  api.polyline(L.map(q => [x + q[0] - gu, y + q[1] - gv]), true);
}