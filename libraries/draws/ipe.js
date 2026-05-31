function drawProfileI(p, x, y) {
  var api = window.minicadAPI;

  var hh  = p.h / 2;
  var bh  = p.b / 2;
  var twh = p.tw / 2;
  var tf  = p.tf;
  var r   = p.r;

  // Bulge pour quart de cercle (90°) = tan(π/8)
  // NÉGATIF car les arcs sont parcourus en sens horaire (CW)
  var bg = -Math.tan(Math.PI / 8);

  var yTop =  hh;
  var yBot = -hh;
  var yIT  =  hh - tf;
  var yIB  = -hh + tf;

  api.polyline([
    // 1  Coin bas-gauche
    [x - bh,       y + yBot],

    // 2  Coin bas-droit
    [x + bh,       y + yBot],

    // 3  Chant aile inférieure droite
    [x + bh,       y + yIB],

    // 4  Segment horizontal sous aile + ARC BR (CW, concave)
    [x + twh + r,  y + yIB,        bg],

    // 5  Fin arc BR, début âme droite
    [x + twh,      y + yIB + r],

    // 6  Âme droite + ARC TR (CW, concave)
    [x + twh,      y + yIT - r,    bg],

    // 7  Fin arc TR
    [x + twh + r,  y + yIT],

    // 8  Segment horizontal sous aile supérieure
    [x + bh,       y + yIT],

    // 9  Chant aile supérieure droite
    [x + bh,       y + yTop],

    // 10 Coin haut-droit
    [x - bh,       y + yTop],

    // 11 Chant aile supérieure gauche
    [x - bh,       y + yIT],

    // 12 Segment horizontal sous aile sup + ARC TL (CW, concave)
    [x - twh - r,  y + yIT,        bg],

    // 13 Fin arc TL, début âme gauche
    [x - twh,      y + yIT - r],

    // 14 Âme gauche + ARC BL (CW, concave)
    [x - twh,      y + yIB + r,    bg],

    // 15 Fin arc BL
    [x - twh - r,  y + yIB],

    // 16 Segment horizontal sur aile inférieure
    [x - bh,       y + yIB],

    // 17 Fermeture
    [x - bh,       y + yBot]

  ], true);
}