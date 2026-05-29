// Profilés en I — vue de face (section transversale)
// Paramètres : h (hauteur), b (largeur aile), tw (ép. âme), tf (ép. aile), r (congé)
// Point d'insertion : centroïde

function drawProfileI(p, x, y) {
  var api = window.minicadAPI;
  var hh = p.h / 2, bh = p.b / 2, twh = p.tw / 2, tf = p.tf, r = p.r;
  var PI = Math.PI;

  function arc(cx, cy, a0, a1) {
    var pts = [];
    for (var i = 0; i <= 6; i++) {
      var a = a0 + (a1 - a0) * i / 6;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  var pts = [];
  pts.push([x - bh, y - hh], [x + bh, y - hh], [x + bh, y - hh + tf]);
  arc(x + twh + r, y - hh + tf + r, -PI / 2, -PI).forEach(p => pts.push(p));
  arc(x + twh + r, y + hh - tf - r,  PI,  PI / 2).forEach(p => pts.push(p));
  pts.push([x + bh, y + hh - tf], [x + bh, y + hh], [x - bh, y + hh], [x - bh, y + hh - tf]);
  arc(x - twh - r, y + hh - tf - r,  PI / 2,  0).forEach(p => pts.push(p));
  arc(x - twh - r, y - hh + tf + r,  0, -PI / 2).forEach(p => pts.push(p));
  pts.push([x - bh, y - hh + tf], [x - bh, y - hh]);

  api.polyline(pts, true);
}
