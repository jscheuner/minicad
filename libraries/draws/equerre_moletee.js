function drawProfileEQUERREMOLETEE(p, x, y) {
  var api = window.minicadAPI;
  var a = p.a; 
  var b = (p.b != null) ? p.b : a; // Si b n'est pas défini, équerre égale (b = a)
  var d = p.d;
  if (!a || !b || !d) return;

  var r1 = d;
  var r2 = 2 * d;
  
  // Limitation des rayons pour éviter les dépassements sur la plus petite aile
  if (r2 > a / 2) r2 = a / 2;
  if (r2 > b / 2) r2 = b / 2;
  if (r1 > a - d) r1 = a - d;
  if (r1 > b - d) r1 = b - d;

  var BG = Math.tan(Math.PI / 8);

  var L = [
    [r2, 0],
    [b, 0],                  // Bout de l'aile horizontale (largeur b)
    [b, d],
    [d + r1, d, -BG],        // Congé intérieur (concave)
    [d, d + r1],
    [d, a],                  // Bout de l'aile verticale (largeur a)
    [0, a],
    [0, r2, BG],             // Arrondi extérieur (convexe)
    [r2, 0]
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