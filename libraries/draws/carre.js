// Acier carré (Vierkantstahl) — vue de face (section transversale : un carré)
// Paramètre : a (côté)
// Point d'insertion : centroïde (= centre du carré)

function drawProfileCARRE(p, x, y) {
  var api = window.minicadAPI;
  var h = p.a / 2;
  api.polyline([
    [x - h, y - h],
    [x + h, y - h],
    [x + h, y + h],
    [x - h, y + h],
    [x - h, y - h]
  ], true);
}