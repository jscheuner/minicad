// Acier à T vif (T-Stahl scharfkantig) — section en T à ARÊTES VIVES
// Paramètres : b (largeur de bride), h (hauteur totale), d (épaisseur bride = âme)
//   -> si b omis ou null, b = h
// Point d'insertion : centroïde (calcul par shoelace)

function drawProfileTVIF(p, x, y) {
  var api = window.minicadAPI;
  var b  = (p.b != null ? p.b : p.h);
  var h  = p.h, d = p.d;
  var bh = b / 2, wh = d / 2;

  // Contour local : haut de bride à y=0, âme vers le bas
  var L = [
    [-bh,  0],
    [ bh,  0],
    [ bh, -d],
    [ wh, -d],
    [ wh, -h],
    [-wh, -h],
    [-wh, -d],
    [-bh, -d],
    [-bh,  0]         // fermeture explicite
  ];

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

  api.polyline(L.map(q => [x + q[0] - gu, y + q[1] - gv]), true);
}