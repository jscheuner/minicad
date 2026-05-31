// Équerre (Winkelstahl scharfkantig) — section en L à ARÊTES VIVES, égale ou inégale
// Paramètres : a (aile horizontale), b (aile verticale ; = a si omis), d (épaisseur)
// Point d'insertion : centroïde (talon décalé ; calcul par shoelace)

function drawProfileEQUERRE(p, x, y) {
  var api = window.minicadAPI;
  var a = p.a;
  var b = (p.b != null ? p.b : p.a);
  var d = p.d;

  // Contour local (CCW), talon vif à l'origine, ailes vers +x (a) et +y (b)
  var L = [
    [0, 0],
    [a, 0],
    [a, d],
    [d, d],
    [d, b],
    [0, b],
    [0, 0]            // fermeture explicite
  ];

  // Centroïde du contour (shoelace)
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