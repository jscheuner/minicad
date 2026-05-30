// Profilés IPN — vue de face (section transversale, ailes inclinées à 14%)
// Paramètres : h (hauteur), b (largeur aile), tw (ép. âme),
//              tf (ép. aile mesurée à b/4), r1 (congé racine), r2 (congé de pied)
// Point d'insertion : centroïde

function drawProfileIPN(p, x, y) {
  var api = window.minicadAPI;
  var m  = 0.14;                          // pente intérieure des ailes (14 %)
  var hh = p.h / 2, bh = p.b / 2, twh = p.tw / 2;
  var tf = p.tf, r1 = p.r1, r2 = p.r2;
  var s1 = Math.sqrt(1 + m * m);

  // Face inférieure (intérieure) de l'aile sup. droite : v = C - m*u   (v vers le bas)
  var C = -hh + tf + m * (p.b / 4);

  // Congé de pied r2 (haut-droit) : tangent au chant vertical (u=bh) et à la face inclinée
  var uc2 = bh - r2;
  var vc2 = C - m * uc2 - r2 * s1;

  // Congé de racine r1 (haut-droit) : tangent à l'âme (u=twh) et à la face inclinée
  var uc1 = twh + r1;
  var vc1 = C - m * uc1 + r1 * s1;

  function arc(cx, cy, r, a0, a1) {
    var out = [];
    for (var i = 0; i <= 6; i++) {
      var a = a0 + (a1 - a0) * i / 6;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
  }

  // Quart supérieur droit, ordonné de l'extérieur (pointe) vers l'âme
  var Q = [[bh, -hh]];                                                       // coin ext. de la pointe
  arc(uc2, vc2, r2, 0, Math.atan2(1, m)).forEach(q => Q.push(q));            // congé de pied
  arc(uc1, vc1, r1, Math.atan2(-1, -m), -Math.PI).forEach(q => Q.push(q));   // congé de racine -> (twh,vc1)

  var negV  = q => [ q[0], -q[1]];
  var negU  = q => [-q[0],  q[1]];
  var negUV = q => [-q[0], -q[1]];
  var rev   = a => a.slice().reverse();

  // Contour complet (sens horaire) par symétrie du quart
  var L = [[-bh, -hh]];                        // pointe haut-gauche
  Q.forEach(q => L.push(q));                   // arête sup. + quart haut-droit  -> (twh, vc1)
  rev(Q.map(negV)).forEach(q => L.push(q));    // âme droite + quart bas-droit   -> (bh, hh)
  Q.map(negUV).forEach(q => L.push(q));        // arête inf. + quart bas-gauche  -> (-twh,-vc1)
  rev(Q.map(negU)).forEach(q => L.push(q));    // âme gauche + quart haut-gauche -> (-bh,-hh)

  api.polyline(L.map(q => [x + q[0], y + q[1]]), true);
}