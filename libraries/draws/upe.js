// Profilés en U à ailes parallèles (UPE) — vue de face (section transversale)
// Paramètres : h, b, tw, tf, r1 (congé racine âme/aile), r2 (congé bout d'aile intérieur)
// Point d'insertion : centre de la boîte englobante
// Âme à gauche, ailes vers la droite

function drawProfileUPE(p, x, y) {
  var api = window.minicadAPI;
  var h = p.h, b = p.b, tw = p.tw, tf = p.tf, r1 = p.r1, r2 = p.r2;
  var PI = Math.PI;

  var xL = x - b / 2;   // face arrière (dos de l'âme)
  var xR = x + b / 2;   // bouts d'ailes
  var xW = xL + tw;      // face intérieure de l'âme
  var yB = y - h / 2;
  var yT = y + h / 2;

  function arc(cx, cy, r, a0, a1) {
    var pts = [];
    for (var i = 0; i <= 6; i++) {
      var a = a0 + (a1 - a0) * i / 6;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  var pts = [];

  // Coin bas-gauche (vif)
  pts.push([xL, yB]);

  // Face inférieure → coin vif bas-droit aile basse
  pts.push([xR, yB]);

  // Face droite aile basse → congé r2 coin intérieur haut (CCW : 0 → π/2)
  // Segment implicite [xR,yB]→(xR,yB+tf-r2), puis arc
  arc(xR - r2, yB + tf - r2, r2, 0, PI / 2).forEach(p => pts.push(p));
  // arc : (xR, yB+tf-r2) → (xR-r2, yB+tf)

  // Face intérieure aile basse → congé r1 racine bas (CW : -π/2 → -π)
  // Segment implicite (xR-r2,yB+tf)→(xW+r1,yB+tf)
  arc(xW + r1, yB + tf + r1, r1, -PI / 2, -PI).forEach(p => pts.push(p));
  // arc : (xW+r1,yB+tf) → (xW,yB+tf+r1)

  // Face intérieure âme → congé r1 racine haut (CW : π → π/2)
  // Segment implicite (xW,yB+tf+r1)→(xW,yT-tf-r1)
  arc(xW + r1, yT - tf - r1, r1, PI, PI / 2).forEach(p => pts.push(p));
  // arc : (xW,yT-tf-r1) → (xW+r1,yT-tf)

  // Face intérieure aile haute → congé r2 coin intérieur bas (CCW : -π/2 → 0)
  // Segment implicite (xW+r1,yT-tf)→(xR-r2,yT-tf)
  arc(xR - r2, yT - tf + r2, r2, -PI / 2, 0).forEach(p => pts.push(p));
  // arc : (xR-r2,yT-tf) → (xR,yT-tf+r2)

  // Face droite aile haute → coin vif haut-droit aile haute
  // Segment implicite (xR,yT-tf+r2)→[xR,yT]
  pts.push([xR, yT]);

  // Face supérieure et fermeture
  pts.push([xL, yT]);
  pts.push([xL, yB]);

  api.polyline(pts, true);
}
