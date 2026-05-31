// Acier rond (Rundstahl) — vue de face (section transversale : un cercle)
// Paramètre : d (diamètre)
// Point d'insertion : centroïde (= centre du cercle)

function drawProfileROND(p, x, y) {
  var api = window.minicadAPI;
  var r = p.d / 2;
  var n = 64;                              // segments d'approximation du cercle

  // Si l'API expose un cercle natif, le préférer :
  if (api.circle) { api.circle(x, y, r); return; }

  var pts = [];
  for (var i = 0; i < n; i++) {
    var a = 2 * Math.PI * i / n;
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  api.polyline(pts, true);
}