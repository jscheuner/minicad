// Profils à U moletés à froid (Cold-rolled U-Profile)
// Paramètres : b (largeur aile), h (hauteur), d (épaisseur)
// Point d'insertion : Centroïde de la section

function drawProfileUMOLETE(p, x, y) {
  var api = window.minicadAPI;
  var b = p.b, h = p.h, d = p.d;
  if (!b || !h || !d) return;

  var r1 = d;
  var r2 = 2 * d;
  
  if (r2 > b) r2 = b;
  if (r2 > h / 2) r2 = h / 2;
  if (r1 > b - d) r1 = b - d;
  if (r1 > h / 2 - d) r1 = h / 2 - d;

  var BG = Math.tan(Math.PI / 8);

  var L = [
    [0, r2, BG],
    [r2, 0],
    [b, 0],
    [b, d],
    [d + r1, d, -BG],
    [d, d + r1],
    [d, h - d - r1, -BG],
    [d + r1, h - d],
    [b, h - d],
    [b, h],
    [r2, h, BG],
    [0, h - r2],
    [0, r2]
  ];

  var A = 0, Cu = 0, Cv = 0;
  for (var i = 0; i < L.length - 1; i++) {
    var p0 = L[i], p1 = L[i + 1];
    var cr = p0[0] * p1[1] - p1[0] * p0[1];
    A += cr; 
    Cu += (p0[0] + p1[0]) * cr; 
    Cv += (p0[1] + p1[1]) * cr;
  }
  A *= 0.5;
  if (Math.abs(A) < 1e-6) return;
  
  var gu = Cu / (6 * A);
  var gv = Cv / (6 * A);

  api.polyline(L.map(q => {
    var pt = [x + q[0] - gu, y + q[1] - gv];
    if (q.length > 2) pt.push(q[2]);
    return pt;
  }), true);
}