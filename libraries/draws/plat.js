// Acier plat (Flachstahl) — vue de face (section transversale : un rectangle)
// Paramètres : b (largeur, horizontale), t (épaisseur, verticale)
// Point d'insertion : centroïde (= centre du rectangle)

function drawProfilePLAT(p, x, y) {
  var api = window.minicadAPI;
  var bh = p.b / 2, th = p.t / 2;
  api.polyline([
    [x - bh, y - th],
    [x + bh, y - th],
    [x + bh, y + th],
    [x - bh, y + th],
    [x - bh, y - th]   // on referme explicitement le contour
  ], true);
}